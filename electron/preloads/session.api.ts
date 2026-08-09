import { ipcRenderer } from "electron";
import type { ProjectSession, ResumeProgress, SessionStep } from "../../types/session";

export const sessionAPI = {
  get: (projectId: string) => ipcRenderer.invoke("sessions:get", projectId),

  getAll: () => ipcRenderer.invoke("sessions:getAll"),

  update: (
    projectId: string,
    updates: { steps?: SessionStep[]; autoCapture?: boolean },
  ): Promise<ProjectSession> => ipcRenderer.invoke("sessions:update", projectId, updates),

  clear: (projectId: string) => ipcRenderer.invoke("sessions:clear", projectId),

  resume: (projectId: string) => ipcRenderer.invoke("sessions:resume", projectId),

  /** Returns an unsubscribe function so React effects can clean up. */
  onResumeProgress: (callback: (progress: ResumeProgress) => void) => {
    const listener = (_event: unknown, progress: ResumeProgress) => callback(progress);
    ipcRenderer.on("sessions:resumeProgress", listener);
    return () => {
      ipcRenderer.removeListener("sessions:resumeProgress", listener);
    };
  },
};
