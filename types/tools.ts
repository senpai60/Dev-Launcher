/**
 * Types for the developer utilities: disk reclaimer, port manager,
 * environment doctor, and cross-project script index.
 */

/* -------------------------------------------------------------------------- */
/*  Disk reclaimer                                                             */
/* -------------------------------------------------------------------------- */

export type NodeModulesEntry = {
  projectId: string;
  projectName: string;
  projectPath: string;
  /** Absolute path of the node_modules directory itself. */
  modulesPath: string;
  /** Path shown in the UI, relative to the project root. */
  relativeLabel: string;
  sizeBytes: number;
  fileCount: number;
  /** Newest mtime found inside, used as a proxy for "last touched". */
  lastModified: number;
  lastOpenedAt?: number;
  /** Days since the project was last opened in the launcher. */
  daysSinceOpened: number | null;
  /** True when nothing has touched this project in a while. */
  isStale: boolean;
};

export type DiskScanResult = {
  entries: NodeModulesEntry[];
  totalBytes: number;
  staleBytes: number;
  scannedProjects: number;
  skippedProjects: number;
  /** Non-fatal problems, e.g. a folder we could not read. */
  warnings: string[];
};

export type DiskScanProgress = {
  current: number;
  total: number;
  projectName: string;
  done: boolean;
};

export type DeleteModulesResult = {
  deleted: string[];
  failed: Array<{ path: string; reason: string }>;
  reclaimedBytes: number;
};

/* -------------------------------------------------------------------------- */
/*  Port manager                                                               */
/* -------------------------------------------------------------------------- */

export type PortEntry = {
  port: number;
  pid: number;
  protocol: string;
  address: string;
  state: string;
  processName?: string;
  /** True for ports commonly used by dev servers and local databases. */
  isDevPort: boolean;
  /** Friendly name when the port is a well-known service. */
  knownService?: string;
  /** Set when a registered project's folder matches the owning process. */
  matchedProjectName?: string;
  /** True for PIDs that must never be killed (System, Idle). */
  isProtected: boolean;
};

export type PortScanResult = {
  entries: PortEntry[];
  scannedAt: number;
  warnings: string[];
};

export type KillPortResult = {
  pid: number;
  killed: boolean;
  message: string;
};

/* -------------------------------------------------------------------------- */
/*  Environment doctor                                                         */
/* -------------------------------------------------------------------------- */

/**
 * `missing`  - declared in the example file but absent from the active file
 * `empty`    - present in the active file but has no value
 * `ok`       - present with a non-empty value
 * `extra`    - in the active file but not documented in the example
 */
export type EnvKeyStatus = "missing" | "empty" | "ok" | "extra";

export type EnvKeyRow = {
  key: string;
  status: EnvKeyStatus;
};

export type EnvFileSummary = {
  fileName: string;
  keyCount: number;
  /** Keys whose value is blank. Names only -- values never leave main. */
  emptyKeys: number;
};

/**
 * One directory containing env files.
 *
 * Client/server projects keep their env files in subdirectories rather than at
 * the project root, so a single project can report several of these.
 */
export type EnvLocation = {
  /** Directory relative to the project root. Empty string means the root. */
  relativeDir: string;
  /** Display label, e.g. "project root" or "server". */
  label: string;
  /** The `.env.example`-style file we compared against, if any. */
  exampleFile?: string;
  /** The active env file we audited, if any. */
  activeFile?: string;
  files: EnvFileSummary[];
  keys: EnvKeyRow[];
  missingCount: number;
  emptyCount: number;
  extraCount: number;
  /** True when a real .env exists here but is not covered by .gitignore. */
  envNotIgnored: boolean;
  warnings: string[];
};

export type EnvReport = {
  projectId: string;
  projectName: string;
  projectPath: string;
  pathExists: boolean;
  /** Every directory in this project that holds env files. */
  locations: EnvLocation[];
  /** Totals rolled up across all locations. */
  missingCount: number;
  emptyCount: number;
  extraCount: number;
  /** True when there is nothing to audit. */
  hasEnvFiles: boolean;
  /** True when any location has an unignored .env. */
  envNotIgnored: boolean;
  warnings: string[];
};

export type EnvAuditResult = {
  reports: EnvReport[];
  projectsWithIssues: number;
  totalMissing: number;
};

/* -------------------------------------------------------------------------- */
/*  Stale project radar                                                        */
/* -------------------------------------------------------------------------- */

export type RadarIssueKind =
  | "path-missing"
  | "uncommitted-changes"
  | "unpushed-commits"
  | "stale-commits"
  | "never-opened"
  | "deps-not-installed"
  | "lockfile-drift"
  | "no-git";

export type RadarIssueSeverity = "high" | "medium" | "low";

export type RadarIssue = {
  kind: RadarIssueKind;
  severity: RadarIssueSeverity;
  /** Short label for the badge. */
  label: string;
  /** One-line explanation shown under the project. */
  detail: string;
};

export type RadarEntry = {
  projectId: string;
  projectName: string;
  projectPath: string;
  pathExists: boolean;

  isRepository: boolean;
  branch?: string;
  /** Working-tree file count, split by state. */
  modifiedFiles: number;
  untrackedFiles: number;
  ahead: number;
  behind: number;
  lastCommitAt?: number;
  lastCommitMessage?: string;
  daysSinceCommit: number | null;

  hasPackageJson: boolean;
  hasNodeModules: boolean;
  lockfileName?: string;
  /** True when package.json is newer than the lockfile. */
  lockfileDrift: boolean;

  lastOpenedAt?: number;
  daysSinceOpened: number | null;

  issues: RadarIssue[];
  /** 0 = healthy. Higher means more neglected. */
  score: number;
};

export type RadarResult = {
  entries: RadarEntry[];
  scannedAt: number;
  healthyCount: number;
  needsAttentionCount: number;
  warnings: string[];
};

export type RadarProgress = {
  current: number;
  total: number;
  projectName: string;
  done: boolean;
};

/* -------------------------------------------------------------------------- */
/*  Clone to running                                                           */
/* -------------------------------------------------------------------------- */

export type CloneRequest = {
  /** https or ssh git remote. */
  url: string;
  /** Existing directory the repository will be cloned into. */
  destinationParent: string;
  /** Folder name; defaults to the repository name. */
  folderName?: string;
  /** Run the detected package manager's install afterwards. */
  installDependencies: boolean;
  /** Open the project in this editor when finished. */
  openInEditor?: string;
};

export type ClonePhase =
  | "validating"
  | "cloning"
  | "detecting"
  | "registering"
  | "installing"
  | "opening"
  | "done"
  | "failed";

export type CloneProgress = {
  phase: ClonePhase;
  message: string;
  /** Raw git output line, when there is one. */
  detail?: string;
  done: boolean;
};

export type CloneResult = {
  projectId: string;
  projectName: string;
  projectPath: string;
  detectedTags: string[];
  commandCount: number;
  installStarted: boolean;
  editorOpened: boolean;
  warnings: string[];
};

/* -------------------------------------------------------------------------- */
/*  Script index                                                               */
/* -------------------------------------------------------------------------- */

export type ScriptEntry = {
  projectId: string;
  projectName: string;
  projectPath: string;
  pathExists: boolean;
  packageManager: string;
  scriptName: string;
  scriptBody: string;
  /** The command the launcher would actually run, e.g. `pnpm dev`. */
  runCommand: string;
};

export type ScriptIndexResult = {
  scripts: ScriptEntry[];
  projectsIndexed: number;
  /** Script names that appear in more than one project. */
  sharedNames: string[];
  warnings: string[];
};
