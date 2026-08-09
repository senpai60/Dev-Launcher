import { execFile } from "child_process";

export type CaptureResult = {
  stdout: string;
  stderr: string;
  code: number;
};

/**
 * Runs a fixed diagnostic binary and captures its output.
 *
 * `execFile` with an argv array and no shell: these commands are chosen by the
 * app (netstat, tasklist, lsof), never assembled from user input, and nothing
 * here is re-parsed by a shell.
 */
export function capture(
  command: string,
  args: string[],
  timeoutMs = 10000,
): Promise<CaptureResult> {
  return new Promise((resolve, reject) => {
    execFile(
      command,
      args,
      { timeout: timeoutMs, windowsHide: true, maxBuffer: 8 * 1024 * 1024 },
      (error, stdout, stderr) => {
        if (error) {
          const err = error as NodeJS.ErrnoException & { code?: number | string };

          if (err.code === "ENOENT") {
            reject(new Error(`"${command}" is not available on this system.`));
            return;
          }

          // A non-zero exit is still useful output for these tools (lsof
          // returns 1 when nothing matches), so surface it instead of throwing.
          resolve({
            stdout: stdout ?? "",
            stderr: stderr ?? "",
            code: typeof err.code === "number" ? err.code : 1,
          });
          return;
        }

        resolve({ stdout, stderr, code: 0 });
      },
    );
  });
}
