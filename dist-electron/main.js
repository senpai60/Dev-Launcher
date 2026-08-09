import { app, ipcMain, BrowserWindow } from "electron";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path, { join } from "node:path";
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { exec } from "child_process";
const dataDir = () => {
  const dir = join(app.getPath("userData"), "DevLauncher");
  mkdirSync(dir, { recursive: true });
  return dir;
};
console.log(app.getPath("userData"));
const dataPath = (filename) => {
  return join(dataDir(), `${filename}.json`);
};
const readData = (filename) => {
  try {
    const data = readFileSync(dataPath(filename), "utf8");
    return JSON.parse(data);
  } catch {
    return [];
  }
};
const writeData = (filename, data) => {
  try {
    writeFileSync(dataPath(filename), JSON.stringify(data));
  } catch (e) {
    console.error("Error saving data:", e);
  }
};
function readProjects() {
  try {
    return readData("projects");
  } catch {
    return [];
  }
}
function writeProjects(projects) {
  writeData("projects", projects);
}
function openInVsCode(projectPath, newWindow = false, cb) {
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
function openInCursor(projectPath, cb) {
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
function openInAntigravity(projectPath, cb) {
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
function openTerminal(projectPath, cb) {
  const absolutePath = path.resolve(projectPath);
  const command = `start cmd /k cd "${absolutePath}"`;
  exec(command, (err, stdout, stderr) => {
    if (err) {
      console.error(`error opening terminal: ${stderr}`, err);
      if (cb) cb(err, null);
      return;
    }
    console.log("terminal opend successfully", absolutePath);
    if (cb) cb(null, stdout);
  });
}
function openInExplorer(projectPath, cb) {
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
function getProjects() {
  return readProjects();
}
function getProject(id) {
  const projects = readProjects();
  return projects.find((project) => project.id === id);
}
function addProject(project) {
  const projects = readProjects();
  projects.push(project);
  writeProjects(projects);
  return project;
}
function updateProject(id, updates) {
  const projects = readProjects();
  const index = projects.findIndex((project) => project.id === id);
  if (index === -1) {
    return void 0;
  }
  const updatedProject = {
    ...projects[index],
    ...updates
  };
  projects[index] = updatedProject;
  writeProjects(projects);
  return updatedProject;
}
function deleteProject(id) {
  const projects = readProjects();
  const filteredProjects = projects.filter((project) => project.id !== id);
  if (filteredProjects.length === projects.length) {
    return false;
  }
  writeProjects(filteredProjects);
  return true;
}
function launchProject(id, action, newWindow = false, cb) {
  const project = getProject(id);
  if (!project) {
    if (cb) cb(new Error("Project not found"), null);
    return;
  }
  try {
    const projectPath = project.path;
    switch (action.toLowerCase()) {
      case "open-in-vscode":
      case "vscode":
        openInVsCode(projectPath, newWindow, cb);
        break;
      case "open-in-cursor":
      case "cursor":
        openInCursor(projectPath, cb);
        break;
      case "open-in-antigravity":
      case "antigravity":
        openInAntigravity(projectPath, cb);
        break;
      case "open-in-terminal":
      case "terminal":
        openTerminal(projectPath, cb);
        break;
      case "folder":
      case "explorer":
      default:
        openInExplorer(projectPath, cb);
        break;
    }
  } catch (error) {
    cb(error, null);
  }
}
function registerProjectIPC() {
  ipcMain.handle("projects:getAll", () => {
    return getProjects();
  });
  ipcMain.handle("projects:get", (_, id) => {
    return getProject(id);
  });
  ipcMain.handle("projects:add", (_, project) => {
    return addProject(project);
  });
  ipcMain.handle("projects:update", (_, id, updates) => {
    return updateProject(id, updates);
  });
  ipcMain.handle("projects:delete", (_, id) => {
    return deleteProject(id);
  });
  ipcMain.handle("projects:launch", async (_, id, action) => {
    return new Promise((resolve, reject) => {
      launchProject(id, action, false, (error, stdout) => {
        if (error) {
          reject(error);
        } else {
          resolve(stdout);
        }
      });
    });
  });
}
createRequire(import.meta.url);
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
    webPreferences: {
      preload: path.join(__dirname$1, "preload.mjs")
    }
  });
  win.webContents.on("did-finish-load", () => {
    win == null ? void 0 : win.webContents.send("main-process-message", (/* @__PURE__ */ new Date()).toLocaleString());
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
app.whenReady().then(createWindow);
registerProjectIPC();
export {
  MAIN_DIST,
  RENDERER_DIST,
  VITE_DEV_SERVER_URL
};
