# Dev Launcher — Production Feature Specification

> A production-ready developer workspace launcher built with Electron.
>
> Goal: turn the launcher from a simple "open project / VS Code / terminal" utility into a developer command center that can manage projects, workspaces, commands, tools, Git, containers, URLs, notes, and developer workflows from one place.

---

# 1. Product Vision

Dev Launcher should provide a fast, keyboard-first way for developers to:

- Find and open projects
- Open projects in editors
- Open terminals at the correct working directory
- Run project-specific commands
- Manage favorite and recent projects
- Launch complete development workspaces
- Manage Git/GitHub workflows
- Open project-related URLs
- Store project notes and metadata
- Detect development tools and project stacks
- Monitor basic project/tool health
- Integrate with Docker and other developer tools
- Customize the launcher
- Work reliably offline
- Safely persist local configuration
- Update itself as a packaged desktop application

Core principle:

> Anything a developer repeatedly does to start or switch between projects should be a candidate for one-click or keyboard-driven automation.

---

# 2. Core Project Management

## 2.1 Add Project

Users should be able to add a project by:

- Selecting a folder
- Entering a path
- Dragging a folder into the application
- Importing a project configuration

When a project is added:

- Validate that the path exists
- Detect whether it is a directory
- Detect Git repository
- Detect package manager
- Detect project type
- Detect framework
- Detect language
- Detect common configuration files
- Generate project metadata
- Record creation time

## 2.2 Project CRUD

Support:

- Create project entry
- View project
- Edit project
- Delete project entry
- Duplicate project configuration
- Archive/hide project
- Restore archived project

Deleting a project entry must NOT delete the actual project folder unless a separate, explicit destructive workflow is added.

## 2.3 Project Metadata

Each project can contain:

- ID
- Name
- Path
- Description
- Icon
- Tags
- Stack
- Language
- Framework
- Package manager
- Repository information
- Favorite state
- Archived state
- Created timestamp
- Updated timestamp
- Last opened timestamp
- Last command timestamp
- Custom commands
- Project URLs
- Notes
- Environment file references
- Workspace configuration

---

# 3. Project Discovery & Auto Detection

When a folder is added, inspect it and infer useful information.

Examples:

- `package.json` → Node.js project
- `vite.config.*` → Vite
- `next.config.*` → Next.js
- `electron-builder` → Electron
- `tsconfig.json` → TypeScript
- `Dockerfile` → Docker
- `docker-compose.yml` / `compose.yml` → Docker Compose
- `.git` → Git
- `requirements.txt` / `pyproject.toml` → Python
- `Cargo.toml` → Rust
- `go.mod` → Go
- `pom.xml` → Maven
- `build.gradle` → Gradle

Detect:

- Node
- npm
- pnpm
- yarn
- bun
- Python
- pip
- Rust
- Cargo
- Go
- Java
- Docker
- Git

Detection must be best-effort and should never make the application unusable when detection fails.

---

# 4. Favorites

Support:

- Favorite/unfavorite project
- Favorite folders
- Favorite workspaces
- Favorite commands
- Reorder favorites
- Dedicated favorites section
- Keyboard access to favorites

Example:

- BrutDesk
- Gym Website
- Tattoo Portfolio
- CRM

---

# 5. Recent Items

Track recently used:

- Projects
- Folders
- Commands
- Workspaces
- URLs

For projects record:

- Last opened time
- Number of launches
- Last action

Support:

- Recent projects
- Recently run commands
- Clear history
- Configurable history size

---

# 6. Search

Global search should search across:

- Projects
- Folders
- Commands
- Workspaces
- URLs
- Notes
- Git repositories
- Tags

Search should support:

- Fuzzy search
- Prefix search
- Tag search
- Keyboard navigation
- Search ranking
- Recent-item prioritization
- Favorites prioritization

Example:

`brut`

could return:

- BrutDesk project
- BrutCode folder
- Start BrutDesk command
- BrutDesk GitHub repository
- BrutDesk production URL

---

# 7. Command Palette

Provide a developer-focused command palette.

Suggested shortcut:

`Ctrl/Cmd + K`

Possible commands:

