import { ipcMain } from "electron";
import {
  getGroups,
  getGroup,
  addGroup,
  updateGroup,
  deleteGroup,
} from "../services/group.service";

export function registerGroupIPC() {
  ipcMain.handle("groups:getAll", () => {
    return getGroups();
  });

  ipcMain.handle("groups:get", (_, id: string) => {
    return getGroup(id);
  });

  ipcMain.handle("groups:add", (_, groupData) => {
    return addGroup(groupData);
  });

  ipcMain.handle("groups:update", (_, id: string, updates) => {
    return updateGroup(id, updates);
  });

  ipcMain.handle("groups:delete", (_, id: string) => {
    return deleteGroup(id);
  });
}
