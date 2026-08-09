import { contextBridge } from "electron";
import { projectAPI } from "./preloads/project.api";
import { groupAPI } from "./preloads/group.api";

// --------- Expose some API to the Renderer process ---------
contextBridge.exposeInMainWorld("api", {
  projectAPI,
  groupAPI,
});
