import { contextBridge } from "electron";
import { projectAPI } from "./preloads/project.api";

// --------- Expose some API to the Renderer process ---------
contextBridge.exposeInMainWorld("api", {
  projectAPI,
});
