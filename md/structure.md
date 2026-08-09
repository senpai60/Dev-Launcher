# Dev Launcher — Project Structure

This document defines the recommended folder and file structure for the Dev Launcher Electron + React + TypeScript application.

The structure is intentionally designed to start simple and grow with the phases defined in `phases.md` / `features.md`.

---

# 1. Current Architecture

The project currently follows:

```text
dev-launcher/
│
├── dist-electron/
├── electron/
├── md/
├── node_modules/
├── public/
├── src/
│
├── .eslintrc.cjs
├── .gitignore
├── electron-builder.json5
├── index.html
├── package.json
├── package-lock.json
├── README.md
└── tsconfig.json
```

This is a good starting structure.

Do not over-engineer the project before the application actually needs more layers.

---

# 2. Recommended Final Root Structure

As the application grows:

```text
dev-launcher/
│
├── electron/
│   ├── main.ts
│   ├── preload.ts
│   ├── electron-env.d.ts
│   │
│   ├── ipc/
│   ├── services/
│   ├── windows/
│   ├── storage/
│   ├── integrations/
│   ├── utils/
│   └── types/
│
├── src/
│   ├── assets/
│   ├── components/
│   ├── features/
│   ├── hooks/
│   ├── layouts/
│   ├── pages/
│   ├── services/
│   ├── stores/
│   ├── types/
│   ├── utils/
│   ├── css/
│   ├── App.tsx
│   ├── main.tsx
│   └── vite-env.d.ts
│
├── public/
│
├── md/
│   ├── features.md
│   ├── phases.md
│   └── structure.md
│
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
│
├── resources/
│   ├── icons/
│   ├── installers/
│   └── assets/
│
├── scripts/
│
├── dist-electron/
│
├── .gitignore
├── .eslintrc.cjs
├── electron-builder.json5
├── index.html
├── package.json
├── package-lock.json
├── README.md
└── tsconfig.json
```

---

# 3. Electron Directory

The `electron/` directory contains everything that requires Electron's main-process capabilities.

```text
electron/
│
├── main.ts
├── preload.ts
├── electron-env.d.ts
│
├── ipc/
├── services/
├── windows/
├── storage/
├── integrations/
├── utils/
└── types/
```

Important rule:

> Renderer code should never directly access Node.js or Electron privileged APIs.

The flow should be:

```text
React Renderer
      ↓
Preload
      ↓
IPC
      ↓
Electron Main
      ↓
OS / Filesystem / Processes
```

---

# 4. electron/main.ts

This is the Electron application's entry point.

Responsibilities:

- Create the BrowserWindow
- Initialize Electron
- Register IPC handlers
- Initialize application services
- Handle application lifecycle
- Handle tray initialization later
- Handle auto-update initialization later

Keep this file small.

Do NOT put all application logic into `main.ts`.

Eventually:

```text
main.ts
   ↓
initializeApp()
   ↓
registerIpc()
   ↓
createMainWindow()
   ↓
initializeServices()
```

---

# 5. electron/preload.ts

This is the security boundary between React and Electron.

Responsibilities:

- Expose safe APIs
- Use `contextBridge`
- Forward requests through IPC
- Keep exposed APIs minimal

Example conceptual API:

```ts
window.electron.projects.getAll()
window.electron.projects.create()
window.electron.projects.open()

window.electron.terminal.open()
window.electron.terminal.run()

window.electron.editor.open()

window.electron.git.status()
```

Do NOT expose:

```ts
window.electron.executeAnything()
```

Avoid exposing unrestricted Node APIs.

---

# 6. electron/electron-env.d.ts

Contains Electron-specific TypeScript declarations.

Use it for:

- Electron environment typings
- Preload/global declarations
- Build-specific types

Keep it focused on Electron typing rather than application models.

---

# 7. electron/ipc/

The `ipc/` directory contains IPC handlers.

Recommended structure:

```text
electron/ipc/
│
├── index.ts
├── projects.ipc.ts
├── folders.ipc.ts
├── terminal.ipc.ts
├── editor.ipc.ts
├── commands.ipc.ts
├── git.ipc.ts
├── settings.ipc.ts
├── workspace.ipc.ts
└── system.ipc.ts
```

