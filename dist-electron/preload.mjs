"use strict";
const electron = require("electron");
const projectAPI = {
  getAll: () => electron.ipcRenderer.invoke("projects:getAll"),
  get: (id) => electron.ipcRenderer.invoke("projects:get", id),
  add: (project) => electron.ipcRenderer.invoke("projects:add", project),
  update: (id, data) => electron.ipcRenderer.invoke("projects:update", id, data),
  delete: (id) => electron.ipcRenderer.invoke("projects:delete", id),
  launch: (id, action) => electron.ipcRenderer.invoke("projects:launch", id, action)
};
electron.contextBridge.exposeInMainWorld("api", {
  projectAPI
});
