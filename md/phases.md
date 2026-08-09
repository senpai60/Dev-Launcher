# Dev Launcher — Phase-by-Phase Feature Roadmap

> Build Dev Launcher progressively. Start with simple Electron fundamentals, then add developer workflow features, then integrations, and finally production hardening.
>
> Rule: **Do not jump to advanced features early.** Each phase should produce a usable version of the application.

---

# Phase 0 — Project Foundation

## Goal

Set up a clean Electron architecture before adding features.

## Features

- Electron app initialization
- Main process
- Preload script
- Renderer process
- `contextIsolation: true`
- `nodeIntegration: false`
- Basic IPC communication
- TypeScript
- Environment/config structure
- Development scripts
- Production build script
- Basic application window
- Application icon placeholder

## Learn

- Main vs renderer
- Preload
- Context bridge
- IPC
- Electron lifecycle

## Done When

You can:

1. Start Electron
2. Render the UI
3. Call a safe preload API
4. Receive data from the main process

---

# Phase 1 — Basic Project Launcher

## Goal

Build the simplest useful Dev Launcher.

## Features

### Project CRUD

- Add project
- Edit project
- Delete project entry
- View project
- Project name
- Project path

### Folder Selection

- Native folder picker
- Validate selected path
- Detect missing paths

### Opening

- Open project folder in system Explorer/Finder
- Open terminal in project
- Open project in VS Code

### Storage

Start with local JSON:

```text
userData/
└── projects.json
```

Support:

- Read projects
- Save projects
- Update projects
- Delete projects

## UI

Create:

- Sidebar
- Project list
- Add Project button
- Project card
- Project actions
- Empty state

## Learn

- Filesystem APIs
- Native dialogs
- IPC
- OS integration
- JSON persistence

## Done When

You can add:

```text
BrutDesk
C:\Projects\BrutDesk
```

and click:

```text
Open
VS Code
Terminal
Explorer
```

---

# Phase 2 — Favorites + Recent Projects

## Goal

Make the launcher convenient for daily use.

## Features

### Favorites

- Favorite/unfavorite
- Favorites section
- Favorite sorting
- Reorder favorites

### Recent Projects

Track:

- Last opened
- Last action
- Recently used projects

Display:

```text
Favorites
──────────
BrutDesk
Gym Website

Recent
──────
Tattoo Portfolio
CRM
```

### Project Metadata

Add:

- Description
- Icon/emoji
- Tags
- Created date
- Last opened date

## Learn

- State management
- Updating persisted records
- Sorting
- Derived UI state

## Done When

Opening a project automatically moves it into Recent Projects.

---

# Phase 3 — Search + Keyboard Workflow

## Goal

Make Dev Launcher fast enough for real daily use.

## Features

### Search

Search:

- Project name
- Path
- Tags
- Description

### Keyboard Navigation

Support:

- Search shortcut
- Arrow navigation
- Enter to open
- Escape to close

### Quick Actions

From search:

```text
Open Project
Open VS Code
Open Terminal
Open Folder
```

### Command Palette — Basic

Start with only:

- Open project
- Open terminal
- Open VS Code
- Open folder
- Settings

## Learn

- Keyboard events
- Search algorithms
- Fuzzy matching
- Command-driven UI

## Done When

You can open:

```text
Ctrl/Cmd + K
> brutdesk
Enter
```

and immediately launch it.

---

# Phase 4 — Project Auto Detection

## Goal

Make adding projects smarter.

## Features

When adding a project, detect:

### Language

- JavaScript
- TypeScript
- Python
- Go
- Rust
- Java

### Framework

- React
- Next.js
- Vite
- Express
- Electron
- etc.

### Package Manager

- npm
- pnpm
- yarn
- bun

### Project Tools

- Git
- Docker
- TypeScript

### Detection Files

Examples:

```text
package.json
vite.config.*
next.config.*
tsconfig.json
.git
Dockerfile
docker-compose.yml
```

## UI

Show:

```text
BrutDesk

React
Express
TypeScript
npm
Git
```

## Learn

- Filesystem scanning
- File existence checks
- Project metadata detection

## Done When

User does not need to manually enter most project metadata.

---

# Phase 5 — Custom Project Commands

## Goal

Let developers define the commands they repeatedly run.

## Features