Each file should contain handlers for one domain.

Example:

```text
projects.ipc.ts
├── projects:get-all
├── projects:create
├── projects:update
├── projects:delete
└── projects:open
```

Avoid one giant `ipc.ts` file.

---

# 8. electron/services/

Services contain actual Electron-side business logic.

Recommended:

```text
electron/services/
│
├── project.service.ts
├── folder.service.ts
├── terminal.service.ts
├── command.service.ts
├── editor.service.ts
├── git.service.ts
├── workspace.service.ts
├── detection.service.ts
├── settings.service.ts
├── notification.service.ts
├── process.service.ts
└── system.service.ts
```

Example:

```text
projects.ipc.ts
      ↓
project.service.ts
      ↓
storage.service.ts
```

This keeps IPC thin.

---

# 9. electron/storage/

Responsible for local application persistence.

Start simple:

```text
electron/storage/
│
├── index.ts
├── json-storage.ts
├── paths.ts
└── migrations/
```

Early project:

```text
userData/
├── projects.json
├── settings.json
└── commands.json
```

Later:

```text
userData/
└── dev-launcher.db
```

when SQLite is introduced.

---

# 10. JSON Storage Phase

During the early phases, JSON is enough.

Recommended conceptual data:

```text
projects.json
settings.json
commands.json
workspaces.json
history.json
```

Do not create dozens of storage files immediately.

Start with:

```text
projects.json
settings.json
```

and add files only when the feature requires them.

---

# 11. Storage Migrations

When the data format changes:

```text
migrations/
├── v1-to-v2.ts
├── v2-to-v3.ts
└── index.ts
```

Never silently replace old user data.

Migration flow:

```text
Load
 ↓
Validate version
 ↓
Backup
 ↓
Migrate
 ↓
Validate new data
 ↓
Save
```

---

# 12. electron/windows/

Use this when multiple Electron windows are introduced.

```text
electron/windows/
│
├── main-window.ts
├── launcher-window.ts
├── settings-window.ts
└── about-window.ts
```

Initially, only:

```text
main-window.ts
```

may be needed.

Do not create unnecessary windows.

---

# 13. electron/integrations/

External developer-tool integrations belong here.

Eventually:

```text
electron/integrations/
│
├── vscode/
├── cursor/
├── terminal/
├── git/
├── github/
├── docker/
├── browser/
├── render/
├── vercel/
└── ssh/
```

Example:

```text
electron/integrations/git/
├── git.service.ts
├── git.parser.ts
└── git.types.ts
```

This keeps third-party/platform-specific logic isolated.

---

# 14. electron/utils/

Small Electron/main-process utilities.

Examples:

```text
electron/utils/
├── paths.ts
├── platform.ts
├── executable.ts
├── shell.ts
├── process.ts
├── logger.ts
└── errors.ts
```

Rules:

- Utilities should be small
- Avoid putting business logic here
- Avoid creating a giant `utils.ts`

If a utility becomes domain-specific, move it into a service.

---

# 15. electron/types/

Main-process-specific types.

Example:

```text
electron/types/
├── ipc.ts
├── process.ts
├── storage.ts
└── system.ts
```

Application-wide domain types can eventually live in a shared `src/types` or dedicated shared type location.

---

# 16. React Renderer Structure

The `src/` directory contains the UI.

Recommended:

```text
src/
│
├── assets/
├── components/
├── features/
├── hooks/
├── layouts/
├── pages/
├── services/
├── stores/
├── types/
├── utils/
├── css/
│
├── App.tsx
├── main.tsx
└── vite-env.d.ts
```

---

# 17. src/components/

Use `components/` for reusable UI components.

Recommended:

```text
src/components/
│
├── layout/
├── ui/
├── project/
├── search/
├── command/
├── workspace/
└── common/
```

Example:

```text
components/
├── layout/
│   ├── Sidebar.tsx
│   ├── Header.tsx
│   └── MainContent.tsx
│
├── ui/
│   ├── Button.tsx
│   ├── Modal.tsx
│   ├── Input.tsx
│   └── Dropdown.tsx
│
└── project/
    ├── ProjectCard.tsx
    ├── ProjectList.tsx
    └── ProjectActions.tsx
```

