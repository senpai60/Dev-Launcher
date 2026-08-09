import { promises as fsp } from "fs";
import fs from "fs";
import path from "node:path";
import { getProjects } from "./project.service";
import { isGitAvailable, readGitSnapshot } from "../utils/git";
import type {
  RadarEntry,
  RadarIssue,
  RadarProgress,
  RadarResult,
} from "../../types/tools";

const DAY_MS = 24 * 60 * 60 * 1000;

/** A repo with no commits in this long is worth a look. */
const STALE_COMMIT_DAYS = 90;
/** Not opened from the launcher in this long. */
const NEVER_OPENED_DAYS = 60;

const LOCKFILES = [
  "pnpm-lock.yaml",
  "yarn.lock",
  "bun.lockb",
  "bun.lock",
  "package-lock.json",
];

function daysBetween(from: number | undefined, to: number): number | null {
  if (!from) return null;
  return Math.floor((to - from) / DAY_MS);
}

/**
 * Inspects the filesystem side of a project: dependencies installed, and
 * whether the lockfile has fallen behind package.json.
 */
async function readPackageState(projectPath: string) {
  const packageJsonPath = path.join(projectPath, "package.json");
  const hasPackageJson = fs.existsSync(packageJsonPath);

  if (!hasPackageJson) {
    return { hasPackageJson, hasNodeModules: false, lockfileName: undefined, lockfileDrift: false };
  }

  const hasNodeModules = fs.existsSync(path.join(projectPath, "node_modules"));
  const lockfileName = LOCKFILES.find((name) => fs.existsSync(path.join(projectPath, name)));

  let lockfileDrift = false;
  if (lockfileName) {
    try {
      const [pkgStat, lockStat] = await Promise.all([
        fsp.stat(packageJsonPath),
        fsp.stat(path.join(projectPath, lockfileName)),
      ]);
      // A package.json edited well after the lockfile usually means a
      // dependency was added without installing. One minute of slack avoids
      // false positives from a single checkout writing both files.
      lockfileDrift = pkgStat.mtimeMs - lockStat.mtimeMs > 60_000;
    } catch {
      lockfileDrift = false;
    }
  }

  return { hasPackageJson, hasNodeModules, lockfileName, lockfileDrift };
}

/** Builds the issue list and a score used for sorting. */
function evaluate(entry: Omit<RadarEntry, "issues" | "score">): {
  issues: RadarIssue[];
  score: number;
} {
  const issues: RadarIssue[] = [];
  let score = 0;

  const add = (issue: RadarIssue, weight: number) => {
    issues.push(issue);
    score += weight;
  };

  if (!entry.pathExists) {
    add(
      {
        kind: "path-missing",
        severity: "high",
        label: "Folder missing",
        detail: "The project folder no longer exists on disk.",
      },
      100,
    );
    // Nothing else can be checked.
    return { issues, score };
  }

  if (entry.isRepository) {
    const dirty = entry.modifiedFiles + entry.untrackedFiles;
    if (dirty > 0) {
      add(
        {
          kind: "uncommitted-changes",
          severity: dirty > 20 ? "high" : "medium",
          label: `${dirty} uncommitted`,
          detail: `${entry.modifiedFiles} modified, ${entry.untrackedFiles} untracked. This work only exists on this machine.`,
        },
        Math.min(dirty, 30) + 10,
      );
    }

    if (entry.ahead > 0) {
      add(
        {
          kind: "unpushed-commits",
          severity: entry.ahead > 5 ? "high" : "medium",
          label: `${entry.ahead} unpushed`,
          detail: `${entry.ahead} commit${entry.ahead === 1 ? "" : "s"} on ${entry.branch ?? "this branch"} have not been pushed.`,
        },
        entry.ahead * 3 + 10,
      );
    }

    if (entry.daysSinceCommit !== null && entry.daysSinceCommit >= STALE_COMMIT_DAYS) {
      add(
        {
          kind: "stale-commits",
          severity: "low",
          label: `${entry.daysSinceCommit}d since commit`,
          detail: `Last commit was ${entry.daysSinceCommit} days ago.`,
        },
        5,
      );
    }
  } else {
    add(
      {
        kind: "no-git",
        severity: "low",
        label: "Not a repo",
        detail: "This folder is not under version control.",
      },
      4,
    );
  }

  if (entry.hasPackageJson && !entry.hasNodeModules) {
    add(
      {
        kind: "deps-not-installed",
        severity: "medium",
        label: "Deps not installed",
        detail: "package.json exists but node_modules is missing. Install before running.",
      },
      15,
    );
  }

  if (entry.lockfileDrift) {
    add(
      {
        kind: "lockfile-drift",
        severity: "medium",
        label: "Lockfile behind",
        detail: `package.json is newer than ${entry.lockfileName}. Dependencies may be out of sync.`,
      },
      12,
    );
  }

  if (entry.daysSinceOpened === null) {
    add(
      {
        kind: "never-opened",
        severity: "low",
        label: "Never opened",
        detail: "This project has never been opened from Dev Launcher.",
      },
      2,
    );
  } else if (entry.daysSinceOpened >= NEVER_OPENED_DAYS) {
    add(
      {
        kind: "never-opened",
        severity: "low",
        label: `${entry.daysSinceOpened}d untouched`,
        detail: `Not opened from Dev Launcher in ${entry.daysSinceOpened} days.`,
      },
      3,
    );
  }

  return { issues, score };
}

