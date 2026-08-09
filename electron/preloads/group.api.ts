import { ipcRenderer } from "electron";
import { ProjectGroup } from "../../types/group";

export const groupAPI = {
  getAll: () => ipcRenderer.invoke("groups:getAll"),
  get: (id: string) => ipcRenderer.invoke("groups:get", id),
  add: (group: Partial<ProjectGroup>) => ipcRenderer.invoke("groups:add", group),
  update: (id: string, updates: Partial<ProjectGroup>) =>
    ipcRenderer.invoke("groups:update", id, updates),
  delete: (id: string) => ipcRenderer.invoke("groups:delete", id),
};
