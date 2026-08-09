import { app, ipcMain, BrowserWindow, dialog, shell, globalShortcut, screen } from "electron";
import { fileURLToPath } from "node:url";
import path, { join } from "node:path";
import fs, { existsSync, readFileSync, writeFileSync, renameSync, unlinkSync, copyFileSync, mkdirSync, promises } from "fs";
import { randomUUID, createHash } from "node:crypto";
import { spawn, execFile } from "child_process";
import path$1 from "path";
const SCHEMA_VERSION = 1;
const dataDir = () => {
  const dir = join(app.getPath("userData"), "DevLauncher");
  mkdirSync(dir, { recursive: true });
  return dir;
};
const dataPath = (filename) => join(dataDir(), `${filename}.json`);
const quarantine = (filename) => {
  const source = dataPath(filename);
  if (!existsSync(source)) return null;
  const backup = join(dataDir(), `${filename}.corrupt-${Date.now()}.json`);
  try {
    copyFileSync(source, backup);
    return backup;
  } catch (e) {
    console.error(`Could not quarantine ${filename}.json:`, e);
    return null;
  }
};
const migrate = (parsed, filename) => {
  if (Array.isArray(parsed)) {
    console.log(`Migrating ${filename}.json from v0 (bare array) to v${SCHEMA_VERSION}`);
    return parsed;
  }
  if (parsed && typeof parsed === "object" && Array.isArray(parsed.data)) {
    return parsed.data;
  }
  throw new Error(`Unrecognised shape in ${filename}.json`);
};
const readData = (filename) => {
  const source = dataPath(filename);
  if (!existsSync(source)) return [];
  let raw;
  try {
    raw = readFileSync(source, "utf8");
  } catch (e) {
    console.error(`Could not read ${filename}.json:`, e);
    throw new Error(`Unable to read ${filename} storage.`);
  }
  if (raw.trim() === "") return [];
  try {
    return migrate(JSON.parse(raw), filename);
  } catch (e) {
    const backup = quarantine(filename);
    console.error(
      `${filename}.json is corrupt and was backed up to ${backup ?? "(backup failed)"}:`,
      e
    );
    throw new Error(
      `${filename}.json could not be read and was backed up. Starting from an empty list.`
    );
  }
};
const writeData = (filename, data) => {
  const target = dataPath(filename);
  const temp = `${target}.tmp`;
  const envelope = { version: SCHEMA_VERSION, data };
  try {
    writeFileSync(temp, JSON.stringify(envelope, null, 2), "utf8");
    renameSync(temp, target);
  } catch (e) {
    console.error(`Error saving ${filename}.json:`, e);
    try {
      if (existsSync(temp)) unlinkSync(temp);
    } catch {
    }
    throw new Error(`Unable to save ${filename}. Your changes were not written to disk.`);
  }
};
function readProjects() {
  return readData("projects");
}
function writeProjects(projects) {
  writeData("projects", projects);
}
function generateId(prefix = "id") {
  const uuid = randomUUID().replace(/-/g, "").slice(0, 12);
  return `${prefix}_${uuid}`;
}
const MAX_NAME_LENGTH = 80;
const MAX_COMMAND_LENGTH = 2e3;
const DESTRUCTIVE_PATTERNS = [
  { pattern: /\brm\s+(-[a-z]*[rf][a-z]*\s+)+/i, reason: "recursively deletes files (rm -rf)" },
  { pattern: /\brmdir\s+\/s\b/i, reason: "recursively deletes a directory (rmdir /s)" },
  { pattern: /\bdel\s+\/[qsf]/i, reason: "force-deletes files (del /f)" },
  { pattern: /\bRemove-Item\b[^|]*-Recurse/i, reason: "recursively deletes files (Remove-Item -Recurse)" },
  { pattern: /\bgit\s+reset\s+--hard\b/i, reason: "discards all uncommitted changes (git reset --hard)" },
  { pattern: /\bgit\s+clean\s+-[a-z]*[fd]/i, reason: "deletes untracked files (git clean -fd)" },
  { pattern: /\bgit\s+push\b[^|]*(--force|-f)\b/i, reason: "force-pushes and can overwrite remote history" },
  { pattern: /\bgit\s+branch\s+-D\b/i, reason: "force-deletes a branch" },
  { pattern: /\bdocker\s+system\s+prune\b/i, reason: "removes Docker images, containers and volumes" },
  { pattern: /\bdocker\s+volume\s+rm\b/i, reason: "deletes a Docker volume and its data" },
  { pattern: /\bDROP\s+(TABLE|DATABASE|SCHEMA)\b/i, reason: "drops a database object" },
  { pattern: /\bTRUNCATE\s+TABLE\b/i, reason: "empties a database table" },
  { pattern: /\b(mkfs|format)\s+/i, reason: "formats a filesystem" },
  { pattern: /\bdd\s+if=/i, reason: "writes raw disk data (dd)" },
  { pattern: /\bnpm\s+unpublish\b/i, reason: "removes a published package from the registry" },
  { pattern: /\b(shutdown|reboot)\b/i, reason: "shuts down or restarts the machine" },
  { pattern: />\s*\/dev\/sd[a-z]/i, reason: "writes directly to a block device" }
];
function checkDestructive(command) {
  for (const { pattern, reason } of DESTRUCTIVE_PATTERNS) {
    if (pattern.test(command)) {
      return { destructive: true, reason };
    }
  }
  return { destructive: false };
}
function validateCommand(input, projectPath) {
  const errors = [];
  const name = (input.name ?? "").trim();
  const command = (input.command ?? "").trim();
  const workingDirectory = (input.workingDirectory ?? "").trim();
  if (!name) {
    errors.push("Command name is required.");
  } else if (name.length > MAX_NAME_LENGTH) {
    errors.push(`Command name must be ${MAX_NAME_LENGTH} characters or fewer.`);
  }
  if (!command) {
    errors.push("Command string is required.");
  } else if (command.length > MAX_COMMAND_LENGTH) {
    errors.push(`Command string must be ${MAX_COMMAND_LENGTH} characters or fewer.`);
  }
  if (/[\r\n]/.test(command)) {
    errors.push("Command string cannot span multiple lines.");
  }
  if (/\0/.test(command) || /\0/.test(name)) {
    errors.push("Command contains invalid characters.");
  }
  if (workingDirectory) {
    if (path.isAbsolute(workingDirectory)) {
      errors.push("Working directory must be relative to the project folder.");
    } else if (workingDirectory.split(/[/\\]/).includes("..")) {
      errors.push("Working directory cannot escape the project folder.");
    } else if (projectPath) {
      const resolved = path.resolve(projectPath, workingDirectory);
      if (!resolved.startsWith(path.resolve(projectPath))) {
        errors.push("Working directory cannot escape the project folder.");
      } else if (!fs.existsSync(resolved)) {
        errors.push(`Working directory "${workingDirectory}" does not exist.`);
      }
    }
  }
  const { destructive, reason } = checkDestructive(command);
  return {
    valid: errors.length === 0,
    errors,
    requiresConfirmation: destructive,
    destructiveReason: reason
  };
}
function resolveWorkingDirectory(projectPath, workingDirectory) {
  const root = path.resolve(projectPath);
  if (!workingDirectory || !workingDirectory.trim()) return root;
  const resolved = path.resolve(root, workingDirectory.trim());
  if (!resolved.startsWith(root)) {
    throw new Error("Working directory escapes the project folder.");
  }
  if (!fs.existsSync(resolved)) {
    throw new Error(`Working directory "${workingDirectory}" does not exist.`);
  }
  return resolved;
}
const isWindows = process.platform === "win32";
const isMac = process.platform === "darwin";
function fileManagerSpec(absolutePath) {
  if (isWindows) {
    return { command: "explorer.exe", args: [absolutePath], detached: true };
  }
  if (isMac) {
    return { command: "open", args: [absolutePath], detached: true };
  }
  return { command: "xdg-open", args: [absolutePath], detached: true };
}
function terminalSpec(cwd, runCommand) {
  if (isWindows) {
    const inner = runCommand ? ["cmd", "/k", runCommand] : ["cmd", "/k"];
    return {
      command: "cmd",
      args: ["/c", "start", "", ...inner],
      detached: true
    };
  }
  if (isMac) {
    if (!runCommand) {
      return { command: "open", args: ["-a", "Terminal", cwd], detached: true };
    }
    const script = `tell application "Terminal" to do script "cd ${shellQuote(cwd)} && ${runCommand.replace(/"/g, '\\"')}"`;
    return { command: "osascript", args: ["-e", script], detached: true };
  }
  const args = runCommand ? ["-e", `bash -c '${runCommand.replace(/'/g, "'\\''")}; exec bash'`] : [];
  return { command: "x-terminal-emulator", args, detached: true };
}
const EDITOR_BINARIES = {
  vscode: { bin: "code", label: "VS Code" },
  cursor: { bin: "cursor", label: "Cursor" },
  antigravity: { bin: "agy", label: "Antigravity" }
};
function windowsShimSpec(binary, args) {
  const quote = (value) => value.startsWith("-") ? value : `"${value}"`;
  const line = [binary, ...args.map(quote)].join(" ");
  return {
    command: "cmd.exe",
    args: ["/d", "/s", "/c", `"${line}"`],
    detached: false,
    verbatim: true
  };
}
function editorSpec(editorKey, absolutePath, newWindow) {
  const editor = EDITOR_BINARIES[editorKey];
  if (!editor) return null;
  const args = editorKey === "vscode" ? [newWindow ? "-n" : "-r", absolutePath] : [absolutePath];
  if (isWindows) return windowsShimSpec(`${editor.bin}.cmd`, args);
  return { command: editor.bin, args, detached: false };
}
function shellQuote(value) {
  return value.replace(/(["\s'$`\\])/g, "\\$1");
}
function run(spec, cwd) {
  return new Promise((resolve, reject) => {
    var _a;
    let child;
    try {
      child = spawn(spec.command, spec.args, {
        cwd,
        shell: false,
        detached: spec.detached,
        // Detached windows own their own console. For everything else we keep
        // stderr so a failure can be explained instead of reported as a bare
        // exit code.
        stdio: spec.detached ? "ignore" : ["ignore", "ignore", "pipe"],
        windowsHide: false,
        windowsVerbatimArguments: spec.verbatim ?? false
      });
    } catch (e) {
      reject(e);
      return;
    }
    let settled = false;
    let stderr = "";
    (_a = child.stderr) == null ? void 0 : _a.on("data", (chunk) => {
      stderr = (stderr + chunk.toString()).slice(-2e3);
    });
    child.on("error", (err) => {
      if (settled) return;
      settled = true;
      reject(
        err.code === "ENOENT" ? new Error(`"${spec.command}" was not found on your PATH.`) : err
      );
    });
    if (spec.detached) {
      child.unref();
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
        return;
      }
      const detail = stderr.trim().split(/\r?\n/).filter(Boolean).slice(-2).join(" ");
      reject(new Error(detail || `"${spec.command}" exited with code ${code}.`));
    });
  });
}
function assertDirectory(projectPath) {
  const absolutePath = path.resolve(projectPath);
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`The folder "${absolutePath}" no longer exists.`);
  }
  return absolutePath;
}
async function openInEditor(editorKey, projectPath, newWindow = false) {
  var _a;
  const absolutePath = assertDirectory(projectPath);
  const spec = editorSpec(editorKey, absolutePath, newWindow);
  if (!spec) {
    throw new Error(`Unknown editor "${editorKey}".`);
  }
  try {
    return await run(spec, absolutePath);
  } catch (e) {
    const label = ((_a = EDITOR_BINARIES[editorKey]) == null ? void 0 : _a.label) ?? editorKey;
    const message = e instanceof Error ? e.message : String(e);
    const notFound = message.includes("was not found on your PATH") || message.includes("exited with code 9009") || /is not recognized as an internal or external command/i.test(message) || /command not found/i.test(message);
    if (notFound) {
      throw new Error(
        `${label} was not detected. Make sure its command-line launcher is installed and on your PATH.`
      );
    }
    throw new Error(`Could not open ${label}: ${message}`);
  }
}
async function openTerminal(projectPath) {
  const absolutePath = assertDirectory(projectPath);
  return run(terminalSpec(absolutePath), absolutePath);
}
async function openInExplorer(projectPath) {
  const absolutePath = assertDirectory(projectPath);
  return run(fileManagerSpec(absolutePath), absolutePath);
}
async function runCommandInTerminal(commandString, cwd) {
  const absolutePath = assertDirectory(cwd);
  return run(terminalSpec(absolutePath, commandString), absolutePath);
}
function readSessions() {
  return readData("sessions");
}
function writeSessions(sessions) {
  writeData("sessions", sessions);
}
const DEFAULT_DELAY_MS = 800;
const MAX_DELAY_MS = 6e4;
const MAX_STEPS$1 = 30;
function emptySession(projectId) {
  return {
    projectId,
    steps: [],
    capturedAt: Date.now(),
    autoCapture: true
  };
}
function getSession(projectId) {
  return readSessions().find((s) => s.projectId === projectId) ?? emptySession(projectId);
}
function getAllSessions() {
  return readSessions();
}
function saveSession(session) {
  const sessions = readSessions();
  const index = sessions.findIndex((s) => s.projectId === session.projectId);
  const normalized = {
    ...session,
    steps: session.steps.slice(0, MAX_STEPS$1).map((step, i) => ({ ...step, sortOrder: i }))
  };
  if (index === -1) sessions.push(normalized);
  else sessions[index] = normalized;
  writeSessions(sessions);
  return normalized;
}
function captureStep(projectId, kind, target, label) {
  const session = getSession(projectId);
  if (!session.autoCapture) return;
  const existingIndex = session.steps.findIndex(
    (step) => kind === "editor" ? step.kind === "editor" : step.kind === kind && step.target === target
  );
  if (existingIndex !== -1) {
    session.steps[existingIndex] = {
      ...session.steps[existingIndex],
      target,
      label
    };
  } else {
    if (session.steps.length >= MAX_STEPS$1) return;
    session.steps.push({
      id: generateId("step"),
      kind,
      target,
      label,
      delayMs: DEFAULT_DELAY_MS,
      enabled: true,
      sortOrder: session.steps.length
    });
  }
  session.capturedAt = Date.now();
  saveSession(session);
}
function updateSession(projectId, updates) {
  const session = getSession(projectId);
  if (updates.autoCapture !== void 0) {
    session.autoCapture = updates.autoCapture;
  }
  if (updates.steps) {
    session.steps = updates.steps.map((step, i) => ({
      id: step.id || generateId("step"),
      kind: step.kind,
      target: String(step.target ?? ""),
      label: String(step.label ?? "").slice(0, 120),
      delayMs: Math.min(Math.max(Number(step.delayMs) || 0, 0), MAX_DELAY_MS),
      enabled: step.enabled !== false,
      sortOrder: i
    }));
  }
  return saveSession(session);
}
function clearSession(projectId) {
  const session = getSession(projectId);
  session.steps = [];
  session.capturedAt = Date.now();
  return saveSession(session);
}
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function resumeSession(projectId, onProgress) {
  const project = readProjects().find((p) => p.id === projectId);
  if (!project) throw new Error("Project not found.");
  if (!fs.existsSync(project.path)) {
    throw new Error(`The folder "${project.path}" no longer exists.`);
  }
  const session = getSession(projectId);
  const ordered = [...session.steps].sort((a, b) => a.sortOrder - b.sortOrder);
  if (ordered.length === 0) {
    throw new Error(
      "This project has no saved session yet. Open it and run a command, then try again."
    );
  }
  const results = [];
  for (let i = 0; i < ordered.length; i += 1) {
    const step = ordered[i];
    onProgress == null ? void 0 : onProgress({
      projectId,
      current: i + 1,
      total: ordered.length,
      label: step.label,
      done: false
    });
    if (!step.enabled) {
      results.push({ stepId: step.id, label: step.label, kind: step.kind, status: "skipped" });
      continue;
    }
    try {
      await runStep(project, step);
      results.push({ stepId: step.id, label: step.label, kind: step.kind, status: "ok" });
    } catch (e) {
      results.push({
        stepId: step.id,
        label: step.label,
        kind: step.kind,
        status: "failed",
        error: e instanceof Error ? e.message : String(e)
      });
    }
    if (step.delayMs > 0 && i < ordered.length - 1) {
      await delay(Math.min(step.delayMs, MAX_DELAY_MS));
    }
  }
  onProgress == null ? void 0 : onProgress({
    projectId,
    current: ordered.length,
    total: ordered.length,
    label: "",
    done: true
  });
  session.lastResumedAt = Date.now();
  saveSession(session);
  return {
    projectId,
    projectName: project.name,
    steps: results,
    succeeded: results.filter((r) => r.status === "ok").length,
    failed: results.filter((r) => r.status === "failed").length,
    skipped: results.filter((r) => r.status === "skipped").length
  };
}
async function runStep(project, step) {
  switch (step.kind) {
    case "editor": {
      const editorKey = EDITOR_BINARIES[step.target] ? step.target : "vscode";
      await openInEditor(editorKey, project.path, false);
      return;
    }
    case "terminal":
      await openTerminal(project.path);
      return;
    case "folder":
      await openInExplorer(project.path);
      return;
    case "command": {
      const command = (project.commands ?? []).find((c) => c.id === step.target);
      if (!command) {
        throw new Error("That command has been deleted.");
      }
      const check = validateCommand(
        {
          name: command.name,
          command: command.command,
          workingDirectory: command.workingDirectory
        },
        project.path
      );
      if (!check.valid) throw new Error(check.errors.join(" "));
      if (check.requiresConfirmation) {
        throw new Error(
          `Skipped because it ${check.destructiveReason}. Run it manually if you meant to.`
        );
      }
      const cwd = resolveWorkingDirectory(project.path, command.workingDirectory);
      await runCommandInTerminal(command.command, cwd);
      return;
    }
    case "url":
      throw new Error("URL steps are not supported yet.");
    default:
      throw new Error(`Unknown step type "${step.kind}".`);
  }
}
function pruneSessions() {
  const projectIds = new Set(readProjects().map((p) => p.id));
  const sessions = readSessions();
  const kept = sessions.filter((s) => projectIds.has(s.projectId));
  if (kept.length !== sessions.length) writeSessions(kept);
}
function getProjects() {
  return readProjects();
}
function getProject(id) {
  return readProjects().find((project) => project.id === id);
}
function addProject(projectData) {
  const projects = readProjects();
  const newProject = {
    ...projectData,
    id: projectData.id || generateId("proj"),
    tags: projectData.tags || [],
    commands: projectData.commands || [],
    isFavorite: projectData.isFavorite ?? false,
    createdAt: projectData.createdAt || Date.now(),
    updatedAt: projectData.updatedAt || Date.now()
  };
  projects.push(newProject);
  writeProjects(projects);
  return newProject;
}
function updateProject(id, updates) {
  const projects = readProjects();
  const index = projects.findIndex((project) => project.id === id);
  if (index === -1) return void 0;
  const safeUpdates = { ...updates };
  delete safeUpdates.id;
  delete safeUpdates.createdAt;
  const updatedProject = {
    ...projects[index],
    ...safeUpdates,
    updatedAt: Date.now()
  };
  projects[index] = updatedProject;
  writeProjects(projects);
  return updatedProject;
}
function deleteProject(id) {
  const projects = readProjects();
  const filteredProjects = projects.filter((project) => project.id !== id);
  if (filteredProjects.length === projects.length) return false;
  writeProjects(filteredProjects);
  return true;
}
function seedProjectCommands(projectId, commands) {
  const project = requireProject(projectId);
  if (project.commands && project.commands.length > 0) return project;
  const now = Date.now();
  const seeded = commands.map((cmd) => ({
    ...cmd,
    id: cmd.id || generateId("cmd"),
    projectId,
    isFavorite: cmd.isFavorite ?? false,
    createdAt: cmd.createdAt || now,
    updatedAt: now
  }));
  return updateProject(projectId, { commands: seeded });
}
function addProjectCommand(projectId, input) {
  var _a, _b;
  const project = requireProject(projectId);
  const result = validateCommand(
    { name: input.name, command: input.command, workingDirectory: input.workingDirectory },
    project.path
  );
  if (!result.valid) {
    throw new Error(result.errors.join(" "));
  }
  const now = Date.now();
  const command = {
    id: generateId("cmd"),
    projectId,
    name: (input.name ?? "").trim(),
    command: (input.command ?? "").trim(),
    description: ((_a = input.description) == null ? void 0 : _a.trim()) || void 0,
    workingDirectory: ((_b = input.workingDirectory) == null ? void 0 : _b.trim()) || void 0,
    shell: input.shell,
    isFavorite: input.isFavorite ?? false,
    createdAt: now,
    updatedAt: now
  };
  const commands = [...project.commands ?? [], command];
  const updated = updateProject(projectId, { commands });
  return { project: updated, command };
}
function updateProjectCommand(projectId, commandId, updates) {
  const project = requireProject(projectId);
  const commands = project.commands ?? [];
  const index = commands.findIndex((c) => c.id === commandId);
  if (index === -1) {
    throw new Error("Command not found.");
  }
  const merged = {
    ...commands[index],
    ...updates,
    id: commands[index].id,
    projectId,
    createdAt: commands[index].createdAt,
    updatedAt: Date.now()
  };
  const touchesExecution = updates.name !== void 0 || updates.command !== void 0 || updates.workingDirectory !== void 0;
  if (touchesExecution) {
    const result = validateCommand(
      { name: merged.name, command: merged.command, workingDirectory: merged.workingDirectory },
      project.path
    );
    if (!result.valid) {
      throw new Error(result.errors.join(" "));
    }
  }
  const next = [...commands];
  next[index] = merged;
  const updated = updateProject(projectId, { commands: next });
  return { project: updated, command: merged };
}
function deleteProjectCommand(projectId, commandId) {
  const project = requireProject(projectId);
  const commands = project.commands ?? [];
  const next = commands.filter((c) => c.id !== commandId);
  if (next.length === commands.length) {
    throw new Error("Command not found.");
  }
  return updateProject(projectId, { commands: next });
}
async function runProjectCommand(projectId, commandId, confirmedDestructive = false) {
  const project = requireProject(projectId);
  const command = (project.commands ?? []).find((c) => c.id === commandId);
  if (!command) {
    throw new Error("Command not found. It may have been deleted.");
  }
  if (!fs.existsSync(project.path)) {
    throw new Error(`The folder "${project.path}" no longer exists.`);
  }
  const check = validateCommand(
    { name: command.name, command: command.command, workingDirectory: command.workingDirectory },
    project.path
  );
  if (!check.valid) {
    throw new Error(check.errors.join(" "));
  }
  if (check.requiresConfirmation && !confirmedDestructive) {
    throw new Error(
      `"${command.name}" ${check.destructiveReason}. It was not run because it has not been confirmed.`
    );
  }
  const cwd = resolveWorkingDirectory(project.path, command.workingDirectory);
  const result = await runCommandInTerminal(command.command, cwd);
  captureStep(projectId, "command", command.id, command.name);
  const now = Date.now();
  const commands = (project.commands ?? []).map(
    (c) => c.id === commandId ? { ...c, lastRunAt: now } : c
  );
  const updated = updateProject(projectId, { commands, lastCommandAt: now });
  return { project: updated, result };
}
const EDITOR_ACTIONS = {
  "open-in-vscode": "vscode",
  vscode: "vscode",
  "open-in-cursor": "cursor",
  cursor: "cursor",
  "open-in-antigravity": "antigravity",
  antigravity: "antigravity"
};
async function launchProject(id, action, newWindow = false) {
  var _a;
  const project = requireProject(id);
  const normalized = action.toLowerCase();
  if (!fs.existsSync(project.path)) {
    throw new Error(`The folder "${project.path}" no longer exists.`);
  }
  let result;
  const editorKey = EDITOR_ACTIONS[normalized];
  if (editorKey) {
    result = await openInEditor(editorKey, project.path, newWindow);
    captureStep(id, "editor", editorKey, `Open in ${((_a = EDITOR_BINARIES[editorKey]) == null ? void 0 : _a.label) ?? editorKey}`);
  } else if (normalized === "terminal" || normalized === "open-in-terminal") {
    result = await openTerminal(project.path);
    captureStep(id, "terminal", "", "Open terminal");
  } else {
    result = await openInExplorer(project.path);
  }
  const updated = updateProject(id, { lastOpenedAt: Date.now() });
  return { project: updated, result };
}
function requireProject(id) {
  const project = getProject(id);
  if (!project) {
    throw new Error("Project not found.");
  }
  return project;
}
function fallbackCommand(folderPath) {
  const has = (relative) => fs.existsSync(path$1.join(folderPath, relative));
  if (has("Cargo.toml")) {
    return { name: "Run", command: "cargo run", description: "Build and run the crate" };
  }
  if (has("go.mod")) {
    return { name: "Run", command: "go run .", description: "Build and run the module" };
  }
  if (has("manage.py")) {
    return {
      name: "Start Dev Server",
      command: "python manage.py runserver",
      description: "Start the Django development server"
    };
  }
  if (has("requirements.txt") || has("pyproject.toml") || has("Pipfile")) {
    return { name: "Run", command: "python main.py", description: "Run the entry point" };
  }
  if (has("pom.xml")) {
    return { name: "Run", command: "mvn spring-boot:run", description: "Run via Maven" };
  }
  if (has("build.gradle") || has("build.gradle.kts")) {
    return { name: "Run", command: "gradle run", description: "Run via Gradle" };
  }
  if (has("docker-compose.yml") || has("docker-compose.yaml") || has("compose.yml")) {
    return {
      name: "Compose Up",
      command: "docker compose up",
      description: "Start the Compose stack"
    };
  }
  if (has("Makefile")) {
    return { name: "Make", command: "make", description: "Run the default make target" };
  }
  return null;
}
function stableCommandId(folderPath, name, command) {
  const digest = createHash("sha1").update(`${path$1.resolve(folderPath)}::${name}::${command}`).digest("hex").slice(0, 12);
  return `cmd_${digest}`;
}
function detectProjectMeta(folderPath) {
  const folderName = path$1.basename(folderPath) || "New Project";
  const tagsSet = /* @__PURE__ */ new Set();
  const languages = [];
  const frameworks = [];
  const commands = [];
  let packageManager = void 0;
  let description = void 0;
  if (!folderPath || !fs.existsSync(folderPath)) {
    return {
      name: folderName,
      tags: [],
      commands: [],
      details: {
        languages: [],
        frameworks: [],
        hasGit: false,
        hasDocker: false
      }
    };
  }
  const exists = (relativePath) => fs.existsSync(path$1.join(folderPath, relativePath));
  const hasGit = exists(".git");
  if (hasGit) tagsSet.add("Git");
  const hasDocker = exists("Dockerfile") || exists("docker-compose.yml") || exists("docker-compose.yaml");
  if (hasDocker) tagsSet.add("Docker");
  let pmPrefix = "npm run";
  if (exists("pnpm-lock.yaml")) {
    packageManager = "pnpm";
    pmPrefix = "pnpm";
    tagsSet.add("pnpm");
  } else if (exists("yarn.lock")) {
    packageManager = "yarn";
    pmPrefix = "yarn";
    tagsSet.add("yarn");
  } else if (exists("bun.lockb") || exists("bun.lock")) {
    packageManager = "bun";
    pmPrefix = "bun run";
    tagsSet.add("bun");
  } else if (exists("package-lock.json")) {
    packageManager = "npm";
    pmPrefix = "npm run";
    tagsSet.add("npm");
  }
  const packageJsonPath = path$1.join(folderPath, "package.json");
  if (fs.existsSync(packageJsonPath)) {
    try {
      const content = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));
      if (content.description) {
        description = content.description;
      }
      const allDeps = {
        ...content.dependencies || {},
        ...content.devDependencies || {}
      };
      if (allDeps["typescript"] || exists("tsconfig.json")) {
        languages.push("TypeScript");
        tagsSet.add("TypeScript");
      } else {
        languages.push("JavaScript");
        tagsSet.add("JavaScript");
      }
      if (allDeps["next"]) {
        frameworks.push("Next.js");
        tagsSet.add("Next.js");
      } else if (allDeps["react"]) {
        frameworks.push("React");
        tagsSet.add("React");
      } else if (allDeps["vue"]) {
        frameworks.push("Vue");
        tagsSet.add("Vue");
      } else if (allDeps["@angular/core"]) {
        frameworks.push("Angular");
        tagsSet.add("Angular");
      } else if (allDeps["svelte"]) {
        frameworks.push("Svelte");
        tagsSet.add("Svelte");
      }
      if (allDeps["vite"] || exists("vite.config.ts") || exists("vite.config.js")) {
        frameworks.push("Vite");
        tagsSet.add("Vite");
      }
      if (allDeps["express"]) {
        frameworks.push("Express");
        tagsSet.add("Express");
      }
      if (allDeps["electron"]) {
        frameworks.push("Electron");
        tagsSet.add("Electron");
      }
      if (!packageManager) {
        packageManager = "npm";
        tagsSet.add("npm");
      }
      if (content.scripts && typeof content.scripts === "object") {
        const scripts = content.scripts;
        const now = Date.now();
        const addCommand = (name, command, description2, isFavorite) => {
          commands.push({
            id: stableCommandId(folderPath, name, command),
            name,
            command,
            description: description2,
            isFavorite,
            createdAt: now,
            updatedAt: now
          });
        };
        const known = [
          ["dev", "Start Dev Server", "Launch local development server", true],
          ["start", "Start Application", "Start application process", !scripts.dev],
          ["build", "Build Production Bundle", "Compile production distribution assets", false],
          ["test", "Run Test Suite", "Execute test scripts", false],
          ["lint", "Lint & Format", "Run code linter", false],
          ["typecheck", "Type Check", "Run the TypeScript compiler", false],
          ["preview", "Preview Build", "Serve the production build locally", false]
        ];
        for (const [script, label, description2, isFavorite] of known) {
          if (scripts[script]) {
            addCommand(label, `${pmPrefix} ${script}`, description2, isFavorite);
          }
        }
        const claimed = new Set(known.map(([script]) => script));
        for (const script of Object.keys(scripts)) {
          if (claimed.has(script)) continue;
          if (script.startsWith("pre") || script.startsWith("post")) continue;
          addCommand(script, `${pmPrefix} ${script}`, `Run the "${script}" script`, false);
        }
      }
    } catch (e) {
      console.warn(`Could not parse package.json in ${folderPath}:`, e);
    }
  }
  if (commands.length === 0) {
    const now = Date.now();
    const fallback = fallbackCommand(folderPath);
    if (fallback) {
      commands.push({
        id: stableCommandId(folderPath, fallback.name, fallback.command),
        ...fallback,
        isFavorite: true,
        createdAt: now,
        updatedAt: now
      });
    }
  }
  if (exists("requirements.txt") || exists("pyproject.toml") || exists("Pipfile")) {
    languages.push("Python");
    tagsSet.add("Python");
  }
  if (exists("go.mod")) {
    languages.push("Go");
    tagsSet.add("Go");
  }
  if (exists("Cargo.toml")) {
    languages.push("Rust");
    tagsSet.add("Rust");
  }
  if (exists("pom.xml") || exists("build.gradle")) {
    languages.push("Java");
    tagsSet.add("Java");
  }
  return {
    name: folderName,
    tags: Array.from(tagsSet),
    description,
    commands,
    details: {
      languages,
      frameworks,
      packageManager,
      hasGit,
      hasDocker
    }
  };
}
const MAX_STRING = 4096;
function requireString(value, field) {
  if (typeof value !== "string") {
    throw new Error(`${field} must be a string.`);
  }
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error(`${field} is required.`);
  }
  if (trimmed.length > MAX_STRING) {
    throw new Error(`${field} is too long.`);
  }
  if (trimmed.includes("\0")) {
    throw new Error(`${field} contains invalid characters.`);
  }
  return trimmed;
}
function requireId(value, field) {
  const id = requireString(value, field);
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(id)) {
    throw new Error(`${field} is not a valid identifier.`);
  }
  return id;
}
function requireObject(value, field) {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`${field} must be an object.`);
  }
  return value;
}
function optionalBoolean(value, field) {
  if (value === void 0 || value === null) return false;
  if (typeof value !== "boolean") {
    throw new Error(`${field} must be a boolean.`);
  }
  return value;
}
function handler(name, fn) {
  return async (_event, ...args) => {
    try {
      return await fn(...args);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      console.error(`IPC ${name} failed:`, message);
      throw new Error(message);
    }
  };
}
function withStatus(project) {
  return { ...project, pathExists: Boolean(project.path) && fs.existsSync(project.path) };
}
function registerProjectIPC() {
  ipcMain.handle(
    "projects:getAll",
    handler("projects:getAll", () => getProjects().map(withStatus))
  );
  ipcMain.handle(
    "projects:get",
    handler("projects:get", (id) => {
      const project = getProject(requireId(id, "Project id"));
      return project ? withStatus(project) : void 0;
    })
  );
  ipcMain.handle(
    "projects:add",
    handler("projects:add", (project) => {
      const input = requireObject(project, "Project");
      const name = requireString(input.name, "Project name");
      const projectPath = requireString(input.path, "Project path");
      if (!fs.existsSync(projectPath)) {
        throw new Error(`The folder "${projectPath}" does not exist.`);
      }
      if (!fs.statSync(projectPath).isDirectory()) {
        throw new Error(`"${projectPath}" is a file, not a folder.`);
      }
      return withStatus(
        addProject({
          ...input,
          name,
          path: projectPath,
          tags: Array.isArray(input.tags) ? input.tags : [],
          isFavorite: Boolean(input.isFavorite)
        })
      );
    })
  );
  ipcMain.handle(
    "projects:update",
    handler("projects:update", (id, updates) => {
      const projectId = requireId(id, "Project id");
      const patch = requireObject(updates, "Updates");
      if (patch.path !== void 0) {
        const nextPath = requireString(patch.path, "Project path");
        if (!fs.existsSync(nextPath)) {
          throw new Error(`The folder "${nextPath}" does not exist.`);
        }
      }
      if (patch.name !== void 0) {
        requireString(patch.name, "Project name");
      }
      const updated = updateProject(projectId, patch);
      if (!updated) throw new Error("Project not found.");
      return withStatus(updated);
    })
  );
  ipcMain.handle(
    "projects:delete",
    handler("projects:delete", (id) => deleteProject(requireId(id, "Project id")))
  );
  ipcMain.handle(
    "projects:detect",
    handler(
      "projects:detect",
      (folderPath) => detectProjectMeta(requireString(folderPath, "Folder path"))
    )
  );
  ipcMain.handle(
    "projects:seedCommands",
    handler("projects:seedCommands", (projectId, commands) => {
      if (!Array.isArray(commands)) throw new Error("Commands must be an array.");
      return withStatus(
        seedProjectCommands(requireId(projectId, "Project id"), commands)
      );
    })
  );
  ipcMain.handle(
    "projects:addCommand",
    handler("projects:addCommand", (projectId, command) => {
      const input = requireObject(command, "Command");
      const { project, command: created } = addProjectCommand(
        requireId(projectId, "Project id"),
        input
      );
      return { project: withStatus(project), command: created };
    })
  );
  ipcMain.handle(
    "projects:updateCommand",
    handler("projects:updateCommand", (projectId, commandId, updates) => {
      const patch = requireObject(updates, "Updates");
      const { project, command } = updateProjectCommand(
        requireId(projectId, "Project id"),
        requireId(commandId, "Command id"),
        patch
      );
      return { project: withStatus(project), command };
    })
  );
  ipcMain.handle(
    "projects:deleteCommand",
    handler(
      "projects:deleteCommand",
      (projectId, commandId) => withStatus(
        deleteProjectCommand(
          requireId(projectId, "Project id"),
          requireId(commandId, "Command id")
        )
      )
    )
  );
  ipcMain.handle(
    "projects:runCommand",
    handler("projects:runCommand", async (projectId, commandId, confirmed) => {
      const { project } = await runProjectCommand(
        requireId(projectId, "Project id"),
        requireId(commandId, "Command id"),
        optionalBoolean(confirmed, "Confirmation flag")
      );
      return withStatus(project);
    })
  );
  ipcMain.handle(
    "projects:inspectCommand",
    handler("projects:inspectCommand", (projectId, commandId) => {
      const project = getProject(requireId(projectId, "Project id"));
      if (!project) throw new Error("Project not found.");
      const command = (project.commands ?? []).find(
        (c) => c.id === requireId(commandId, "Command id")
      );
      if (!command) throw new Error("Command not found.");
      return validateCommand(
        {
          name: command.name,
          command: command.command,
          workingDirectory: command.workingDirectory
        },
        project.path
      );
    })
  );
  ipcMain.handle(
    "projects:validateCommand",
    handler("projects:validateCommand", (draft, projectPath) => {
      const input = requireObject(draft, "Command");
      return validateCommand(
        {
          name: typeof input.name === "string" ? input.name : "",
          command: typeof input.command === "string" ? input.command : "",
          workingDirectory: typeof input.workingDirectory === "string" ? input.workingDirectory : void 0
        },
        typeof projectPath === "string" ? projectPath : void 0
      );
    })
  );
  ipcMain.handle(
    "projects:launch",
    handler("projects:launch", async (id, action, newWindow) => {
      const { project } = await launchProject(
        requireId(id, "Project id"),
        requireString(action, "Action"),
        optionalBoolean(newWindow, "New window flag")
      );
      return withStatus(project);
    })
  );
}
function readGroups() {
  const data = readData("groups");
  if (data.length === 0) {
    const defaultGroups = [
      { id: "group_freelance", name: "Freelance", sortOrder: 1, createdAt: Date.now(), updatedAt: Date.now() },
      { id: "group_personal", name: "Personal", sortOrder: 2, createdAt: Date.now(), updatedAt: Date.now() },
      { id: "group_experiments", name: "Experiments", sortOrder: 3, createdAt: Date.now(), updatedAt: Date.now() },
      { id: "group_learning", name: "Learning", sortOrder: 4, createdAt: Date.now(), updatedAt: Date.now() }
    ];
    writeData("groups", defaultGroups);
    return defaultGroups;
  }
  return data;
}
function writeGroups(groups) {
  writeData("groups", groups);
}
function getGroups() {
  return readGroups();
}
function getGroup(id) {
  const groups = readGroups();
  return groups.find((group) => group.id === id);
}
function addGroup(groupData) {
  const groups = readGroups();
  const newGroup = {
    id: groupData.id || generateId("group"),
    name: groupData.name,
    icon: groupData.icon,
    color: groupData.color,
    sortOrder: groupData.sortOrder ?? groups.length + 1,
    createdAt: groupData.createdAt || Date.now(),
    updatedAt: groupData.updatedAt || Date.now()
  };
  groups.push(newGroup);
  writeGroups(groups);
  return newGroup;
}
function updateGroup(id, updates) {
  const groups = readGroups();
  const index = groups.findIndex((g) => g.id === id);
  if (index === -1) {
    return void 0;
  }
  const updatedGroup = {
    ...groups[index],
    ...updates,
    updatedAt: Date.now()
  };
  groups[index] = updatedGroup;
  writeGroups(groups);
  return updatedGroup;
}
function deleteGroup(id) {
  const groups = readGroups();
  const filtered = groups.filter((g) => g.id !== id);
  if (filtered.length === groups.length) {
    return false;
  }
  writeGroups(filtered);
  return true;
}
function registerGroupIPC() {
  ipcMain.handle("groups:getAll", () => {
    return getGroups();
  });
  ipcMain.handle("groups:get", (_, id) => {
    return getGroup(id);
  });
  ipcMain.handle("groups:add", (_, groupData) => {
    return addGroup(groupData);
  });
  ipcMain.handle("groups:update", (_, id, updates) => {
    return updateGroup(id, updates);
  });
  ipcMain.handle("groups:delete", (_, id) => {
    return deleteGroup(id);
  });
}
function registerDialogIPC() {
  ipcMain.handle(
    "dialog:selectFolder",
    handler("dialog:selectFolder", async (defaultPath) => {
      const parent = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0];
      const options = {
        title: "Select project folder",
        properties: ["openDirectory", "createDirectory"]
      };
      if (typeof defaultPath === "string" && defaultPath && fs.existsSync(defaultPath)) {
        options.defaultPath = defaultPath;
      }
      const result = parent ? await dialog.showOpenDialog(parent, options) : await dialog.showOpenDialog(options);
      if (result.canceled || result.filePaths.length === 0) return null;
      const selected = result.filePaths[0];
      return { path: selected, name: path.basename(selected) };
    })
  );
  ipcMain.handle(
    "dialog:pathExists",
    handler("dialog:pathExists", (target) => {
      const candidate = requireString(target, "Path");
      return fs.existsSync(candidate) && fs.statSync(candidate).isDirectory();
    })
  );
  ipcMain.handle(
    "shell:openExternal",
    handler("shell:openExternal", async (url) => {
      const target = requireString(url, "URL");
      let parsed;
      try {
        parsed = new URL(target);
      } catch {
        throw new Error("That is not a valid URL.");
      }
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        throw new Error("Only http and https links can be opened.");
      }
      await shell.openExternal(parsed.toString());
      return true;
    })
  );
}
async function measureDirectory(target) {
  const stats = { sizeBytes: 0, fileCount: 0, lastModified: 0 };
  const stack = [target];
  while (stack.length > 0) {
    const current = stack.pop();
    let entries;
    try {
      entries = await promises.readdir(current, { withFileTypes: true });
    } catch {
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
        const info = await promises.stat(full);
        stats.sizeBytes += info.size;
        stats.fileCount += 1;
        if (info.mtimeMs > stats.lastModified) stats.lastModified = info.mtimeMs;
      } catch {
      }
    }
  }
  return stats;
}
async function findNodeModules(root, maxDepth = 3) {
  const found = [];
  const queue = [{ dir: root, depth: 0 }];
  const IGNORED = /* @__PURE__ */ new Set([".git", ".next", "dist", "build", "out", ".cache", ".turbo"]);
  while (queue.length > 0) {
    const { dir, depth } = queue.shift();
    let entries;
    try {
      entries = await promises.readdir(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      if (!entry.isDirectory() || entry.isSymbolicLink()) continue;
      if (entry.name === "node_modules") {
        found.push(path.join(dir, entry.name));
        continue;
      }
      if (depth < maxDepth && !IGNORED.has(entry.name) && !entry.name.startsWith(".")) {
        queue.push({ dir: path.join(dir, entry.name), depth: depth + 1 });
      }
    }
  }
  return found;
}
const STALE_AFTER_DAYS = 30;
const DAY_MS$1 = 24 * 60 * 60 * 1e3;
async function scanNodeModules(onProgress) {
  const projects = getProjects();
  const entries = [];
  const warnings = [];
  let scannedProjects = 0;
  let skippedProjects = 0;
  for (let i = 0; i < projects.length; i += 1) {
    const project = projects[i];
    onProgress == null ? void 0 : onProgress({
      current: i + 1,
      total: projects.length,
      projectName: project.name,
      done: false
    });
    if (!project.path || !fs.existsSync(project.path)) {
      skippedProjects += 1;
      continue;
    }
    let modulePaths;
    try {
      modulePaths = await findNodeModules(project.path);
    } catch (e) {
      warnings.push(`Could not scan ${project.name}: ${e.message}`);
      skippedProjects += 1;
      continue;
    }
    scannedProjects += 1;
    for (const modulesPath of modulePaths) {
      const stats = await measureDirectory(modulesPath);
      const daysSinceOpened = project.lastOpenedAt ? Math.floor((Date.now() - project.lastOpenedAt) / DAY_MS$1) : null;
      const daysSinceModified = stats.lastModified ? Math.floor((Date.now() - stats.lastModified) / DAY_MS$1) : null;
      const isStale = daysSinceOpened === null ? (daysSinceModified ?? 0) >= STALE_AFTER_DAYS : daysSinceOpened >= STALE_AFTER_DAYS;
      const relative = path.relative(project.path, modulesPath);
      entries.push({
        projectId: project.id,
        projectName: project.name,
        projectPath: project.path,
        modulesPath,
        relativeLabel: relative || "node_modules",
        sizeBytes: stats.sizeBytes,
        fileCount: stats.fileCount,
        lastModified: stats.lastModified,
        lastOpenedAt: project.lastOpenedAt,
        daysSinceOpened,
        isStale
      });
    }
  }
  onProgress == null ? void 0 : onProgress({
    current: projects.length,
    total: projects.length,
    projectName: "",
    done: true
  });
  entries.sort((a, b) => b.sizeBytes - a.sizeBytes);
  return {
    entries,
    totalBytes: entries.reduce((sum, e) => sum + e.sizeBytes, 0),
    staleBytes: entries.filter((e) => e.isStale).reduce((sum, e) => sum + e.sizeBytes, 0),
    scannedProjects,
    skippedProjects,
    warnings
  };
}
async function deleteNodeModules(targets) {
  const projects = getProjects();
  const projectRoots = projects.filter((p) => p.path).map((p) => path.resolve(p.path));
  const result = { deleted: [], failed: [], reclaimedBytes: 0 };
  for (const rawTarget of targets) {
    const target = path.resolve(rawTarget);
    const reject = (reason) => result.failed.push({ path: rawTarget, reason });
    if (path.basename(target) !== "node_modules") {
      reject("Not a node_modules directory.");
      continue;
    }
    const owningRoot = projectRoots.find(
      (root) => target.startsWith(root + path.sep) && target !== root
    );
    if (!owningRoot) {
      reject("Not inside a registered project folder.");
      continue;
    }
    let stat;
    try {
      stat = await promises.lstat(target);
    } catch {
      reject("Folder no longer exists.");
      continue;
    }
    if (stat.isSymbolicLink()) {
      reject("Refusing to follow a symlink.");
      continue;
    }
    if (!stat.isDirectory()) {
      reject("Not a directory.");
      continue;
    }
    const { sizeBytes } = await measureDirectory(target);
    try {
      await promises.rm(target, { recursive: true, force: true, maxRetries: 3, retryDelay: 200 });
      result.deleted.push(target);
      result.reclaimedBytes += sizeBytes;
    } catch (e) {
      const message = e.code === "EBUSY" ? "Files are in use. Close your editor or dev server and try again." : e.message;
      reject(message);
    }
  }
  return result;
}
function capture(command, args, timeoutMs = 1e4) {
  return new Promise((resolve, reject) => {
    execFile(
      command,
      args,
      { timeout: timeoutMs, windowsHide: true, maxBuffer: 8 * 1024 * 1024 },
      (error, stdout, stderr) => {
        if (error) {
          const err = error;
          if (err.code === "ENOENT") {
            reject(new Error(`"${command}" is not available on this system.`));
            return;
          }
          resolve({
            stdout: stdout ?? "",
            stderr: stderr ?? "",
            code: typeof err.code === "number" ? err.code : 1
          });
          return;
        }
        resolve({ stdout, stderr, code: 0 });
      }
    );
  });
}
const KNOWN_SERVICES = {
  80: "HTTP",
  443: "HTTPS",
  3e3: "Node / Next.js",
  3001: "Node (alt)",
  4e3: "Node / GraphQL",
  4200: "Angular",
  5e3: "Flask / .NET",
  5173: "Vite",
  5174: "Vite (alt)",
  5432: "PostgreSQL",
  6379: "Redis",
  8e3: "Django / FastAPI",
  8080: "HTTP alt / Tomcat",
  8081: "HTTP alt",
  9e3: "PHP-FPM / SonarQube",
  27017: "MongoDB",
  3306: "MySQL",
  1433: "SQL Server",
  5672: "RabbitMQ",
  9200: "Elasticsearch",
  11434: "Ollama"
};
const PROTECTED_PIDS = /* @__PURE__ */ new Set([0, 4]);
function classifyPort(port) {
  const knownService = KNOWN_SERVICES[port];
  const isDevPort = Boolean(knownService) || port >= 3e3 && port <= 9999 || port >= 4e3 && port <= 5999;
  return { isDevPort, knownService };
}
async function listPorts() {
  const warnings = [];
  const entries = isWindows ? await listPortsWindows(warnings) : await listPortsUnix(warnings);
  const byPort = /* @__PURE__ */ new Map();
  for (const entry of entries) {
    const key = `${entry.port}:${entry.pid}`;
    if (!byPort.has(key)) byPort.set(key, entry);
  }
  const deduped = [...byPort.values()].sort((a, b) => a.port - b.port);
  return { entries: deduped, scannedAt: Date.now(), warnings };
}
async function listPortsWindows(warnings) {
  const { stdout } = await capture("netstat", ["-ano", "-p", "TCP"]);
  const entries = [];
  for (const line of stdout.split(/\r?\n/)) {
    const parts = line.trim().split(/\s+/);
    if (parts.length < 5 || parts[0].toUpperCase() !== "TCP") continue;
    if (parts[3].toUpperCase() !== "LISTENING") continue;
    const local = parts[1];
    const pid = Number(parts[4]);
    if (!Number.isFinite(pid)) continue;
    const separator = local.lastIndexOf(":");
    if (separator === -1) continue;
    const port = Number(local.slice(separator + 1));
    if (!Number.isFinite(port) || port === 0) continue;
    const { isDevPort, knownService } = classifyPort(port);
    entries.push({
      port,
      pid,
      protocol: "TCP",
      address: local.slice(0, separator) || "0.0.0.0",
      state: "LISTENING",
      isDevPort,
      knownService,
      isProtected: PROTECTED_PIDS.has(pid)
    });
  }
  await attachWindowsProcessNames(entries, warnings);
  return entries;
}
async function attachWindowsProcessNames(entries, warnings) {
  if (entries.length === 0) return;
  try {
    const { stdout } = await capture("tasklist", ["/FO", "CSV", "/NH"]);
    const names = /* @__PURE__ */ new Map();
    for (const line of stdout.split(/\r?\n/)) {
      const fields = line.match(/"([^"]*)"/g);
      if (!fields || fields.length < 2) continue;
      const name = fields[0].replace(/"/g, "");
      const pid = Number(fields[1].replace(/"/g, ""));
      if (Number.isFinite(pid)) names.set(pid, name);
    }
    for (const entry of entries) {
      entry.processName = names.get(entry.pid);
    }
  } catch (e) {
    warnings.push(`Could not resolve process names: ${e.message}`);
  }
}
async function listPortsUnix(warnings) {
  try {
    const { stdout } = await capture("lsof", ["-nP", "-iTCP", "-sTCP:LISTEN"]);
    const entries = [];
    for (const line of stdout.split("\n").slice(1)) {
      const parts = line.trim().split(/\s+/);
      if (parts.length < 9) continue;
      const processName = parts[0];
      const pid = Number(parts[1]);
      const name = parts[8];
      if (!Number.isFinite(pid)) continue;
      const separator = name.lastIndexOf(":");
      if (separator === -1) continue;
      const port = Number(name.slice(separator + 1));
      if (!Number.isFinite(port) || port === 0) continue;
      const { isDevPort, knownService } = classifyPort(port);
      entries.push({
        port,
        pid,
        protocol: "TCP",
        address: name.slice(0, separator) || "*",
        state: "LISTEN",
        processName,
        isDevPort,
        knownService,
        isProtected: PROTECTED_PIDS.has(pid)
      });
    }
    return entries;
  } catch (e) {
    warnings.push(e.message);
    return [];
  }
}
async function killByPid(pid, expectedPort) {
  if (!Number.isInteger(pid) || pid <= 0) {
    throw new Error("Invalid process id.");
  }
  if (PROTECTED_PIDS.has(pid)) {
    throw new Error("That is a protected system process and cannot be stopped.");
  }
  const { entries } = await listPorts();
  const match = entries.find((e) => e.pid === pid && e.port === expectedPort);
  if (!match) {
    throw new Error(
      `Nothing is listening on port ${expectedPort} with PID ${pid} any more. Refresh the list.`
    );
  }
  const result = isWindows ? await capture("taskkill", ["/PID", String(pid), "/F", "/T"]) : await capture("kill", ["-9", String(pid)]);
  if (result.code !== 0) {
    const detail = (result.stderr || result.stdout).trim();
    throw new Error(
      detail.toLowerCase().includes("access is denied") || detail.toLowerCase().includes("not permitted") ? `Access denied stopping PID ${pid}. It may need administrator rights.` : detail || `Could not stop PID ${pid}.`
    );
  }
  return {
    pid,
    killed: true,
    message: `Stopped ${match.processName ?? `PID ${pid}`} on port ${expectedPort}.`
  };
}
const EXAMPLE_NAMES = [".env.example", ".env.sample", ".env.template", ".env.dist"];
const ACTIVE_NAMES = [".env", ".env.local", ".env.development", ".env.development.local"];
const ENV_FILE_PATTERN = /^\.env(\..+)?$/;
const MAX_ENV_DEPTH = 3;
const SKIP_DIRS = /* @__PURE__ */ new Set([
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
  ".vscode"
]);
function parseEnvKeys(contents) {
  const keys = [];
  const emptyKeys = /* @__PURE__ */ new Set();
  const seen = /* @__PURE__ */ new Set();
  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const withoutExport = line.startsWith("export ") ? line.slice(7).trim() : line;
    const separator = withoutExport.indexOf("=");
    if (separator <= 0) continue;
    const key = withoutExport.slice(0, separator).trim();
    if (!key || !/^[A-Za-z_][A-Za-z0-9_.]*$/.test(key)) continue;
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
async function readEnvFile(filePath) {
  try {
    const contents = await promises.readFile(filePath, "utf8");
    return parseEnvKeys(contents);
  } catch {
    return null;
  }
}
async function findEnvDirectories(root) {
  const found = /* @__PURE__ */ new Map();
  const queue = [{ dir: root, depth: 0 }];
  while (queue.length > 0) {
    const { dir, depth } = queue.shift();
    let entries;
    try {
      entries = await promises.readdir(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    const envFiles = [];
    for (const entry of entries) {
      if (entry.isFile() && ENV_FILE_PATTERN.test(entry.name)) {
        envFiles.push(entry.name);
        continue;
      }
      if (entry.isDirectory() && !entry.isSymbolicLink() && depth < MAX_ENV_DEPTH && !SKIP_DIRS.has(entry.name)) {
        queue.push({ dir: path.join(dir, entry.name), depth: depth + 1 });
      }
    }
    if (envFiles.length > 0) {
      found.set(path.relative(root, dir), envFiles.sort());
    }
  }
  return found;
}
async function isEnvGitIgnored(projectRoot, relativeDir) {
  const candidates = [path.join(projectRoot, ".gitignore")];
  if (relativeDir) {
    candidates.push(path.join(projectRoot, relativeDir, ".gitignore"));
  }
  for (const gitignorePath of candidates) {
    try {
      const contents = await promises.readFile(gitignorePath, "utf8");
      const covered = contents.split(/\r?\n/).map((l) => l.trim()).some(
        (l) => l === ".env" || l === ".env*" || l === "*.env" || l === ".env.*" || l === "**/.env" || l.endsWith("/.env")
      );
      if (covered) return true;
    } catch {
    }
  }
  return false;
}
async function auditLocation(projectRoot, relativeDir, envFiles) {
  const warnings = [];
  const absoluteDir = path.join(projectRoot, relativeDir);
  const parsedByName = /* @__PURE__ */ new Map();
  const files = [];
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
      emptyKeys: parsed.emptyKeys.size
    });
  }
  const exampleFile = EXAMPLE_NAMES.find((name) => parsedByName.has(name));
  const activeFile = ACTIVE_NAMES.find((name) => parsedByName.has(name));
  const example = exampleFile ? parsedByName.get(exampleFile) : void 0;
  const active = activeFile ? parsedByName.get(activeFile) : void 0;
  const keys = [];
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
    for (const key of active.keys) {
      const isEmpty = active.emptyKeys.has(key);
      keys.push({ key, status: isEmpty ? "empty" : "ok" });
      if (isEmpty) emptyCount += 1;
    }
    warnings.push("No .env.example here, so missing keys cannot be detected.");
  } else if (example) {
    for (const key of example.keys) {
      keys.push({ key, status: "missing" });
      missingCount += 1;
    }
    warnings.push(`${exampleFile} exists but there is no .env file.`);
  }
  const hasRealEnv = ACTIVE_NAMES.some((name) => parsedByName.has(name));
  const envNotIgnored = hasRealEnv && !await isEnvGitIgnored(projectRoot, relativeDir);
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
    warnings
  };
}
async function auditProject(project) {
  const warnings = [];
  const base = {
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
    warnings
  };
  if (!project.path || !fs.existsSync(project.path)) {
    return { ...base, pathExists: false };
  }
  let envDirs;
  try {
    envDirs = await findEnvDirectories(project.path);
  } catch (e) {
    warnings.push(`Could not scan the project folder: ${e.message}`);
    return base;
  }
  if (envDirs.size === 0) return base;
  const locations = [];
  for (const [relativeDir, envFiles] of envDirs) {
    locations.push(await auditLocation(project.path, relativeDir, envFiles));
  }
  locations.sort((a, b) => {
    if (!a.relativeDir !== !b.relativeDir) return a.relativeDir ? 1 : -1;
    const aScore = a.missingCount * 10 + a.emptyCount;
    const bScore = b.missingCount * 10 + b.emptyCount;
    if (aScore !== bScore) return bScore - aScore;
    return a.label.localeCompare(b.label);
  });
  const sum = (pick) => locations.reduce((total, location) => total + pick(location), 0);
  return {
    ...base,
    locations,
    missingCount: sum((l) => l.missingCount),
    emptyCount: sum((l) => l.emptyCount),
    extraCount: sum((l) => l.extraCount),
    hasEnvFiles: locations.some((l) => l.files.length > 0),
    envNotIgnored: locations.some((l) => l.envNotIgnored),
    warnings
  };
}
async function auditEnvironments(projectId) {
  const projects = getProjects().filter((p) => !projectId || p.id === projectId);
  const reports = [];
  for (const project of projects) {
    reports.push(await auditProject(project));
  }
  reports.sort((a, b) => {
    const aScore = a.missingCount * 10 + a.emptyCount;
    const bScore = b.missingCount * 10 + b.emptyCount;
    if (aScore !== bScore) return bScore - aScore;
    return a.projectName.localeCompare(b.projectName);
  });
  return {
    reports,
    projectsWithIssues: reports.filter((r) => r.missingCount > 0 || r.emptyCount > 0).length,
    totalMissing: reports.reduce((sum, r) => sum + r.missingCount, 0)
  };
}
const LOCKFILES$1 = [
  { file: "pnpm-lock.yaml", manager: "pnpm", prefix: "pnpm" },
  { file: "yarn.lock", manager: "yarn", prefix: "yarn" },
  { file: "bun.lockb", manager: "bun", prefix: "bun run" },
  { file: "bun.lock", manager: "bun", prefix: "bun run" },
  { file: "package-lock.json", manager: "npm", prefix: "npm run" }
];
function detectRunner(projectPath) {
  for (const { file, manager, prefix } of LOCKFILES$1) {
    if (fs.existsSync(path.join(projectPath, file))) return { manager, prefix };
  }
  return { manager: "npm", prefix: "npm run" };
}
async function readScripts(projectPath) {
  const packageJsonPath = path.join(projectPath, "package.json");
  if (!fs.existsSync(packageJsonPath)) return null;
  try {
    const parsed = JSON.parse(await promises.readFile(packageJsonPath, "utf8"));
    const scripts = parsed == null ? void 0 : parsed.scripts;
    if (!scripts || typeof scripts !== "object") return null;
    const clean = {};
    for (const [name, body] of Object.entries(scripts)) {
      if (typeof body === "string") clean[name] = body;
    }
    return clean;
  } catch {
    return null;
  }
}
async function indexScripts() {
  const projects = getProjects();
  const scripts = [];
  const warnings = [];
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
        runCommand: `${prefix} ${scriptName}`
      });
    }
  }
  const nameCounts = /* @__PURE__ */ new Map();
  for (const script of scripts) {
    nameCounts.set(script.scriptName, (nameCounts.get(script.scriptName) ?? 0) + 1);
  }
  const sharedNames = [...nameCounts.entries()].filter(([, count]) => count > 1).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([name]) => name);
  scripts.sort(
    (a, b) => a.projectName.localeCompare(b.projectName) || a.scriptName.localeCompare(b.scriptName)
  );
  return { scripts, projectsIndexed, sharedNames, warnings };
}
async function runScript(projectId, scriptName) {
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
const EMPTY = {
  isRepository: false,
  modifiedFiles: 0,
  untrackedFiles: 0,
  ahead: 0,
  behind: 0
};
function looksLikeRepository(projectPath) {
  return fs.existsSync(path.join(projectPath, ".git"));
}
async function git(projectPath, args, timeoutMs = 8e3) {
  return capture("git", ["-C", projectPath, ...args], timeoutMs);
}
async function readGitSnapshot(projectPath) {
  if (!looksLikeRepository(projectPath)) return { ...EMPTY };
  const snapshot = { ...EMPTY, isRepository: true };
  try {
    const { stdout, code } = await git(projectPath, ["rev-parse", "--abbrev-ref", "HEAD"]);
    if (code === 0) {
      const branch = stdout.trim();
      if (branch) snapshot.branch = branch;
    }
  } catch {
    return { ...EMPTY, isRepository: true };
  }
  try {
    const { stdout, code } = await git(projectPath, ["status", "--porcelain"]);
    if (code === 0) {
      for (const line of stdout.split(/\r?\n/)) {
        if (!line.trim()) continue;
        if (line.startsWith("??")) snapshot.untrackedFiles += 1;
        else snapshot.modifiedFiles += 1;
      }
    }
  } catch {
  }
  try {
    const { stdout, code } = await git(projectPath, [
      "rev-list",
      "--count",
      "--left-right",
      "@{upstream}...HEAD"
    ]);
    if (code === 0) {
      const [behind, ahead] = stdout.trim().split(/\s+/).map(Number);
      if (Number.isFinite(behind)) snapshot.behind = behind;
      if (Number.isFinite(ahead)) snapshot.ahead = ahead;
    }
  } catch {
  }
  try {
    const { stdout, code } = await git(projectPath, [
      "log",
      "-1",
      "--format=%ct%x00%s"
    ]);
    if (code === 0 && stdout.trim()) {
      const [seconds, message] = stdout.trim().split("\0");
      const timestamp = Number(seconds);
      if (Number.isFinite(timestamp)) snapshot.lastCommitAt = timestamp * 1e3;
      if (message) snapshot.lastCommitMessage = message.trim();
    }
  } catch {
  }
  return snapshot;
}
async function isGitAvailable() {
  try {
    const { code } = await capture("git", ["--version"], 5e3);
    return code === 0;
  } catch {
    return false;
  }
}
function parseRepositoryName(url) {
  const trimmed = url.trim();
  const scpMatch = /^[A-Za-z0-9_.-]+@[A-Za-z0-9_.-]+:(.+)$/.exec(trimmed);
  const pathPart = scpMatch ? scpMatch[1] : null;
  let candidate = pathPart;
  if (!candidate) {
    try {
      const parsed = new URL(trimmed);
      if (!["https:", "http:", "ssh:", "git:"].includes(parsed.protocol)) return null;
      candidate = parsed.pathname;
    } catch {
      return null;
    }
  }
  const last = candidate.split("/").filter(Boolean).pop();
  if (!last) return null;
  const name = last.replace(/\.git$/i, "");
  if (!/^[A-Za-z0-9._-]+$/.test(name) || name === "." || name === "..") return null;
  return name;
}
function validateCloneUrl(url) {
  const trimmed = url.trim();
  if (!trimmed) return { valid: false, reason: "Enter a repository URL." };
  if (/[\r\n\0]/.test(trimmed)) {
    return { valid: false, reason: "That URL contains invalid characters." };
  }
  if (trimmed.startsWith("-")) {
    return { valid: false, reason: "That URL is not valid." };
  }
  if (/^(ext|file|fd)::/i.test(trimmed) || trimmed.startsWith("file://")) {
    return { valid: false, reason: "Only http(s) and ssh remotes can be cloned." };
  }
  const isScp = /^[A-Za-z0-9_.-]+@[A-Za-z0-9_.-]+:.+$/.test(trimmed);
  if (!isScp) {
    let parsed;
    try {
      parsed = new URL(trimmed);
    } catch {
      return { valid: false, reason: "That is not a valid repository URL." };
    }
    if (!["https:", "http:", "ssh:", "git:"].includes(parsed.protocol)) {
      return { valid: false, reason: "Only http(s) and ssh remotes can be cloned." };
    }
  }
  if (!parseRepositoryName(trimmed)) {
    return { valid: false, reason: "Could not work out a folder name from that URL." };
  }
  return { valid: true };
}
const DAY_MS = 24 * 60 * 60 * 1e3;
const STALE_COMMIT_DAYS = 90;
const NEVER_OPENED_DAYS = 60;
const LOCKFILES = [
  "pnpm-lock.yaml",
  "yarn.lock",
  "bun.lockb",
  "bun.lock",
  "package-lock.json"
];
function daysBetween(from, to) {
  if (!from) return null;
  return Math.floor((to - from) / DAY_MS);
}
async function readPackageState(projectPath) {
  const packageJsonPath = path.join(projectPath, "package.json");
  const hasPackageJson = fs.existsSync(packageJsonPath);
  if (!hasPackageJson) {
    return { hasPackageJson, hasNodeModules: false, lockfileName: void 0, lockfileDrift: false };
  }
  const hasNodeModules = fs.existsSync(path.join(projectPath, "node_modules"));
  const lockfileName = LOCKFILES.find((name) => fs.existsSync(path.join(projectPath, name)));
  let lockfileDrift = false;
  if (lockfileName) {
    try {
      const [pkgStat, lockStat] = await Promise.all([
        promises.stat(packageJsonPath),
        promises.stat(path.join(projectPath, lockfileName))
      ]);
      lockfileDrift = pkgStat.mtimeMs - lockStat.mtimeMs > 6e4;
    } catch {
      lockfileDrift = false;
    }
  }
  return { hasPackageJson, hasNodeModules, lockfileName, lockfileDrift };
}
function evaluate(entry) {
  const issues = [];
  let score = 0;
  const add = (issue, weight) => {
    issues.push(issue);
    score += weight;
  };
  if (!entry.pathExists) {
    add(
      {
        kind: "path-missing",
        severity: "high",
        label: "Folder missing",
        detail: "The project folder no longer exists on disk."
      },
      100
    );
    return { issues, score };
  }
  if (entry.isRepository) {
    const dirty = entry.modifiedFiles + entry.untrackedFiles;
    if (dirty > 0) {
      add(
        {
          kind: "uncommitted-changes",
          severity: dirty > 20 ? "high" : "medium",
          label: `${dirty} uncommitted`,
          detail: `${entry.modifiedFiles} modified, ${entry.untrackedFiles} untracked. This work only exists on this machine.`
        },
        Math.min(dirty, 30) + 10
      );
    }
    if (entry.ahead > 0) {
      add(
        {
          kind: "unpushed-commits",
          severity: entry.ahead > 5 ? "high" : "medium",
          label: `${entry.ahead} unpushed`,
          detail: `${entry.ahead} commit${entry.ahead === 1 ? "" : "s"} on ${entry.branch ?? "this branch"} have not been pushed.`
        },
        entry.ahead * 3 + 10
      );
    }
    if (entry.daysSinceCommit !== null && entry.daysSinceCommit >= STALE_COMMIT_DAYS) {
      add(
        {
          kind: "stale-commits",
          severity: "low",
          label: `${entry.daysSinceCommit}d since commit`,
          detail: `Last commit was ${entry.daysSinceCommit} days ago.`
        },
        5
      );
    }
  } else {
    add(
      {
        kind: "no-git",
        severity: "low",
        label: "Not a repo",
        detail: "This folder is not under version control."
      },
      4
    );
  }
  if (entry.hasPackageJson && !entry.hasNodeModules) {
    add(
      {
        kind: "deps-not-installed",
        severity: "medium",
        label: "Deps not installed",
        detail: "package.json exists but node_modules is missing. Install before running."
      },
      15
    );
  }
  if (entry.lockfileDrift) {
    add(
      {
        kind: "lockfile-drift",
        severity: "medium",
        label: "Lockfile behind",
        detail: `package.json is newer than ${entry.lockfileName}. Dependencies may be out of sync.`
      },
      12
    );
  }
  if (entry.daysSinceOpened === null) {
    add(
      {
        kind: "never-opened",
        severity: "low",
        label: "Never opened",
        detail: "This project has never been opened from Dev Launcher."
      },
      2
    );
  } else if (entry.daysSinceOpened >= NEVER_OPENED_DAYS) {
    add(
      {
        kind: "never-opened",
        severity: "low",
        label: `${entry.daysSinceOpened}d untouched`,
        detail: `Not opened from Dev Launcher in ${entry.daysSinceOpened} days.`
      },
      3
    );
  }
  return { issues, score };
}
async function scanRadar(onProgress) {
  const projects = getProjects();
  const warnings = [];
  const entries = [];
  const gitAvailable = await isGitAvailable();
  if (!gitAvailable) {
    warnings.push("git was not found on your PATH, so repository checks were skipped.");
  }
  const now = Date.now();
  for (let i = 0; i < projects.length; i += 1) {
    const project = projects[i];
    onProgress == null ? void 0 : onProgress({
      current: i + 1,
      total: projects.length,
      projectName: project.name,
      done: false
    });
    const pathExists = Boolean(project.path) && fs.existsSync(project.path);
    const git2 = pathExists && gitAvailable ? await readGitSnapshot(project.path) : {
      isRepository: pathExists ? fs.existsSync(path.join(project.path, ".git")) : false,
      modifiedFiles: 0,
      untrackedFiles: 0,
      ahead: 0,
      behind: 0,
      branch: void 0,
      lastCommitAt: void 0,
      lastCommitMessage: void 0
    };
    const pkg = pathExists ? await readPackageState(project.path) : { hasPackageJson: false, hasNodeModules: false, lockfileName: void 0, lockfileDrift: false };
    const base = {
      projectId: project.id,
      projectName: project.name,
      projectPath: project.path,
      pathExists,
      isRepository: git2.isRepository,
      branch: git2.branch,
      modifiedFiles: git2.modifiedFiles,
      untrackedFiles: git2.untrackedFiles,
      ahead: git2.ahead,
      behind: git2.behind,
      lastCommitAt: git2.lastCommitAt,
      lastCommitMessage: git2.lastCommitMessage,
      daysSinceCommit: daysBetween(git2.lastCommitAt, now),
      hasPackageJson: pkg.hasPackageJson,
      hasNodeModules: pkg.hasNodeModules,
      lockfileName: pkg.lockfileName,
      lockfileDrift: pkg.lockfileDrift,
      lastOpenedAt: project.lastOpenedAt,
      daysSinceOpened: daysBetween(project.lastOpenedAt, now)
    };
    const { issues, score } = evaluate(base);
    entries.push({ ...base, issues, score });
  }
  onProgress == null ? void 0 : onProgress({ current: projects.length, total: projects.length, projectName: "", done: true });
  entries.sort((a, b) => b.score - a.score || a.projectName.localeCompare(b.projectName));
  return {
    entries,
    scannedAt: now,
    healthyCount: entries.filter((e) => e.issues.length === 0).length,
    needsAttentionCount: entries.filter(
      (e) => e.issues.some((i) => i.severity === "high" || i.severity === "medium")
    ).length,
    warnings
  };
}
const INSTALL_COMMANDS = [
  { lockfile: "pnpm-lock.yaml", command: "pnpm install" },
  { lockfile: "yarn.lock", command: "yarn install" },
  { lockfile: "bun.lockb", command: "bun install" },
  { lockfile: "bun.lock", command: "bun install" },
  { lockfile: "package-lock.json", command: "npm install" }
];
function runClone(url, destination, onLine) {
  return new Promise((resolve, reject) => {
    var _a, _b;
    const child = spawn(
      "git",
      ["clone", "--progress", "--", url, destination],
      {
        shell: false,
        windowsHide: true,
        // Stop git from popping a GUI credential prompt that would hang us.
        env: { ...process.env, GIT_TERMINAL_PROMPT: "0", GCM_INTERACTIVE: "never" }
      }
    );
    let stderrTail = "";
    const consume = (chunk) => {
      const text = chunk.toString();
      stderrTail = (stderrTail + text).slice(-4e3);
      for (const line of text.split(/\r?\n|\r/)) {
        const trimmed = line.trim();
        if (trimmed) onLine(trimmed);
      }
    };
    (_a = child.stdout) == null ? void 0 : _a.on("data", consume);
    (_b = child.stderr) == null ? void 0 : _b.on("data", consume);
    child.on("error", (err) => {
      reject(
        err.code === "ENOENT" ? new Error("git was not found on your PATH.") : err
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
async function cloneAndSetup(request, onProgress) {
  const warnings = [];
  const report = (phase, message, detail, done = false) => onProgress == null ? void 0 : onProgress({ phase, message, detail, done });
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
  const requestedName = String(request.folderName ?? "").trim();
  const folderName = requestedName || parseRepositoryName(url);
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
  report("cloning", `Cloning into ${folderName}...`);
  try {
    await runClone(url, destination, (line) => {
      report("cloning", `Cloning into ${folderName}...`, line);
    });
  } catch (e) {
    try {
      if (fs.existsSync(destination)) {
        await promises.rm(destination, { recursive: true, force: true, maxRetries: 2 });
      }
    } catch {
      warnings.push(`A partial clone may remain at ${destination}.`);
    }
    throw e;
  }
  report("detecting", "Detecting the project stack...");
  let detected;
  try {
    detected = detectProjectMeta(destination);
  } catch (e) {
    warnings.push(`Stack detection failed: ${e.message}`);
    detected = {
      name: folderName,
      tags: [],
      commands: [],
      details: {
        languages: [],
        frameworks: [],
        hasGit: true,
        hasDocker: false
      }
    };
  }
  report("registering", "Adding it to your projects...");
  const project = addProject({
    name: detected.name || folderName,
    path: destination,
    description: detected.description,
    tags: detected.tags,
    isFavorite: false,
    commands: detected.commands.map((c) => ({ ...c, id: c.id || generateId("cmd") }))
  });
  let installStarted = false;
  if (request.installDependencies) {
    const match = INSTALL_COMMANDS.find(
      ({ lockfile }) => fs.existsSync(path.join(destination, lockfile))
    );
    const hasPackageJson = fs.existsSync(path.join(destination, "package.json"));
    if (!hasPackageJson) {
      warnings.push("No package.json found, so dependencies were not installed.");
    } else {
      const command = (match == null ? void 0 : match.command) ?? "npm install";
      report("installing", `Running ${command}...`);
      try {
        await runCommandInTerminal(command, destination);
        installStarted = true;
      } catch (e) {
        warnings.push(`Could not start the install: ${e.message}`);
      }
    }
  }
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
        warnings.push(e.message);
      }
    }
  }
  report("done", `${project.name} is ready.`, void 0, true);
  return {
    projectId: project.id,
    projectName: project.name,
    projectPath: destination,
    detectedTags: detected.tags,
    commandCount: detected.commands.length,
    installStarted,
    editorOpened,
    warnings
  };
}
const MAX_DELETE_TARGETS = 200;
function broadcast(channel, payload) {
  for (const win2 of BrowserWindow.getAllWindows()) {
    if (!win2.isDestroyed()) win2.webContents.send(channel, payload);
  }
}
function registerToolsIPC() {
  ipcMain.handle(
    "tools:scanDisk",
    handler("tools:scanDisk", async (_unused, event) => {
      return scanNodeModules((progress) => broadcast("tools:diskScanProgress", progress));
    })
  );
  ipcMain.handle(
    "tools:deleteModules",
    handler("tools:deleteModules", (targets) => {
      if (!Array.isArray(targets)) {
        throw new Error("Expected a list of folders to delete.");
      }
      if (targets.length === 0) {
        throw new Error("Nothing was selected.");
      }
      if (targets.length > MAX_DELETE_TARGETS) {
        throw new Error(`Too many folders selected (limit ${MAX_DELETE_TARGETS}).`);
      }
      const paths = targets.map((t, i) => requireString(t, `Target ${i + 1}`));
      return deleteNodeModules(paths);
    })
  );
  ipcMain.handle(
    "tools:listPorts",
    handler("tools:listPorts", () => listPorts())
  );
  ipcMain.handle(
    "tools:killPort",
    handler("tools:killPort", (pid, port) => {
      if (typeof pid !== "number" || !Number.isInteger(pid) || pid <= 0) {
        throw new Error("Invalid process id.");
      }
      if (typeof port !== "number" || !Number.isInteger(port) || port <= 0 || port > 65535) {
        throw new Error("Invalid port number.");
      }
      return killByPid(pid, port);
    })
  );
  ipcMain.handle(
    "tools:auditEnv",
    handler(
      "tools:auditEnv",
      (projectId) => auditEnvironments(
        projectId === void 0 || projectId === null ? void 0 : requireId(projectId, "Project id")
      )
    )
  );
  ipcMain.handle(
    "tools:indexScripts",
    handler("tools:indexScripts", () => indexScripts())
  );
  ipcMain.handle(
    "tools:runScript",
    handler("tools:runScript", async (projectId, scriptName) => {
      const name = requireString(scriptName, "Script name");
      if (!/^[A-Za-z0-9_.:\-/ ]{1,120}$/.test(name)) {
        throw new Error("That script name contains unsupported characters.");
      }
      const { command } = await runScript(requireId(projectId, "Project id"), name);
      return { command };
    })
  );
  ipcMain.handle(
    "tools:scanRadar",
    handler(
      "tools:scanRadar",
      () => scanRadar((progress) => broadcast("tools:radarProgress", progress))
    )
  );
  ipcMain.handle(
    "tools:validateCloneUrl",
    handler(
      "tools:validateCloneUrl",
      (url) => validateCloneUrl(typeof url === "string" ? url : "")
    )
  );
  ipcMain.handle(
    "tools:clone",
    handler("tools:clone", (request) => {
      const input = requireObject(request, "Clone request");
      return cloneAndSetup(
        {
          url: requireString(input.url, "Repository URL"),
          destinationParent: requireString(input.destinationParent, "Destination folder"),
          folderName: typeof input.folderName === "string" && input.folderName.trim() ? input.folderName.trim() : void 0,
          installDependencies: optionalBoolean(
            input.installDependencies,
            "Install dependencies flag"
          ),
          openInEditor: typeof input.openInEditor === "string" && input.openInEditor ? input.openInEditor : void 0
        },
        (progress) => broadcast("tools:cloneProgress", progress)
      );
    })
  );
}
const VALID_KINDS = ["editor", "command", "terminal", "folder", "url"];
const MAX_STEPS = 30;
function sanitizeSteps(raw) {
  if (!Array.isArray(raw)) throw new Error("Steps must be an array.");
  if (raw.length > MAX_STEPS) throw new Error(`A session can hold at most ${MAX_STEPS} steps.`);
  return raw.map((entry, index) => {
    const step = requireObject(entry, `Step ${index + 1}`);
    const kind = String(step.kind ?? "");
    if (!VALID_KINDS.includes(kind)) {
      throw new Error(`Step ${index + 1} has an unknown type.`);
    }
    return {
      id: typeof step.id === "string" ? step.id : "",
      kind,
      target: typeof step.target === "string" ? step.target : "",
      label: typeof step.label === "string" ? step.label : kind,
      delayMs: Number(step.delayMs) || 0,
      enabled: step.enabled !== false,
      sortOrder: index
    };
  });
}
function registerSessionIPC() {
  ipcMain.handle(
    "sessions:get",
    handler(
      "sessions:get",
      (projectId) => getSession(requireId(projectId, "Project id"))
    )
  );
  ipcMain.handle(
    "sessions:getAll",
    handler("sessions:getAll", () => {
      pruneSessions();
      return getAllSessions();
    })
  );
  ipcMain.handle(
    "sessions:update",
    handler("sessions:update", (projectId, updates) => {
      const patch = requireObject(updates, "Updates");
      return updateSession(requireId(projectId, "Project id"), {
        steps: patch.steps === void 0 ? void 0 : sanitizeSteps(patch.steps),
        autoCapture: patch.autoCapture === void 0 ? void 0 : optionalBoolean(patch.autoCapture, "Auto capture")
      });
    })
  );
  ipcMain.handle(
    "sessions:clear",
    handler(
      "sessions:clear",
      (projectId) => clearSession(requireId(projectId, "Project id"))
    )
  );
  ipcMain.handle(
    "sessions:resume",
    handler("sessions:resume", async (projectId) => {
      const windows = BrowserWindow.getAllWindows();
      return resumeSession(requireId(projectId, "Project id"), (progress) => {
        for (const win2 of windows) {
          if (!win2.isDestroyed()) win2.webContents.send("sessions:resumeProgress", progress);
        }
      });
    })
  );
}
const OVERLAY_WIDTH = 720;
const OVERLAY_HEIGHT = 460;
const SHORTCUT_CANDIDATES = [
  "CommandOrControl+Space",
  "Alt+Space",
  "CommandOrControl+Shift+Space"
];
let overlayWindow = null;
let registeredShortcut = null;
function getRegisteredShortcut() {
  return registeredShortcut;
}
function buildOverlayWindow(preloadPath, devServerUrl, rendererDist) {
  const win2 = new BrowserWindow({
    width: OVERLAY_WIDTH,
    height: OVERLAY_HEIGHT,
    show: false,
    frame: false,
    transparent: true,
    backgroundColor: "#00000000",
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    // Keep it out of the window list; it is a transient palette, not an app
    // window the user should be able to alt-tab into.
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });
  win2.setAlwaysOnTop(true, "floating");
  win2.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  if (devServerUrl) {
    win2.loadURL(`${devServerUrl}#/overlay`);
  } else if (rendererDist) {
    win2.loadFile(path.join(rendererDist, "index.html"), { hash: "/overlay" });
  }
  win2.on("close", (event) => {
    event.preventDefault();
    win2.hide();
  });
  win2.on("blur", () => {
    if (win2.isVisible()) win2.hide();
  });
  return win2;
}
function positionOnActiveDisplay(win2) {
  const cursor = screen.getCursorScreenPoint();
  const display = screen.getDisplayNearestPoint(cursor);
  const { x, y, width, height } = display.workArea;
  win2.setBounds({
    x: Math.round(x + (width - OVERLAY_WIDTH) / 2),
    // Slightly above centre reads better than dead centre.
    y: Math.round(y + Math.max(60, (height - OVERLAY_HEIGHT) / 3)),
    width: OVERLAY_WIDTH,
    height: OVERLAY_HEIGHT
  });
}
function showOverlay() {
  if (!overlayWindow || overlayWindow.isDestroyed()) return;
  positionOnActiveDisplay(overlayWindow);
  overlayWindow.show();
  overlayWindow.focus();
  overlayWindow.webContents.send("overlay:shown");
}
function hideOverlay() {
  if (overlayWindow && !overlayWindow.isDestroyed() && overlayWindow.isVisible()) {
    overlayWindow.hide();
  }
}
function toggleOverlay() {
  if (!overlayWindow || overlayWindow.isDestroyed()) return;
  if (overlayWindow.isVisible()) hideOverlay();
  else showOverlay();
}
function initOverlay(options) {
  overlayWindow = buildOverlayWindow(
    options.preloadPath,
    options.devServerUrl,
    options.rendererDist
  );
  for (const accelerator of SHORTCUT_CANDIDATES) {
    try {
      if (globalShortcut.register(accelerator, toggleOverlay)) {
        registeredShortcut = accelerator;
        break;
      }
    } catch {
    }
  }
  if (!registeredShortcut) {
    console.warn("Could not register a global launcher shortcut; all candidates were taken.");
  } else {
    console.log(`Global launcher bound to ${registeredShortcut}`);
  }
  return registeredShortcut;
}
function teardownOverlay() {
  globalShortcut.unregisterAll();
  registeredShortcut = null;
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    overlayWindow.removeAllListeners("close");
    overlayWindow.destroy();
  }
  overlayWindow = null;
}
function registerOverlayIPC(getMainWindow) {
  ipcMain.handle(
    "overlay:hide",
    handler("overlay:hide", () => {
      hideOverlay();
      return true;
    })
  );
  ipcMain.handle(
    "overlay:getShortcut",
    handler("overlay:getShortcut", () => getRegisteredShortcut())
  );
  ipcMain.handle(
    "overlay:focusMain",
    handler("overlay:focusMain", (route) => {
      hideOverlay();
      const main = getMainWindow();
      if (!main || main.isDestroyed()) return false;
      if (main.isMinimized()) main.restore();
      main.show();
      main.focus();
      if (typeof route === "string" && /^\/[A-Za-z0-9?=&/_-]*$/.test(route)) {
        main.webContents.send("overlay:navigate", route);
      }
      return true;
    })
  );
}
const __dirname$1 = path.dirname(fileURLToPath(import.meta.url));
process.env.APP_ROOT = path.join(__dirname$1, "..");
const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
const MAIN_DIST = path.join(process.env.APP_ROOT, "dist-electron");
const RENDERER_DIST = path.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, "public") : RENDERER_DIST;
let win;
function createWindow() {
  win = new BrowserWindow({
    icon: path.join(process.env.VITE_PUBLIC, "electron-vite.svg"),
    width: 1280,
    height: 820,
    minWidth: 940,
    minHeight: 600,
    backgroundColor: "#181818",
    webPreferences: {
      preload: path.join(__dirname$1, "preload.mjs"),
      // Set explicitly rather than relying on Electron's defaults, so a major
      // version bump can never silently weaken the sandbox.
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webviewTag: false
    }
  });
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("http://") || url.startsWith("https://")) {
      shell.openExternal(url);
    }
    return { action: "deny" };
  });
  win.webContents.on("will-navigate", (event, url) => {
    const isDevServer = VITE_DEV_SERVER_URL && url.startsWith(VITE_DEV_SERVER_URL);
    if (!isDevServer && !url.startsWith("file://")) {
      event.preventDefault();
      if (url.startsWith("http://") || url.startsWith("https://")) {
        shell.openExternal(url);
      }
    }
  });
  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(path.join(RENDERER_DIST, "index.html"));
  }
}
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
    win = null;
  }
});
app.on("will-quit", teardownOverlay);
app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
app.whenReady().then(() => {
  registerProjectIPC();
  registerGroupIPC();
  registerDialogIPC();
  registerToolsIPC();
  registerSessionIPC();
  registerOverlayIPC(() => win);
  createWindow();
  initOverlay({
    preloadPath: path.join(__dirname$1, "preload.mjs"),
    devServerUrl: VITE_DEV_SERVER_URL,
    rendererDist: RENDERER_DIST
  });
});
export {
  MAIN_DIST,
  RENDERER_DIST,
  VITE_DEV_SERVER_URL
};