- Open project
- Open terminal
- Open editor
- Run command
- Git status
- Git pull
- Git push
- Open GitHub
- Open production URL
- Launch workspace
- Open folder
- Copy project path
- Reveal project in Explorer/Finder
- Refresh project detection
- Open settings

The command palette should support aliases and keyboard navigation.

---

# 8. Keyboard-First Workflow

The application should be usable almost entirely from the keyboard.

Support:

- Global launcher shortcut
- Search shortcut
- Command palette shortcut
- Arrow navigation
- Enter to launch
- Escape to close
- Shortcut for terminal
- Shortcut for editor
- Shortcut for Explorer/Finder
- Shortcut for favorite projects
- Shortcut for recent projects

Avoid requiring mouse interaction for common operations.

---

# 9. Editor Integration

Support configurable code editors.

Potential integrations:

- Visual Studio Code
- VS Code Insiders
- Cursor
- Windsurf
- WebStorm
- IntelliJ IDEA
- Android Studio
- Sublime Text
- Other custom editors

Features:

- Detect installed editors
- Set default editor
- Open project
- Open folder
- Open file
- Open workspace
- Open new editor window
- Configure custom editor command

Example:

`code "C:\Projects\BrutDesk"`

Editor commands should be platform-aware.

---

# 10. Terminal Integration

Support configurable terminals:

- PowerShell
- CMD
- Windows Terminal
- Git Bash
- macOS Terminal
- iTerm
- Linux terminal
- Custom terminal application

Features:

- Open terminal in project
- Open terminal in folder
- Open terminal in selected subdirectory
- Run command in project
- Open new terminal
- Configure default terminal

The terminal working directory must be correct automatically.

---

# 11. Command Runner

Each project can define custom commands.

Example:

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

Command metadata can include:

- Name
- Command
- Working directory
- Shell
- Environment
- Icon
- Shortcut
- Confirmation requirement
- Whether command should open a terminal
- Whether output should be captured

Support:

- Run
- Stop
- Restart
- Rerun
- Command history

---

# 12. Command Presets / Snippets

Global command snippets can be stored.

Categories:

- Git
- Node
- npm
- Docker
- Database
- Deployment
- File utilities

Examples:

```text
git status
git pull
git fetch
npm install
npm run dev
docker compose up
docker compose down
```

Allow variables such as:

- Current project path
- Current branch
- Project name

---

# 13. Process Management

For long-running commands, provide basic process management.

Features:

- Start process
- Stop process
- Restart process
- Show process status
- Capture stdout
- Capture stderr
- Show exit code
- Detect crashes
- Prevent duplicate process launches when appropriate

Example:

```text
BrutDesk Backend
● Running
PID: 14320
Port: 5000
```

Potential future support:

- Port detection
- Kill process by port
- Process tree termination
- Resource usage

---

# 14. Workspace System

A workspace represents the entire development environment for a project.

Example:

```text
BrutDesk Workspace

Editor
  frontend/
  server/

Terminal 1
  npm run dev

Terminal 2
  npm run server

Browser
  http://localhost:5173

Docker
  mongodb
  redis
```

One action:

`Launch Workspace`

should orchestrate all configured components.

Workspace configuration can contain:

- Editor
- Folders
- Terminals
- Commands
- URLs
- Docker services
- Environment profile
- Startup order
- Delays
- Dependencies between processes

---

# 15. Workspace Profiles

Allow multiple profiles per project.

Examples:

- Development
- Production-like
- Client Demo
- Testing
- Frontend Only
- Backend Only

Each profile can have different:

- Commands
- Environment files
- URLs
- Containers
- Editor folders
- Terminal layout

---

# 16. Folder Launcher

Not every directory is a project.

Support generic folders:

- Clients
- Assets
- Downloads
- Documents
- Freelance
- BrutCode
- Resources

Actions:

- Open folder
- Open terminal here
- Open editor here
- Copy path
- Reveal in Explorer/Finder
- Add to favorites

---

# 17. URL / Web Shortcuts

Project-specific URLs:

- Production
- Staging
- Local development
- GitHub
- GitHub Actions
- Render
- Vercel
- Figma
- Documentation
- Client dashboard
- API documentation

