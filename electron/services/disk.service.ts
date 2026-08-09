import { promises as fsp } from "fs";
import fs from "fs";
import path from "node:path";
import { getProjects } from "./project.service";
import { findNodeModules, measureDirectory } from "../utils/fsScan";
import type {
  DeleteModulesResult,
  DiskScanProgress,
  DiskScanResult,
  NodeModulesEntry,
} from "../../types/tools";

/** A project untouched for this long is offered up for reclaiming. */
const STALE_AFTER_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Scans every registered project for `node_modules` directories and measures
 * them. Reports progress per project so the UI can stay responsive.
 */
export async function scanNodeModules(
  onProgress?: (progress: DiskScanProgress) => void,
): Promise<DiskScanResult> {
  const projects = getProjects();
  const entries: NodeModulesEntry[] = [];
  const warnings: string[] = [];

  let scannedProjects = 0;
  let skippedProjects = 0;

  for (let i = 0; i < projects.length; i += 1) {
    const project = projects[i];

    onProgress?.({
      current: i + 1,
      total: projects.length,
      projectName: project.name,
      done: false,
    });

    if (!project.path || !fs.existsSync(project.path)) {
      skippedProjects += 1;
      continue;
    }

    let modulePaths: string[];
    try {
      modulePaths = await findNodeModules(project.path);
    } catch (e) {
      warnings.push(`Could not scan ${project.name}: ${(e as Error).message}`);
      skippedProjects += 1;
      continue;
    }

    scannedProjects += 1;

    for (const modulesPath of modulePaths) {
      const stats = await measureDirectory(modulesPath);

      const daysSinceOpened = project.lastOpenedAt
        ? Math.floor((Date.now() - project.lastOpenedAt) / DAY_MS)
        : null;

      // Stale means "nothing has touched this in a month" -- judged by the
      // launcher's own open history first, falling back to file mtimes for
      // projects that were added but never opened from here.
      const daysSinceModified = stats.lastModified
        ? Math.floor((Date.now() - stats.lastModified) / DAY_MS)
        : null;

      const isStale =
        daysSinceOpened === null
          ? (daysSinceModified ?? 0) >= STALE_AFTER_DAYS
          : daysSinceOpened >= STALE_AFTER_DAYS;

      const relative = path.relative(project.path, modulesPath);

      entries.push({
        projectId: project.id,
        projectName: project.name,
        projectPath: project.path,
        modulesPath,
        relativeLabel: relative || "node_modules",
        sizeBytes: stats.sizeBytes,
        fileCount: stats.fileCount,
        lastModified: stats.lastModified,
        lastOpenedAt: project.lastOpenedAt,
        daysSinceOpened,
        isStale,
      });
    }
  }

  onProgress?.({
    current: projects.length,
    total: projects.length,
    projectName: "",
    done: true,
  });

  entries.sort((a, b) => b.sizeBytes - a.sizeBytes);

  return {
    entries,
    totalBytes: entries.reduce((sum, e) => sum + e.sizeBytes, 0),
    staleBytes: entries.filter((e) => e.isStale).reduce((sum, e) => sum + e.sizeBytes, 0),
    scannedProjects,
    skippedProjects,
    warnings,
  };
}

/**
 * Deletes `node_modules` directories.
 *
 * This is the most destructive operation in the app, so every target must pass
 * all of these before it is touched:
 *
 *   1. the final path segment is literally `node_modules`
 *   2. it resolves inside the folder of a currently registered project
 *   3. it is not the project root itself
 *   4. it exists and is a real directory, not a symlink
 *
 * A path that fails any check is reported back rather than silently skipped.
 */
export async function deleteNodeModules(targets: string[]): Promise<DeleteModulesResult> {
  const projects = getProjects();
  const projectRoots = projects
    .filter((p) => p.path)
    .map((p) => path.resolve(p.path));

  const result: DeleteModulesResult = { deleted: [], failed: [], reclaimedBytes: 0 };

  for (const rawTarget of targets) {
    const target = path.resolve(rawTarget);

    const reject = (reason: string) => result.failed.push({ path: rawTarget, reason });

    if (path.basename(target) !== "node_modules") {
      reject("Not a node_modules directory.");
      continue;
    }

    const owningRoot = projectRoots.find(
      (root) => target.startsWith(root + path.sep) && target !== root,
    );
    if (!owningRoot) {
      reject("Not inside a registered project folder.");
      continue;
    }

    let stat;
    try {
      stat = await fsp.lstat(target);
    } catch {
      reject("Folder no longer exists.");
      continue;
    }

    if (stat.isSymbolicLink()) {
      reject("Refusing to follow a symlink.");
      continue;
    }
    if (!stat.isDirectory()) {
      reject("Not a directory.");
      continue;
    }

    // Measure before deleting so the reclaimed total is accurate.
    const { sizeBytes } = await measureDirectory(target);

    try {
      await fsp.rm(target, { recursive: true, force: true, maxRetries: 3, retryDelay: 200 });
      result.deleted.push(target);
      result.reclaimedBytes += sizeBytes;
    } catch (e) {
      const message = (e as NodeJS.ErrnoException).code === "EBUSY"
        ? "Files are in use. Close your editor or dev server and try again."
        : (e as Error).message;
      reject(message);
    }
  }

  return result;
}
