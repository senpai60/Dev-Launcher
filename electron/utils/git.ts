import fs from "fs";
import path from "node:path";
import { capture } from "./capture";

/**
 * Read-only git helpers.
 *
 * Every call goes through `execFile` with a fixed argv and `-C <path>`, so no
 * repository path is ever concatenated into a shell string. Nothing here
 * mutates a repository -- the radar only reports.
 */

export type GitSnapshot = {
  isRepository: boolean;
  branch?: string;
  modifiedFiles: number;
  untrackedFiles: number;
  ahead: number;
  behind: number;
  lastCommitAt?: number;
  lastCommitMessage?: string;
};

const EMPTY: GitSnapshot = {
  isRepository: false,
  modifiedFiles: 0,
  untrackedFiles: 0,
  ahead: 0,
  behind: 0,
};

/** True when the folder contains a `.git` entry (directory or worktree file). */
export function looksLikeRepository(projectPath: string): boolean {
  return fs.existsSync(path.join(projectPath, ".git"));
}

async function git(projectPath: string, args: string[], timeoutMs = 8000) {
  return capture("git", ["-C", projectPath, ...args], timeoutMs);
}

/**
 * Collects branch, working-tree state, upstream divergence, and last commit
 * in one pass. Any individual failure degrades to a default rather than
 * failing the whole snapshot -- a repo with no commits or no upstream is
 * normal, not an error.
 */
export async function readGitSnapshot(projectPath: string): Promise<GitSnapshot> {
  if (!looksLikeRepository(projectPath)) return { ...EMPTY };

  const snapshot: GitSnapshot = { ...EMPTY, isRepository: true };

  // Branch. Detached HEAD reports "HEAD", which we surface as-is.
  try {
    const { stdout, code } = await git(projectPath, ["rev-parse", "--abbrev-ref", "HEAD"]);
    if (code === 0) {
      const branch = stdout.trim();
      if (branch) snapshot.branch = branch;
    }
  } catch {
    // git unavailable; the caller reports it once rather than per-project.
    return { ...EMPTY, isRepository: true };
  }

  // Working tree. Porcelain v1 is stable and easy to count.
  try {
    const { stdout, code } = await git(projectPath, ["status", "--porcelain"]);
    if (code === 0) {
      for (const line of stdout.split(/\r?\n/)) {
        if (!line.trim()) continue;
        if (line.startsWith("??")) snapshot.untrackedFiles += 1;
        else snapshot.modifiedFiles += 1;
      }
    }
  } catch {
    // Leave counts at zero.
  }

  // Ahead/behind. Fails when there is no upstream, which is common.
  try {
    const { stdout, code } = await git(projectPath, [
      "rev-list",
      "--count",
      "--left-right",
      "@{upstream}...HEAD",
    ]);
    if (code === 0) {
      const [behind, ahead] = stdout.trim().split(/\s+/).map(Number);
      if (Number.isFinite(behind)) snapshot.behind = behind;
      if (Number.isFinite(ahead)) snapshot.ahead = ahead;
    }
  } catch {
    // No upstream configured.
  }

  // Last commit. Fails on a repo with no commits yet.
  try {
    const { stdout, code } = await git(projectPath, [
      "log",
      "-1",
      "--format=%ct%x00%s",
    ]);
    if (code === 0 && stdout.trim()) {
      const [seconds, message] = stdout.trim().split("\0");
      const timestamp = Number(seconds);
      if (Number.isFinite(timestamp)) snapshot.lastCommitAt = timestamp * 1000;
      if (message) snapshot.lastCommitMessage = message.trim();
    }
  } catch {
    // No commits.
  }

  return snapshot;
}

/** True when the `git` binary is callable. Checked once per scan. */
export async function isGitAvailable(): Promise<boolean> {
  try {
    const { code } = await capture("git", ["--version"], 5000);
    return code === 0;
  } catch {
    return false;
  }
}

/**
 * Parses a git remote into a safe repository name.
 * Returns null when the URL is not one we are willing to clone.
 */
export function parseRepositoryName(url: string): string | null {
  const trimmed = url.trim();

  // scp-style shorthand: git@host:owner/repo.git
  const scpMatch = /^[A-Za-z0-9_.-]+@[A-Za-z0-9_.-]+:(.+)$/.exec(trimmed);
  const pathPart = scpMatch ? scpMatch[1] : null;

  let candidate: string | null = pathPart;

  if (!candidate) {
    try {
      const parsed = new URL(trimmed);
      if (!["https:", "http:", "ssh:", "git:"].includes(parsed.protocol)) return null;
      candidate = parsed.pathname;
    } catch {
      return null;
    }
  }

  const last = candidate.split("/").filter(Boolean).pop();
  if (!last) return null;

  const name = last.replace(/\.git$/i, "");

  // Reject anything that could escape a directory or is not a plain name.
  if (!/^[A-Za-z0-9._-]+$/.test(name) || name === "." || name === "..") return null;

  return name;
}

/**
 * Validates a clone URL.
 *
 * Only http(s), ssh, and scp-style git remotes are accepted. `file://` and
 * `ext::` style remotes are rejected because git can be made to execute
 * commands through some transports.
 */
export function validateCloneUrl(url: string): { valid: boolean; reason?: string } {
  const trimmed = url.trim();

  if (!trimmed) return { valid: false, reason: "Enter a repository URL." };
  if (/[\r\n\0]/.test(trimmed)) {
    return { valid: false, reason: "That URL contains invalid characters." };
  }
  if (trimmed.startsWith("-")) {
    return { valid: false, reason: "That URL is not valid." };
  }
  if (/^(ext|file|fd)::/i.test(trimmed) || trimmed.startsWith("file://")) {
    return { valid: false, reason: "Only http(s) and ssh remotes can be cloned." };
  }

  const isScp = /^[A-Za-z0-9_.-]+@[A-Za-z0-9_.-]+:.+$/.test(trimmed);
  if (!isScp) {
    let parsed: URL;
    try {
      parsed = new URL(trimmed);
    } catch {
      return { valid: false, reason: "That is not a valid repository URL." };
    }
    if (!["https:", "http:", "ssh:", "git:"].includes(parsed.protocol)) {
      return { valid: false, reason: "Only http(s) and ssh remotes can be cloned." };
    }
  }

  if (!parseRepositoryName(trimmed)) {
    return { valid: false, reason: "Could not work out a folder name from that URL." };
  }

  return { valid: true };
}
