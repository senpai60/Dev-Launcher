import fs from "fs";
import { readSessions, writeSessions } from "../storage/session.storage";
import { readProjects } from "../storage/project.storage";
import { generateId } from "../utils/idGenerator";
import { resolveWorkingDirectory, validateCommand } from "../utils/commandSafety";
import {
  openInEditor,
  openInExplorer,
  openTerminal,
  runCommandInTerminal,
} from "../integrations/launcher";
import { EDITOR_BINARIES } from "../utils/platform";
import type {
  ProjectSession,
  ResumeProgress,
  ResumeResult,
  ResumeStepResult,
  SessionStep,
  SessionStepKind,
} from "../../types/session";
import type { Project } from "../../types/project";

/** Default pause between steps so a dev server has a moment to boot. */
const DEFAULT_DELAY_MS = 800;
const MAX_DELAY_MS = 60_000;
const MAX_STEPS = 30;

function emptySession(projectId: string): ProjectSession {
  return {
    projectId,
    steps: [],
    capturedAt: Date.now(),
    autoCapture: true,
  };
}

export function getSession(projectId: string): ProjectSession {
  return readSessions().find((s) => s.projectId === projectId) ?? emptySession(projectId);
}

export function getAllSessions(): ProjectSession[] {
  return readSessions();
}

function saveSession(session: ProjectSession): ProjectSession {
  const sessions = readSessions();
  const index = sessions.findIndex((s) => s.projectId === session.projectId);

  const normalized: ProjectSession = {
    ...session,
    steps: session.steps
      .slice(0, MAX_STEPS)
      .map((step, i) => ({ ...step, sortOrder: i })),
  };

  if (index === -1) sessions.push(normalized);
  else sessions[index] = normalized;

  writeSessions(sessions);
  return normalized;
}

/**
 * Folds a launcher action into the project's session.
 *
 * Called from the launch and run paths so the session builds itself from what
 * you actually did, rather than asking you to configure it up front.
 *
 * Steps are deduplicated by kind+target: opening VS Code three times still
 * yields one editor step, and it keeps its original position in the order.
 */
export function captureStep(
  projectId: string,
  kind: SessionStepKind,
  target: string,
  label: string,
): void {
  const session = getSession(projectId);
  if (!session.autoCapture) return;

  // An editor step is singular -- opening Cursor replaces VS Code rather than
  // adding a second editor to the routine.
  const existingIndex = session.steps.findIndex((step) =>
    kind === "editor" ? step.kind === "editor" : step.kind === kind && step.target === target,
  );

  if (existingIndex !== -1) {
    session.steps[existingIndex] = {
      ...session.steps[existingIndex],
      target,
      label,
    };
  } else {
    if (session.steps.length >= MAX_STEPS) return;
    session.steps.push({
      id: generateId("step"),
      kind,
      target,
      label,
      delayMs: DEFAULT_DELAY_MS,
      enabled: true,
      sortOrder: session.steps.length,
    });
  }

  session.capturedAt = Date.now();
  saveSession(session);
}

/** Replaces the whole step list, e.g. after a reorder or bulk edit. */
export function updateSession(
  projectId: string,
  updates: { steps?: SessionStep[]; autoCapture?: boolean },
): ProjectSession {
  const session = getSession(projectId);

  if (updates.autoCapture !== undefined) {
    session.autoCapture = updates.autoCapture;
  }

  if (updates.steps) {
    session.steps = updates.steps.map((step, i) => ({
      id: step.id || generateId("step"),
      kind: step.kind,
      target: String(step.target ?? ""),
      label: String(step.label ?? "").slice(0, 120),
      delayMs: Math.min(Math.max(Number(step.delayMs) || 0, 0), MAX_DELAY_MS),
      enabled: step.enabled !== false,
      sortOrder: i,
    }));
  }

  return saveSession(session);
}

