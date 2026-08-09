import { ipcRenderer } from "electron";
import type { DiskScanProgress } from "../../types/tools";

export const toolsAPI = {
  /* Disk reclaimer */
  scanDisk: () => ipcRenderer.invoke("tools:scanDisk"),
  deleteModules: (targets: string[]) => ipcRenderer.invoke("tools:deleteModules", targets),

  /**
   * Subscribes to scan progress. Returns an unsubscribe function so React
   * effects can clean up without exposing the raw emitter.
   */
  onDiskScanProgress: (callback: (progress: DiskScanProgress) => void) => {
    const listener = (_event: unknown, progress: DiskScanProgress) => callback(progress);
    ipcRenderer.on("tools:diskScanProgress", listener);
    return () => {
      ipcRenderer.removeListener("tools:diskScanProgress", listener);
    };
  },

  /* Port manager */
  listPorts: () => ipcRenderer.invoke("tools:listPorts"),
  killPort: (pid: number, port: number) => ipcRenderer.invoke("tools:killPort", pid, port),

  /* Environment doctor */
  auditEnv: (projectId?: string) => ipcRenderer.invoke("tools:auditEnv", projectId),

  /* Script index */
  indexScripts: () => ipcRenderer.invoke("tools:indexScripts"),
  runScript: (projectId: string, scriptName: string) =>
    ipcRenderer.invoke("tools:runScript", projectId, scriptName),
};