---

# 18. Keep Components Small

Avoid:

```text
ProjectCard.tsx
```

containing:

- UI
- IPC
- filesystem operations
- Git logic
- storage
- business rules

Instead:

```text
ProjectCard
    ↓
hook/store
    ↓
renderer service
    ↓
preload
    ↓
IPC
    ↓
main service
```

React components should primarily describe UI.

---

# 19. src/features/

As the application becomes larger, feature-based organization is recommended.

Example:

```text
src/features/
│
├── projects/
├── search/
├── commands/
├── workspaces/
├── git/
├── settings/
├── history/
└── integrations/
```

A feature can contain:

```text
projects/
├── components/
├── hooks/
├── project.types.ts
├── project.utils.ts
└── project.api.ts
```

Use this structure when the feature becomes large enough to justify it.

Do not force every tiny feature into a directory.

---

# 20. src/layouts/

Application-level layouts.

Example:

```text
layouts/
├── AppLayout.tsx
├── DashboardLayout.tsx
└── SettingsLayout.tsx
```

The primary layout might be:

```text
AppLayout
├── Sidebar
├── Header
└── Content
```

---

# 21. src/pages/

Application screens.

Initially:

```text
pages/
├── HomePage.tsx
└── SettingsPage.tsx
```

Later:

```text
pages/
├── HomePage.tsx
├── ProjectPage.tsx
├── WorkspacePage.tsx
├── SearchPage.tsx
├── SettingsPage.tsx
└── DiagnosticsPage.tsx
```

If the app remains single-page, do not introduce unnecessary routing.

---

# 22. src/hooks/

Reusable React hooks.

Examples:

```text
hooks/
├── useProjects.ts
├── useSearch.ts
├── useCommands.ts
├── useWorkspace.ts
├── useKeyboardShortcut.ts
└── useDebounce.ts
```

Hooks should coordinate UI state and renderer-side APIs.

---

# 23. src/stores/

Use this when global state becomes complex.

Potential:

```text
stores/
├── project.store.ts
├── settings.store.ts
├── command.store.ts
├── workspace.store.ts
└── ui.store.ts
```

Possible state library:

- Zustand
- Redux Toolkit
- Jotai

For the early project, React state/context may be enough.

Do not add a state library just because the project is an Electron app.

---

# 24. src/services/

Renderer-side services.

These should call the preload API rather than Node/Electron directly.

Example:

```text
src/services/
├── project.service.ts
├── command.service.ts
├── workspace.service.ts
├── settings.service.ts
└── system.service.ts
```

Flow:

```text
React
 ↓
Renderer Service
 ↓
window.electron
 ↓
Preload
 ↓
IPC
```

---

# 25. src/types/

Renderer/shared domain types.

Recommended:

```text
src/types/
├── project.ts
├── command.ts
├── workspace.ts
├── settings.ts
├── git.ts
└── common.ts
```

Example:

```ts
export interface Project {
  id: string;
  name: string;
  path: string;
  favorite: boolean;
  createdAt: number;
  updatedAt: number;
  lastOpenedAt?: number;
}
```

Types should be shared consistently between UI and Electron boundaries where practical.

---

# 26. src/utils/

Renderer-side utilities.

Examples:

```text
src/utils/
├── formatDate.ts
├── fuzzySearch.ts
├── keyboard.ts
├── constants.ts
└── validation.ts
```

Keep these UI/application utilities separate from Electron/Node utilities.

---

# 27. src/css/

Your current structure:

```text
src/css/
├── variable.css
├── App.css
└── index.css
```

is fine initially.

As styling grows:

```text
css/
├── variables.css
├── reset.css
├── globals.css
├── utilities.css
└── themes/
    ├── dark.css
    └── light.css
```

If using a component library, avoid duplicating its entire design system in CSS.

---

# 28. src/assets/

Static renderer assets:

```text
assets/
├── icons/
├── images/
├── logos/
└── fonts/
```

Keep large application resources out of component directories.

---

# 29. public/

Use `public/` for assets that need to be copied directly without processing.

Example:

```text
public/
├── favicon.ico
└── static/
```