/**
 * Stale project radar.
 *
 * Answers "which of my projects have work I'm about to lose?" -- uncommitted
 * changes, unpushed commits, uninstalled dependencies, missing folders.
 * Read-only: nothing here mutates a repository.
 */
export async function scanRadar(
  onProgress?: (progress: RadarProgress) => void,
): Promise<RadarResult> {
  const projects = getProjects();
  const warnings: string[] = [];
  const entries: RadarEntry[] = [];

  const gitAvailable = await isGitAvailable();
  if (!gitAvailable) {
    warnings.push("git was not found on your PATH, so repository checks were skipped.");
  }

  const now = Date.now();

  for (let i = 0; i < projects.length; i += 1) {
    const project = projects[i];

    onProgress?.({
      current: i + 1,
      total: projects.length,
      projectName: project.name,
      done: false,
    });

    const pathExists = Boolean(project.path) && fs.existsSync(project.path);

    const git =
      pathExists && gitAvailable
        ? await readGitSnapshot(project.path)
        : {
            isRepository: pathExists ? fs.existsSync(path.join(project.path, ".git")) : false,
            modifiedFiles: 0,
            untrackedFiles: 0,
            ahead: 0,
            behind: 0,
            branch: undefined,
            lastCommitAt: undefined,
            lastCommitMessage: undefined,
          };

    const pkg = pathExists
      ? await readPackageState(project.path)
      : { hasPackageJson: false, hasNodeModules: false, lockfileName: undefined, lockfileDrift: false };

    const base: Omit<RadarEntry, "issues" | "score"> = {
      projectId: project.id,
      projectName: project.name,
      projectPath: project.path,
      pathExists,

      isRepository: git.isRepository,
      branch: git.branch,
      modifiedFiles: git.modifiedFiles,
      untrackedFiles: git.untrackedFiles,
      ahead: git.ahead,
      behind: git.behind,
      lastCommitAt: git.lastCommitAt,
      lastCommitMessage: git.lastCommitMessage,
      daysSinceCommit: daysBetween(git.lastCommitAt, now),

      hasPackageJson: pkg.hasPackageJson,
      hasNodeModules: pkg.hasNodeModules,
      lockfileName: pkg.lockfileName,
      lockfileDrift: pkg.lockfileDrift,

      lastOpenedAt: project.lastOpenedAt,
      daysSinceOpened: daysBetween(project.lastOpenedAt, now),
    };

    const { issues, score } = evaluate(base);
    entries.push({ ...base, issues, score });
  }

  onProgress?.({ current: projects.length, total: projects.length, projectName: "", done: true });

  // Worst first.
  entries.sort((a, b) => b.score - a.score || a.projectName.localeCompare(b.projectName));

  return {
    entries,
    scannedAt: now,
    healthyCount: entries.filter((e) => e.issues.length === 0).length,
    needsAttentionCount: entries.filter((e) =>
      e.issues.some((i) => i.severity === "high" || i.severity === "medium"),
    ).length,
    warnings,
  };
}
