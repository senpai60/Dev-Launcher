# Dev Launcher — Data Storage Objects

The rule for this project:

> Each service owns its own domain data. Do not create one giant `data.json`.

Start with JSON files. Later the same models can move to SQLite.

---

## 1. Project Service

**Storage:** `projects.json`

```ts
type Project = {
  id: string;
  name: string;
  path: string;
  description?: string;
  icon?: string;
  groupId?: string;
  tags: string[];
  isFavorite: boolean;
  createdAt: number;
  updatedAt: number;
  lastOpenedAt?: number;
};
```

Example:

```json
{
  "id": "proj_001",
  "name": "BrutDesk",
  "path": "C:\Projects\BrutDesk",
  "description": "Internal CRM",
  "icon": "💼",
  "groupId": "group_freelance",
  "tags": ["react", "express", "mongodb"],
  "isFavorite": true,
  "createdAt": 1754700000000,
  "updatedAt": 1754701000000,
  "lastOpenedAt": 1754702000000
}
```

---

## 2. Project Detection Service

**Storage:** optional cache; can usually be detected at runtime.

```ts
type ProjectMetadata = {
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
```

Keep this separate from `Project` because detection can change automatically.

---

## 3. Group Service

**Storage:** `groups.json`

```ts
type ProjectGroup = {
  id: string;
  name: string;
  icon?: string;
  color?: string;
  sortOrder: number;
  createdAt: number;
  updatedAt: number;
};
```

Projects reference it:

```ts
groupId: "group_freelance";
```

Do not duplicate the group object inside every project.

---

## 4. Command Service

**Storage:** `commands.json`

```ts
type ProjectCommand = {
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
```

Example:

```json
{
  "id": "cmd_001",
  "projectId": "proj_001",
  "name": "Start Dev",
  "description": "Start development server",
  "command": "npm run dev",
  "workingDirectory": ".",
  "isFavorite": true,
  "createdAt": 1754700000000,
  "updatedAt": 1754700000000
}
```

If `projectId` is missing, it can be a global command.

---

## 5. URL Service

**Storage:** `urls.json`

```ts
type ProjectUrl = {
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
```

---

## 6. Note Service

**Storage:** `notes.json`

```ts
type ProjectNote = {
  id: string;
  projectId: string;
  title?: string;
  content: string;
  isPinned: boolean;
  createdAt: number;
  updatedAt: number;
};
```

---

## 7. Workspace Service

**Storage:** `workspaces.json`

A workspace should reference existing projects and commands rather than duplicating them.

```ts
type Workspace = {
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

type WorkspaceEditor = {
  type: "vscode" | "cursor" | "other";
  projectIds: string[];
};

type WorkspaceTerminal = {
  id: string;
  name: string;
  commandId?: string;
  command?: string;
  workingDirectory?: string;
  sortOrder: number;
};

type WorkspaceUrl = {
  id: string;
  name: string;
  url: string;
  openOnLaunch: boolean;
};

type WorkspaceBrowser = {
  url?: string;
  browser?: "default" | "chrome" | "edge" | "firefox";
  openOnLaunch: boolean;
};
```

---

## 8. Settings Service

**Storage:** `settings.json`

```ts
type Settings = {
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
```

---

## 9. History Service

**Storage:** `history.json`

```ts
type HistoryEntry = {
  id: string;

  type:
    | "project"
    | "command"
    | "workspace"
    | "url";

  targetId: string;

  action:
    | "open"
    | "run"
    | "launch";

  timestamp: number;
};
```

This powers:

- Recent Projects
- Recent Commands
- Recent Workspaces
- Continue Working

---

# Runtime Services

These should generally **not** be persisted as normal JSON.

---

## 10. Process Service

**Storage:** memory

```ts
type RunningProcess = {
  id: string;
  projectId?: string;
  commandId?: string;
  pid: number;
  name: string;
  command: string;

  status:
    | "starting"
    | "running"
    | "stopping"
    | "stopped"
    | "failed";

  startedAt: number;
  stoppedAt?: number;
  exitCode?: number;
};
```

Use something like:

```ts
Map<string, RunningProcess>
```

Reason: process state becomes stale when the app closes.

---

## 11. Git Service

**Storage:** runtime / local Git repository

```ts
type GitStatus = {
  isRepository: boolean;
  branch?: string;
  isClean: boolean;
  modifiedFiles: number;
  stagedFiles: number;
  untrackedFiles: number;
  ahead: number;
  behind: number;

  lastCommit?: {
    hash: string;
    message: string;
    author: string;
    timestamp: number;
  };
};
```

Get it from Git when needed instead of constantly persisting it.

---

## 12. Docker Service

**Storage:** runtime / Docker Engine

```ts
type DockerContainer = {
  id: string;
  name: string;
  image: string;
  status: string;
  state: "running" | "stopped" | "paused" | "unknown";
  ports: DockerPort[];
};

type DockerPort = {
  containerPort: number;
  hostPort?: number;
  protocol: "tcp" | "udp";
};
```

Docker itself is the source of truth.

---

## 13. Tool Detection Service

**Storage:** runtime or optional cache