Do not put normal imported React assets here unless they actually need public/static URLs.

---

# 30. md/

Keep project documentation here.

Recommended:

```text
md/
├── features.md
├── phases.md
└── structure.md
```

Later:

```text
md/
├── features.md
├── phases.md
├── structure.md
├── architecture.md
├── security.md
├── ipc.md
├── storage.md
└── release.md
```

---

# 31. tests/

When testing starts:

```text
tests/
├── unit/
├── integration/
└── e2e/
```

## Unit

Test:

- Utilities
- Detection
- Storage
- Validation
- Parsers

## Integration

Test:

- IPC
- Services
- Project operations
- Process management

## E2E

Test:

- App launch
- Add project
- Search
- Open project
- Workspace launch
- Settings

---

# 32. resources/

Application packaging resources:

```text
resources/
├── icons/
│   ├── icon.ico
│   ├── icon.icns
│   └── icon.png
│
└── assets/
```

Keep installer/package resources separate from renderer assets.

---

# 33. scripts/

Build/release/helper scripts.

Potential:

```text
scripts/
├── clean.ts
├── generate-icons.ts
├── validate-build.ts
└── release.ts
```

Only add scripts when they solve a real repeated task.

---

# 34. dist-electron/

Build output.

Example:

```text
dist-electron/
├── main.js
├── preload.js
└── ...
```

This should normally be generated automatically.

Do NOT manually edit files inside `dist-electron`.

Usually add it to `.gitignore`.

---

# 35. package.json

Keep scripts organized.

Example conceptual scripts:

```json
{
  "scripts": {
    "dev": "...",
    "build": "...",
    "preview": "...",
    "lint": "...",
    "test": "...",
    "package": "...",
    "dist": "..."
  }
}
```

As the application grows, avoid creating dozens of opaque scripts.

---

# 36. electron-builder.json5

Contains packaging configuration.

Potential responsibilities:

- App ID
- Product name
- Output directory
- Icons
- Windows target
- macOS target
- Linux target
- Installer configuration
- Publish/update configuration

Keep platform-specific packaging configuration here rather than scattering it through source code.

---

# 37. README.md

The root README should explain:

- What Dev Launcher is
- Features
- Tech stack
- Development setup
- Commands
- Architecture overview
- Build instructions
- Contribution instructions

Detailed feature planning belongs in `md/features.md`.

---

# 38. Recommended Architecture as the App Grows

The final architecture should resemble:

```text
                         DEV LAUNCHER
                              │
              ┌───────────────┴───────────────┐
              │                               │
          React UI                         Electron
              │                               │
        Components                           IPC
              │                               │
           Features                        Services
              │                               │
           Stores                         Integrations
              │                               │
        Renderer APIs                     Storage / OS
              │                               │
              └────────── Preload ─────────────┘
```

---

# 39. Data Flow Example — Add Project

```text
User clicks "Add Project"
        ↓
React Component
        ↓
Project Hook
        ↓
Renderer Service
        ↓
window.electron.projects.selectFolder()
        ↓
Preload
        ↓
IPC
        ↓
Electron Main
        ↓
Native Folder Dialog
        ↓
Selected Path
        ↓
Project Service
        ↓
Storage
        ↓
projects.json / SQLite
        ↓
IPC Response
        ↓
React State
        ↓
Project appears in UI
```

---

# 40. Data Flow Example — Open VS Code

```text
User clicks VS Code
        ↓
ProjectCard
        ↓
Project Action
        ↓
Renderer Service
        ↓
Preload
        ↓
IPC
        ↓
Editor Service
        ↓
Executable Detection
        ↓
VS Code
        ↓
Project Opens
```

The renderer should NOT execute:

```ts
exec("code ...")
```

directly.

---

# 41. Data Flow Example — Run Command

```text
User clicks "Start Dev"
        ↓
Command Component
        ↓
Command Service
        ↓
Preload
        ↓
IPC
        ↓
Command Service
        ↓
Process Service
        ↓
child_process
        ↓
stdout / stderr
        ↓
IPC events
        ↓
Renderer
        ↓
Command Output UI
```

---

# 42. Growth Strategy

Do not immediately create every directory shown in the final architecture.

