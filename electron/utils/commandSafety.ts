import fs from "fs";
import path from "node:path";

/**
 * Phase 5 command safety.
 *
 * Two jobs:
 *  1. Reject structurally invalid command configurations before they are saved.
 *  2. Flag commands that can destroy work so the UI can demand confirmation.
 *
 * This is not a sandbox. Commands are user-authored and run with the user's own
 * privileges by design -- the goal is to stop accidents, not a determined user.
 */

export type CommandValidationResult = {
  valid: boolean;
  errors: string[];
  /** Set when the command matched a destructive pattern. */
  requiresConfirmation: boolean;
  /** Human-readable reason shown in the confirmation dialog. */
  destructiveReason?: string;
};

export type ValidatableCommand = {
  name?: string;
  command?: string;
  workingDirectory?: string;
};

const MAX_NAME_LENGTH = 80;
const MAX_COMMAND_LENGTH = 2000;

/**
 * Patterns that delete, overwrite, or otherwise discard work.
 * Ordered most-specific first so the reported reason is the useful one.
 */
const DESTRUCTIVE_PATTERNS: Array<{ pattern: RegExp; reason: string }> = [
  { pattern: /\brm\s+(-[a-z]*[rf][a-z]*\s+)+/i, reason: "recursively deletes files (rm -rf)" },
  { pattern: /\brmdir\s+\/s\b/i, reason: "recursively deletes a directory (rmdir /s)" },
  { pattern: /\bdel\s+\/[qsf]/i, reason: "force-deletes files (del /f)" },
  { pattern: /\bRemove-Item\b[^|]*-Recurse/i, reason: "recursively deletes files (Remove-Item -Recurse)" },
  { pattern: /\bgit\s+reset\s+--hard\b/i, reason: "discards all uncommitted changes (git reset --hard)" },
  { pattern: /\bgit\s+clean\s+-[a-z]*[fd]/i, reason: "deletes untracked files (git clean -fd)" },
  { pattern: /\bgit\s+push\b[^|]*(--force|-f)\b/i, reason: "force-pushes and can overwrite remote history" },
  { pattern: /\bgit\s+branch\s+-D\b/i, reason: "force-deletes a branch" },
  { pattern: /\bdocker\s+system\s+prune\b/i, reason: "removes Docker images, containers and volumes" },
  { pattern: /\bdocker\s+volume\s+rm\b/i, reason: "deletes a Docker volume and its data" },
  { pattern: /\bDROP\s+(TABLE|DATABASE|SCHEMA)\b/i, reason: "drops a database object" },
  { pattern: /\bTRUNCATE\s+TABLE\b/i, reason: "empties a database table" },
  { pattern: /\b(mkfs|format)\s+/i, reason: "formats a filesystem" },
  { pattern: /\bdd\s+if=/i, reason: "writes raw disk data (dd)" },
  { pattern: /\bnpm\s+unpublish\b/i, reason: "removes a published package from the registry" },
  { pattern: /\b(shutdown|reboot)\b/i, reason: "shuts down or restarts the machine" },
  { pattern: />\s*\/dev\/sd[a-z]/i, reason: "writes directly to a block device" },
];

/**
 * Checks a command string against the destructive pattern list.
 * Safe to call on unsaved input -- it never touches the filesystem.
 */
export function checkDestructive(command: string): { destructive: boolean; reason?: string } {
  for (const { pattern, reason } of DESTRUCTIVE_PATTERNS) {
    if (pattern.test(command)) {
      return { destructive: true, reason };
    }
  }
  return { destructive: false };
}

/**
 * Validates a command configuration.
 *
 * `projectPath` is required to resolve a relative `workingDirectory`; pass it
 * whenever the project is known so we can verify the directory exists.
 */
export function validateCommand(
  input: ValidatableCommand,
  projectPath?: string,
): CommandValidationResult {
  const errors: string[] = [];

  const name = (input.name ?? "").trim();
  const command = (input.command ?? "").trim();
  const workingDirectory = (input.workingDirectory ?? "").trim();

  if (!name) {
    errors.push("Command name is required.");
  } else if (name.length > MAX_NAME_LENGTH) {
    errors.push(`Command name must be ${MAX_NAME_LENGTH} characters or fewer.`);
  }

  if (!command) {
    errors.push("Command string is required.");
  } else if (command.length > MAX_COMMAND_LENGTH) {
    errors.push(`Command string must be ${MAX_COMMAND_LENGTH} characters or fewer.`);
  }

  // A newline would let a single field smuggle in extra commands, and no
  // legitimate single-line command needs one.
  if (/[\r\n]/.test(command)) {
    errors.push("Command string cannot span multiple lines.");
  }

  if (/\0/.test(command) || /\0/.test(name)) {
    errors.push("Command contains invalid characters.");
  }

  if (workingDirectory) {
    if (path.isAbsolute(workingDirectory)) {
      errors.push("Working directory must be relative to the project folder.");
    } else if (workingDirectory.split(/[/\\]/).includes("..")) {
      errors.push("Working directory cannot escape the project folder.");
    } else if (projectPath) {
      const resolved = path.resolve(projectPath, workingDirectory);
      if (!resolved.startsWith(path.resolve(projectPath))) {
        errors.push("Working directory cannot escape the project folder.");
      } else if (!fs.existsSync(resolved)) {
        errors.push(`Working directory "${workingDirectory}" does not exist.`);
      }
    }
  }

  const { destructive, reason } = checkDestructive(command);

  return {
    valid: errors.length === 0,
    errors,
    requiresConfirmation: destructive,
    destructiveReason: reason,
  };
}

/**
 * Resolves the directory a command should run in, defaulting to the project
 * root. Throws if the result would fall outside the project.
 */
export function resolveWorkingDirectory(projectPath: string, workingDirectory?: string): string {
  const root = path.resolve(projectPath);
  if (!workingDirectory || !workingDirectory.trim()) return root;

  const resolved = path.resolve(root, workingDirectory.trim());
  if (!resolved.startsWith(root)) {
    throw new Error("Working directory escapes the project folder.");
  }
  if (!fs.existsSync(resolved)) {
    throw new Error(`Working directory "${workingDirectory}" does not exist.`);
  }
  return resolved;
}