```ts
type DetectedTool = {
  id: string;
  name: string;

  type:
    | "editor"
    | "terminal"
    | "git"
    | "node"
    | "package-manager"
    | "docker"
    | "browser"
    | "other";

  executablePath?: string;
  version?: string;
  isAvailable: boolean;
  detectedAt: number;
};
```

Machine-specific paths should not be blindly synced between computers.

---

# Secure Storage

## 14. Credential Service

**Storage:** OS secure credential store

Use:

- Windows Credential Manager
- macOS Keychain
- Linux Secret Service

Metadata can be:

```ts
type CredentialReference = {
  id: string;

  service:
    | "github"
    | "render"
    | "vercel"
    | "ssh"
    | "custom";

  label: string;

  createdAt: number;
};
```

The actual secret should NOT be in JSON.

Never put these directly in `settings.json` or `projects.json`:

```text
API keys
OAuth tokens
Passwords
JWT secrets
SSH private keys
Database passwords
```

---

# 15. GitHub Integration

**Storage:** `github.json` or later SQLite

Store metadata only:

```ts
type GitHubRepository = {
  id: string;
  projectId: string;
  owner: string;
  repository: string;
  defaultBranch: string;
  url: string;
  connectedAt: number;
};
```

OAuth tokens belong in secure storage.

---

# 16. Environment Profiles

**Storage:** `environment-profiles.json`

```ts
type EnvironmentProfile = {
  id: string;
  projectId: string;
  name: string;
  description?: string;
  envFile?: string;
  variables?: Record<string, string>;
  createdAt: number;
  updatedAt: number;
};
```

Do not put actual secrets into plain JSON.

For example, avoid:

```json
{
  "variables": {
    "JWT_SECRET": "real-secret"
  }
}
```

Use secure-storage references for sensitive values.

---

# 17. App Metadata

**Storage:** `app.json`

```ts
type AppMetadata = {
  schemaVersion: number;
  firstRunAt: number;
  lastRunAt: number;
  lastBackupAt?: number;
  onboardingCompleted: boolean;
};
```

`schemaVersion` becomes important when you later migrate JSON → newer JSON format → SQLite.

---

# Service → Storage Map

```text
ProjectService
    ↓
projects.json

GroupService
    ↓
groups.json

CommandService
    ↓
commands.json

URLService
    ↓
urls.json

NoteService
    ↓
notes.json

WorkspaceService
    ↓
workspaces.json

SettingsService
    ↓
settings.json

HistoryService
    ↓
history.json

EnvironmentProfileService
    ↓
environment-profiles.json

GitHubService
    ↓
github.json
```

Runtime:

```text
ProcessService
    ↓
Memory

GitService
    ↓
Local Git repository

DockerService
    ↓
Docker Engine

ToolDetectionService
    ↓
Operating System
```

Secure:

```text
CredentialService
    ↓
OS Secure Credential Store
```

---

# Object Relationships

Think of the data like this:

```text
Group
 │
 ├── Project
 │     │
 │     ├── ProjectMetadata
 │     ├── Commands
 │     ├── URLs
 │     ├── Notes
 │     └── EnvironmentProfiles
 │
 └── Workspace
       │
       ├── Projects
       ├── Commands
       ├── Terminals
       └── URLs
```

Everything connects through IDs.

Example:

```ts
Project.id
      ↓
Command.projectId

Project.id
      ↓
Note.projectId

Project.id
      ↓
ProjectUrl.projectId

Project.id
      ↓
EnvironmentProfile.projectId

Workspace.projectIds[]
      ↓
Project.id
```

---

# Do NOT Make One Giant Object

Avoid:

```ts
type Project = {
  commands: [];
  notes: [];
  urls: [];
  workspace: {};
  git: {};
  docker: {};
  settings: {};
};
```

Prefer separate domain objects:

```text
Project
Command
Note
URL
Workspace
GitStatus
DockerContainer
Settings
```

connected with IDs.

This makes the later SQLite migration much easier.

---

# Initial Storage Plan

## Phase 1

Only:

```text
userData/
├── projects.json
└── settings.json
```

## Phase 2–3

```text
userData/
├── projects.json
├── groups.json
├── history.json
└── settings.json
```

## Phase 5–7

```text
userData/
├── projects.json
├── groups.json
├── commands.json
├── urls.json
├── notes.json
├── history.json
└── settings.json
```

## Workspace Phase

```text
userData/
├── projects.json
├── groups.json
├── commands.json
├── urls.json
├── notes.json
├── workspaces.json
├── history.json
└── settings.json
```

## Later

```text
userData/
└── dev-launcher.db
```

---

# Final Mental Model

```text
                 DEV LAUNCHER DATA
                        │
       ┌────────────────┼────────────────┐
       │                │                │
 Persistent          Runtime           Secure
       │                │                │
       ↓                ↓                ↓
 Projects           Processes       Credentials
 Groups             Git status      OAuth tokens
 Commands           Docker status   API keys
 URLs               Tool detection  Passwords
 Notes
 Workspaces
 Settings
 History
```

**Persistent data** = user configuration and information.

**Runtime data** = what the computer knows right now.

**Secure data** = secrets that should never live in normal JSON.

That separation should remain even after moving from JSON to SQLite.
