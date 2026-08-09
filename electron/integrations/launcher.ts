import { exec } from "child_process";
import path from "node:path";
import { stderr, stdout } from "node:process";

export function openInVsCode(
  projectPath: string,
  newWindow: boolean = false,
  cb?: (error: Error | null, stdout: string | null) => void,
) {
  const absolutePath = path.resolve(projectPath);

  const flag = newWindow ? "-n" : "-r";

  const command = `code ${flag} "${absolutePath}"`;

  exec(command, (err, stdout, stderr) => {
    if (err) {
      console.error(`Failed to open VS Code: ${stderr}`);
      if (cb) cb(err, null);
      return;
    }
    console.log(`Opened ${absolutePath} in VS Code`);
    if (cb) cb(null, stdout);
  });
}

export function openTerminal(
  projectPath: string,
  cb?: (error: Error | null, stdout: string | null) => void,
) {
  const absolutePath = path.resolve(projectPath);
  const command = `start cmd /k cd "${absolutePath}"`;

  exec(command, (err, stdout, stderr) => {
    if (err) {
      console.error("error opening terminal", err);
      if (cb) cb(err, null);
      return;
    }
    console.log("terminal opend successfully", absolutePath);
    if (cb) cb(null, stdout);
  });
}

export function openInExplorer(
  projectPath: string,
  cb?: (error: Error | null, stdout: string | null) => void,
) {
  const absolutePath = path.resolve(projectPath);
  const command = `explorer.exe /select,"${absolutePath}"`;
  exec(command, (err, stdout, stderr) => {
    if (err) {
      console.error(`Failed to open Explorer: ${stderr}`);
      if (cb) cb(err, null);
      return;
    }
    console.log(`Opened ${absolutePath} in Explorer`);
    if (cb) cb(null, stdout);
  });
}