Each project can have:

```text
Start Frontend
npm run dev

Start Backend
npm run server

Build
npm run build

Test
npm test
```

Support:

- Create command
- Edit command
- Delete command
- Run command
- Command description
- Working directory
- Package manager-aware commands
- Favorite command

## Command Safety

At this stage:

- Validate command configuration
- Require confirmation for explicitly destructive commands
- Never execute arbitrary commands automatically

## UI

Project:

```text
Commands
────────────
▶ Start Dev
▶ Build
▶ Test
```

## Learn

- Process spawning
- Child processes
- Working directories
- stdout/stderr
- Exit codes

## Done When

A developer can configure a project once and stop manually typing common commands.

---

# Phase 6 — Command Runner + Process Management

## Goal

Turn commands into reliable development tasks.

## Features

### Process State

Show:

```text
● Running
✓ Completed
✕ Failed
○ Stopped
```

### Process Information

- PID
- Exit code
- Start time
- Runtime
- stdout
- stderr

### Controls

- Run
- Stop
- Restart
- Rerun

### Long-Running Processes

Support:

```text
npm run dev
npm run server
npm run worker
```

without freezing the application.

### Basic Logs

Show command output in a dedicated panel.

## Learn

- Node child processes
- Process lifecycle
- Async streams
- Process termination

## Done When

You can start and stop a dev server from Dev Launcher reliably.

---

# Phase 7 — Project URLs + Notes

## Goal

Keep project context in one place.

## URL Features

Per project:

- Production
- Staging
- Localhost
- GitHub
- Figma
- Render
- Documentation

Actions:

- Open
- Edit
- Delete
- Copy URL

## Notes

Support:

- Add note
- Edit note
- Delete note
- Pin note
- Markdown
- Timestamp

Example:

```text
BrutDesk

Notes
─────
Need GitHub webhook.
Client agreement flow pending.
```

## Done When

Opening a project gives access to its code, commands, URLs, and notes.

---

# Phase 8 — Git Basics

## Goal

Add useful Git information without trying to become a full Git client.

## Features

Detect:

- Git repository
- Current branch
- Working tree state

Show:

```text
main
✓ Clean

or

main
● 4 modified files
```

Actions:

- Git status
- Fetch
- Pull
- Push
- Open Git repository
- Open terminal

Show:

- Last commit
- Ahead/behind count
- Changed file count

## Safety

Require confirmation for operations that can overwrite or discard work.

## Learn

- Git CLI
- Process execution
- Parsing command output

## Done When

You can understand the basic Git state of every project without opening another app.

---

# Phase 9 — Better Command Palette

## Goal

Turn the launcher into a true developer command center.

## Commands

Add:

- Open project
- Open terminal
- Open editor
- Run project command
- Git status
- Git pull
- Git push
- Open GitHub
- Open URL
- Launch workspace
- Open folder
- Copy path
- Reveal in Explorer/Finder
- Refresh detection
- Settings

## Search Across

- Projects
- Commands
- URLs
- Workspaces
- Tags

## Learn

- Command registry
- Search ranking
- Action abstraction

## Done When

Most daily actions can be performed from one search box.

---

# Phase 10 — Settings + Tool Detection

## Goal

Make the launcher configurable across different machines.

## Settings

### General

- Default editor
- Default terminal
- Startup behavior
- Recent history limit

### Appearance

- Dark
- Light
- System
- Accent color
- Density

### Keyboard

- Global launcher shortcut
- Search shortcut
- Command palette shortcut

### Integrations

- Editor
- Terminal
- Git
- Docker

## Tool Detection

Detect:

- Git
- Node
- npm
- pnpm
- yarn
- bun
- Docker
- VS Code
- Cursor
- Git Bash
- PowerShell

Show versions where available.

## Done When

The same application works cleanly on machines with different tool installations.

---

# Phase 11 — Folder Launcher + Project Groups

## Goal

Organize more than just coding projects.

## Folder Launcher

Support:

- Add folder
- Open folder
- Open terminal
- Open editor
- Reveal folder
- Copy path
- Favorite

## Groups

Examples:

```text
Freelance
├── BrutDesk
├── Gym
└── Tattoo

Personal
├── Electron Launcher
└── Experiments

Learning
├── Node
└── Rust
```

Features:

