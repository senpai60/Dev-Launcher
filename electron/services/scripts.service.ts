import { promises as fsp } from "fs";
import fs from "fs";
import path from "node:path";
import { getProjects } from "./project.service";
import { runCommandInTerminal, type LaunchResult } from "../integrations/launcher";
import type { ScriptEntry, ScriptIndexResult } from "../../types/tools";

/** Maps a lockfile to the runner used to invoke its scripts. */
const LOCKFILES: Array<{ file: string; manager: string; prefix: string }> = [
  { file: "pnpm-lock.yaml", manager: "pnpm", prefix: "pnpm" },
  { file: "yarn.lock", manager: "yarn", prefix: "yarn" },
  { file: "bun.lockb", manager: "bun", prefix: "bun run" },
  { file: "bun.lock", manager: "bun", prefix: "bun run" },
  { file: "package-lock.json", manager: "npm", prefix: "npm run" },
];

function detectRunner(projectPath: string): { manager: string; prefix: string } {
  for (const { file, manager, prefix } of LOCKFILES) {
    if (fs.existsSync(path.join(projectPath, file))) return { manager, prefix };
  }
  return { manager: "npm", prefix: "npm run" };
}

async function readScripts(projectPath: string): Promise<Record<string, string> | null> {
  const packageJsonPath = path.join(projectPath, "package.json");
  if (!fs.existsSync(packageJsonPath)) return null;

  try {
    const parsed = JSON.parse(await fsp.readFile(packageJsonPath, "utf8"));
    const scripts = parsed?.scripts;
    if (!scripts || typeof scripts !== "object") return null;

    const clean: Record<string, string> = {};
    for (const [name, body] of Object.entries(scripts)) {
      if (typeof body === "string") clean[name] = body;
    }
    return clean;
  } catch {
    return null;
  }
}

/**
 * Builds a searchable index of every npm script across every project.
 *
 * Answers "which of my repos has a `seed` script?" without opening 40 folders.
 */
export async function indexScripts(): Promise<ScriptIndexResult> {
  const projects = getProjects();
  const scripts: ScriptEntry[] = [];
  const warnings: string[] = [];

  let projectsIndexed = 0;

  for (const project of projects) {
    const pathExists = Boolean(project.path) && fs.existsSync(project.path);
    if (!pathExists) continue;

    const found = await readScripts(project.path);
    if (!found) continue;

    projectsIndexed += 1;
    const { manager, prefix } = detectRunner(project.path);

    for (const [scriptName, scriptBody] of Object.entries(found)) {
      scripts.push({
        projectId: project.id,
        projectName: project.name,
        projectPath: project.path,
        pathExists,
        packageManager: manager,
        scriptName,
        scriptBody,
        runCommand: `${prefix} ${scriptName}`,
      });
    }
  }

  // Script names that show up in more than one project are the interesting
  // ones -- they are the conventions worth knowing about.
  const nameCounts = new Map<string, number>();
  for (const script of scripts) {
    nameCounts.set(script.scriptName, (nameCounts.get(script.scriptName) ?? 0) + 1);
  }
  const sharedNames = [...nameCounts.entries()]
    .filter(([, count]) => count > 1)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([name]) => name);

  scripts.sort(
    (a, b) => a.projectName.localeCompare(b.projectName) || a.scriptName.localeCompare(b.scriptName),
  );

  return { scripts, projectsIndexed, sharedNames, warnings };
}

/**
 * Runs a script by name.
 *
 * Same contract as saved commands: the renderer sends identifiers, and main
 * re-reads the project's own package.json to confirm the script exists before
 * building the command line. A script name that is not in package.json is
 * rejected, so this cannot be used to run arbitrary text.
 */
export async function runScript(
  projectId: string,
  scriptName: string,
): Promise<{ command: string; result: LaunchResult }> {
  const project = getProjects().find((p) => p.id === projectId);
  if (!project) throw new Error("Project not found.");

  if (!fs.existsSync(project.path)) {
    throw new Error(`The folder "${project.path}" no longer exists.`);
  }

  const scripts = await readScripts(project.path);
  if (!scripts) {
    throw new Error(`${project.name} has no package.json scripts.`);
  }
  if (!Object.prototype.hasOwnProperty.call(scripts, scriptName)) {
    throw new Error(`"${scriptName}" is not a script in ${project.name}.`);
  }

  const { prefix } = detectRunner(project.path);
  const command = `${prefix} ${scriptName}`;

  const result = await runCommandInTerminal(command, project.path);
  return { command, result };
}
