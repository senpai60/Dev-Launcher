import { app, ipcMain, BrowserWindow, dialog, shell } from "electron";
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
function editorSpec(editorKey, absolutePath, newWindow) {
  const editor = EDITOR_BINARIES[editorKey];
  if (!editor) return null;
  const args = editorKey === "vscode" ? [newWindow ? "-n" : "-r", absolutePath] : [absolutePath];
  return {
    command: isWindows ? `${editor.bin}.cmd` : editor.bin,
    args,
    detached: false
  };
}
function shellQuote(value) {
  return value.replace(/(["\s'$`\\])/g, "\\$1");
}
function run(spec, cwd) {
  return new Promise((resolve, reject) => {
    let child;
    try {
      child = spawn(spec.command, spec.args, {
        cwd,
        shell: false,
        detached: spec.detached,
        stdio: "ignore",
        windowsHide: false
      });
    } catch (e) {
      reject(e);
      return;
    }
    let settled = false;
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
      } else {
        reject(new Error(`"${spec.command}" exited with code ${code}.`));
      }
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
    if (message.includes("was not found on your PATH")) {
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
  const project = requireProject(id);
  const normalized = action.toLowerCase();
  if (!fs.existsSync(project.path)) {
    throw new Error(`The folder "${project.path}" no longer exists.`);
  }
  let result;
  const editorKey = EDITOR_ACTIONS[normalized];
  if (editorKey) {
    result = await openInEditor(editorKey, project.path, newWindow);
  } else if (normalized === "terminal" || normalized === "open-in-terminal") {
    result = await openTerminal(project.path);
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
const DAY_MS = 24 * 60 * 60 * 1e3;
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
      const daysSinceOpened = project.lastOpenedAt ? Math.floor((Date.now() - project.lastOpenedAt) / DAY_MS) : null;
      const daysSinceModified = stats.lastModified ? Math.floor((Date.now() - stats.lastModified) / DAY_MS) : null;
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
const LOCKFILES = [
  { file: "pnpm-lock.yaml", manager: "pnpm", prefix: "pnpm" },
  { file: "yarn.lock", manager: "yarn", prefix: "yarn" },
  { file: "bun.lockb", manager: "bun", prefix: "bun run" },
  { file: "bun.lock", manager: "bun", prefix: "bun run" },
  { file: "package-lock.json", manager: "npm", prefix: "npm run" }
];
function detectRunner(projectPath) {
  for (const { file, manager, prefix } of LOCKFILES) {
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
const MAX_DELETE_TARGETS = 200;
function registerToolsIPC() {
  ipcMain.handle(
    "tools:scanDisk",
    handler("tools:scanDisk", async (_unused, event) => {
      const windows = BrowserWindow.getAllWindows();
      return scanNodeModules((progress) => {
        for (const win2 of windows) {
          if (!win2.isDestroyed()) win2.webContents.send("tools:diskScanProgress", progress);
        }
      });
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
  createWindow();
});
export {
  MAIN_DIST,
  RENDERER_DIST,
  VITE_DEV_SERVER_URL
};
