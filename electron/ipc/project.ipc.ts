import { ipcMain } from "electron";
import {
  getProjects,
  getProject,
  addProject,
  updateProject,
  deleteProject,
  launchProject,
} from "../services/project.service";
import { detectProjectMeta } from "../utils/projectDetector";

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

  ipcMain.handle("projects:detect", (_, folderPath: string) => {
    return detectProjectMeta(folderPath);
  });

  ipcMain.handle("projects:launch", async (_, id: string, action: string) => {
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
