# Project: Dev Launcher Phase 24 — Instant Project Generator from Templates

## Architecture
- **Data Models & Types**: `types/generator.ts`, `types/global.d.ts` defining scaffold definitions, options, IPC progress events, and window `generatorAPI`.
- **Main Process Generator Service & IPC**: `electron/services/generator.service.ts`, `electron/ipc/generator.ipc.ts` handling CLI bootstrappers (`npm`, `npx`), fallback programmatic local generators, live stdout/stderr IPC streaming (`generator:progress`), project detection (`detectProjectMeta`), and store registration (`addProject`).
- **Preload Bridge**: `electron/preloads/generator.api.ts`, `electron/preload.ts` bridging `generatorAPI` context bridge safely.
- **Renderer UI & Styling**: `src/components/ui/ProjectGenerator/ProjectGeneratorModal.tsx` & `generator.css` featuring template selection cards, option form, live log terminal, step progress indicator, and action buttons.
- **Integration**: `src/pages/ProjectsPage.tsx` button `⚡ Instant Generator` and `src/components/CommandPalette.tsx` command registration.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | R1. Scaffold Definitions & Core Options | Support 5 scaffolds (React+Vite, Next.js, Express Node API, Electron App, Python FastAPI) with name, target folder, TS/JS, git init, install deps, open editor options. | M1 | ORIGINAL_REQUEST §R1 |
| 2 | R2. Main Process Service & IPC | Background service `generator.service.ts` running CLI bootstrappers, fallback local scaffolding, real-time log streaming (`generator:progress`), `detectProjectMeta`, and `addProject`. | M2 | ORIGINAL_REQUEST §R2 |
| 3 | R3. Preload Bridge & Global Window API | Expose `generatorAPI` via `electron/preloads/generator.api.ts`, `electron/preload.ts`, updating `types/global.d.ts` and `types/generator.ts`. | M3 | ORIGINAL_REQUEST §R3 |
| 4 | R4. React UI Component & Styling | Create `ProjectGeneratorModal.tsx` and `generator.css` matching Dev Launcher dark theme with template selection cards, form inputs, live terminal log, and progress indicator. | M4 | ORIGINAL_REQUEST §R4 |
| 5 | R5. Integration & Command Palette | Add `⚡ Instant Generator` trigger button to `ProjectsPage.tsx`, command in `CommandPalette.tsx`, and auto-refresh sidebar/collection upon project generation. | M5 | ORIGINAL_REQUEST §R5 |

## Code Layout
- `types/generator.ts` — Generator interfaces (`GeneratorRequest`, `GeneratorProgress`, `GeneratorResult`, `TemplateScaffoldDef`).
- `types/global.d.ts` — Global window interface extension for `window.generatorAPI`.
- `electron/services/generator.service.ts` — Main process background generation, child process CLI execution, fallback generators, IPC progress streaming, auto-indexing into store.
- `electron/ipc/generator.ipc.ts` — IPC handler registration (`generator:start`, `generator:cancel`, etc.).
- `electron/preloads/generator.api.ts` — Preload IPC API bridge module.
- `electron/preload.ts` — Exposes `generatorAPI` bridge to renderer.
- `src/components/ui/ProjectGenerator/ProjectGeneratorModal.tsx` — React generator modal component.
- `src/components/ui/ProjectGenerator/generator.css` — CSS stylesheet for generator modal and live log terminal.
- `src/pages/ProjectsPage.tsx` — Trigger button placement and modal state handling.
- `src/components/CommandPalette.tsx` — Quick Action entry for Instant Generator.

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Core Scaffolds & Type Definitions | `types/generator.ts`, `types/global.d.ts`, template definitions | none | PLANNED |
| M2 | Main Generator Service & IPC Execution | `electron/services/generator.service.ts`, `electron/ipc/generator.ipc.ts` | M1 | PLANNED |
| M3 | Preload Bridge & Window API | `electron/preloads/generator.api.ts`, `electron/preload.ts` | M1, M2 | PLANNED |
| M4 | React UI Generator Modal & Terminal Styling | `src/components/ui/ProjectGenerator/ProjectGeneratorModal.tsx`, `generator.css` | M1, M3 | PLANNED |
| M5 | Integration & Command Palette Trigger | `src/pages/ProjectsPage.tsx`, `src/components/CommandPalette.tsx` | M4 | PLANNED |

## Interface Contracts
### Main Process ↔ Renderer IPC Contract
- Channel: `generator:start`
  - Input: `GeneratorRequest { templateId, name, targetPath, variant: 'ts'|'js', gitInit: boolean, installDeps: boolean, openEditor: boolean }`
  - Output: `Promise<GeneratorResult { success: boolean, projectPath: string, error?: string }>`
- Channel: `generator:progress`
  - Output stream: `GeneratorProgress { step: 'validating'|'scaffolding'|'git'|'dependencies'|'indexing', percentage: number, message: string, logLine?: string }`
