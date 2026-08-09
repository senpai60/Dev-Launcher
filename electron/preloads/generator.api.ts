import { ipcRenderer } from "electron";
import type { GeneratorProgress, GeneratorRequest } from "../../types/generator";

export const generatorAPI = {
  /** Fetch the list of all supported scaffold templates. */
  getTemplates: () => ipcRenderer.invoke("generator:getTemplates"),

  /** Kick off a project scaffold and wait for the final result. */
  create: (request: GeneratorRequest) => ipcRenderer.invoke("generator:create", request),

  /** Alias for `create` kept for API symmetry. */
  startGenerator: (request: GeneratorRequest) => ipcRenderer.invoke("generator:create", request),

  /** Cancel an in-progress scaffold job. */
  cancel: (jobId?: string) => ipcRenderer.invoke("generator:cancel", jobId),

  /** Alias for `cancel` kept for API symmetry. */
  cancelGenerator: (jobId?: string) => ipcRenderer.invoke("generator:cancel", jobId),

  /**
   * Subscribe to real-time progress events.
   * Returns an unsubscribe function so React effects can clean up properly.
   */
  onProgress: (callback: (progress: GeneratorProgress) => void) => {
    const listener = (_event: unknown, progress: GeneratorProgress) => callback(progress);
    ipcRenderer.on("generator:progress", listener);
    return () => {
      ipcRenderer.removeListener("generator:progress", listener);
    };
  },
};
