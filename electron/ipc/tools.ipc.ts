import { BrowserWindow, ipcMain } from "electron";
import { deleteNodeModules, scanNodeModules } from "../services/disk.service";
import { killByPid, listPorts } from "../services/ports.service";
import { auditEnvironments } from "../services/env.service";
import { indexScripts, runScript } from "../services/scripts.service";
import { scanRadar } from "../services/radar.service";
import { cloneAndSetup } from "../services/clone.service";
import { validateCloneUrl } from "../utils/git";
import { handler, optionalBoolean, requireId, requireObject, requireString } from "./validate";

/** Upper bound on a single bulk delete, as a guard against a runaway UI. */
const MAX_DELETE_TARGETS = 200;

/** Broadcasts an event to every open window. */
function broadcast(channel: string, payload: unknown) {
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) win.webContents.send(channel, payload);
  }
}

export function registerToolsIPC() {
  /* ---------------------------------------------------------------------- */
  /*  Disk reclaimer                                                         */
  /* ---------------------------------------------------------------------- */

  ipcMain.handle(
    "tools:scanDisk",
    handler("tools:scanDisk", async (_unused: unknown, event?: unknown) => {
      void _unused;
      void event;

      // Progress is pushed to every open window so the UI can show which
      // project is being measured during a long scan.
      return scanNodeModules((progress) => broadcast("tools:diskScanProgress", progress));
    }),
  );

  ipcMain.handle(
    "tools:deleteModules",
    handler("tools:deleteModules", (targets: unknown) => {
      if (!Array.isArray(targets)) {
        throw new Error("Expected a list of folders to delete.");
      }
      if (targets.length === 0) {
        throw new Error("Nothing was selected.");
      }
      if (targets.length > MAX_DELETE_TARGETS) {
        throw new Error(`Too many folders selected (limit ${MAX_DELETE_TARGETS}).`);
      }

      const paths = targets.map((t, i) => requireString(t, `Target ${i + 1}`));
      return deleteNodeModules(paths);
    }),
  );

  /* ---------------------------------------------------------------------- */
  /*  Port manager                                                           */
  /* ---------------------------------------------------------------------- */

  ipcMain.handle(
    "tools:listPorts",
    handler("tools:listPorts", () => listPorts()),
  );

  ipcMain.handle(
    "tools:killPort",
    handler("tools:killPort", (pid: unknown, port: unknown) => {
      if (typeof pid !== "number" || !Number.isInteger(pid) || pid <= 0) {
        throw new Error("Invalid process id.");
      }
      if (typeof port !== "number" || !Number.isInteger(port) || port <= 0 || port > 65535) {
        throw new Error("Invalid port number.");
      }
      return killByPid(pid, port);
    }),
  );

  /* ---------------------------------------------------------------------- */
  /*  Environment doctor                                                     */
  /* ---------------------------------------------------------------------- */

  ipcMain.handle(
    "tools:auditEnv",
    handler("tools:auditEnv", (projectId: unknown) =>
      auditEnvironments(
        projectId === undefined || projectId === null
          ? undefined
          : requireId(projectId, "Project id"),
      ),
    ),
  );

  /* ---------------------------------------------------------------------- */
  /*  Script index                                                           */
  /* ---------------------------------------------------------------------- */

  ipcMain.handle(
    "tools:indexScripts",
    handler("tools:indexScripts", () => indexScripts()),
  );

  ipcMain.handle(
    "tools:runScript",
    handler("tools:runScript", async (projectId: unknown, scriptName: unknown) => {
      const name = requireString(scriptName, "Script name");
      // package.json script names are permissive, but a newline or shell
      // metacharacter has no business here.
      if (!/^[A-Za-z0-9_.:\-/ ]{1,120}$/.test(name)) {
        throw new Error("That script name contains unsupported characters.");
      }
      const { command } = await runScript(requireId(projectId, "Project id"), name);
      return { command };
    }),
  );

  /* ---------------------------------------------------------------------- */
  /*  Stale project radar                                                    */
  /* ---------------------------------------------------------------------- */

  ipcMain.handle(
    "tools:scanRadar",
    handler("tools:scanRadar", () =>
      scanRadar((progress) => broadcast("tools:radarProgress", progress)),
    ),
  );

  /* ---------------------------------------------------------------------- */
  /*  Clone to running                                                       */
  /* ---------------------------------------------------------------------- */

  /** Cheap pre-flight so the form can validate before the user commits. */
  ipcMain.handle(
    "tools:validateCloneUrl",
    handler("tools:validateCloneUrl", (url: unknown) =>
      validateCloneUrl(typeof url === "string" ? url : ""),
    ),
  );

  ipcMain.handle(
    "tools:clone",
    handler("tools:clone", (request: unknown) => {
      const input = requireObject(request, "Clone request");

      return cloneAndSetup(
        {
          url: requireString(input.url, "Repository URL"),
          destinationParent: requireString(input.destinationParent, "Destination folder"),
          folderName:
            typeof input.folderName === "string" && input.folderName.trim()
              ? input.folderName.trim()
              : undefined,
          installDependencies: optionalBoolean(
            input.installDependencies,
            "Install dependencies flag",
          ),
          openInEditor:
            typeof input.openInEditor === "string" && input.openInEditor
              ? input.openInEditor
              : undefined,
        },
        (progress) => broadcast("tools:cloneProgress", progress),
      );
    }),
  );
}