- Create group
- Rename
- Delete
- Reorder
- Move project between groups

## Done When

The launcher becomes the developer's main workspace index.

---

# Phase 12 — Workspace Launching

## Goal

Introduce the first major advanced feature.

A workspace launches an entire development environment.

Example:

```text
BrutDesk Workspace

VS Code
├── frontend
└── server

Terminal 1
npm run dev

Terminal 2
npm run server

Browser
localhost:5173
```

## Features

- Create workspace
- Edit workspace
- Delete workspace
- Launch workspace
- Stop workspace
- Restart workspace
- Workspace status

## Workspace Components

- Editor
- Terminal
- Command
- URL
- Folder

## Done When

One click can reproduce your normal project startup routine.

---

# Phase 13 — Workspace Profiles + Multi-Root Projects

## Goal

Handle complex applications.

## Profiles

Examples:

- Development
- Client Demo
- Testing
- Frontend Only
- Backend Only

Each profile can have:

- Different commands
- Different URLs
- Different folders
- Different services

## Multi-Root

Support:

```text
Project
├── frontend
├── backend
├── worker
└── infrastructure
```

Each root can have:

- Path
- Commands
- Editor
- Git repository

## Done When

Large MERN/monorepo-style applications can be launched cleanly.

---

# Phase 14 — Docker Integration

## Goal

Add local infrastructure management.

## Detection

Detect:

- Docker
- Docker Compose
- Dockerfile
- Compose files

## Features

- Compose up
- Compose down
- Restart
- Container list
- Container status
- Container logs

Display:

```text
Docker

mongodb     ● Running
redis       ● Running
backend     ● Running
```

## Later

- Container shell
- Image management
- Volume management

## Done When

A project using Docker can be started from the same workspace.

---

# Phase 15 — Project Health + Diagnostics

## Goal

Help developers quickly understand why a project is not working.

## Health Checks

Check:

- Project path
- Git
- Node
- Package manager
- Dependencies
- Lockfile
- Docker
- Editor
- Required files

Example:

```text
BrutDesk Health

Git             ✓
Node            ✓
Dependencies    ✓
Docker          ✓
Build config    ✓
```

## Diagnostics

Create a diagnostics screen for:

- Electron
- Node
- Git
- Terminal
- Editor
- Filesystem
- Storage
- Updater

Provide:

`Copy Diagnostics`

Never include secrets.

## Done When

The app can identify common local setup problems without crashing.

---

# Phase 16 — Port + Browser Integration

## Goal

Improve local development workflow.

## Features

Detect ports used by managed processes.

Example:

```text
Frontend
localhost:5173
● Running

Backend
localhost:5000
● Running
```

Actions:

- Open browser
- Copy URL
- Identify process
- Stop process
- Kill process by port

## Browser Support

Allow:

- Default browser
- Chrome
- Edge
- Firefox

## Future

Wait for server readiness before opening browser.

---

# Phase 17 — Environment Profiles

## Goal

Support projects with multiple runtime environments.

Profiles:

```text
Development
Testing
Client Demo
Production-like
```

Each profile can define:

- Environment file
- Commands
- URLs
- Docker services
- Workspace settings

## Security

Do not expose secrets unnecessarily.

Do not log `.env` contents.

For application-managed secrets, use OS secure storage.

## Done When

Switching a project profile changes its development workflow safely and predictably.

---

# Phase 18 — Process Dependencies + Smart Workspace Startup

## Goal

Make workspace launching reliable instead of simply launching everything at once.

Example:

```text
MongoDB
   ↓
Backend
   ↓
Frontend
```

## Features

- Startup order
- Dependencies
- Delays
- Readiness checks
- Port checks
- HTTP health checks
- Docker health checks

Example:

1. Start MongoDB
2. Wait for MongoDB
3. Start backend
4. Wait for API
5. Start frontend
6. Open browser

## Failure Handling

```text
Backend ✕ Failed

[ Restart ]
[ View Logs ]
[ Continue ]
```

## Done When

A complete workspace can recover from partial startup failures.

---

# Phase 19 — System Tray + Global Launcher

## Goal

Make Dev Launcher always available.

## System Tray

- Open launcher
- Favorites
- Recent projects
- Quick commands
- Settings
- Quit

Settings:

- Start with system
- Start minimized
- Close to tray

