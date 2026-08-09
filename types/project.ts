export type Project = {
  id: string;
  name: string;
  path: string;
  description?: string;
  icon?: string;
  groupId?: string;
  tags: string[];
  isFavorite: boolean;
  commands?: ProjectCommand[];
  createdAt: number;
  updatedAt: number;
  lastOpenedAt?: number;
  lastCommandAt?: number;
};

/**
 * A project enriched with state that is checked at read time rather than
 * persisted, so a folder deleted outside the app is reflected immediately.
 */
export type ProjectWithStatus = Project & {
  pathExists: boolean;
};

/**
 * Result of scanning a folder. Single source of truth -- the main-process
 * detector and the renderer both import this rather than redeclaring it.
 */
export type DetectedProjectMeta = {
  name: string;
  tags: string[];
  description?: string;
  commands: ProjectCommand[];
  details: {
    languages: string[];
    frameworks: string[];
    packageManager?: string;
    hasGit: boolean;
    hasDocker: boolean;
  };
};

export type ProjectMetadata = {
  projectId: string;
  language?: string;
  framework?: string;
  packageManager?: "npm" | "pnpm" | "yarn" | "bun";
  hasGit: boolean;
  hasDocker: boolean;
  hasTypeScript: boolean;
  packageManagerVersion?: string;
  detectedAt: number;
};

export type ProjectGroup = {
  id: string;
  name: string;
  icon?: string;
  color?: string;
  sortOrder: number;
  createdAt: number;
  updatedAt: number;
};

export type ProjectCommand = {
  id: string;
  projectId?: string;
  name: string;
  description?: string;
  command: string;
  workingDirectory?: string;
  shell?: string;
  environmentProfileId?: string;
  isFavorite: boolean;
  createdAt: number;
  updatedAt: number;
  lastRunAt?: number;
};

export type ProjectUrl = {
  id: string;
  projectId: string;
  name: string;
  url: string;
  type:
    | "production"
    | "staging"
    | "local"
    | "github"
    | "figma"
    | "documentation"
    | "other";
  isFavorite: boolean;
  createdAt: number;
  updatedAt: number;
};

export type ProjectNote = {
  id: string;
  projectId: string;
  title?: string;
  content: string;
  isPinned: boolean;
  createdAt: number;
  updatedAt: number;
};