Actions:

- Open URL
- Copy URL
- Edit URL
- Delete URL
- Favorite URL

---

# 18. Project Notes

Each project can contain lightweight notes.

Features:

- Create note
- Edit note
- Delete note
- Timestamp notes
- Markdown support
- Search notes
- Pin important notes

Example:

```text
Need to implement GitHub webhook.
Client agreement flow pending.
Move worker to BullMQ later.
```

---

# 19. Environment File Utilities

Support references to:

- `.env`
- `.env.local`
- `.env.development`
- `.env.production`
- `.env.example`

Features:

- Open env file
- Open env directory
- Open example env
- Compare environment files
- Detect missing env files

SECURITY:

- Never expose secrets in logs
- Avoid sending secrets to renderer unnecessarily
- Use OS secure storage when the application itself must persist sensitive values
- Do not silently upload environment data

---

# 20. Git Integration

Project Git features:

- Detect Git repository
- Current branch
- Working tree status
- Changed files count
- Ahead/behind count
- Last commit
- Git status
- Fetch
- Pull
- Push
- Branch list
- Checkout branch
- Open repository
- Open terminal at repository

Potential advanced features:

- Commit
- Stage/unstage
- Diff viewer
- Stash
- Merge
- Rebase
- Tags

Destructive Git operations should require confirmation.

---

# 21. GitHub Integration

Optional GitHub account integration.

Features:

- Connect GitHub
- List repositories
- Detect repository for project
- Open repository
- Open issues
- Open pull requests
- View recent commits
- View GitHub Actions status
- Open branches
- Open releases

Advanced:

- Repository search
- PR creation
- Issue creation
- Notifications
- Review status

Use least-privilege OAuth permissions.

---

# 22. Docker Integration

Detect:

- Docker
- Docker Compose
- Dockerfiles
- Compose files

Project actions:

- Docker Compose up
- Docker Compose down
- Restart services
- Show containers
- Show logs
- Open Docker configuration

Container information:

- Name
- Status
- Ports
- Image
- Health

Potential advanced support:

- Container restart
- Container shell
- Image management
- Volume management

---

# 23. Project Health

Provide a lightweight project health view.

Check:

- Project path exists
- Git repository exists
- Git status
- Node version
- Package manager
- Dependencies installed
- Lockfile present
- Build configuration
- Docker availability
- Required tools

Example:

```text
BrutDesk

Git             ✓
Node            ✓
Dependencies    ✓
Docker          ✓
Build           ✓
```

Health checks should be asynchronous and should not freeze the UI.

---

# 24. Dependency Utilities

Useful project actions:

- Install dependencies
- Update dependencies
- Reinstall dependencies
- Remove `node_modules`
- Run package manager audit
- Detect outdated packages

Destructive operations require confirmation.

Do not automatically modify dependencies without explicit user action.

---

# 25. Project Templates

Allow reusable project templates.

Examples:

- React + Vite
- Next.js
- Express
- MERN
- Electron
- Node API

Template definition can include:

- Template name
- Source repository/folder
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

# 26. Project Import / Export

Export launcher configuration.

Include:

- Projects
- Favorites
- Commands
- Workspaces
- URLs
- Settings
- Notes

Do NOT export secrets by default.

Import should:

- Validate schema
- Show preview
- Detect conflicts
- Allow merge/replace
- Handle missing paths
- Support path remapping

---

# 27. Cross-Machine Path Remapping

When importing a configuration on another computer:

```text
BrutDesk
Path unavailable

[ Locate Project ]
```

Support configurable root mappings:

```text
Machine A:
C:\Projects

Machine B:
D:\Development
```

Then map:

`C:\Projects\BrutDesk`

to:

`D:\Development\BrutDesk`

---

# 28. System Tray

Provide a tray application.

Actions:

- Open launcher
- Favorites
- Recent projects
- Quick commands
- Settings
- Quit

Optional:

- Start minimized
- Minimize to tray
- Close window to tray

---

# 29. Startup

Settings:

- Launch on system startup
- Start minimized
- Start in tray
- Restore previous state

Startup behavior should be configurable.

---

# 30. Notifications

Notify users about important events:

