import { BrowserWindow, ipcMain } from "electron";
import { getRegisteredShortcut, hideOverlay } from "../windows/overlay";
import { handler } from "./validate";

export function registerOverlayIPC(getMainWindow: () => BrowserWindow | null) {
  ipcMain.handle(
    "overlay:hide",
    handler("overlay:hide", () => {
      hideOverlay();
      return true;
    }),
  );

  /** The accelerator that actually bound, so the UI can show the right hint. */
  ipcMain.handle(
    "overlay:getShortcut",
    handler("overlay:getShortcut", () => getRegisteredShortcut()),
  );

  /** Dismisses the overlay and brings the main window forward. */
  ipcMain.handle(
    "overlay:focusMain",
    handler("overlay:focusMain", (route: unknown) => {
      hideOverlay();

      const main = getMainWindow();
      if (!main || main.isDestroyed()) return false;

      if (main.isMinimized()) main.restore();
      main.show();
      main.focus();

      if (typeof route === "string" && /^\/[A-Za-z0-9?=&/_-]*$/.test(route)) {
        main.webContents.send("overlay:navigate", route);
      }

      return true;
    }),
  );
}