export function clearSession(projectId: string): ProjectSession {
  const session = getSession(projectId);
  session.steps = [];
  session.capturedAt = Date.now();
  return saveSession(session);
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Replays a session.
 *
 * Steps run in order. A failing step is recorded and the run continues, so one
 * missing editor does not stop your database and backend from starting
 * (phases.md Phase 18's failure strategy, in its simplest form).
 */
export async function resumeSession(
  projectId: string,
  onProgress?: (progress: ResumeProgress) => void,
): Promise<ResumeResult> {
  const project = readProjects().find((p) => p.id === projectId);
  if (!project) throw new Error("Project not found.");

  if (!fs.existsSync(project.path)) {
    throw new Error(`The folder "${project.path}" no longer exists.`);
  }

  const session = getSession(projectId);
  const ordered = [...session.steps].sort((a, b) => a.sortOrder - b.sortOrder);

  if (ordered.length === 0) {
    throw new Error(
      "This project has no saved session yet. Open it and run a command, then try again.",
    );
  }

  const results: ResumeStepResult[] = [];

  for (let i = 0; i < ordered.length; i += 1) {
    const step = ordered[i];

    onProgress?.({
      projectId,
      current: i + 1,
      total: ordered.length,
      label: step.label,
      done: false,
    });

    if (!step.enabled) {
      results.push({ stepId: step.id, label: step.label, kind: step.kind, status: "skipped" });
      continue;
    }

    try {
      await runStep(project, step);
      results.push({ stepId: step.id, label: step.label, kind: step.kind, status: "ok" });
    } catch (e) {
      results.push({
        stepId: step.id,
        label: step.label,
        kind: step.kind,
        status: "failed",
        error: e instanceof Error ? e.message : String(e),
      });
    }

    if (step.delayMs > 0 && i < ordered.length - 1) {
      await delay(Math.min(step.delayMs, MAX_DELAY_MS));
    }
  }

  onProgress?.({
    projectId,
    current: ordered.length,
    total: ordered.length,
    label: "",
    done: true,
  });

  session.lastResumedAt = Date.now();
  saveSession(session);

  return {
    projectId,
    projectName: project.name,
    steps: results,
    succeeded: results.filter((r) => r.status === "ok").length,
    failed: results.filter((r) => r.status === "failed").length,
    skipped: results.filter((r) => r.status === "skipped").length,
  };
}

/**
 * Executes one step.
 *
 * Command steps resolve the command from the project's own record, exactly
 * like the normal run path -- a session cannot smuggle in arbitrary text.
 */
async function runStep(project: Project, step: SessionStep): Promise<void> {
  switch (step.kind) {
    case "editor": {
      const editorKey = EDITOR_BINARIES[step.target] ? step.target : "vscode";
      await openInEditor(editorKey, project.path, false);
      return;
    }

    case "terminal":
      await openTerminal(project.path);
      return;

    case "folder":
      await openInExplorer(project.path);
      return;

    case "command": {
      const command = (project.commands ?? []).find((c) => c.id === step.target);
      if (!command) {
        throw new Error("That command has been deleted.");
      }

      const check = validateCommand(
        {
          name: command.name,
          command: command.command,
          workingDirectory: command.workingDirectory,
        },
        project.path,
      );
      if (!check.valid) throw new Error(check.errors.join(" "));

      // Destructive commands never run unattended from a session replay.
      if (check.requiresConfirmation) {
        throw new Error(
          `Skipped because it ${check.destructiveReason}. Run it manually if you meant to.`,
        );
      }

      const cwd = resolveWorkingDirectory(project.path, command.workingDirectory);
      await runCommandInTerminal(command.command, cwd);
      return;
    }

    case "url":
      // URLs are opened by the caller through shell.openExternal, which
      // enforces the http(s) allowlist. Handled in the IPC layer.
      throw new Error("URL steps are not supported yet.");

    default:
      throw new Error(`Unknown step type "${step.kind}".`);
  }
}

/** Removes sessions whose project no longer exists. */
export function pruneSessions(): void {
  const projectIds = new Set(readProjects().map((p) => p.id));
  const sessions = readSessions();
  const kept = sessions.filter((s) => projectIds.has(s.projectId));

  if (kept.length !== sessions.length) writeSessions(kept);
}
