import { ipcMain } from "electron";
import fs from "fs";
import {
  getProjects,
  getProject,
  addProject,
  updateProject,
  deleteProject,
  launchProject,
  addProjectCommand,
  updateProjectCommand,
  deleteProjectCommand,
  runProjectCommand,
  seedProjectCommands,
} from "../services/project.service";
import { detectProjectMeta } from "../utils/projectDetector";
import { validateCommand } from "../utils/commandSafety";
import type { Project, ProjectCommand, ProjectWithStatus } from "../../types/project";
import { handler, optionalBoolean, requireId, requireObject, requireString } from "./validate";

/** Adds read-time state that must not be trusted from disk. */
function withStatus(project: Project): ProjectWithStatus {
  return { ...project, pathExists: Boolean(project.path) && fs.existsSync(project.path) };
}

export function registerProjectIPC() {
  ipcMain.handle(
    "projects:getAll",
    handler("projects:getAll", () => getProjects().map(withStatus)),
  );

  ipcMain.handle(
    "projects:get",
    handler("projects:get", (id: unknown) => {
      const project = getProject(requireId(id, "Project id"));
      return project ? withStatus(project) : undefined;
    }),
  );

  ipcMain.handle(
    "projects:add",
    handler("projects:add", (project: unknown) => {
      const input = requireObject(project, "Project");
      const name = requireString(input.name, "Project name");
      const projectPath = requireString(input.path, "Project path");

      if (!fs.existsSync(projectPath)) {
        throw new Error(`The folder "${projectPath}" does not exist.`);
      }
      if (!fs.statSync(projectPath).isDirectory()) {
        throw new Error(`"${projectPath}" is a file, not a folder.`);
      }

      return withStatus(
        addProject({
          ...(input as unknown as Project),
          name,
          path: projectPath,
          tags: Array.isArray(input.tags) ? (input.tags as string[]) : [],
          isFavorite: Boolean(input.isFavorite),
        }),
      );
    }),
  );

  ipcMain.handle(
    "projects:update",
    handler("projects:update", (id: unknown, updates: unknown) => {
      const projectId = requireId(id, "Project id");
      const patch = requireObject(updates, "Updates");

      if (patch.path !== undefined) {
        const nextPath = requireString(patch.path, "Project path");
        if (!fs.existsSync(nextPath)) {
          throw new Error(`The folder "${nextPath}" does not exist.`);
        }
      }
      if (patch.name !== undefined) {
        requireString(patch.name, "Project name");
      }

      const updated = updateProject(projectId, patch as Partial<Project>);
      if (!updated) throw new Error("Project not found.");
      return withStatus(updated);
    }),
  );

  ipcMain.handle(
    "projects:delete",
    handler("projects:delete", (id: unknown) => deleteProject(requireId(id, "Project id"))),
  );

  ipcMain.handle(
    "projects:detect",
    handler("projects:detect", (folderPath: unknown) =>
      detectProjectMeta(requireString(folderPath, "Folder path")),
    ),
  );

  /* ---------------------------------------------------------------------- */
  /*  Phase 5 — command management                                           */
  /* ---------------------------------------------------------------------- */

  ipcMain.handle(
    "projects:seedCommands",
    handler("projects:seedCommands", (projectId: unknown, commands: unknown) => {
      if (!Array.isArray(commands)) throw new Error("Commands must be an array.");
      return withStatus(
        seedProjectCommands(requireId(projectId, "Project id"), commands as ProjectCommand[]),
      );
    }),
  );

  ipcMain.handle(
    "projects:addCommand",
    handler("projects:addCommand", (projectId: unknown, command: unknown) => {
      const input = requireObject(command, "Command");
      const { project, command: created } = addProjectCommand(
        requireId(projectId, "Project id"),
        input as Partial<ProjectCommand>,
      );
      return { project: withStatus(project), command: created };
    }),
  );

  ipcMain.handle(
    "projects:updateCommand",
    handler("projects:updateCommand", (projectId: unknown, commandId: unknown, updates: unknown) => {
      const patch = requireObject(updates, "Updates");
      const { project, command } = updateProjectCommand(
        requireId(projectId, "Project id"),
        requireId(commandId, "Command id"),
        patch as Partial<ProjectCommand>,
      );
      return { project: withStatus(project), command };
    }),
  );

  ipcMain.handle(
    "projects:deleteCommand",
    handler("projects:deleteCommand", (projectId: unknown, commandId: unknown) =>
      withStatus(
        deleteProjectCommand(
          requireId(projectId, "Project id"),
          requireId(commandId, "Command id"),
        ),
      ),
    ),
  );

  /**
   * Runs a stored command by id.
   *
   * The renderer cannot send a command string -- main resolves the text from
   * its own storage, so this is not an arbitrary-execution channel.
   */
  ipcMain.handle(
    "projects:runCommand",
    handler("projects:runCommand", async (projectId: unknown, commandId: unknown, confirmed: unknown) => {
      const { project } = await runProjectCommand(
        requireId(projectId, "Project id"),
        requireId(commandId, "Command id"),
        optionalBoolean(confirmed, "Confirmation flag"),
      );
      return withStatus(project);
    }),
  );

  /** Pre-flight check so the UI can show a confirmation before running. */
  ipcMain.handle(
    "projects:inspectCommand",
    handler("projects:inspectCommand", (projectId: unknown, commandId: unknown) => {
      const project = getProject(requireId(projectId, "Project id"));
      if (!project) throw new Error("Project not found.");

      const command = (project.commands ?? []).find(
        (c) => c.id === requireId(commandId, "Command id"),
      );
      if (!command) throw new Error("Command not found.");

      return validateCommand(
        {
          name: command.name,
          command: command.command,
          workingDirectory: command.workingDirectory,
        },
        project.path,
      );
    }),
  );

  /** Validates unsaved form input so the dialog can warn before saving. */
  ipcMain.handle(
    "projects:validateCommand",
    handler("projects:validateCommand", (draft: unknown, projectPath: unknown) => {
      const input = requireObject(draft, "Command");
      return validateCommand(
        {
          name: typeof input.name === "string" ? input.name : "",
          command: typeof input.command === "string" ? input.command : "",
          workingDirectory:
            typeof input.workingDirectory === "string" ? input.workingDirectory : undefined,
        },
        typeof projectPath === "string" ? projectPath : undefined,
      );
    }),
  );

  ipcMain.handle(
    "projects:launch",
    handler("projects:launch", async (id: unknown, action: unknown, newWindow: unknown) => {
      const { project } = await launchProject(
        requireId(id, "Project id"),
        requireString(action, "Action"),
        optionalBoolean(newWindow, "New window flag"),
      );
      return withStatus(project);
    }),
  );
}