- Command completed
- Command failed
- Workspace launched
- Workspace partially failed
- Update available
- Tool unavailable

Avoid excessive notifications.

---

# 31. Application Settings

## General

- Startup behavior
- Tray behavior
- Default editor
- Default terminal
- Project root directory
- History limit

## Appearance

- Dark mode
- Light mode
- System mode
- Accent color
- Compact/comfortable density

## Integrations

- Editors
- Terminals
- Git
- GitHub
- Docker

## Keyboard

- Global launcher shortcut
- Search shortcut
- Command palette shortcut
- Custom project shortcuts

---

# 32. Tool Detection

Detect installed developer tools.

Examples:

- Git
- Node
- npm
- pnpm
- yarn
- bun
- Python
- Docker
- VS Code
- Cursor
- Git Bash
- PowerShell

Show:

```text
Git       ✓ 2.51.0
Node      ✓ 24.x
Docker    ✓
VS Code   ✓
```

If missing:

```text
VS Code not detected.

[ Configure ]
```

Never assume a hard-coded executable path.

---

# 33. Platform Abstraction

Support Windows, macOS, and Linux.

Abstract:

- File paths
- Shells
- Terminals
- Editors
- Explorer/Finder
- Startup behavior
- Notifications
- Keyboard shortcuts
- Executable discovery

Never assume:

```text
C:\...
```

for all platforms.

---

# 34. Global Launcher

Future high-value feature:

A global keyboard shortcut opens a lightweight search UI.

Example:

`Ctrl/Cmd + Space`

Search:

```text
> brutdesk
```

Results:

```text
Open BrutDesk
Open Terminal
Open VS Code
Run Dev Server
Open GitHub
Open Production
```

This can evolve into a developer-specific launcher similar in spirit to Raycast/Alfred/PowerToys Run.

---

# 35. Quick Actions

Project cards can expose:

- Open
- Terminal
- VS Code
- Explorer
- Run Dev
- Git Status
- GitHub
- Production

Avoid making cards visually overloaded; keep advanced actions inside a context menu or action panel.

---

# 36. Context Menu

Right-click project:

```text
Open
Open in VS Code
Open Terminal
Open Folder
Run Command
Git
URLs
Workspace
Edit
Favorite
Archive
Delete
```

Destructive actions should be separated visually.

---

# 37. Project Statistics

Optional metadata:

- Times opened
- Last opened
- Commands executed
- Workspace launches
- Last Git activity

Do not collect analytics remotely unless the user explicitly opts in.

---

# 38. Local Data Storage

Recommended initial architecture:

```text
userData/
├── config.json
├── projects.json
├── workspaces.json
├── commands.json
├── settings.json
├── history.json
├── notes.json
└── logs/
```

Use versioned schemas.

Example:

```json
{
  "version": 2,
  "projects": []
}
```

Production requirements:

- Atomic writes
- Validation
- Corruption handling
- Backup before migrations
- Schema migrations
- Recovery defaults

For larger data requirements, consider SQLite instead of many JSON files.

---

# 39. SQLite Future Migration

JSON is excellent for learning and the first version.

For a larger production application, consider SQLite for:

- Projects
- Commands
- History
- Notes
- Workspaces
- Git metadata
- Search indexes

Benefits:

- Transactions
- Querying
- Relationships
- Better scaling
- Better migration support

Sensitive credentials should still use OS secure storage rather than plain SQLite.

---

# 40. Electron Security

Production Electron security requirements:

- `contextIsolation: true`
- `nodeIntegration: false`
- Sandbox where practical
- Narrow IPC APIs
- Validate IPC arguments
- Never trust renderer input
- Avoid arbitrary shell execution
- Avoid exposing Node APIs directly
- Restrict navigation
- Restrict new windows
- Validate external URLs
- Use secure protocol patterns where needed
- Keep dependencies updated

Architecture:

```text
Renderer
   ↓
Preload
   ↓
IPC
   ↓
Main Process
   ↓
OS / Filesystem / Processes
```

---

# 41. Secure IPC Design

Prefer focused APIs:

