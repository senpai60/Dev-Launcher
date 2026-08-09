import { promises as fsp } from "fs";
import path from "node:path";

export type DirStats = {
  sizeBytes: number;
  fileCount: number;
  /** Newest mtime seen anywhere in the tree. */
  lastModified: number;
};

/**
 * Recursively measures a directory.
 *
 * Uses async fs throughout so a 50k-file `node_modules` never blocks the main
 * process (featured.md section 53). Symlinks are counted but not followed, so
 * pnpm's linked store cannot send us in a loop or double-count shared packages.
 */
export async function measureDirectory(target: string): Promise<DirStats> {
  const stats: DirStats = { sizeBytes: 0, fileCount: 0, lastModified: 0 };

  // Explicit stack instead of recursion: node_modules trees get deep enough
  // that recursion risks a stack overflow on pathological layouts.
  const stack: string[] = [target];

  while (stack.length > 0) {
    const current = stack.pop() as string;

    let entries;
    try {
      entries = await fsp.readdir(current, { withFileTypes: true });
    } catch {
      // Permission denied or the folder vanished mid-scan; skip it.
      continue;
    }

    for (const entry of entries) {
      const full = path.join(current, entry.name);

      if (entry.isSymbolicLink()) {
        stats.fileCount += 1;
        continue;
      }

      if (entry.isDirectory()) {
        stack.push(full);
        continue;
      }

      try {
        const info = await fsp.stat(full);
        stats.sizeBytes += info.size;
        stats.fileCount += 1;
        if (info.mtimeMs > stats.lastModified) stats.lastModified = info.mtimeMs;
      } catch {
        // File disappeared between readdir and stat.
      }
    }
  }

  return stats;
}

/**
 * Finds `node_modules` directories under a project root.
 *
 * Descends a bounded number of levels so monorepo workspaces such as
 * `packages/<name>/node_modules` are found without walking the entire tree.
 * Never descends *into* a `node_modules` it has already found.
 */
export async function findNodeModules(root: string, maxDepth = 3): Promise<string[]> {
  const found: string[] = [];
  const queue: Array<{ dir: string; depth: number }> = [{ dir: root, depth: 0 }];

  const IGNORED = new Set([".git", ".next", "dist", "build", "out", ".cache", ".turbo"]);

  while (queue.length > 0) {
    const { dir, depth } = queue.shift() as { dir: string; depth: number };

    let entries;
    try {
      entries = await fsp.readdir(dir, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const entry of entries) {
      if (!entry.isDirectory() || entry.isSymbolicLink()) continue;

      if (entry.name === "node_modules") {
        found.push(path.join(dir, entry.name));
        // Do not queue it -- nested node_modules are part of this one's size.
        continue;
      }

      if (depth < maxDepth && !IGNORED.has(entry.name) && !entry.name.startsWith(".")) {
        queue.push({ dir: path.join(dir, entry.name), depth: depth + 1 });
      }
    }
  }

  return found;
}

/** Formats a byte count for log messages. UI formatting lives in the renderer. */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[unit]}`;
}
