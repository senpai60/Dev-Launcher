import { spawn } from "child_process";
import fs from "fs";
import path from "node:path";
import {
  EDITOR_BINARIES,
  editorSpec,
  fileManagerSpec,
  terminalSpec,
  type SpawnSpec,
} from "../utils/platform";

export type LaunchResult = {
  ok: true;
  detached: boolean;
};

/**
 * Runs a SpawnSpec.
 *
 * Every call uses an argv array with `shell: false`, so nothing in `args` is
 * ever re-parsed by a shell. Paths containing spaces, `&`, `^` or quotes are
 * passed through verbatim.
 */
function run(spec: SpawnSpec, cwd: string): Promise<LaunchResult> {
  return new Promise((resolve, reject) => {
    let child;
    try {
      child = spawn(spec.command, spec.args, {
        cwd,
        shell: false,
        detached: spec.detached,
        stdio: "ignore",
        windowsHide: false,
      });
    } catch (e) {
      reject(e);
      return;
    }

    let settled = false;

    child.on("error", (err: NodeJS.ErrnoException) => {
      if (settled) return;
      settled = true;
      reject(
        err.code === "ENOENT"
          ? new Error(`"${spec.command}" was not found on your PATH.`)
          : err,
      );
    });

    if (spec.detached) {
      // The launched window outlives us; don't hold the event loop open for it.
      child.unref();
      // Give `spawn` a tick to surface an ENOENT before reporting success.
      setTimeout(() => {
        if (settled) return;
        settled = true;
        resolve({ ok: true, detached: true });
      }, 100);
      return;
    }

    child.on("close", (code) => {
      if (settled) return;
      settled = true;
      if (code === 0 || code === null) {
        resolve({ ok: true, detached: false });
      } else {
        reject(new Error(`"${spec.command}" exited with code ${code}.`));
      }
    });
  });
}

function assertDirectory(projectPath: string): string {
  const absolutePath = path.resolve(projectPath);
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`The folder "${absolutePath}" no longer exists.`);
  }
  return absolutePath;
}

export async function openInEditor(
  editorKey: string,
  projectPath: string,
  newWindow = false,
): Promise<LaunchResult> {
  const absolutePath = assertDirectory(projectPath);
  const spec = editorSpec(editorKey, absolutePath, newWindow);

  if (!spec) {
    throw new Error(`Unknown editor "${editorKey}".`);
  }

  try {
    return await run(spec, absolutePath);
  } catch (e) {
    const label = EDITOR_BINARIES[editorKey]?.label ?? editorKey;
    const message = e instanceof Error ? e.message : String(e);
    if (message.includes("was not found on your PATH")) {
      throw new Error(
        `${label} was not detected. Make sure its command-line launcher is installed and on your PATH.`,
      );
    }
    throw new Error(`Could not open ${label}: ${message}`);
  }
}

export async function openTerminal(projectPath: string): Promise<LaunchResult> {
  const absolutePath = assertDirectory(projectPath);
  return run(terminalSpec(absolutePath), absolutePath);
}

export async function openInExplorer(projectPath: string): Promise<LaunchResult> {
  const absolutePath = assertDirectory(projectPath);
  // explorer.exe returns exit code 1 even on success, so it is always treated
  // as detached and its exit code ignored.
  return run(fileManagerSpec(absolutePath), absolutePath);
}

/**
 * Opens a terminal in `cwd` and runs `commandString` inside it.
 *
 * The command text is user-authored and intentionally interpreted by the
 * terminal's shell -- that is the whole point of a custom command. What we do
 * guarantee is that the *working directory* is passed via `spawn`'s `cwd`
 * rather than being concatenated into the command line, which is where the
 * previous `cd /d "path" && cmd` construction broke on quoted paths.
 */
export async function runCommandInTerminal(
  commandString: string,
  cwd: string,
): Promise<LaunchResult> {
  const absolutePath = assertDirectory(cwd);
  return run(terminalSpec(absolutePath, commandString), absolutePath);
}