```text
projects.getAll()
projects.create()
projects.update()
projects.delete()
projects.open()

terminal.open()
terminal.run()
terminal.stop()

editor.detect()
editor.open()

git.status()
git.pull()
git.push()

settings.get()
settings.update()
```

Avoid giant unrestricted APIs such as:

```text
executeAnything(command)
```

IPC should use:

- Input validation
- Explicit operations
- Typed request/response contracts
- Error normalization
- Permission checks where appropriate

---

# 42. Shell Execution Safety

Commands are inherently powerful.

Rules:

- Do not silently execute arbitrary renderer-provided shell strings
- Distinguish trusted configured commands from user-entered commands
- Require confirmation for destructive operations
- Never interpolate secrets into logs
- Handle command cancellation
- Handle process trees
- Normalize platform-specific shell behavior

Potential destructive commands should have explicit warnings.

---

# 43. Error Handling

Gracefully handle:

- Missing folder
- Deleted project
- Permission denied
- Git unavailable
- Node unavailable
- Editor unavailable
- Terminal unavailable
- Command failure
- Process crash
- Invalid configuration
- Corrupt local data
- Invalid import
- Update failure

Use human-readable errors.

Example:

```text
Couldn't open VS Code.

VS Code was not detected.

[ Configure Editor ]
```

---

# 44. Logging

Maintain application logs for troubleshooting.

Log:

- Application lifecycle
- Important IPC failures
- Process failures
- Update failures
- Storage failures

Do NOT log:

- Passwords
- API tokens
- `.env` contents
- OAuth secrets
- Private credentials

Provide:

`Open Logs Folder`

and optionally:

`Export Diagnostic Logs`

---

# 45. Crash Recovery

If a workspace/process crashes:

- Detect exit
- Show status
- Preserve logs
- Offer restart
- Do not automatically loop forever

Potential:

```text
Backend crashed.

Exit code: 1

[ Restart ]
[ View Logs ]
```

---

# 46. Auto Update

Production release pipeline should support:

- Version checking
- Update availability
- Download
- Install
- Restart
- Release notes
- Failed-update recovery

Use signed releases.

Update channels can eventually include:

- Stable
- Beta
- Nightly

---

# 47. Packaging

Provide installers for:

## Windows

- NSIS installer
- Portable build (optional)
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

# 48. Code Signing

For production distribution:

- Sign Windows binaries
- Sign macOS application
- Notarize macOS application
- Protect signing credentials
- Never commit signing certificates/private keys

---

# 49. Versioning & Release Management

Use semantic versioning:

```text
MAJOR.MINOR.PATCH
```

Example:

```text
1.0.0
1.1.0
1.1.1
```

Maintain:

- Changelog
- Release notes
- Migration notes
- Compatibility information

---

# 50. Data Migration

Whenever schema changes:

```text
v1 → v2
v2 → v3
```

Use explicit migrations.

Never simply overwrite existing user data.

Migration system should:

- Backup data
- Validate old schema
- Transform
- Validate new schema
- Roll back on failure

---

# 51. Backup & Recovery

Automatic local backups can protect user configuration.

Possible:

```text
backups/
├── backup-2026-08-09.json
├── backup-2026-08-08.json
```

Settings:

- Backup frequency
- Maximum backup count
- Manual backup
- Restore backup

Do not backup secrets unless explicitly requested.

---

# 52. Accessibility

Production UI should support:

- Keyboard navigation
- Focus states
- Screen-reader labels
- Sufficient contrast
- Reduced motion
- Scalable text
- Clear error states
- Tooltips for unfamiliar icons

---

# 53. Performance

Important requirements:

- Fast startup
- Lazy-load expensive integrations
- Do not scan every project continuously
- Cache project detection
- Run Git/tool checks asynchronously
- Avoid blocking main process
- Debounce search
- Virtualize long lists
- Avoid unnecessary renderer re-renders

The main process must never be blocked by heavy filesystem scans or long-running commands.

---

# 54. Offline First

Core features should work without internet:

- Projects
- Folders
- Editors
- Terminals
- Local commands
- Git local operations
- Notes
- Settings
- Workspaces

Internet should only be required for features such as:

- GitHub
- Updates
- Online integrations

---

# 55. Privacy

