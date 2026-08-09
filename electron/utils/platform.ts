/**
 * Platform abstraction for the OS-level integrations.
 *
 * Everything that shells out lives behind one of these descriptors so the rest
 * of the app never branches on `process.platform` directly.
 */

export type SpawnSpec = {
  command: string;
  args: string[];
  /** True when the process detaches and we cannot observe its exit code. */
  detached: boolean;
};

export const isWindows = process.platform === "win32";
export const isMac = process.platform === "darwin";
export const isLinux = !isWindows && !isMac;

/** Reveals a folder in the OS file manager. */
export function fileManagerSpec(absolutePath: string): SpawnSpec {
  if (isWindows) {
    return { command: "explorer.exe", args: [absolutePath], detached: true };
  }
  if (isMac) {
    return { command: "open", args: [absolutePath], detached: true };
  }
  return { command: "xdg-open", args: [absolutePath], detached: true };
}

/**
 * Opens an interactive terminal sitting in `cwd`.
 *
 * When `runCommand` is supplied the terminal stays open after it finishes so
 * the user can read the output.
 */
export function terminalSpec(cwd: string, runCommand?: string): SpawnSpec {
  if (isWindows) {
    // `start` is a cmd builtin, so it has to run through `cmd /c`. The empty
    // string after `start` is the window title -- without it, a quoted path
    // would be swallowed as the title instead of being passed through.
    const inner = runCommand ? ["cmd", "/k", runCommand] : ["cmd", "/k"];
    return {
      command: "cmd",
      args: ["/c", "start", "", ...inner],
      detached: true,
    };
  }

  if (isMac) {
    // `open -a Terminal <dir>` cannot carry a command, so fall back to a script
    // file only when we actually need to run something.
    if (!runCommand) {
      return { command: "open", args: ["-a", "Terminal", cwd], detached: true };
    }
    const script = `tell application "Terminal" to do script "cd ${shellQuote(cwd)} && ${runCommand.replace(/"/g, '\\"')}"`;
    return { command: "osascript", args: ["-e", script], detached: true };
  }

  // Linux terminals vary wildly; x-terminal-emulator is the Debian alternatives
  // entry and gnome-terminal/konsole both accept the same -e contract.
  const args = runCommand
    ? ["-e", `bash -c '${runCommand.replace(/'/g, "'\\''")}; exec bash'`]
    : [];
  return { command: "x-terminal-emulator", args, detached: true };
}

/**
 * CLI launchers for the editors we support. These are looked up on PATH -- we
 * never hard-code an install location (featured.md section 32).
 */
export const EDITOR_BINARIES: Record<string, { bin: string; label: string }> = {
  vscode: { bin: "code", label: "VS Code" },
  cursor: { bin: "cursor", label: "Cursor" },
  antigravity: { bin: "agy", label: "Antigravity" },
};

export function editorSpec(
  editorKey: string,
  absolutePath: string,
  newWindow: boolean,
): SpawnSpec | null {
  const editor = EDITOR_BINARIES[editorKey];
  if (!editor) return null;

  const args = editorKey === "vscode" ? [newWindow ? "-n" : "-r", absolutePath] : [absolutePath];

  // On Windows these ship as .cmd shims, which CreateProcess cannot execute
  // directly -- they have to go through the shell.
  return {
    command: isWindows ? `${editor.bin}.cmd` : editor.bin,
    args,
    detached: false,
  };
}

/** Default shell used for captured (non-terminal) command runs. */
export function defaultShell(): { command: string; flag: string } {
  return isWindows ? { command: "cmd.exe", flag: "/c" } : { command: "/bin/sh", flag: "-c" };
}

function shellQuote(value: string): string {
  return value.replace(/(["\s'$`\\])/g, "\\$1");
}
