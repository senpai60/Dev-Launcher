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
  /**
   * Pass `args` to CreateProcess verbatim instead of letting Node re-quote
   * them. Required for the `cmd.exe /s /c "..."` form below, where we have
   * already done the quoting ourselves.
   */
  verbatim?: boolean;
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

/**
 * Runs a Windows `.cmd`/`.bat` shim safely.
 *
 * Node refuses to spawn batch files unless they go through a shell (the
 * CVE-2024-27980 fix), so these have to run via `cmd.exe`. Rather than using
 * `shell: true` -- which would let a folder name containing `&` inject a second
 * command -- we build the command line ourselves and pass it verbatim:
 *
 *     cmd.exe /d /s /c ""C:\path\code.cmd" "C:\my project""
 *
 * `/s` makes cmd strip only the outermost quote pair and treat the rest
 * literally, so `&`, `^` and `|` inside the quoted path stay inert. Windows
 * paths cannot contain a double quote, so the quoting cannot be broken out of.
 *
 * The binary name is deliberately left unquoted. It is a fixed constant from
 * EDITOR_BINARIES with no spaces or metacharacters, and quoting a bare
 * PATH-resolved name breaks `%~dp0` inside the shim -- VS Code's `code.cmd`
 * would then look for `Code.exe` relative to the working directory instead of
 * its own install folder.
 */
function windowsShimSpec(binary: string, args: string[]): SpawnSpec {
  const quote = (value: string) => (value.startsWith("-") ? value : `"${value}"`);
  const line = [binary, ...args.map(quote)].join(" ");

  return {
    command: "cmd.exe",
    args: ["/d", "/s", "/c", `"${line}"`],
    detached: false,
    verbatim: true,
  };
}

export function editorSpec(
  editorKey: string,
  absolutePath: string,
  newWindow: boolean,
): SpawnSpec | null {
  const editor = EDITOR_BINARIES[editorKey];
  if (!editor) return null;

  const args = editorKey === "vscode" ? [newWindow ? "-n" : "-r", absolutePath] : [absolutePath];

  // On Windows these ship as .cmd shims and must go through cmd.exe.
  if (isWindows) return windowsShimSpec(`${editor.bin}.cmd`, args);

  return { command: editor.bin, args, detached: false };
}

/** Default shell used for captured (non-terminal) command runs. */
export function defaultShell(): { command: string; flag: string } {
  return isWindows ? { command: "cmd.exe", flag: "/c" } : { command: "/bin/sh", flag: "-c" };
}

function shellQuote(value: string): string {
  return value.replace(/(["\s'$`\\])/g, "\\$1");
}
