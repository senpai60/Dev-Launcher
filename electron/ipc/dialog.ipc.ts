import { BrowserWindow, dialog, ipcMain, shell } from "electron";
import fs from "fs";
import path from "node:path";
import { handler, requireString } from "./validate";

export type SelectedFolder = {
  path: string;
  name: string;
} | null;

export function registerDialogIPC() {
  /**
   * Native directory picker.
   *
   * Replaces the old `<input webkitdirectory>` approach, which derived the
   * folder by stripping the filename off the first enumerated file -- that
   * returned a nested subdirectory whenever the first file was not at the root.
   */
  ipcMain.handle(
    "dialog:selectFolder",
    handler("dialog:selectFolder", async (defaultPath: unknown): Promise<SelectedFolder> => {
      const parent = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0];

      const options: Electron.OpenDialogOptions = {
        title: "Select project folder",
        properties: ["openDirectory", "createDirectory"],
      };

      if (typeof defaultPath === "string" && defaultPath && fs.existsSync(defaultPath)) {
        options.defaultPath = defaultPath;
      }

      const result = parent
        ? await dialog.showOpenDialog(parent, options)
        : await dialog.showOpenDialog(options);

      if (result.canceled || result.filePaths.length === 0) return null;

      const selected = result.filePaths[0];
      return { path: selected, name: path.basename(selected) };
    }),
  );

  /** Reports whether a stored path still resolves to a directory. */
  ipcMain.handle(
    "dialog:pathExists",
    handler("dialog:pathExists", (target: unknown) => {
      const candidate = requireString(target, "Path");
      return fs.existsSync(candidate) && fs.statSync(candidate).isDirectory();
    }),
  );

  /**
   * Opens an external URL in the user's browser.
   * Only http(s) is allowed -- `file:` and custom schemes are rejected so a
   * link cannot be used to launch a local executable.
   */
  ipcMain.handle(
    "shell:openExternal",
    handler("shell:openExternal", async (url: unknown) => {
      const target = requireString(url, "URL");
      let parsed: URL;
      try {
        parsed = new URL(target);
      } catch {
        throw new Error("That is not a valid URL.");
      }
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        throw new Error("Only http and https links can be opened.");
      }
      await shell.openExternal(parsed.toString());
      return true;
    }),
  );
}
