import { contextBridge } from "electron";
import { projectAPI } from "./preloads/project.api";
import { groupAPI } from "./preloads/group.api";
import { systemAPI } from "./preloads/system.api";
import { toolsAPI } from "./preloads/tools.api";
import { sessionAPI } from "./preloads/session.api";
import { overlayAPI } from "./preloads/overlay.api";
import { generatorAPI } from "./preloads/generator.api";

// --------- Expose a narrow, explicit API to the Renderer process ---------
// No raw ipcRenderer is exposed: every channel the renderer can reach is
// enumerated in one of these modules (featured.md section 41).
contextBridge.exposeInMainWorld("api", {
  projectAPI,
  groupAPI,
  systemAPI,
  toolsAPI,
  sessionAPI,
  overlayAPI,
  generatorAPI,
});