## Global Shortcut

Example:

```text
Ctrl/Cmd + Space
```

Open a lightweight launcher.

Search:

```text
> brutdesk
```

Results:

```text
Open BrutDesk
Open Terminal
Open VS Code
Run Dev
Open GitHub
Open Production
```

## Done When

Dev Launcher can replace repeated Start Menu/File Explorer workflows.

---

# Phase 20 — Backup + Import/Export + Migration

## Goal

Make user data safe.

## Export

Export:

- Projects
- Favorites
- Groups
- Commands
- Workspaces
- URLs
- Notes
- Settings

Do not export secrets by default.

## Import

Support:

- Preview
- Merge
- Replace
- Conflict resolution
- Missing-path detection
- Path remapping

## Backups

Support:

- Automatic backups
- Manual backup
- Restore backup
- Backup retention

## Schema Migration

Use:

```text
v1 → v2
v2 → v3
```

Never overwrite incompatible data blindly.

## Done When

A user can move Dev Launcher to another machine without rebuilding everything manually.

---

# Phase 21 — SQLite Migration

## Goal

Move from simple JSON storage to a stronger local data layer when the application becomes complex.

## Consider SQLite For

- Projects
- Groups
- Commands
- Workspaces
- Notes
- URLs
- History
- Git metadata
- Search index

## Keep Secure Storage Separate

Use OS secure storage for:

- Tokens
- Passwords
- API keys
- Sensitive credentials

## Benefits

- Transactions
- Relationships
- Search
- Migrations
- Better reliability

## Done When

Data operations are more structured than a collection of large JSON files.

---

# Phase 22 — Embedded Terminal

## Goal

Optional advanced terminal experience.

## Technologies

Potential:

- xterm.js
- node-pty

## Features

- Embedded terminal
- Multiple tabs
- Split panes
- Copy/paste
- Search
- Resize
- Named sessions
- Session management

## Important

This is intentionally late because terminal embedding adds significant complexity.

Do not build this before the external terminal workflow is stable.

---

# Phase 23 — GitHub Integration

## Goal

Connect project repositories to GitHub.

## Features

- Connect GitHub
- List repositories
- Map project to repository
- Open repository
- Open issues
- Open pull requests
- Recent commits
- Branches
- GitHub Actions status

## Advanced

- Create issue
- Create PR
- Review status
- Repository search

## Security

Use OAuth with minimum required permissions.

Do not store access tokens in plain JSON.

---

# Phase 24 — Project Templates

## Goal

Create new projects from reusable templates.

## Features

Templates:

- React + Vite
- Next.js
- Express
- MERN
- Electron
- Custom templates

Template configuration:

- Name
- Source
- Setup command
- Post-create command
- Variables

Example:

```text
Create MERN Project

Name: My CRM
Location: C:\Projects
```

---

# Phase 25 — Testing + Build Integration

## Goal

Make project quality checks accessible.

Detect:

- Jest
- Vitest
- Playwright
- Cypress
- Mocha

Actions:

- Run tests
- Watch tests
- Build
- Open test report

Show:

```text
Build
✓ Passed

Tests
✓ 42 passed
```

---

# Phase 26 — Deployment Integrations

## Goal

Connect the launcher to deployment platforms.

Potential:

- Render
- Vercel
- Netlify
- Railway
- Fly.io
- AWS

Actions:

- Open project dashboard
- Open deployment
- View deployment
- View logs
- Open production
- Trigger deployment where supported

Prefer official APIs and OAuth.

---

# Phase 27 — SSH + Server Shortcuts

## Goal

Make Dev Launcher useful for remote development.

## Features

- SSH host list
- Open SSH terminal
- Copy SSH command
- Open SSH config
- Server groups

Example:

```text
Servers

Production
Staging
Development
```

Never expose private SSH keys through the UI.

---

# Phase 28 — Secret Manager Integrations

## Goal

Avoid handling credentials as plain text.

Potential integrations:

- Windows Credential Manager
- macOS Keychain
- Linux Secret Service
- 1Password
- Bitwarden

Use secure storage for application-managed credentials.

Never store secrets in:

```text
projects.json
settings.json
logs
backups
```

unless they are explicitly encrypted and designed for that purpose.

---

# Phase 29 — Plugin Architecture

