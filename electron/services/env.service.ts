import { promises as fsp } from "fs";
import fs from "fs";
import path from "node:path";
import { getProjects } from "./project.service";
import type {
  EnvAuditResult,
  EnvFileSummary,
  EnvKeyRow,
  EnvLocation,
  EnvReport,
} from "../../types/tools";

/**
 * Environment doctor.
 *
 * SECURITY: this module reads `.env` files but never returns a value to the
 * renderer, never logs one, and never writes one anywhere. Only key names and
 * a boolean "is it blank" ever cross the IPC boundary (featured.md section 19).
 */

/** Files treated as the documented template, in priority order. */
const EXAMPLE_NAMES = [".env.example", ".env.sample", ".env.template", ".env.dist"];

/** Files treated as the real, active configuration, in priority order. */
const ACTIVE_NAMES = [".env", ".env.local", ".env.development", ".env.development.local"];

/** Anything matching this is an env file worth summarising. */
const ENV_FILE_PATTERN = /^\.env(\..+)?$/;

/**
 * How deep to look for env files.
 *
 * Depth 3 covers the layouts that actually occur: `server/.env`,
 * `apps/web/.env`, `packages/api/.env`.
 */
const MAX_ENV_DEPTH = 3;

/** Directories that never contain a project's own env files. */
const SKIP_DIRS = new Set([
  "node_modules",
  ".git",
  "dist",
  "build",
  "out",
  ".next",
  ".nuxt",
  ".output",
  "coverage",
  ".cache",
  ".turbo",
  ".vercel",
  "vendor",
  "target",
  "__pycache__",
  ".venv",
  "venv",
  ".idea",
  ".vscode",
]);

/** A single env file reduced to key names plus which ones are blank. */
type ParsedEnv = {
  keys: string[];
  emptyKeys: Set<string>;
};

/**
 * Extracts key names from env-file text.
 * The value side is inspected only to decide whether it is blank, then dropped.
 */
