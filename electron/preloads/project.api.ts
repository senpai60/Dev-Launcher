import { ipcRenderer } from "electron";
import { Project } from "../types/project.type";

export const projectAPI = {
  getAll: () => ipcRenderer.invoke("projects:getAll"),

  get: (id: string) => ipcRenderer.invoke("projects:get", id),

  add: (project: Project) => ipcRenderer.invoke("projects:add", project),

  update: (id: string, data: Partial<Project>) =>
    ipcRenderer.invoke("projects:update", id, data),

  delete: (id: string) => ipcRenderer.invoke("projects:delete", id),
};