## Goal

Allow integrations to grow without bloating the core application.

Potential plugins:

- GitHub
- GitLab
- Docker
- Jira
- Linear
- Figma
- Notion
- AWS
- Render
- Vercel

Potential plugin APIs:

```text
registerCommand()
registerProjectAction()
registerSearchProvider()
registerSettingsPage()
registerIntegration()
```

Plugins should have restricted permissions.

---

# Phase 30 — Workflow Automation

## Goal

Allow developers to define repeatable sequences.

Example:

```text
Morning Setup

1. Open BrutDesk
2. Open VS Code
3. Start MongoDB
4. Start backend
5. Start frontend
6. Open browser
```

Support:

- Create workflow
- Edit workflow
- Run workflow
- Stop workflow
- Enable/disable
- Logs
- Failure handling

This becomes a lightweight developer automation engine.

---

# Phase 31 — Team Workspaces

## Goal

Future agency/team functionality.

Potential:

- Shared workspace configurations
- Shared commands
- Shared templates
- Shared project metadata
- Organization settings

Do not introduce cloud/team infrastructure until the local-first application is already strong.

---

# Phase 32 — Cloud Sync

## Goal

Optional multi-device synchronization.

Sync:

- Projects metadata
- Favorites
- Groups
- Commands
- Workspaces
- URLs
- Settings

Never automatically sync:

- `.env`
- passwords
- API keys
- SSH private keys

Potential requirements:

- Authentication
- Encryption
- Conflict resolution
- Device management
- Offline sync queue

---

# Phase 33 — AI Features

## Goal

Add AI only after the core launcher is excellent.

Potential:

### Error Explanation

```text
Why isn't my backend starting?
```

### Project Assistant

- Explain project structure
- Suggest commands
- Diagnose configuration
- Explain build errors

### Workspace Generator

Describe:

```text
Start my MERN project with MongoDB,
backend, frontend and browser.
```

AI generates a workspace configuration for approval.

### Security Rule

Never automatically send:

- Source code
- `.env`
- Tokens
- Passwords
- Private project data

without explicit user permission.

---

# Phase 34 — Smart Recommendations

## Goal

Use local usage patterns to make the launcher faster.

Examples:

```text
Continue where you left off

BrutDesk
Gym Website
Tattoo Portfolio
```

Possible signals:

- Recently opened
- Frequently opened
- Last command
- Active workspace

Keep this local and non-invasive.

---

# Phase 35 — Scheduled Developer Tasks

## Goal

Optional automation for repetitive local tasks.

Potential:

- Scheduled commands
- Maintenance tasks
- Dependency checks
- Backup tasks

Requirements:

- Explicit enable/disable
- Execution logs
- Destructive command confirmation
- Safe failure behavior

---

# Phase 36 — Production Hardening

## Goal

Convert the feature-rich application into a reliable distributable product.

## Security

- Context isolation
- Node integration disabled
- Sandboxing where practical
- Strict IPC
- Input validation
- Controlled navigation
- Controlled external URLs
- Controlled shell execution
- Secure credential storage
- Dependency audits

## Reliability

- Crash handling
- Error boundaries
- Data validation
- Atomic writes
- Backups
- Schema migrations
- Recovery defaults
- Process cleanup

## Performance

- Fast startup
- Lazy integrations
- Async filesystem operations
- Async Git checks
- Search optimization
- No blocking main process
- Virtualized large lists

---

# Phase 37 — Logging + Diagnostics

## Goal

Make support and debugging easy.

Logs:

```text
logs/
├── main.log
└── errors.log
```

Log:

- App lifecycle
- IPC failures
- Process failures
- Storage failures
- Update failures

Never log:

- Passwords
- Tokens
- `.env`
- Private credentials

Diagnostics:

```text
Electron
Node
Git
Terminal
Editor
Storage
Updater
OS
```

Allow:

`Export Diagnostic Logs`

---

# Phase 38 — Auto Update

## Goal

Allow users to update Dev Launcher without reinstalling manually.

Features:

- Check for updates
- Download update
- Install on restart
- Release notes
- Failed update handling

Potential channels:

- Stable
- Beta
- Nightly

Use signed releases.

---

# Phase 39 — Packaging + Distribution

## Goal

Ship the application professionally.

## Windows

