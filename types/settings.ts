export type Settings = {
  appearance: {
    theme: "dark" | "light" | "system";
    accentColor?: string;
    compactMode: boolean;
  };
  general: {
    startOnBoot: boolean;
    startMinimized: boolean;
    closeToTray: boolean;
  };
  editor: {
    defaultEditor: "vscode" | "cursor" | "other";
    customPath?: string;
  };
  terminal: {
    defaultTerminal:
      | "system"
      | "powershell"
      | "cmd"
      | "git-bash"
      | "other";
    customPath?: string;
  };
  search: {
    includeProjects: boolean;
    includeCommands: boolean;
    includeWorkspaces: boolean;
    includeUrls: boolean;
  };
  history: {
    maxRecentProjects: number;
    maxRecentCommands: number;
  };
  notifications: {
    enabled: boolean;
  };
};
