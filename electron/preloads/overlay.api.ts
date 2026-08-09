import { ipcRenderer } from "electron";

export const overlayAPI = {
  hide: () => ipcRenderer.invoke("overlay:hide"),

  getShortcut: (): Promise<string | null> => ipcRenderer.invoke("overlay:getShortcut"),

  /** Dismisses the overlay and focuses the main window, optionally routing it. */
  focusMain: (route?: string) => ipcRenderer.invoke("overlay:focusMain", route),

  /** Fires each time the overlay is summoned, so it can reset and reload. */
  onShown: (callback: () => void) => {
    const listener = () => callback();
    ipcRenderer.on("overlay:shown", listener);
    return () => {
      ipcRenderer.removeListener("overlay:shown", listener);
    };
  },

  /** Main window only: route requests coming from the overlay. */
  onNavigate: (callback: (route: string) => void) => {
    const listener = (_event: unknown, route: string) => callback(route);
    ipcRenderer.on("overlay:navigate", listener);
    return () => {
      ipcRenderer.removeListener("overlay:navigate", listener);
    };
  },
};