- Installer
- Optional portable build
- Start Menu shortcut
- Uninstaller
- Code signing

## macOS

- DMG
- App bundle
- Code signing
- Notarization

## Linux

- AppImage
- deb
- Optional rpm

---

# Phase 40 — Testing & Release Quality

## Unit Tests

Test:

- Storage
- Validation
- Project detection
- Command parsing
- Path utilities
- Migrations

## Integration Tests

Test:

- IPC
- Project creation
- Project launching
- Command execution
- Git
- Editor integration

## E2E Tests

Test:

- Startup
- Add project
- Search
- Open project
- Workspace launch
- Settings
- Import/export

---

# Phase 41 — Accessibility + Localization

## Accessibility

Support:

- Keyboard navigation
- Visible focus
- Screen readers
- Contrast
- Reduced motion
- Scalable text
- Clear errors

## Localization

Prepare UI for:

- English
- Hindi
- Spanish
- French
- German
- Japanese

Do not hard-code user-facing text throughout the application.

---

# Recommended MVP

Do not build 40+ phases before using the product.

The first genuinely useful release should end around **Phase 8–10**.

## MVP Features

1. Electron architecture
2. Project CRUD
3. Folder picker
4. JSON persistence
5. Open Explorer/Finder
6. Open terminal
7. Open VS Code
8. Favorites
9. Recent projects
10. Search
11. Keyboard navigation
12. Project auto-detection
13. Custom commands
14. Process runner
15. Project URLs
16. Project notes
17. Basic Git status
18. Settings
19. Tool detection
20. Basic error handling

At this point Dev Launcher is already a useful personal application.

---

# First Major Upgrade

After MVP:

## Workspace System

Build:

```text
Project
    ↓
Workspace
    ↓
Editor
Terminal 1
Terminal 2
Backend
Frontend
Docker
Browser
```

This is the feature that transforms the project from a launcher into a serious developer productivity tool.

---

# Recommended Final Growth Path

```text
PHASE 0
Electron Foundation
        ↓
PHASE 1
Basic Project Launcher
        ↓
PHASE 2
Favorites + Recents
        ↓
PHASE 3
Search + Keyboard
        ↓
PHASE 4
Project Detection
        ↓
PHASE 5
Custom Commands
        ↓
PHASE 6
Process Management
        ↓
PHASE 7
URLs + Notes
        ↓
PHASE 8
Git Basics
        ↓
PHASE 9
Command Palette
        ↓
PHASE 10
Settings + Tool Detection
        ↓
PHASE 11
Folders + Groups
        ↓
PHASE 12
Workspace Launcher
        ↓
PHASE 13
Workspace Profiles
        ↓
PHASE 14
Docker
        ↓
PHASE 15
Health + Diagnostics
        ↓
PHASE 16
Ports + Browser
        ↓
PHASE 17
Environment Profiles
        ↓
PHASE 18
Smart Workspace Startup
        ↓
PHASE 19
Tray + Global Launcher
        ↓
PHASE 20
Backup + Import/Export
        ↓
PHASE 21
SQLite
        ↓
PHASE 22
Embedded Terminal
        ↓
PHASE 23
GitHub
        ↓
PHASE 24
Templates
        ↓
PHASE 25
Testing + Build
        ↓
PHASE 26
Deployment Integrations
        ↓
PHASE 27
SSH
        ↓
PHASE 28
Secret Managers
        ↓
PHASE 29
Plugins
        ↓
PHASE 30
Workflow Automation
        ↓
PHASE 31+
Team / Cloud / AI / Smart Features
        ↓
FINAL
Production Hardening + Distribution
```

---

# Important Build Rule

For every phase:

1. Build the smallest version.
2. Test it manually.
3. Refactor the architecture.
4. Add error handling.
5. Persist the data if needed.
6. Update types.
7. Test edge cases.
8. Only then move to the next phase.

Do not build the entire application in one giant pass.

The purpose of this project is not just to finish Dev Launcher.

It is to progressively learn:

```text
Electron
→ IPC
→ Filesystem
→ OS APIs
→ Process Management
→ Git
→ Workspace Orchestration
→ Docker
→ Security
→ Persistence
→ SQLite
→ Packaging
→ Auto Updates
→ Production Desktop Apps
```

That progression should drive the phase order.
