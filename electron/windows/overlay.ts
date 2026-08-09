import { BrowserWindow, globalShortcut, screen } from "electron";
import path from "node:path";

/**
 * Global launcher overlay.
 *
 * A frameless, always-on-top window that a system-wide shortcut summons from
 * anywhere. It reuses the main renderer bundle via the `#/overlay` hash route,
 * so there is no second Vite entry point to keep in sync.
 */

const OVERLAY_WIDTH = 720;
const OVERLAY_HEIGHT = 460;

/**
 * Shortcuts tried in order. `CommandOrControl+Space` is the one people expect,
 * but it is taken by Spotlight on macOS and by some IME switchers on Windows,
 * so we fall back rather than silently failing.
 */
const SHORTCUT_CANDIDATES = [
  "CommandOrControl+Space",
  "Alt+Space",
  "CommandOrControl+Shift+Space",
];

let overlayWindow: BrowserWindow | null = null;
let registeredShortcut: string | null = null;

export function getRegisteredShortcut(): string | null {
  return registeredShortcut;
}

function buildOverlayWindow(preloadPath: string, devServerUrl?: string, rendererDist?: string) {
  const win = new BrowserWindow({
    width: OVERLAY_WIDTH,
    height: OVERLAY_HEIGHT,
    show: false,
    frame: false,
    transparent: true,
    backgroundColor: "#00000000",
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    // Keep it out of the window list; it is a transient palette, not an app
    // window the user should be able to alt-tab into.
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  win.setAlwaysOnTop(true, "floating");
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

  if (devServerUrl) {
    win.loadURL(`${devServerUrl}#/overlay`);
  } else if (rendererDist) {
    win.loadFile(path.join(rendererDist, "index.html"), { hash: "/overlay" });
  }

  // Closing must never destroy it -- the shortcut has to keep working.
  win.on("close", (event) => {
    event.preventDefault();
    win.hide();
  });

  // Clicking away dismisses, the way a launcher should behave.
  win.on("blur", () => {
    if (win.isVisible()) win.hide();
  });

  return win;
}

/** Centres the overlay on whichever display currently has the cursor. */
function positionOnActiveDisplay(win: BrowserWindow) {
  const cursor = screen.getCursorScreenPoint();
  const display = screen.getDisplayNearestPoint(cursor);
  const { x, y, width, height } = display.workArea;

  win.setBounds({
    x: Math.round(x + (width - OVERLAY_WIDTH) / 2),
    // Slightly above centre reads better than dead centre.
    y: Math.round(y + Math.max(60, (height - OVERLAY_HEIGHT) / 3)),
    width: OVERLAY_WIDTH,
    height: OVERLAY_HEIGHT,
  });
}

export function showOverlay() {
  if (!overlayWindow || overlayWindow.isDestroyed()) return;

  positionOnActiveDisplay(overlayWindow);
  overlayWindow.show();
  overlayWindow.focus();
  // Tells the renderer to reset its query and reload data.
  overlayWindow.webContents.send("overlay:shown");
}

export function hideOverlay() {
  if (overlayWindow && !overlayWindow.isDestroyed() && overlayWindow.isVisible()) {
    overlayWindow.hide();
  }
}

export function toggleOverlay() {
  if (!overlayWindow || overlayWindow.isDestroyed()) return;

  if (overlayWindow.isVisible()) hideOverlay();
  else showOverlay();
}

/**
 * Creates the overlay and binds the first shortcut that is available.
 * Returns the bound accelerator, or null when every candidate was taken.
 */
export function initOverlay(options: {
  preloadPath: string;
  devServerUrl?: string;
  rendererDist?: string;
}): string | null {
  overlayWindow = buildOverlayWindow(
    options.preloadPath,
    options.devServerUrl,
    options.rendererDist,
  );

  for (const accelerator of SHORTCUT_CANDIDATES) {
    // isRegistered only reports this app's bindings, so registration itself is
    // the real test of whether another app already owns the combination.
    try {
      if (globalShortcut.register(accelerator, toggleOverlay)) {
        registeredShortcut = accelerator;
        break;
      }
    } catch {
      // Try the next candidate.
    }
  }

  if (!registeredShortcut) {
    console.warn("Could not register a global launcher shortcut; all candidates were taken.");
  } else {
    console.log(`Global launcher bound to ${registeredShortcut}`);
  }

  return registeredShortcut;
}

/** Called on quit so the accelerator is released and the window can close. */
export function teardownOverlay() {
  globalShortcut.unregisterAll();
  registeredShortcut = null;

  if (overlayWindow && !overlayWindow.isDestroyed()) {
    overlayWindow.removeAllListeners("close");
    overlayWindow.destroy();
  }
  overlayWindow = null;
}