## Start With

```text
electron/
├── main.ts
├── preload.ts
└── electron-env.d.ts

src/
├── assets/
├── components/
├── css/
├── App.tsx
├── main.tsx
└── vite-env.d.ts

md/
├── features.md
├── phases.md
└── structure.md
```

This matches your current project closely.

---

# 43. After Phase 1–3

Add:

```text
electron/
├── ipc/
└── services/

src/
├── hooks/
├── services/
└── types/
```

Only when those responsibilities appear.

---

# 44. After Phase 4–10

Add:

```text
electron/
├── storage/
├── integrations/
└── utils/

src/
├── features/
└── stores/
```

This is where the application starts becoming a serious codebase.

---

# 45. After Workspace Features

Add:

```text
electron/
├── process/
├── workspace/
└── integrations/
```

if the existing services become too large.

Possible:

```text
electron/workspace/
├── workspace.service.ts
├── workspace-runner.ts
├── workspace-resolver.ts
└── workspace.types.ts
```

---

# 46. Production Structure

When the application becomes mature:

```text
dev-launcher/
│
├── electron/
│   ├── main.ts
│   ├── preload.ts
│   │
│   ├── ipc/
│   ├── services/
│   ├── storage/
│   ├── integrations/
│   ├── windows/
│   ├── utils/
│   └── types/
│
├── src/
│   ├── features/
│   ├── components/
│   ├── layouts/
│   ├── pages/
│   ├── hooks/
│   ├── stores/
│   ├── services/
│   ├── types/
│   ├── utils/
│   ├── assets/
│   └── css/
│
├── tests/
├── resources/
├── scripts/
├── public/
├── md/
│
├── package.json
├── electron-builder.json5
├── tsconfig.json
├── index.html
└── README.md
```

---

# 47. Important Rules

## Rule 1 — Don't Over-Engineer Early

If a file has 30 lines, do not create five abstractions around it.

Grow the architecture when complexity appears.

## Rule 2 — Main Process Owns Privileged Operations

Filesystem, process execution, native dialogs, Git, Docker, etc. belong behind Electron's main process.

## Rule 3 — Preload Is a Controlled API Boundary

Expose specific operations, not Node itself.

## Rule 4 — Renderer Owns UI

React should handle:

- Rendering
- UI state
- Interaction
- Presentation

## Rule 5 — Services Own Business Logic

Don't put business logic into:

- JSX
- IPC handlers
- `main.ts`

## Rule 6 — Storage Should Be Replaceable

Start with JSON.

Later move to SQLite without rewriting the whole UI.

## Rule 7 — Integrations Should Be Isolated

Git, GitHub, Docker, VS Code, etc. should not be mixed into generic project logic.

## Rule 8 — Keep Destructive Operations Explicit

Commands such as:

```text
git reset --hard
rm -rf
Remove-Item
docker compose down -v
```

should never be executed accidentally.

---

# 48. Current Project → Recommended Next Step

Based on the current structure:

```text
Dev-Launcher/
├── electron/
│   ├── electron-env.d.ts
│   ├── main.ts
│   └── preload.ts
│
├── md/
│   ├── featured.md
│   └── phases.md
│
├── src/
│   ├── assets/
│   ├── components/
│   │   ├── layout/
│   │   └── ui/
│   ├── css/
│   ├── App.tsx
│   ├── main.tsx
│   └── vite-env.d.ts
│
└── ...
```

Do NOT restructure everything right now.

For the first phase, add only:

```text
electron/
├── ipc/
│   └── projects.ipc.ts
│
└── services/
    └── project.service.ts

src/
├── hooks/
│   └── useProjects.ts
│
├── services/
│   └── project.service.ts
│
└── types/
    └── project.ts
```

Then implement Project CRUD.

As more phases arrive, expand the structure organically.

---

# 49. Final Principle

The folder structure should follow the application's complexity.

Start:

```text
Simple
 ↓
Working
 ↓
Separated
 ↓
Scalable
 ↓
Production-ready
```

Do not start with a 100-folder enterprise architecture for a project that currently only opens VS Code and terminals.

The goal is:

> **Simple architecture at the beginning, strong architecture by the time the features demand it.**
