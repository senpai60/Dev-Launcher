import { ipcRenderer } from "electron";

export const systemAPI = {
  /** Opens the native directory picker. Resolves to null when cancelled. */
  selectFolder: (defaultPath?: string) =>
    ipcRenderer.invoke("dialog:selectFolder", defaultPath),

  pathExists: (target: string) => ipcRenderer.invoke("dialog:pathExists", target),

  openExternal: (url: string) => ipcRenderer.invoke("shell:openExternal", url),
};
