"use strict";
const electron = require("electron");
const projectAPI = {
  getAll: () => electron.ipcRenderer.invoke("projects:getAll"),
  get: (id) => electron.ipcRenderer.invoke("projects:get", id),
  add: (project) => electron.ipcRenderer.invoke("projects:add", project),
  update: (id, data) => electron.ipcRenderer.invoke("projects:update", id, data),
  delete: (id) => electron.ipcRenderer.invoke("projects:delete", id),
  detect: (folderPath) => electron.ipcRenderer.invoke("projects:detect", folderPath),
  /* Phase 5 — commands are addressed by id; the renderer never sends a
     command string to be executed. */
  seedCommands: (projectId, commands) => electron.ipcRenderer.invoke("projects:seedCommands", projectId, commands),
  addCommand: (projectId, command) => electron.ipcRenderer.invoke("projects:addCommand", projectId, command),
  updateCommand: (projectId, commandId, updates) => electron.ipcRenderer.invoke("projects:updateCommand", projectId, commandId, updates),
  deleteCommand: (projectId, commandId) => electron.ipcRenderer.invoke("projects:deleteCommand", projectId, commandId),
  runCommand: (projectId, commandId, confirmedDestructive) => electron.ipcRenderer.invoke("projects:runCommand", projectId, commandId, confirmedDestructive ?? false),
  inspectCommand: (projectId, commandId) => electron.ipcRenderer.invoke("projects:inspectCommand", projectId, commandId),
  validateCommand: (draft, projectPath) => electron.ipcRenderer.invoke("projects:validateCommand", draft, projectPath),
  launch: (id, action, newWindow) => electron.ipcRenderer.invoke("projects:launch", id, action, newWindow ?? false)
};
const groupAPI = {
  getAll: () => electron.ipcRenderer.invoke("groups:getAll"),
  get: (id) => electron.ipcRenderer.invoke("groups:get", id),
  add: (group) => electron.ipcRenderer.invoke("groups:add", group),
  update: (id, updates) => electron.ipcRenderer.invoke("groups:update", id, updates),
  delete: (id) => electron.ipcRenderer.invoke("groups:delete", id)
};
const systemAPI = {
  /** Opens the native directory picker. Resolves to null when cancelled. */
  selectFolder: (defaultPath) => electron.ipcRenderer.invoke("dialog:selectFolder", defaultPath),
  pathExists: (target) => electron.ipcRenderer.invoke("dialog:pathExists", target),
  openExternal: (url) => electron.ipcRenderer.invoke("shell:openExternal", url)
};
const toolsAPI = {
  /* Disk reclaimer */
  scanDisk: () => electron.ipcRenderer.invoke("tools:scanDisk"),
  deleteModules: (targets) => electron.ipcRenderer.invoke("tools:deleteModules", targets),
  /**
   * Subscribes to scan progress. Returns an unsubscribe function so React
   * effects can clean up without exposing the raw emitter.
   */
  onDiskScanProgress: (callback) => {
    const listener = (_event, progress) => callback(progress);
    electron.ipcRenderer.on("tools:diskScanProgress", listener);
    return () => {
      electron.ipcRenderer.removeListener("tools:diskScanProgress", listener);
    };
  },
  /* Port manager */
  listPorts: () => electron.ipcRenderer.invoke("tools:listPorts"),
  killPort: (pid, port) => electron.ipcRenderer.invoke("tools:killPort", pid, port),
  /* Environment doctor */
  auditEnv: (projectId) => electron.ipcRenderer.invoke("tools:auditEnv", projectId),
  /* Script index */
  indexScripts: () => electron.ipcRenderer.invoke("tools:indexScripts"),
  runScript: (projectId, scriptName) => electron.ipcRenderer.invoke("tools:runScript", projectId, scriptName),
  /* Stale project radar */
  scanRadar: () => electron.ipcRenderer.invoke("tools:scanRadar"),
  onRadarProgress: (callback) => {
    const listener = (_event, progress) => callback(progress);
    electron.ipcRenderer.on("tools:radarProgress", listener);
    return () => {
      electron.ipcRenderer.removeListener("tools:radarProgress", listener);
    };
  },
  /* Clone to running */
  validateCloneUrl: (url) => electron.ipcRenderer.invoke("tools:validateCloneUrl", url),
  clone: (request) => electron.ipcRenderer.invoke("tools:clone", request),
  onCloneProgress: (callback) => {
    const listener = (_event, progress) => callback(progress);
    electron.ipcRenderer.on("tools:cloneProgress", listener);
    return () => {
      electron.ipcRenderer.removeListener("tools:cloneProgress", listener);
    };
  }
};
const sessionAPI = {
  get: (projectId) => electron.ipcRenderer.invoke("sessions:get", projectId),
  getAll: () => electron.ipcRenderer.invoke("sessions:getAll"),
  update: (projectId, updates) => electron.ipcRenderer.invoke("sessions:update", projectId, updates),
  clear: (projectId) => electron.ipcRenderer.invoke("sessions:clear", projectId),
  resume: (projectId) => electron.ipcRenderer.invoke("sessions:resume", projectId),
  /** Returns an unsubscribe function so React effects can clean up. */
  onResumeProgress: (callback) => {
    const listener = (_event, progress) => callback(progress);
    electron.ipcRenderer.on("sessions:resumeProgress", listener);
    return () => {
      electron.ipcRenderer.removeListener("sessions:resumeProgress", listener);
    };
  }
};
const overlayAPI = {
  hide: () => electron.ipcRenderer.invoke("overlay:hide"),
  getShortcut: () => electron.ipcRenderer.invoke("overlay:getShortcut"),
  /** Dismisses the overlay and focuses the main window, optionally routing it. */
  focusMain: (route) => electron.ipcRenderer.invoke("overlay:focusMain", route),
  /** Fires each time the overlay is summoned, so it can reset and reload. */
  onShown: (callback) => {
    const listener = () => callback();
    electron.ipcRenderer.on("overlay:shown", listener);
    return () => {
      electron.ipcRenderer.removeListener("overlay:shown", listener);
    };
  },
  /** Main window only: route requests coming from the overlay. */
  onNavigate: (callback) => {
    const listener = (_event, route) => callback(route);
    electron.ipcRenderer.on("overlay:navigate", listener);
    return () => {
      electron.ipcRenderer.removeListener("overlay:navigate", listener);
    };
  }
};
electron.contextBridge.exposeInMainWorld("api", {
  projectAPI,
  groupAPI,
  systemAPI,
  toolsAPI,
  sessionAPI,
  overlayAPI
});