function parseEnvKeys(contents: string): ParsedEnv {
  const keys: string[] = [];
  const emptyKeys = new Set<string>();
  const seen = new Set<string>();

  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const withoutExport = line.startsWith("export ") ? line.slice(7).trim() : line;

    const separator = withoutExport.indexOf("=");
    if (separator <= 0) continue;

    const key = withoutExport.slice(0, separator).trim();
    if (!key || !/^[A-Za-z_][A-Za-z0-9_.]*$/.test(key)) continue;

    // Read just enough of the value to know if it is empty, then discard it.
    const rawValue = withoutExport.slice(separator + 1).trim();
    const unquoted = rawValue.replace(/^(['"])(.*)\1$/s, "$2").trim();
    const isEmpty = unquoted.length === 0;

    if (!seen.has(key)) {
      seen.add(key);
      keys.push(key);
    }
    if (isEmpty) emptyKeys.add(key);
    else emptyKeys.delete(key);
  }

  return { keys, emptyKeys };
}

async function readEnvFile(filePath: string): Promise<ParsedEnv | null> {
  try {
    const contents = await fsp.readFile(filePath, "utf8");
    return parseEnvKeys(contents);
  } catch {
    return null;
  }
}

/**
 * Finds every directory under `root` that contains at least one env file.
 * Returns paths relative to the root, with "" representing the root itself.
 */
async function findEnvDirectories(root: string): Promise<Map<string, string[]>> {
  const found = new Map<string, string[]>();
  const queue: Array<{ dir: string; depth: number }> = [{ dir: root, depth: 0 }];

  while (queue.length > 0) {
    const { dir, depth } = queue.shift() as { dir: string; depth: number };

    let entries;
    try {
      entries = await fsp.readdir(dir, { withFileTypes: true });
    } catch {
      continue;
    }

    const envFiles: string[] = [];

    for (const entry of entries) {
      if (entry.isFile() && ENV_FILE_PATTERN.test(entry.name)) {
        envFiles.push(entry.name);
        continue;
      }

      if (
        entry.isDirectory() &&
        !entry.isSymbolicLink() &&
        depth < MAX_ENV_DEPTH &&
        !SKIP_DIRS.has(entry.name)
      ) {
        queue.push({ dir: path.join(dir, entry.name), depth: depth + 1 });
      }
    }

    if (envFiles.length > 0) {
      found.set(path.relative(root, dir), envFiles.sort());
    }
  }

  return found;
}

/**
 * Best-effort check that `.env` is ignored by git.
 *
 * Git patterns without a slash match at any depth, so a root `.gitignore`
 * containing `.env` covers `server/.env` too. We check the root and the
 * location's own directory.
 */
async function isEnvGitIgnored(projectRoot: string, relativeDir: string): Promise<boolean> {
  const candidates = [path.join(projectRoot, ".gitignore")];
  if (relativeDir) {
    candidates.push(path.join(projectRoot, relativeDir, ".gitignore"));
  }

  for (const gitignorePath of candidates) {
    try {
      const contents = await fsp.readFile(gitignorePath, "utf8");
      const covered = contents
        .split(/\r?\n/)
        .map((l) => l.trim())
        .some(
          (l) =>
            l === ".env" ||
            l === ".env*" ||
            l === "*.env" ||
            l === ".env.*" ||
            l === "**/.env" ||
            l.endsWith("/.env"),
        );
      if (covered) return true;
    } catch {
      // No .gitignore at this level; try the next candidate.
    }
  }

  return false;
}

/** Audits one directory's env files. */
async function auditLocation(
  projectRoot: string,
  relativeDir: string,
  envFiles: string[],
): Promise<EnvLocation> {
  const warnings: string[] = [];
  const absoluteDir = path.join(projectRoot, relativeDir);

  const parsedByName = new Map<string, ParsedEnv>();
  const files: EnvFileSummary[] = [];

  for (const fileName of envFiles) {
    const parsed = await readEnvFile(path.join(absoluteDir, fileName));
    if (!parsed) {
      warnings.push(`Could not read ${fileName}.`);
      continue;
    }
    parsedByName.set(fileName, parsed);
    files.push({
      fileName,
      keyCount: parsed.keys.length,
      emptyKeys: parsed.emptyKeys.size,
    });
  }

  const exampleFile = EXAMPLE_NAMES.find((name) => parsedByName.has(name));
  const activeFile = ACTIVE_NAMES.find((name) => parsedByName.has(name));

  const example = exampleFile ? parsedByName.get(exampleFile) : undefined;
  const active = activeFile ? parsedByName.get(activeFile) : undefined;

  const keys: EnvKeyRow[] = [];
  let missingCount = 0;
  let emptyCount = 0;
  let extraCount = 0;

  if (example && active) {
    const activeKeys = new Set(active.keys);

    for (const key of example.keys) {
      if (!activeKeys.has(key)) {
        keys.push({ key, status: "missing" });
        missingCount += 1;
      } else if (active.emptyKeys.has(key)) {
        keys.push({ key, status: "empty" });
        emptyCount += 1;
      } else {
        keys.push({ key, status: "ok" });
      }
    }

    const exampleKeys = new Set(example.keys);
    for (const key of active.keys) {
      if (!exampleKeys.has(key)) {
        keys.push({ key, status: "extra" });
        extraCount += 1;
      }
    }
  } else if (active) {
    // No template to compare against; still flag blank values.
    for (const key of active.keys) {
      const isEmpty = active.emptyKeys.has(key);
      keys.push({ key, status: isEmpty ? "empty" : "ok" });
      if (isEmpty) emptyCount += 1;
    }
    warnings.push("No .env.example here, so missing keys cannot be detected.");
  } else if (example) {
    // Template exists but no real env file: every key is missing.
    for (const key of example.keys) {
      keys.push({ key, status: "missing" });
      missingCount += 1;
    }
    warnings.push(`${exampleFile} exists but there is no .env file.`);
  }

  const hasRealEnv = ACTIVE_NAMES.some((name) => parsedByName.has(name));
  const envNotIgnored = hasRealEnv && !(await isEnvGitIgnored(projectRoot, relativeDir));

  return {
    relativeDir,
    label: relativeDir ? relativeDir.replace(/\\/g, "/") : "project root",
    exampleFile,
    activeFile,
    files,
    keys,
    missingCount,
    emptyCount,
    extraCount,
    envNotIgnored,
    warnings,
  };
}

async function auditProject(project: {
  id: string;
  name: string;
  path: string;
}): Promise<EnvReport> {
  const warnings: string[] = [];
  const base: EnvReport = {
    projectId: project.id,
    projectName: project.name,
    projectPath: project.path,
    pathExists: true,
    locations: [],
    missingCount: 0,
    emptyCount: 0,
    extraCount: 0,
    hasEnvFiles: false,
    envNotIgnored: false,
    warnings,
  };

  if (!project.path || !fs.existsSync(project.path)) {
    return { ...base, pathExists: false };
  }

  let envDirs: Map<string, string[]>;
  try {
    envDirs = await findEnvDirectories(project.path);
  } catch (e) {
    warnings.push(`Could not scan the project folder: ${(e as Error).message}`);
    return base;
  }

  if (envDirs.size === 0) return base;

  const locations: EnvLocation[] = [];
  for (const [relativeDir, envFiles] of envDirs) {
    locations.push(await auditLocation(project.path, relativeDir, envFiles));
  }

  // Root first, then problem locations, then the rest alphabetically.
  locations.sort((a, b) => {
    if (!a.relativeDir !== !b.relativeDir) return a.relativeDir ? 1 : -1;
    const aScore = a.missingCount * 10 + a.emptyCount;
    const bScore = b.missingCount * 10 + b.emptyCount;
    if (aScore !== bScore) return bScore - aScore;
    return a.label.localeCompare(b.label);
  });

  const sum = (pick: (l: EnvLocation) => number) =>
    locations.reduce((total, location) => total + pick(location), 0);

  return {
    ...base,
    locations,
    missingCount: sum((l) => l.missingCount),
    emptyCount: sum((l) => l.emptyCount),
    extraCount: sum((l) => l.extraCount),
    hasEnvFiles: locations.some((l) => l.files.length > 0),
    envNotIgnored: locations.some((l) => l.envNotIgnored),
    warnings,
  };
}

/** Audits one project, or all of them when `projectId` is omitted. */
export async function auditEnvironments(projectId?: string): Promise<EnvAuditResult> {
  const projects = getProjects().filter((p) => !projectId || p.id === projectId);

  const reports: EnvReport[] = [];
  for (const project of projects) {
    reports.push(await auditProject(project));
  }

  // Projects with problems float to the top.
  reports.sort((a, b) => {
    const aScore = a.missingCount * 10 + a.emptyCount;
    const bScore = b.missingCount * 10 + b.emptyCount;
    if (aScore !== bScore) return bScore - aScore;
    return a.projectName.localeCompare(b.projectName);
  });

  return {
    reports,
    projectsWithIssues: reports.filter((r) => r.missingCount > 0 || r.emptyCount > 0).length,
    totalMissing: reports.reduce((sum, r) => sum + r.missingCount, 0),
  };
}