Default principle:

> User project data stays local.

Do not remotely collect:

- Project paths
- Source code
- Environment variables
- Terminal output
- Git data
- Notes

If telemetry is ever added:

- Make it opt-in
- Explain what is collected
- Provide disable control
- Never collect secrets

---

# 56. Search Index

Future advanced implementation:

Index:

- Project names
- Paths
- Tags
- Commands
- URLs
- Notes
- Git repositories

Support fast fuzzy searching.

For large installations, use SQLite FTS or another local search index.

---

# 57. Notifications & Background Tasks

Potential background tasks:

- Tool availability checks
- Git status refresh
- Workspace process monitoring
- Update checks
- Backup creation

These should be lightweight and configurable.

---

# 58. Developer Dashboard

Optional dashboard:

```text
Today

Projects opened       12
Commands executed     38
Active workspaces      2
Running processes      4
```

Keep this optional.

The launcher should remain a tool, not become a distracting analytics dashboard.

---

# 59. Project Color / Icon System

Allow each project to have:

- Icon
- Emoji
- Custom image
- Color/accent
- Automatically detected framework icon

Use this to make projects visually scannable.

---

# 60. Project Groups

Group projects:

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

Support:

- Create group
- Rename
- Delete
- Reorder
- Drag project into group

---

# 61. Multi-Root Projects

Some projects contain multiple independent repositories.

Support:

```text
Workspace
├── frontend
├── backend
├── worker
└── infrastructure
```

Each root can have:

- Path
- Editor
- Commands
- Git repository
- Environment

---

# 62. Port Management

Advanced feature:

Detect ports used by launched processes.

Example:

```text
BrutDesk

Frontend
localhost:5173
● Running

Backend
localhost:5000
● Running
```

Actions:

- Open in browser
- Stop process
- Identify process
- Kill process by port

Use caution with destructive process termination.

---

# 63. Browser Integration

Workspace/project URLs can be opened in:

- Default browser
- Chrome
- Edge
- Firefox
- Custom browser

Potential advanced feature:

- Open local dev server automatically when it becomes available

---

# 64. Environment Profiles

Allow workspace environment profiles:

```text
Development
Testing
Production-like
Client Demo
```

Each profile can specify:

- Environment file
- Variables stored securely
- Commands
- URLs
- Docker services

Never expose secrets unnecessarily to the renderer.

---

# 65. Process Dependency Graph

Advanced workspace orchestration:

```text
MongoDB
   ↓
Backend
   ↓
Frontend
```

Start order:

1. MongoDB
2. Backend
3. Frontend

Wait for readiness before starting dependent services.

Potential readiness checks:

- Port available
- HTTP health endpoint
- Process running
- Docker health status

---

# 66. Workspace Failure Strategy

Workspace should understand partial failures.

Example:

```text
Frontend       ✓ Running
Backend        ✗ Failed
MongoDB        ✓ Running
```

Actions:

- Restart failed service
- Restart entire workspace
- View logs
- Continue without failed service

---

# 67. Terminal Sessions

Future advanced feature:

Track launched terminal sessions.

Example:

```text
Terminal Sessions

Frontend
Backend
Worker
Git
```

Potential:

- Restore sessions
- Name sessions
- Stop sessions
- Restart sessions

Actual terminal embedding should be treated as a separate advanced milestone because it introduces considerably more complexity.

---

# 68. Embedded Terminal — Future

Potential future architecture:

- xterm.js
- node-pty

Features:

- Embedded terminal
- Multiple tabs
- Split panes
- Search terminal output
- Copy/paste
- Resize
- Session management

This is a major feature and should not be part of the first MVP.

---

# 69. Plugin Architecture — Future

Allow integrations to be added without modifying core code.

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

Plugin API could expose limited capabilities such as:

```text
registerCommand()
registerProjectAction()
registerSearchProvider()
registerSettingsPage()
registerIntegration()
```

Plugins must be sandboxed/restricted where practical.

---

# 70. Cloud Sync — Future

Optional cloud synchronization.

Sync:

- Projects metadata
- Favorites
- Commands
- Workspaces
- URLs
- Settings

Do NOT automatically sync:

