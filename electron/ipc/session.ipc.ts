import { BrowserWindow, ipcMain } from "electron";
import {
  clearSession,
  getAllSessions,
  getSession,
  pruneSessions,
  resumeSession,
  updateSession,
} from "../services/session.service";
import { handler, optionalBoolean, requireId, requireObject } from "./validate";
import type { SessionStep, SessionStepKind } from "../../types/session";

const VALID_KINDS: SessionStepKind[] = ["editor", "command", "terminal", "folder", "url"];
const MAX_STEPS = 30;

/** Coerces renderer-supplied step objects into trusted shapes. */
function sanitizeSteps(raw: unknown): SessionStep[] {
  if (!Array.isArray(raw)) throw new Error("Steps must be an array.");
  if (raw.length > MAX_STEPS) throw new Error(`A session can hold at most ${MAX_STEPS} steps.`);

  return raw.map((entry, index) => {
    const step = requireObject(entry, `Step ${index + 1}`);
    const kind = String(step.kind ?? "");

    if (!VALID_KINDS.includes(kind as SessionStepKind)) {
      throw new Error(`Step ${index + 1} has an unknown type.`);
    }

    return {
      id: typeof step.id === "string" ? step.id : "",
      kind: kind as SessionStepKind,
      target: typeof step.target === "string" ? step.target : "",
      label: typeof step.label === "string" ? step.label : kind,
      delayMs: Number(step.delayMs) || 0,
      enabled: step.enabled !== false,
      sortOrder: index,
    };
  });
}

export function registerSessionIPC() {
  ipcMain.handle(
    "sessions:get",
    handler("sessions:get", (projectId: unknown) =>
      getSession(requireId(projectId, "Project id")),
    ),
  );

  ipcMain.handle(
    "sessions:getAll",
    handler("sessions:getAll", () => {
      pruneSessions();
      return getAllSessions();
    }),
  );

  ipcMain.handle(
    "sessions:update",
    handler("sessions:update", (projectId: unknown, updates: unknown) => {
      const patch = requireObject(updates, "Updates");

      return updateSession(requireId(projectId, "Project id"), {
        steps: patch.steps === undefined ? undefined : sanitizeSteps(patch.steps),
        autoCapture:
          patch.autoCapture === undefined
            ? undefined
            : optionalBoolean(patch.autoCapture, "Auto capture"),
      });
    }),
  );

  ipcMain.handle(
    "sessions:clear",
    handler("sessions:clear", (projectId: unknown) =>
      clearSession(requireId(projectId, "Project id")),
    ),
  );

  /**
   * Replays a session. Progress is pushed so the UI can show which step is
   * running during a multi-second startup routine.
   */
  ipcMain.handle(
    "sessions:resume",
    handler("sessions:resume", async (projectId: unknown) => {
      const windows = BrowserWindow.getAllWindows();

      return resumeSession(requireId(projectId, "Project id"), (progress) => {
        for (const win of windows) {
          if (!win.isDestroyed()) win.webContents.send("sessions:resumeProgress", progress);
        }
      });
    }),
  );
}
