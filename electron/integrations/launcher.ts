import { exec } from "child_process";
import path from "node:path";

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

export function openInCursor(
  projectPath: string,
  cb?: (error: Error | null, stdout: string | null) => void,
) {
  const absolutePath = path.resolve(projectPath);
  const command = `cursor "${absolutePath}"`;

  exec(command, (err, stdout, stderr) => {
    if (err) {
      console.error(`Failed to open Cursor: ${stderr}`);
      if (cb) cb(err, null);
      return;
    }
    console.log(`Opened ${absolutePath} in Cursor`);
    if (cb) cb(null, stdout);
  });
}

export function openInAntigravity(
  projectPath: string,
  cb?: (error: Error | null, stdout: string | null) => void,
) {
  const absolutePath = path.resolve(projectPath);
  const command = `agy "${absolutePath}"`;

  exec(command, (err, stdout, stderr) => {
    if (err) {
      console.error(`Failed to open Antigravity: ${stderr}`);
      if (cb) cb(err, null);
      return;
    }
    console.log(`Opened ${absolutePath} in Antigravity`);
    if (cb) cb(null, stdout);
  });
}

export function openTerminal(
  projectPath: string,
  cb?: (error: Error | null, stdout: string | null) => void,
) {
  const absolutePath = path.resolve(projectPath);
  const command = `start cmd /k cd /d "${absolutePath}"`;

  exec(command, (err, stdout, stderr) => {
    if (err) {
      console.error(`error opening terminal: ${stderr}`, err);
      if (cb) cb(err, null);
      return;
    }
    console.log("terminal opened successfully", absolutePath);
    if (cb) cb(null, stdout);
  });
}

export function openInExplorer(
  projectPath: string,
  cb?: (error: Error | null, stdout: string | null) => void,
) {
  const absolutePath = path.resolve(projectPath);
  const command = `explorer.exe "${absolutePath}"`;
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

export function runCustomCommandInTerminal(
  cmdString: string,
  projectPath: string,
  cb?: (error: Error | null, stdout: string | null) => void,
) {
  const absolutePath = path.resolve(projectPath);
  const command = `start cmd /k "cd /d "${absolutePath}" && ${cmdString}"`;

  exec(command, (err, stdout, stderr) => {
    if (err) {
      console.error(`Failed to execute command "${cmdString}": ${stderr}`, err);
      if (cb) cb(err, null);
      return;
    }
    console.log(`Executing "${cmdString}" in ${absolutePath}`);
    if (cb) cb(null, stdout);
  });
}
