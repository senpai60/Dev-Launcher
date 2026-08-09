import fs from "fs";
import { readProjects, writeProjects } from "../storage/project.storage";
import { generateId } from "../utils/idGenerator";
import { resolveWorkingDirectory, validateCommand } from "../utils/commandSafety";
import {
  openInEditor,
  openInExplorer,
  openTerminal,
  runCommandInTerminal,
  type LaunchResult,
} from "../integrations/launcher";
import { captureStep } from "./session.service";
import { EDITOR_BINARIES } from "../utils/platform";
import type { Project, ProjectCommand } from "../../types/project";

export function getProjects(): Project[] {
  return readProjects();
}

export function getProject(id: string): Project | undefined {
  return readProjects().find((project) => project.id === id);
}

export function addProject(
  projectData: Omit<Project, "id" | "createdAt" | "updatedAt"> & {
    id?: string;
    createdAt?: number;
    updatedAt?: number;
  },
): Project {
  const projects = readProjects();

  const newProject: Project = {
    ...projectData,
    id: projectData.id || generateId("proj"),
    tags: projectData.tags || [],
    commands: projectData.commands || [],
    isFavorite: projectData.isFavorite ?? false,
    createdAt: projectData.createdAt || Date.now(),
    updatedAt: projectData.updatedAt || Date.now(),
  };

  projects.push(newProject);
  writeProjects(projects);

  return newProject;
}

export function updateProject(id: string, updates: Partial<Project>): Project | undefined {
  const projects = readProjects();
  const index = projects.findIndex((project) => project.id === id);

  if (index === -1) return undefined;

  const safeUpdates = { ...updates };
  // `id` and `createdAt` are immutable regardless of what the renderer sends.
  delete safeUpdates.id;
  delete safeUpdates.createdAt;

  const updatedProject: Project = {
    ...projects[index],
    ...safeUpdates,
    updatedAt: Date.now(),
  };

  projects[index] = updatedProject;
  writeProjects(projects);

  return updatedProject;
}

export function deleteProject(id: string): boolean {
  const projects = readProjects();
  const filteredProjects = projects.filter((project) => project.id !== id);

  if (filteredProjects.length === projects.length) return false;

  writeProjects(filteredProjects);
  return true;
}

/* -------------------------------------------------------------------------- */
/*  Phase 5 — Custom project commands                                          */
/* -------------------------------------------------------------------------- */

/**
 * Persists a set of commands onto a project.
 *
 * Used to promote auto-detected commands into real, editable records the first
 * time a project's detail view is opened.
 */
export function seedProjectCommands(projectId: string, commands: ProjectCommand[]): Project {
  const project = requireProject(projectId);

  // Never clobber commands the user has already curated.
  if (project.commands && project.commands.length > 0) return project;

  const now = Date.now();
  const seeded = commands.map((cmd) => ({
    ...cmd,
    id: cmd.id || generateId("cmd"),
    projectId,
    isFavorite: cmd.isFavorite ?? false,
    createdAt: cmd.createdAt || now,
    updatedAt: now,
  }));

  return updateProject(projectId, { commands: seeded }) as Project;
}

export function addProjectCommand(
  projectId: string,
  input: Partial<ProjectCommand>,
): { project: Project; command: ProjectCommand } {
  const project = requireProject(projectId);

  const result = validateCommand(
    { name: input.name, command: input.command, workingDirectory: input.workingDirectory },
    project.path,
  );
  if (!result.valid) {
    throw new Error(result.errors.join(" "));
  }

  const now = Date.now();
  const command: ProjectCommand = {
    id: generateId("cmd"),
    projectId,
    name: (input.name ?? "").trim(),
    command: (input.command ?? "").trim(),
    description: input.description?.trim() || undefined,
    workingDirectory: input.workingDirectory?.trim() || undefined,
    shell: input.shell,
    isFavorite: input.isFavorite ?? false,
    createdAt: now,
    updatedAt: now,
  };

  const commands = [...(project.commands ?? []), command];
  const updated = updateProject(projectId, { commands }) as Project;

  return { project: updated, command };
}

