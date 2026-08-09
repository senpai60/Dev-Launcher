import { spawn } from "child_process";
import fs from "fs";
import { promises as fsp } from "fs";
import path from "node:path";
import { addProject } from "./project.service";
import { detectProjectMeta } from "../utils/projectDetector";
import { parseRepositoryName, validateCloneUrl } from "../utils/git";
import { openInEditor, runCommandInTerminal } from "../integrations/launcher";
import { EDITOR_BINARIES } from "../utils/platform";
import { generateId } from "../utils/idGenerator";
import type { CloneProgress, CloneRequest, CloneResult } from "../../types/tools";

/** Install runners keyed by the lockfile the clone produced. */
const INSTALL_COMMANDS: Array<{ lockfile: string; command: string }> = [
  { lockfile: "pnpm-lock.yaml", command: "pnpm install" },
  { lockfile: "yarn.lock", command: "yarn install" },
  { lockfile: "bun.lockb", command: "bun install" },
  { lockfile: "bun.lock", command: "bun install" },
  { lockfile: "package-lock.json", command: "npm install" },
];

/**
 * Runs `git clone` and streams its progress.
 *
 * argv array with `shell: false`, so the URL and destination are never
 * re-parsed by a shell. `--progress` forces git to emit percentages even
 * though stderr is a pipe rather than a terminal.
 */
function runClone(
  url: string,
  destination: string,
  onLine: (line: string) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(
      "git",
      ["clone", "--progress", "--", url, destination],
      {
        shell: false,
        windowsHide: true,
        // Stop git from popping a GUI credential prompt that would hang us.
        env: { ...process.env, GIT_TERMINAL_PROMPT: "0", GCM_INTERACTIVE: "never" },
      },
    );

    let stderrTail = "";

    const consume = (chunk: Buffer) => {
      const text = chunk.toString();
      stderrTail = (stderrTail + text).slice(-4000);
      for (const line of text.split(/\r?\n|\r/)) {
        const trimmed = line.trim();
        if (trimmed) onLine(trimmed);
      }
    };

    child.stdout?.on("data", consume);
    child.stderr?.on("data", consume);

    child.on("error", (err: NodeJS.ErrnoException) => {
      reject(
        err.code === "ENOENT"
          ? new Error("git was not found on your PATH.")
          : err,
      );
    });

    child.on("close", (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      const detail = stderrTail.trim().split(/\r?\n/).slice(-3).join(" ");
      reject(new Error(detail || `git clone exited with code ${code}.`));
    });
  });
}

/**
 * Clone a repository and get it ready to work on.
 *
 * Clone -> detect stack -> register as a project -> optionally install
 * dependencies and open an editor.
 */
export async function cloneAndSetup(
  request: CloneRequest,
  onProgress?: (progress: CloneProgress) => void,
): Promise<CloneResult> {
  const warnings: string[] = [];

  const report = (
    phase: CloneProgress["phase"],
    message: string,
    detail?: string,
    done = false,
  ) => onProgress?.({ phase, message, detail, done });

  /* ---- Validate ------------------------------------------------------- */

  report("validating", "Checking the repository URL...");

  const url = String(request.url ?? "").trim();
  const urlCheck = validateCloneUrl(url);
  if (!urlCheck.valid) {
    throw new Error(urlCheck.reason ?? "That repository URL is not valid.");
  }

  const parent = path.resolve(String(request.destinationParent ?? "").trim());
  if (!parent || !fs.existsSync(parent)) {
    throw new Error("Choose a destination folder that exists.");
  }
  if (!fs.statSync(parent).isDirectory()) {
    throw new Error("The destination must be a folder.");
  }

  // Folder name is either supplied or derived; either way it must be a plain
  // name so it cannot escape the chosen parent directory.
  const requestedName = String(request.folderName ?? "").trim();
  const folderName = requestedName || (parseRepositoryName(url) as string);

  if (!/^[A-Za-z0-9._-]+$/.test(folderName) || folderName === "." || folderName === "..") {
    throw new Error("That folder name is not valid.");
  }

  const destination = path.join(parent, folderName);
  if (!path.resolve(destination).startsWith(parent + path.sep)) {
    throw new Error("That folder name is not valid.");
  }
  if (fs.existsSync(destination)) {
    throw new Error(`"${folderName}" already exists in that folder.`);
  }

  /* ---- Clone ---------------------------------------------------------- */

  report("cloning", `Cloning into ${folderName}...`);

  try {
    await runClone(url, destination, (line) => {
      report("cloning", `Cloning into ${folderName}...`, line);
    });
  } catch (e) {
    // Leave no half-cloned directory behind.
    try {
      if (fs.existsSync(destination)) {
        await fsp.rm(destination, { recursive: true, force: true, maxRetries: 2 });
      }
    } catch {
      warnings.push(`A partial clone may remain at ${destination}.`);
    }
    throw e;
  }

  /* ---- Detect --------------------------------------------------------- */

  report("detecting", "Detecting the project stack...");

  let detected;
  try {
    detected = detectProjectMeta(destination);
  } catch (e) {
    warnings.push(`Stack detection failed: ${(e as Error).message}`);
    detected = {
      name: folderName,
      tags: [] as string[],
      commands: [],
      details: {
        languages: [] as string[],
        frameworks: [] as string[],
        hasGit: true,
        hasDocker: false,
      },
    };
  }

  /* ---- Register ------------------------------------------------------- */

  report("registering", "Adding it to your projects...");

  const project = addProject({
    name: detected.name || folderName,
    path: destination,
    description: detected.description,
    tags: detected.tags,
    isFavorite: false,
    commands: detected.commands.map((c) => ({ ...c, id: c.id || generateId("cmd") })),
  });

  /* ---- Install -------------------------------------------------------- */

  let installStarted = false;

  if (request.installDependencies) {
    const match = INSTALL_COMMANDS.find(({ lockfile }) =>
      fs.existsSync(path.join(destination, lockfile)),
    );
    const hasPackageJson = fs.existsSync(path.join(destination, "package.json"));

    if (!hasPackageJson) {
      warnings.push("No package.json found, so dependencies were not installed.");
    } else {
      const command = match?.command ?? "npm install";
      report("installing", `Running ${command}...`);
      try {
        // Runs in a visible terminal so the user can watch it and keep the
        // window afterwards.
        await runCommandInTerminal(command, destination);
        installStarted = true;
      } catch (e) {
        warnings.push(`Could not start the install: ${(e as Error).message}`);
      }
    }
  }

  /* ---- Open editor ---------------------------------------------------- */

  let editorOpened = false;

  if (request.openInEditor) {
    const editorKey = request.openInEditor;
    if (!EDITOR_BINARIES[editorKey]) {
      warnings.push(`Unknown editor "${editorKey}".`);
    } else {
      report("opening", `Opening ${EDITOR_BINARIES[editorKey].label}...`);
      try {
        await openInEditor(editorKey, destination, false);
        editorOpened = true;
      } catch (e) {
        warnings.push((e as Error).message);
      }
    }
  }

  report("done", `${project.name} is ready.`, undefined, true);

  return {
    projectId: project.id,
    projectName: project.name,
    projectPath: destination,
    detectedTags: detected.tags,
    commandCount: detected.commands.length,
    installStarted,
    editorOpened,
    warnings,
  };
}