- Secrets
- `.env` contents
- SSH private keys
- Tokens

Possible future backend:

- User authentication
- Encrypted sync
- Conflict resolution
- Device management

This should be optional and not required for the core product.

---

# 71. Team / Shared Workspace — Future

Future team-oriented version:

- Shared workspace configurations
- Shared project templates
- Shared commands
- Team integrations
- Organization settings

Could be useful for agencies and development teams.

---

# 72. AI Features — Future

AI should be optional and should not be required for core functionality.

Potential features:

- Explain command failure
- Summarize Git changes
- Generate project commands
- Detect project setup problems
- Suggest missing dependencies
- Generate workspace configuration
- Search project metadata naturally

Example:

```text
Why isn't BrutDesk starting?
```

AI could inspect permitted local diagnostics and explain likely causes.

Security requirement:

> Never automatically send source code, `.env` values, credentials, or private data to an AI provider without explicit user permission.

---

# 73. Smart Project Recommendations — Future

Use local usage patterns to surface:

```text
Good afternoon.

Continue where you left off:

BrutDesk
Gym Website
Tattoo Portfolio
```

Possible signals:

- Recently opened
- Frequently opened
- Recent command
- Active workspace

Do not make the application feel invasive.

---

# 74. Developer Workflow Automation — Future

Allow sequences:

```text
Morning Setup

1. Open BrutDesk
2. Open VS Code
3. Start MongoDB
4. Start Backend
5. Start Frontend
6. Open localhost
```

This is essentially a lightweight workflow automation system.

---

# 75. Scheduled Workflows — Future

Optional future feature:

- Run commands on schedule
- Run maintenance tasks
- Start development environments

Should include:

- Explicit permissions
- Confirmation for dangerous commands
- Execution logs
- Enable/disable control

---

# 76. Secret Manager Integration — Future

Instead of storing secrets directly:

Integrate with:

- Windows Credential Manager
- macOS Keychain
- Linux Secret Service
- 1Password
- Bitwarden
- Other secret managers

Secrets should never be stored as plain JSON.

---

# 77. SSH Integration — Future

Developer-focused SSH launcher:

```text
Servers

Production
Staging
Development
```

Actions:

- Open SSH terminal
- Copy SSH command
- Open configuration
- Detect SSH host

Private keys must never be exposed through the UI unnecessarily.

---

# 78. Database Tools — Future

Project-specific database shortcuts:

- MongoDB Compass
- TablePlus
- DBeaver
- PostgreSQL tools
- MySQL tools

Example:

```text
BrutDesk

MongoDB
[ Open Compass ]
```

Connection strings should be handled securely.

---

# 79. Deployment Integrations — Future

Potential integrations:

- Render
- Vercel
- Netlify
- AWS
- Railway
- Fly.io

Actions:

- Open project dashboard
- View deployment
- View logs
- Open production
- Trigger deployment where supported

Prefer official APIs and OAuth.

---

# 80. Database / Cache Service Profiles — Future

For development environments:

```text
Services

MongoDB
Redis
PostgreSQL
```

Support:

- Start
- Stop
- Restart
- Health
- Logs

Could use Docker Compose as the primary implementation.

---

# 81. Testing Integration — Future

Detect testing frameworks:

- Vitest
- Jest
- Playwright
- Cypress
- Mocha

Actions:

- Run tests
- Run selected tests
- Watch mode
- Open test reports

---

# 82. Build & Release Dashboard — Future

Project build panel:

```text
Build
✓ TypeScript
✓ Tests
✓ Production build

Release
v1.4.0
```

Could integrate:

- GitHub Actions
- npm
- Docker
- deployment providers

---

# 83. Diagnostics Mode

Add a diagnostics screen that checks:

```text
Electron
Node
Git
Terminal
Editor
Filesystem permissions
Storage
Network
Updater
```

Provide:

`Copy Diagnostics`

for support.

Never include secrets.

---

# 84. Accessibility / Reduced Motion

Settings:

```text
Reduce Motion
High Contrast
Larger Text
Keyboard Navigation
```

Animations must not interfere with productivity.

---

# 85. Internationalization — Future

Potential support:

