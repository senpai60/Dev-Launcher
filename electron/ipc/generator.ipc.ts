import { BrowserWindow, ipcMain } from "electron";
import { generateProject, getTemplates } from "../services/generator.service";
import { handler, requireObject, requireString, optionalBoolean } from "./validate";
import type { GeneratorProgress } from "../../types/generator";

/** Broadcasts a generator:progress event to every open window. */
function broadcastProgress(progress: GeneratorProgress) {
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) win.webContents.send("generator:progress", progress);
  }
}

export function registerGeneratorIPC() {
  /* ------------------------------------------------------------------ */
  /*  Get available templates                                            */
  /* ------------------------------------------------------------------ */

  ipcMain.handle(
    "generator:getTemplates",
    handler("generator:getTemplates", () => getTemplates()),
  );

  /* ------------------------------------------------------------------ */
  /*  Create a new project from a template                               */
  /* ------------------------------------------------------------------ */

  ipcMain.handle(
    "generator:create",
    handler("generator:create", (request: unknown) => {
      const input = requireObject(request, "Generator request");

      const templateId = requireString(input.templateId, "Template ID");
      const name = requireString(input.name, "Project name");
      const targetPath = requireString(input.targetPath, "Target path");

      const variant =
        typeof input.variant === "string" && ["ts", "js"].includes(input.variant)
          ? (input.variant as "ts" | "js")
          : "ts";

      const gitInit = optionalBoolean(input.gitInit ?? true, "Git init flag");
      const installDeps = optionalBoolean(input.installDeps ?? true, "Install deps flag");
      const openEditor = optionalBoolean(input.openEditor ?? false, "Open editor flag");

      const packageManager =
        typeof input.packageManager === "string" &&
        ["npm", "pnpm", "yarn", "bun"].includes(input.packageManager)
          ? (input.packageManager as "npm" | "pnpm" | "yarn" | "bun")
          : "npm";

      return generateProject(
        {
          templateId: templateId as import("../../types/generator").TemplateId,
          name,
          targetPath,
          variant,
          gitInit,
          installDeps,
          openEditor,
          packageManager,
        },
        broadcastProgress,
      );
    }),
  );

  /* ------------------------------------------------------------------ */
  /*  Cancel (no-op stub — kept for API symmetry)                        */
  /* ------------------------------------------------------------------ */

  ipcMain.handle(
    "generator:cancel",
    handler("generator:cancel", () => {
      // Future: implement cancellation via AbortController.
      return true;
    }),
  );
}