export function updateProjectCommand(
  projectId: string,
  commandId: string,
  updates: Partial<ProjectCommand>,
): { project: Project; command: ProjectCommand } {
  const project = requireProject(projectId);
  const commands = project.commands ?? [];
  const index = commands.findIndex((c) => c.id === commandId);

  if (index === -1) {
    throw new Error("Command not found.");
  }

  const merged: ProjectCommand = {
    ...commands[index],
    ...updates,
    id: commands[index].id,
    projectId,
    createdAt: commands[index].createdAt,
    updatedAt: Date.now(),
  };

  // Only re-validate when the fields that matter actually changed; a bare
  // favourite toggle should not fail because a working directory went missing.
  const touchesExecution =
    updates.name !== undefined ||
    updates.command !== undefined ||
    updates.workingDirectory !== undefined;

  if (touchesExecution) {
    const result = validateCommand(
      { name: merged.name, command: merged.command, workingDirectory: merged.workingDirectory },
      project.path,
    );
    if (!result.valid) {
      throw new Error(result.errors.join(" "));
    }
  }

  const next = [...commands];
  next[index] = merged;

  const updated = updateProject(projectId, { commands: next }) as Project;
  return { project: updated, command: merged };
}

export function deleteProjectCommand(projectId: string, commandId: string): Project {
  const project = requireProject(projectId);
  const commands = project.commands ?? [];
  const next = commands.filter((c) => c.id !== commandId);

  if (next.length === commands.length) {
    throw new Error("Command not found.");
  }

  return updateProject(projectId, { commands: next }) as Project;
}

/**
 * Runs a stored command.
 *
 * The renderer sends identifiers only -- never a command string. Main resolves
 * the actual text from its own storage, so a compromised renderer cannot ask
 * for arbitrary shell execution (featured.md section 41).
 *
 * `confirmedDestructive` must be true for commands that matched a destructive
 * pattern; the renderer sets it after the user accepts the confirmation.
 */
export async function runProjectCommand(
  projectId: string,
  commandId: string,
  confirmedDestructive = false,
): Promise<{ project: Project; result: LaunchResult }> {
  const project = requireProject(projectId);
  const command = (project.commands ?? []).find((c) => c.id === commandId);

  if (!command) {
    throw new Error("Command not found. It may have been deleted.");
  }

  if (!fs.existsSync(project.path)) {
    throw new Error(`The folder "${project.path}" no longer exists.`);
  }

  const check = validateCommand(
    { name: command.name, command: command.command, workingDirectory: command.workingDirectory },
    project.path,
  );
  if (!check.valid) {
    throw new Error(check.errors.join(" "));
  }
  if (check.requiresConfirmation && !confirmedDestructive) {
    throw new Error(
      `"${command.name}" ${check.destructiveReason}. It was not run because it has not been confirmed.`,
    );
  }

  const cwd = resolveWorkingDirectory(project.path, command.workingDirectory);
  const result = await runCommandInTerminal(command.command, cwd);

  // Fold this into the project's resumable session.
  captureStep(projectId, "command", command.id, command.name);

  const now = Date.now();
  const commands = (project.commands ?? []).map((c) =>
    c.id === commandId ? { ...c, lastRunAt: now } : c,
  );
  const updated = updateProject(projectId, { commands, lastCommandAt: now }) as Project;

  return { project: updated, result };
}

/* -------------------------------------------------------------------------- */
/*  Launching                                                                  */
/* -------------------------------------------------------------------------- */

const EDITOR_ACTIONS: Record<string, string> = {
  "open-in-vscode": "vscode",
  vscode: "vscode",
  "open-in-cursor": "cursor",
  cursor: "cursor",
  "open-in-antigravity": "antigravity",
  antigravity: "antigravity",
};

/**
 * Opens a project with the OS integration named by `action`.
 *
 * Returns the updated project so the renderer can refresh `lastOpenedAt`
 * without issuing a second write.
 */
export async function launchProject(
  id: string,
  action: string,
  newWindow = false,
): Promise<{ project: Project; result: LaunchResult }> {
  const project = requireProject(id);
  const normalized = action.toLowerCase();

  if (!fs.existsSync(project.path)) {
    throw new Error(`The folder "${project.path}" no longer exists.`);
  }

  let result: LaunchResult;
  const editorKey = EDITOR_ACTIONS[normalized];

  if (editorKey) {
    result = await openInEditor(editorKey, project.path, newWindow);
    captureStep(id, "editor", editorKey, `Open in ${EDITOR_BINARIES[editorKey]?.label ?? editorKey}`);
  } else if (normalized === "terminal" || normalized === "open-in-terminal") {
    result = await openTerminal(project.path);
    captureStep(id, "terminal", "", "Open terminal");
  } else {
    result = await openInExplorer(project.path);
    // Opening Explorer is a one-off lookup, not part of a startup routine, so
    // it is deliberately not captured.
  }

  // Only recorded once the launch actually succeeded.
  const updated = updateProject(id, { lastOpenedAt: Date.now() }) as Project;

  return { project: updated, result };
}

function requireProject(id: string): Project {
  const project = getProject(id);
  if (!project) {
    throw new Error("Project not found.");
  }
  return project;
}
