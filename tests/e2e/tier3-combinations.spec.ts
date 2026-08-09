import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import path from 'path';
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

describe('Tier 3: Cross-Feature Combinations (TC-T3-01 to TC-T3-12)', () => {
  let workspace: TempWorkspace;
  let mockIpc: MockIPCBridge;
  let logCollector: LogStreamCollector;

  beforeEach(() => {
    workspace = new TempWorkspace('tier3-combinations-');
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
  // TC-T3-01: React+Vite (TS) + Git Init (True) + Install Deps (True) + Open Editor (False)
  // =========================================================================
  it('TC-T3-01: React+Vite (TS) + Git Init (True) + Install Deps (True) + Open Editor (False)', async () => {
    const targetDir = workspace.getSubPath('react-ts-full');
    const req: GeneratorRequest = {
      templateId: 'react-vite',
      name: 'react-ts-full',
      targetPath: targetDir,
      variant: 'ts',
      gitInit: true,
      installDeps: true,
      openEditor: false,
    };

    const result: GeneratorResult = await mockIpc.invoke('generator:start', req);

    expect(result.success).toBe(true);
    expect(result.projectPath).toBe(targetDir);

    // Assert files
    assertFileExists(path.join(targetDir, 'package.json'));
    assertFileExists(path.join(targetDir, 'index.html'));
    assertFileExists(path.join(targetDir, 'src', 'App.tsx'));
    assertFileExists(path.join(targetDir, 'src', 'main.tsx'));
    assertFileExists(path.join(targetDir, 'vite.config.ts'));
    assertFileExists(path.join(targetDir, 'tsconfig.json'));
    assertDirectoryExists(path.join(targetDir, '.git'));
    assertDirectoryExists(path.join(targetDir, 'node_modules'));

    // Assert package.json contents
    assertJsonFileContains(path.join(targetDir, 'package.json'), {
      name: 'react-ts-full',
      private: true,
    });

    // Assert progress log stream steps
    logCollector.assertStepSequence(['validating', 'scaffolding', 'git', 'dependencies', 'indexing']);
    logCollector.assertPercentageMonotonic();
  });

  // =========================================================================
  // TC-T3-02: React+Vite (JS) + Git Init (False) + Install Deps (False) + Open Editor (True)
  // =========================================================================
  it('TC-T3-02: React+Vite (JS) + Git Init (False) + Install Deps (False) + Open Editor (True)', async () => {
    const targetDir = workspace.getSubPath('react-js-minimal');
    const req: GeneratorRequest = {
      templateId: 'react-vite',
      name: 'react-js-minimal',
      targetPath: targetDir,
      variant: 'js',
      gitInit: false,
      installDeps: false,
      openEditor: true,
    };

    const result: GeneratorResult = await mockIpc.invoke('generator:start', req);

    expect(result.success).toBe(true);

    // JS variant specific file checks
    assertFileExists(path.join(targetDir, 'package.json'));
    assertFileExists(path.join(targetDir, 'index.html'));
    assertFileExists(path.join(targetDir, 'src', 'App.jsx'));
    assertFileExists(path.join(targetDir, 'src', 'main.jsx'));
    assertFileExists(path.join(targetDir, 'vite.config.js'));

    // Omissions
    assertFileDoesNotExist(path.join(targetDir, 'tsconfig.json'));
    assertFileDoesNotExist(path.join(targetDir, '.git'));
    assertFileDoesNotExist(path.join(targetDir, 'node_modules'));

    // Verify git & dependencies steps were omitted from progress stream
    expect(logCollector.hasStep('git')).toBe(false);
    expect(logCollector.hasStep('dependencies')).toBe(false);
  });

  // =========================================================================
  // TC-T3-03: Next.js (TS) + Git Init (True) + Install Deps (False) + Open Editor (True)
  // =========================================================================
  it('TC-T3-03: Next.js (TS) + Git Init (True) + Install Deps (False) + Open Editor (True)', async () => {
    const targetDir = workspace.getSubPath('next-ts-git-editor');
    const req: GeneratorRequest = {
      templateId: 'nextjs',
      name: 'next-ts-git-editor',
      targetPath: targetDir,
      variant: 'ts',
      gitInit: true,
      installDeps: false,
      openEditor: true,
    };

    const result: GeneratorResult = await mockIpc.invoke('generator:start', req);

    expect(result.success).toBe(true);

    // Assert Next.js TS App Router files
    assertFileExists(path.join(targetDir, 'package.json'));
    assertFileExists(path.join(targetDir, 'next.config.mjs'));
    assertFileExists(path.join(targetDir, 'app', 'page.tsx'));
    assertFileExists(path.join(targetDir, 'app', 'layout.tsx'));
    assertFileExists(path.join(targetDir, 'tsconfig.json'));
    assertDirectoryExists(path.join(targetDir, '.git'));
    assertFileDoesNotExist(path.join(targetDir, 'node_modules'));

    logCollector.assertStepSequence(['validating', 'scaffolding', 'git', 'indexing']);
    expect(logCollector.hasStep('dependencies')).toBe(false);
  });

  // =========================================================================
  // TC-T3-04: Next.js (JS) + Git Init (False) + Install Deps (True) + Open Editor (False)
  // =========================================================================
  it('TC-T3-04: Next.js (JS) + Git Init (False) + Install Deps (True) + Open Editor (False)', async () => {
    const targetDir = workspace.getSubPath('next-js-deps');
    const req: GeneratorRequest = {
      templateId: 'nextjs',
      name: 'next-js-deps',
      targetPath: targetDir,
      variant: 'js',
      gitInit: false,
      installDeps: true,
      openEditor: false,
    };

    const result: GeneratorResult = await mockIpc.invoke('generator:start', req);

    expect(result.success).toBe(true);

    // Assert Next.js JS structure
    assertFileExists(path.join(targetDir, 'package.json'));
    assertFileExists(path.join(targetDir, 'next.config.mjs'));
    assertFileExists(path.join(targetDir, 'app', 'page.jsx'));
    assertFileExists(path.join(targetDir, 'app', 'layout.jsx'));

    // Assert omissions & inclusions
    assertFileDoesNotExist(path.join(targetDir, 'tsconfig.json'));
    assertFileDoesNotExist(path.join(targetDir, '.git'));
    assertDirectoryExists(path.join(targetDir, 'node_modules'));

    logCollector.assertStepSequence(['validating', 'scaffolding', 'dependencies', 'indexing']);
    expect(logCollector.hasStep('git')).toBe(false);
  });

  // =========================================================================
  // TC-T3-05: Express Node API (TS) + Git Init (True) + Install Deps (True) + Open Editor (True)
  // =========================================================================
  it('TC-T3-05: Express Node API (TS) + Git Init (True) + Install Deps (True) + Open Editor (True)', async () => {
    const targetDir = workspace.getSubPath('express-ts-all');
    const req: GeneratorRequest = {
      templateId: 'express-api',
      name: 'express-ts-all',
      targetPath: targetDir,
      variant: 'ts',
      gitInit: true,
      installDeps: true,
      openEditor: true,
    };

    const result: GeneratorResult = await mockIpc.invoke('generator:start', req);

    expect(result.success).toBe(true);

    assertFileExists(path.join(targetDir, 'package.json'));
    assertFileExists(path.join(targetDir, 'src', 'index.ts'));
    assertFileExists(path.join(targetDir, 'src', 'routes', 'index.ts'));
    assertFileExists(path.join(targetDir, 'tsconfig.json'));
    assertDirectoryExists(path.join(targetDir, '.git'));
    assertDirectoryExists(path.join(targetDir, 'node_modules'));

    assertFileContains(path.join(targetDir, 'src', 'index.ts'), 'express');
    assertJsonFileContains(path.join(targetDir, 'package.json'), {
      name: 'express-ts-all',
    });
  });

  // =========================================================================
  // TC-T3-06: Express Node API (JS) + Git Init (False) + Install Deps (True) + Open Editor (False)
  // =========================================================================
  it('TC-T3-06: Express Node API (JS) + Git Init (False) + Install Deps (True) + Open Editor (False)', async () => {
    const targetDir = workspace.getSubPath('express-js-deps');
    const req: GeneratorRequest = {
      templateId: 'express-api',
      name: 'express-js-deps',
      targetPath: targetDir,
      variant: 'js',
      gitInit: false,
      installDeps: true,
      openEditor: false,
    };

    const result: GeneratorResult = await mockIpc.invoke('generator:start', req);

    expect(result.success).toBe(true);

    assertFileExists(path.join(targetDir, 'package.json'));
    assertFileExists(path.join(targetDir, 'src', 'index.js'));
    assertFileExists(path.join(targetDir, 'src', 'routes', 'index.js'));
    assertFileDoesNotExist(path.join(targetDir, 'tsconfig.json'));
    assertFileDoesNotExist(path.join(targetDir, '.git'));
    assertDirectoryExists(path.join(targetDir, 'node_modules'));

    assertFileContains(path.join(targetDir, 'src', 'index.js'), 'require("express")');
  });

  // =========================================================================
  // TC-T3-07: Electron App (TS) + Git Init (True) + Install Deps (True) + Open Editor (True)
  // =========================================================================
  it('TC-T3-07: Electron App (TS) + Git Init (True) + Install Deps (True) + Open Editor (True)', async () => {
    const targetDir = workspace.getSubPath('electron-ts-all');
    const req: GeneratorRequest = {
      templateId: 'electron-app',
      name: 'electron-ts-all',
      targetPath: targetDir,
      variant: 'ts',
      gitInit: true,
      installDeps: true,
      openEditor: true,
    };

    const result: GeneratorResult = await mockIpc.invoke('generator:start', req);

    expect(result.success).toBe(true);

    assertFileExists(path.join(targetDir, 'package.json'));
    assertFileExists(path.join(targetDir, 'electron', 'main.ts'));
    assertFileExists(path.join(targetDir, 'src', 'App.tsx'));
    assertFileExists(path.join(targetDir, 'vite.config.ts'));
    assertFileExists(path.join(targetDir, 'tsconfig.json'));
    assertDirectoryExists(path.join(targetDir, '.git'));
    assertDirectoryExists(path.join(targetDir, 'node_modules'));

    assertFileContains(path.join(targetDir, 'electron', 'main.ts'), 'electron');
  });

  // =========================================================================
  // TC-T3-08: Electron App (JS) + Git Init (False) + Install Deps (False) + Open Editor (False)
  // =========================================================================
  it('TC-T3-08: Electron App (JS) + Git Init (False) + Install Deps (False) + Open Editor (False)', async () => {
    const targetDir = workspace.getSubPath('electron-js-minimal');
    const req: GeneratorRequest = {
      templateId: 'electron-app',
      name: 'electron-js-minimal',
      targetPath: targetDir,
      variant: 'js',
      gitInit: false,
      installDeps: false,
      openEditor: false,
    };

    const result: GeneratorResult = await mockIpc.invoke('generator:start', req);

    expect(result.success).toBe(true);

    assertFileExists(path.join(targetDir, 'package.json'));
    assertFileExists(path.join(targetDir, 'electron', 'main.js'));
    assertFileExists(path.join(targetDir, 'src', 'App.jsx'));
    assertFileExists(path.join(targetDir, 'vite.config.js'));
    assertFileDoesNotExist(path.join(targetDir, 'tsconfig.json'));
    assertFileDoesNotExist(path.join(targetDir, '.git'));
    assertFileDoesNotExist(path.join(targetDir, 'node_modules'));
  });

  // =========================================================================
  // TC-T3-09: Python FastAPI + Git Init (True) + Install Deps (True) + Open Editor (True)
  // =========================================================================
  it('TC-T3-09: Python FastAPI + Git Init (True) + Install Deps (True) + Open Editor (True)', async () => {
    const targetDir = workspace.getSubPath('fastapi-full');
    const req: GeneratorRequest = {
      templateId: 'python-fastapi',
      name: 'fastapi-full',
      targetPath: targetDir,
      variant: 'ts',
      gitInit: true,
      installDeps: true,
      openEditor: true,
    };

    const result: GeneratorResult = await mockIpc.invoke('generator:start', req);

    expect(result.success).toBe(true);

    assertFileExists(path.join(targetDir, 'main.py'));
    assertFileExists(path.join(targetDir, 'requirements.txt'));
    assertFileExists(path.join(targetDir, 'README.md'));
    assertDirectoryExists(path.join(targetDir, '.git'));

    assertFileContains(path.join(targetDir, 'main.py'), 'FastAPI');
    assertFileContains(path.join(targetDir, 'requirements.txt'), 'fastapi');
    assertFileContains(path.join(targetDir, 'requirements.txt'), 'uvicorn');
  });

  // =========================================================================
  // TC-T3-10: Python FastAPI + Git Init (False) + Install Deps (False) + Open Editor (False)
  // =========================================================================
  it('TC-T3-10: Python FastAPI + Git Init (False) + Install Deps (False) + Open Editor (False)', async () => {
    const targetDir = workspace.getSubPath('fastapi-minimal');
    const req: GeneratorRequest = {
      templateId: 'python-fastapi',
      name: 'fastapi-minimal',
      targetPath: targetDir,
      variant: 'js',
      gitInit: false,
      installDeps: false,
      openEditor: false,
    };

    const result: GeneratorResult = await mockIpc.invoke('generator:start', req);

    expect(result.success).toBe(true);

    assertFileExists(path.join(targetDir, 'main.py'));
    assertFileExists(path.join(targetDir, 'requirements.txt'));
    assertFileDoesNotExist(path.join(targetDir, '.git'));
    assertFileDoesNotExist(path.join(targetDir, 'node_modules'));

    expect(logCollector.hasStep('git')).toBe(false);
    expect(logCollector.hasStep('dependencies')).toBe(false);
  });

  // =========================================================================
  // TC-T3-11: Fallback Generator + Git Init (True) + Install Deps (True)
  // =========================================================================
  it('TC-T3-11: Fallback Generator + Git Init (True) + Install Deps (True)', async () => {
    const targetDir = workspace.getSubPath('fallback-app');
    const req: GeneratorRequest = {
      templateId: 'react-vite',
      name: 'fallback-app',
      targetPath: targetDir,
      variant: 'ts',
      gitInit: true,
      installDeps: true,
      openEditor: false,
    };

    // Simulate fallback behavior where embedded generator handles files
    const result: GeneratorResult = await mockIpc.simulateGeneration(req);

    expect(result.success).toBe(true);
    assertDirectoryExists(targetDir);
    assertFileExists(path.join(targetDir, 'package.json'));
    assertDirectoryExists(path.join(targetDir, '.git'));
    assertDirectoryExists(path.join(targetDir, 'node_modules'));

    // Check progress stream emitted logs
    const logs = logCollector.getLogs();
    expect(logs.some(l => l.includes('Initializing template') || l.includes('Created file'))).toBe(true);
  });

  // =========================================================================
  // TC-T3-12: Command Palette Trigger -> Full Flow -> Automatic Navigation
  // =========================================================================
  it('TC-T3-12: Command Palette Trigger -> Full Flow -> Automatic Navigation', async () => {
    const targetDir = workspace.getSubPath('palette-triggered-app');
    const req: GeneratorRequest = {
      templateId: 'express-api',
      name: 'palette-triggered-app',
      targetPath: targetDir,
      variant: 'ts',
      gitInit: true,
      installDeps: false,
      openEditor: true,
    };

    // Simulate Command Palette trigger sending start request
    const result: GeneratorResult = await mockIpc.invoke('generator:start', req);

    expect(result.success).toBe(true);
    expect(result.projectId).toBeDefined();
    expect(result.projectPath).toBe(targetDir);

    // Verify invocation channel was logged
    expect(mockIpc.invocations).toContainEqual({
      channel: 'generator:start',
      data: req,
    });

    // Verify indexing complete event was emitted for UI navigation
    const lastEvent = logCollector.events[logCollector.events.length - 1];
    expect(lastEvent.step).toBe('indexing');
    expect(lastEvent.done).toBe(true);
  });
});
