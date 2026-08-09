export type Workspace = {
  id: string;
  name: string;
  description?: string;
  groupId?: string;
  isFavorite: boolean;
  projectIds: string[];
  commandIds: string[];
  editor?: WorkspaceEditor;
  terminals: WorkspaceTerminal[];
  urls: WorkspaceUrl[];
  browser?: WorkspaceBrowser;
  createdAt: number;
  updatedAt: number;
  lastLaunchedAt?: number;
};

export type WorkspaceEditor = {
  type: "vscode" | "cursor" | "other";
  projectIds: string[];
};

export type WorkspaceTerminal = {
  id: string;
  name: string;
  commandId?: string;
  command?: string;
  workingDirectory?: string;
  sortOrder: number;
};

export type WorkspaceUrl = {
  id: string;
  name: string;
  url: string;
  openOnLaunch: boolean;
};

export type WorkspaceBrowser = {
  url?: string;
  browser?: "default" | "chrome" | "edge" | "firefox";
  openOnLaunch: boolean;
};
