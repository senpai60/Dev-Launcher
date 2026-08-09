import { ipcMain } from "electron";
import {
  getProjects,
  getProject,
  addProject,
  updateProject,
  deleteProject,
} from "../services/project.service";

export function registerProjectIPC() {
  ipcMain.handle("projects:getAll", () => {
    return getProjects();
  });

  ipcMain.handle("projects:get", (_, id: string) => {
    return getProject(id);
  });

  ipcMain.handle("projects:add", (_, project) => {
    return addProject(project);
  });

  ipcMain.handle("projects:update", (_, id: string, updates) => {
    return updateProject(id, updates);
  });

  ipcMain.handle("projects:delete", (_, id: string) => {
    return deleteProject(id);
  });
}
