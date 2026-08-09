/**
 * Resume Session.
 *
 * A session is the ordered set of things you did to get a project running:
 * which editor you opened, which commands you started, which URLs you opened.
 * Replaying it reproduces your startup routine in one click.
 */

export type SessionStepKind = "editor" | "command" | "terminal" | "folder" | "url";

export type SessionStep = {
  id: string;
  kind: SessionStepKind;
  /**
   * What to act on:
   *  - `editor`  -> an editor key such as "vscode"
   *  - `command` -> a ProjectCommand id
   *  - `url`     -> an absolute http(s) URL
   *  - `terminal` / `folder` -> unused
   */
  target: string;
  /** Human-readable label shown in the UI. */
  label: string;
  /** Milliseconds to wait after this step before starting the next one. */
  delayMs: number;
  /** Disabled steps are kept but skipped on resume. */
  enabled: boolean;
  sortOrder: number;
};

export type ProjectSession = {
  projectId: string;
  steps: SessionStep[];
  /** When the launcher last observed activity for this project. */
  capturedAt: number;
  lastResumedAt?: number;
  /** When true, launcher actions are folded into the session automatically. */
  autoCapture: boolean;
};

export type ResumeStepResult = {
  stepId: string;
  label: string;
  kind: SessionStepKind;
  status: "ok" | "failed" | "skipped";
  error?: string;
};

export type ResumeResult = {
  projectId: string;
  projectName: string;
  steps: ResumeStepResult[];
  succeeded: number;
  failed: number;
  skipped: number;
};

export type ResumeProgress = {
  projectId: string;
  current: number;
  total: number;
  label: string;
  done: boolean;
};
