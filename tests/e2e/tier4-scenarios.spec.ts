import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import path from 'path';
import fs from 'fs';
import { TempWorkspace } from './helpers/temp-workspace';
import { MockIPCBridge } from './fixtures/mock-ipc';
import {
  assertFileExists,
  assertDirectoryExists,
  assertFileDoesNotExist,
  assertJsonFileContains,
  assertFileContains,
} from './helpers/fs-assertions';
import { LogStreamCollector } from './helpers/log-stream-collector';
import { GeneratorRequest, GeneratorResult } from '../../types/generator';

describe('Tier 4: Real-World Application Scenarios (TC-T4-01 to TC-T4-06)', () => {
  let workspace: TempWorkspace;
  let mockIpc: MockIPCBridge;
  let logCollector: LogStreamCollector;

  beforeEach(() => {
    workspace = new TempWorkspace('tier4-scenarios-');
    mockIpc = new MockIPCBridge();
    logCollector = new LogStreamCollector();
    mockIpc.onProgress(p => logCollector.push(p));
  });

  afterEach(() => {
    workspace.cleanup();
    mockIpc.reset();
    logCollector.clear();
  });

  // =========================================================================
  // TC-T4-01: Full End-to-End React+Vite Project Generation Workload
  // =========================================================================
  it('TC-T4-01: Full End-to-End React+Vite Project Generation Workload', async () => {
    const projectDir = workspace.getSubPath('my-awesome-app');
    const req: GeneratorRequest = {
      templateId: 'react-vite',
      name: 'my-awesome-app',
      targetPath: projectDir,
      variant: 'ts',
      gitInit: true,
      installDeps: true,
      openEditor: true,
    };

    const result: GeneratorResult = await mockIpc.invoke('generator:start', req);

    // 1. Result validation
    expect(result.success).toBe(true);
    expect(result.projectPath).toBe(projectDir);
    expect(result.projectId).toBeDefined();
    expect(result.detectedMeta).toBeDefined();
    expect(result.detectedMeta?.name).toBe('my-awesome-app');
    expect(result.detectedMeta?.type).toBe('react-vite');

    // 2. File layout verification
    assertFileExists(path.join(projectDir, 'package.json'));
    assertFileExists(path.join(projectDir, 'index.html'));
    assertFileExists(path.join(projectDir, 'src', 'App.tsx'));
    assertFileExists(path.join(projectDir, 'src', 'main.tsx'));
    assertFileExists(path.join(projectDir, 'vite.config.ts'));
    assertFileExists(path.join(projectDir, 'tsconfig.json'));
    assertDirectoryExists(path.join(projectDir, '.git'));
    assertDirectoryExists(path.join(projectDir, 'node_modules'));

    // 3. Monotonic progress stream validation
    logCollector.assertStepSequence(['validating', 'scaffolding', 'git', 'dependencies', 'indexing']);
    logCollector.assertPercentageMonotonic();

    // 4. Live log capture validation
    const logs = logCollector.getLogs();
    expect(logs.length).toBeGreaterThan(0);
    expect(logs.some(line => line.includes('Created file:') || line.includes('Scaffolding complete'))).toBe(true);
  });

  // =========================================================================
  // TC-T4-02: Full End-to-End Next.js App Router Project Lifecycle
  // =========================================================================
  it('TC-T4-02: Full End-to-End Next.js App Router Project Lifecycle', async () => {
    const projectDir = workspace.getSubPath('my-nextjs-app');
    const req: GeneratorRequest = {
      templateId: 'nextjs',
      name: 'my-nextjs-app',
      targetPath: projectDir,
      variant: 'ts',
      gitInit: true,
      installDeps: true,
      openEditor: false,
    };

    const result: GeneratorResult = await mockIpc.invoke('generator:start', req);

    expect(result.success).toBe(true);
    expect(result.detectedMeta?.type).toBe('nextjs');

    // Verify Next.js App Router structure
    assertFileExists(path.join(projectDir, 'package.json'));
    assertFileExists(path.join(projectDir, 'next.config.mjs'));
    assertFileExists(path.join(projectDir, 'app', 'page.tsx'));
    assertFileExists(path.join(projectDir, 'app', 'layout.tsx'));
    assertFileExists(path.join(projectDir, 'tsconfig.json'));
    assertDirectoryExists(path.join(projectDir, '.git'));

    // Verify package scripts for Next.js
    assertJsonFileContains(path.join(projectDir, 'package.json'), {
      scripts: {
        dev: 'next dev',
        build: 'next build',
        start: 'next start',
      },
    });

    logCollector.assertStepSequence(['validating', 'scaffolding', 'git', 'dependencies', 'indexing']);
  });

  // =========================================================================
  // TC-T4-03: Express Node API Scaffolding & Command Execution Test
  // =========================================================================
  it('TC-T4-03: Express Node API Scaffolding & Command Execution Test', async () => {
    const projectDir = workspace.getSubPath('express-rest-api');
    const req: GeneratorRequest = {
      templateId: 'express-api',
      name: 'express-rest-api',
      targetPath: projectDir,
      variant: 'ts',
      gitInit: true,
      installDeps: true,
      openEditor: true,
    };

    const result: GeneratorResult = await mockIpc.invoke('generator:start', req);

    expect(result.success).toBe(true);

    // Verify Express Node API layout
    assertFileExists(path.join(projectDir, 'package.json'));
    assertFileExists(path.join(projectDir, 'src', 'index.ts'));
    assertFileExists(path.join(projectDir, 'src', 'routes', 'index.ts'));
    assertFileExists(path.join(projectDir, 'tsconfig.json'));

    // Verify content in main entry point
    assertFileContains(path.join(projectDir, 'src', 'index.ts'), 'express()');

    // Verify package scripts for seeded execution test
    const pkg = JSON.parse(fs.readFileSync(path.join(projectDir, 'package.json'), 'utf-8'));
    expect(pkg.scripts).toBeDefined();
    expect(pkg.scripts.dev).toContain('ts-node');
  });

  // =========================================================================
  // TC-T4-04: Electron Desktop App Scaffolding & Multi-Process Setup
  // =========================================================================
  it('TC-T4-04: Electron Desktop App Scaffolding & Multi-Process Setup', async () => {
    const projectDir = workspace.getSubPath('electron-desktop-app');
    const req: GeneratorRequest = {
      templateId: 'electron-app',
      name: 'electron-desktop-app',
      targetPath: projectDir,
      variant: 'ts',
      gitInit: true,
      installDeps: true,
      openEditor: true,
    };

    const result: GeneratorResult = await mockIpc.invoke('generator:start', req);

    expect(result.success).toBe(true);

    // Verify multi-process architecture setup (electron main process + react renderer)
    assertFileExists(path.join(projectDir, 'package.json'));
    assertFileExists(path.join(projectDir, 'electron', 'main.ts'));
    assertFileExists(path.join(projectDir, 'src', 'App.tsx'));
    assertFileExists(path.join(projectDir, 'vite.config.ts'));
    assertFileExists(path.join(projectDir, 'tsconfig.json'));

    // Assert main process content
    assertFileContains(path.join(projectDir, 'electron', 'main.ts'), 'BrowserWindow');

    // Assert renderer process content
    assertFileContains(path.join(projectDir, 'src', 'App.tsx'), 'Electron App');
  });

  // =========================================================================
  // TC-T4-05: Python FastAPI Scaffolding, Dependency Setup & Metadata Indexing
  // =========================================================================
  it('TC-T4-05: Python FastAPI Scaffolding, Dependency Setup & Metadata Indexing', async () => {
    const projectDir = workspace.getSubPath('python-api');
    const req: GeneratorRequest = {
      templateId: 'python-fastapi',
      name: 'python-api',
      targetPath: projectDir,
      variant: 'ts',
      gitInit: true,
      installDeps: true,
      openEditor: false,
    };

    const result: GeneratorResult = await mockIpc.invoke('generator:start', req);

    expect(result.success).toBe(true);

    // Verify Python FastAPI layout
    assertFileExists(path.join(projectDir, 'main.py'));
    assertFileExists(path.join(projectDir, 'requirements.txt'));
    assertFileExists(path.join(projectDir, 'README.md'));
    assertDirectoryExists(path.join(projectDir, '.git'));

    // Assert main.py FastAPI setup
    assertFileContains(path.join(projectDir, 'main.py'), 'app = FastAPI()');
    assertFileContains(path.join(projectDir, 'main.py'), '@app.get("/")');

    // Assert requirements.txt
    assertFileContains(path.join(projectDir, 'requirements.txt'), 'fastapi');
    assertFileContains(path.join(projectDir, 'requirements.txt'), 'uvicorn');
  });

  // =========================================================================
  // TC-T4-06: Multi-Template Bulk Generation & Store Isolation
  // =========================================================================
  it('TC-T4-06: Multi-Template Bulk Generation & Store Isolation', async () => {
    const parentWorkspace = workspace.getSubPath('bulk-projects');

    const proj1Dir = path.join(parentWorkspace, 'app-react');
    const proj2Dir = path.join(parentWorkspace, 'app-express');
    const proj3Dir = path.join(parentWorkspace, 'app-fastapi');

    // 1. Scaffolding project 1 (React)
    const res1 = await mockIpc.invoke('generator:start', {
      templateId: 'react-vite',
      name: 'app-react',
      targetPath: proj1Dir,
      variant: 'ts',
      gitInit: true,
      installDeps: false,
      openEditor: false,
    });

    // 2. Scaffolding project 2 (Express)
    const res2 = await mockIpc.invoke('generator:start', {
      templateId: 'express-api',
      name: 'app-express',
      targetPath: proj2Dir,
      variant: 'ts',
      gitInit: true,
      installDeps: false,
      openEditor: false,
    });

    // 3. Scaffolding project 3 (FastAPI)
    const res3 = await mockIpc.invoke('generator:start', {
      templateId: 'python-fastapi',
      name: 'app-fastapi',
      targetPath: proj3Dir,
      variant: 'ts',
      gitInit: true,
      installDeps: false,
      openEditor: false,
    });

    // Assert all 3 succeeded
    expect(res1.success).toBe(true);
    expect(res2.success).toBe(true);
    expect(res3.success).toBe(true);

    // Verify 3 unique project IDs
    const ids = new Set([res1.projectId, res2.projectId, res3.projectId]);
    expect(ids.size).toBe(3);

    // Verify folder isolation
    assertFileExists(path.join(proj1Dir, 'src', 'App.tsx'));
    assertFileExists(path.join(proj2Dir, 'src', 'index.ts'));
    assertFileExists(path.join(proj3Dir, 'main.py'));

    assertFileDoesNotExist(path.join(proj1Dir, 'main.py'));
    assertFileDoesNotExist(path.join(proj2Dir, 'src', 'App.tsx'));
    assertFileDoesNotExist(path.join(proj3Dir, 'src', 'index.ts'));
  });
});