- English
- Hindi
- Spanish
- French
- German
- Japanese

All UI text should be structured for localization rather than hard-coded everywhere.

---

# 86. Testing Strategy

## Unit Tests

Test:

- Storage
- Validation
- Detection
- Command parsing
- Path utilities
- Configuration migration

## Integration Tests

Test:

- IPC
- Project creation
- Project launch
- Command execution
- Editor integration
- Git integration

## E2E Tests

Test:

- App startup
- Add project
- Search
- Open project
- Launch workspace
- Settings
- Import/export

---

# 87. Production Quality Checklist

Before calling the application production-ready:

## Architecture

- [ ] Clear main/preload/renderer separation
- [ ] Typed IPC
- [ ] Services separated from IPC handlers
- [ ] No business logic dumped into renderer

## Security

- [ ] Context isolation enabled
- [ ] Node integration disabled
- [ ] IPC validated
- [ ] External URLs controlled
- [ ] Shell execution controlled
- [ ] Secrets protected

## Reliability

- [ ] Crash handling
- [ ] Error handling
- [ ] Data validation
- [ ] Schema migrations
- [ ] Atomic writes
- [ ] Backups
- [ ] Recovery strategy

## Performance

- [ ] Fast startup
- [ ] Async filesystem operations
- [ ] No blocking main process
- [ ] Lazy integrations
- [ ] Search optimized

## Distribution

- [ ] Windows installer
- [ ] macOS build
- [ ] Linux build
- [ ] Code signing
- [ ] Auto updater
- [ ] Release process

## UX

- [ ] Keyboard-first
- [ ] Search
- [ ] Command palette
- [ ] Favorites
- [ ] Recents
- [ ] Clear errors
- [ ] Accessibility
- [ ] Dark/light themes

---

# 88. Recommended Development Roadmap

## Stage 1 — Electron Fundamentals

Build:

- Electron window
- Main process
- Preload
- IPC
- Project CRUD
- Folder picker
- JSON persistence

## Stage 2 — Launcher Core

Build:

- Favorites
- Recents
- Search
- Project actions
- Folder launcher
- VS Code integration
- Terminal integration

## Stage 3 — Developer Automation

Build:

- Custom commands
- Command palette
- Keyboard shortcuts
- Command history
- Project detection
- Tool detection
- URLs
- Notes

## Stage 4 — Git & Workspace

Build:

- Git status
- Branch information
- Git actions
- GitHub integration
- Workspace profiles
- Multi-root projects
- Process management

## Stage 5 — Advanced Integrations

Build:

- Docker
- Port management
- Health checks
- Environment profiles
- Browser automation
- Project templates

## Stage 6 — Production Hardening

Build:

- Secure IPC
- Validation
- Error handling
- Logging
- Crash recovery
- Schema migrations
- Backups
- Diagnostics

## Stage 7 — Distribution

Build:

- Installer
- Code signing
- Auto updater
- Release pipeline
- Windows/macOS/Linux builds

## Stage 8 — Future Platform

Potentially add:

- Embedded terminal
- Plugin system
- Cloud sync
- Team workspaces
- AI assistant
- SSH manager
- Deployment integrations
- Secret manager integrations

---

# 89. MVP Recommendation

Do NOT build everything in version 1.

The strongest first version should contain:

1. Project CRUD
2. Folder picker
3. JSON persistence
4. Favorites
5. Recent projects
6. Search
7. VS Code integration
8. Terminal integration
9. Folder opening
10. Custom commands
11. Command palette
12. Keyboard shortcuts
13. Project auto-detection
14. Git status
15. Project URLs
16. Project notes
17. Settings
18. Secure IPC
19. Error handling
20. Logging

Then build Workspace Launching as the first major upgrade.

---

# 90. Product North Star

The final product should make this workflow:

```text
Think of project
      ↓
Open launcher
      ↓
Search project
      ↓
Enter
      ↓
Workspace launches
      ↓
Editor + terminals + services + browser
      ↓
Start coding
```

take only a few seconds.

The best version of Dev Launcher is not the one with the most features.

It is the one that removes the most repetitive developer actions while staying fast, predictable, local-first, secure, and unobtrusive.
