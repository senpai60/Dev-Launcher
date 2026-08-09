import { ipcRenderer } from "electron";
import { Project } from "../../types/project";

export const projectAPI = {
  getAll: () => ipcRenderer.invoke("projects:getAll"),

  get: (id: string) => ipcRenderer.invoke("projects:get", id),

  add: (project: Partial<Project>) => ipcRenderer.invoke("projects:add", project),

  update: (id: string, data: Partial<Project>) =>
    ipcRenderer.invoke("projects:update", id, data),

  delete: (id: string) => ipcRenderer.invoke("projects:delete", id),

  detect: (folderPath: string) => ipcRenderer.invoke("projects:detect", folderPath),

  runCustomCommand: (cmdString: string, projectPath: string) =>
    ipcRenderer.invoke("projects:runCustomCommand", cmdString, projectPath),

  launch: (id: string, action: string) =>
    ipcRenderer.invoke("projects:launch", id, action),
};
