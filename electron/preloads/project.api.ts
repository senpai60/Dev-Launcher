import { ipcRenderer } from "electron";
import type { Project, ProjectCommand } from "../../types/project";

export const projectAPI = {
  getAll: () => ipcRenderer.invoke("projects:getAll"),

  get: (id: string) => ipcRenderer.invoke("projects:get", id),

  add: (project: Partial<Project>) => ipcRenderer.invoke("projects:add", project),

  update: (id: string, data: Partial<Project>) =>
    ipcRenderer.invoke("projects:update", id, data),

  delete: (id: string) => ipcRenderer.invoke("projects:delete", id),

  detect: (folderPath: string) => ipcRenderer.invoke("projects:detect", folderPath),

  /* Phase 5 — commands are addressed by id; the renderer never sends a
     command string to be executed. */
  seedCommands: (projectId: string, commands: ProjectCommand[]) =>
    ipcRenderer.invoke("projects:seedCommands", projectId, commands),

  addCommand: (projectId: string, command: Partial<ProjectCommand>) =>
    ipcRenderer.invoke("projects:addCommand", projectId, command),

  updateCommand: (projectId: string, commandId: string, updates: Partial<ProjectCommand>) =>
    ipcRenderer.invoke("projects:updateCommand", projectId, commandId, updates),

  deleteCommand: (projectId: string, commandId: string) =>
    ipcRenderer.invoke("projects:deleteCommand", projectId, commandId),

  runCommand: (projectId: string, commandId: string, confirmedDestructive?: boolean) =>
    ipcRenderer.invoke("projects:runCommand", projectId, commandId, confirmedDestructive ?? false),

  inspectCommand: (projectId: string, commandId: string) =>
    ipcRenderer.invoke("projects:inspectCommand", projectId, commandId),

  validateCommand: (draft: Partial<ProjectCommand>, projectPath?: string) =>
    ipcRenderer.invoke("projects:validateCommand", draft, projectPath),

  launch: (id: string, action: string, newWindow?: boolean) =>
    ipcRenderer.invoke("projects:launch", id, action, newWindow ?? false),
};
