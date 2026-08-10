import { app, BrowserWindow, shell } from "electron";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { registerProjectIPC } from "./ipc/project.ipc";
import { registerGroupIPC } from "./ipc/group.ipc";
import { registerDialogIPC } from "./ipc/dialog.ipc";
import { registerToolsIPC } from "./ipc/tools.ipc";
import { registerSessionIPC } from "./ipc/session.ipc";
import { registerOverlayIPC } from "./ipc/overlay.ipc";
import { registerGeneratorIPC } from "./ipc/generator.ipc";
import { initOverlay, teardownOverlay } from "./windows/overlay";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// The built directory structure
//
// ├─┬─┬ dist
// │ │ └── index.html
// │ │
// │ ├─┬ dist-electron
// │ │ ├── main.js
// │ │ └── preload.mjs
// │
process.env.APP_ROOT = path.join(__dirname, "..");

// 🚧 Use ['ENV_NAME'] avoid vite:define plugin - Vite@2.x
export const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
export const MAIN_DIST = path.join(process.env.APP_ROOT, "dist-electron");
export const RENDERER_DIST = path.join(process.env.APP_ROOT, "dist");

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL
  ? path.join(process.env.APP_ROOT, "public")
  : RENDERER_DIST;

let win: BrowserWindow | null;

// Set the application name — this is what shows in Task Manager / Dock.
app.setName("Dev Launcher");

function createWindow() {
  win = new BrowserWindow({
    icon: path.join(process.env.VITE_PUBLIC, "app-icon.png"),
    title: "Dev Launcher",
    width: 1280,
    height: 820,
    minWidth: 940,
    minHeight: 600,
    backgroundColor: "#181818",
    webPreferences: {
      preload: path.join(__dirname, "preload.mjs"),
      // Set explicitly rather than relying on Electron's defaults, so a major
      // version bump can never silently weaken the sandbox.
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webviewTag: false,
    },
  });

  // Nothing in this app should ever open a second window or navigate away from
  // the bundled UI. External links go to the OS browser instead.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("http://") || url.startsWith("https://")) {
      shell.openExternal(url);
    }
    return { action: "deny" };
  });

  win.webContents.on("will-navigate", (event, url) => {
    const isDevServer = VITE_DEV_SERVER_URL && url.startsWith(VITE_DEV_SERVER_URL);
    if (!isDevServer && !url.startsWith("file://")) {
      event.preventDefault();
      if (url.startsWith("http://") || url.startsWith("https://")) {
        shell.openExternal(url);
      }
    }
  });

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(path.join(RENDERER_DIST, "index.html"));
  }
}

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
    win = null;
  }
});

// Release the global accelerator and let the overlay actually close.
app.on("will-quit", teardownOverlay);

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Handlers are registered before the window loads so the renderer can never
// invoke a channel that does not exist yet.
app.whenReady().then(() => {
  registerProjectIPC();
  registerGroupIPC();
  registerDialogIPC();
  registerToolsIPC();
  registerSessionIPC();
  registerOverlayIPC(() => win);
  registerGeneratorIPC();
  createWindow();

  // The overlay reuses the main bundle through the #/overlay hash route, so it
  // is created hidden at startup and simply shown when the shortcut fires.
  initOverlay({
    preloadPath: path.join(__dirname, "preload.mjs"),
    devServerUrl: VITE_DEV_SERVER_URL,
    rendererDist: RENDERER_DIST,
  });
});
