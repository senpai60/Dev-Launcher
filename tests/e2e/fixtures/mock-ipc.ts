import { EventEmitter } from 'events';
import fs from 'fs';
import path from 'path';
import {
  GeneratorProgress,
  GeneratorRequest,
  GeneratorResult,
  SCAFFOLD_TEMPLATES,
  TemplateScaffoldDef,
} from '../../../types/generator';

export class MockIPCBridge extends EventEmitter {
  public invocations: Array<{ channel: string; data: any }> = [];
  public progressEvents: GeneratorProgress[] = [];
  private progressListeners: Array<(progress: GeneratorProgress) => void> = [];

  constructor() {
    super();
  }

  public getTemplates(): Promise<TemplateScaffoldDef[]> {
    this.invocations.push({ channel: 'generator:get-templates', data: null });
    return Promise.resolve(SCAFFOLD_TEMPLATES);
  }

  public async invoke(channel: string, data: any): Promise<any> {
    this.invocations.push({ channel, data });
    if (channel === 'generator:start' || channel === 'generator:create') {
      return this.simulateGeneration(data as GeneratorRequest);
    }
    if (channel === 'generator:get-templates') {
      return this.getTemplates();
    }
    if (channel === 'generator:cancel') {
      return Promise.resolve(true);
    }
    throw new Error(`Unknown IPC channel: ${channel}`);
  }

  public emitProgress(progress: GeneratorProgress): void {
    this.progressEvents.push(progress);
    this.emit('generator:progress', progress);
    this.progressListeners.forEach(listener => listener(progress));
  }

  public onProgress(callback: (progress: GeneratorProgress) => void): () => void {
    this.progressListeners.push(callback);
    return () => {
      this.progressListeners = this.progressListeners.filter(l => l !== callback);
    };
  }

  public async simulateGeneration(req: GeneratorRequest): Promise<GeneratorResult> {
    if (!req.name || req.name.trim() === '') {
      const err = 'Project name cannot be empty';
      this.emitProgress({ step: 'error', percentage: 0, message: err, error: err });
      return { success: false, error: err };
    }

    // Step 1: Validating
    this.emitProgress({
      step: 'validating',
      percentage: 10,
      message: 'Validating parameters...',
    });

    const targetDir = req.targetPath;
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    // Step 2: Scaffolding
    this.emitProgress({
      step: 'scaffolding',
      percentage: 30,
      message: 'Scaffolding template files...',
      logLine: `Initializing template ${req.templateId} (${req.variant})...`,
    });

    this.createTemplateFiles(targetDir, req.templateId, req.variant, req.name);

    this.emitProgress({
      step: 'scaffolding',
      percentage: 50,
      message: 'Files written successfully.',
      logLine: 'Scaffolding complete.',
    });

    // Step 3: Git
    if (req.gitInit) {
      this.emitProgress({
        step: 'git',
        percentage: 60,
        message: 'Initializing git repository...',
        logLine: 'Executing git init...',
      });
      const gitDir = path.join(targetDir, '.git');
      if (!fs.existsSync(gitDir)) {
        fs.mkdirSync(gitDir, { recursive: true });
      }
    }

    // Step 4: Dependencies
    if (req.installDeps) {
      this.emitProgress({
        step: 'dependencies',
        percentage: 80,
        message: 'Installing dependencies...',
        logLine: 'Running package installation...',
      });
      const nodeModules = path.join(targetDir, 'node_modules');
      if (!fs.existsSync(nodeModules)) {
        fs.mkdirSync(nodeModules, { recursive: true });
      }
    }

    // Step 5: Indexing
    this.emitProgress({
      step: 'indexing',
      percentage: 100,
      message: 'Registering project...',
      done: true,
    });

    return {
      success: true,
      projectPath: targetDir,
      projectId: `proj-${Date.now()}`,
      detectedMeta: {
        name: req.name,
        path: targetDir,
        type: req.templateId,
      } as any,
    };
  }

  private createTemplateFiles(targetDir: string, templateId: string, variant: string, name: string): void {
    const isTs = variant === 'ts';

    const write = (relPath: string, content: string) => {
      const fullPath = path.join(targetDir, relPath);
      const parent = path.dirname(fullPath);
      if (!fs.existsSync(parent)) {
        fs.mkdirSync(parent, { recursive: true });
      }
      fs.writeFileSync(fullPath, content, 'utf-8');
      this.emitProgress({
        step: 'scaffolding',
        percentage: 40,
        message: `Writing ${relPath}`,
        logLine: `Created file: ${relPath}`,
      });
    };

    switch (templateId) {
      case 'react-vite':
        write('package.json', JSON.stringify({ name, version: '1.0.0', private: true, scripts: { dev: 'vite', build: 'vite build' } }, null, 2));
        write('index.html', '<!DOCTYPE html><html><body><div id="root"></div></body></html>');
        if (isTs) {
          write('src/App.tsx', 'export default function App() { return <h1>React App</h1>; }');
          write('src/main.tsx', 'import App from "./App";');
          write('vite.config.ts', 'import { defineConfig } from "vite"; export default defineConfig({});');
          write('tsconfig.json', JSON.stringify({ compilerOptions: { target: 'ES2020' } }, null, 2));
        } else {
          write('src/App.jsx', 'export default function App() { return <h1>React App</h1>; }');
          write('src/main.jsx', 'import App from "./App";');
          write('vite.config.js', 'import { defineConfig } from "vite"; export default defineConfig({});');
        }
        break;

      case 'nextjs':
        write('package.json', JSON.stringify({ name, version: '1.0.0', scripts: { dev: 'next dev', build: 'next build', start: 'next start' } }, null, 2));
        write('next.config.mjs', 'export default {};');
        if (isTs) {
          write('app/page.tsx', 'export default function Page() { return <h1>Next Page</h1>; }');
          write('app/layout.tsx', 'export default function RootLayout({ children }: { children: React.ReactNode }) { return <html><body>{children}</body></html>; }');
          write('tsconfig.json', JSON.stringify({ compilerOptions: { jsx: 'preserve' } }, null, 2));
        } else {
          write('app/page.jsx', 'export default function Page() { return <h1>Next Page</h1>; }');
          write('app/layout.jsx', 'export default function RootLayout({ children }) { return <html><body>{children}</body></html>; }');
        }
        break;

      case 'express-api':
        write('package.json', JSON.stringify({ name, version: '1.0.0', scripts: { dev: isTs ? 'ts-node src/index.ts' : 'node src/index.js' } }, null, 2));
        if (isTs) {
          write('src/index.ts', 'import express from "express"; const app = express(); app.listen(3000);');
          write('src/routes/index.ts', 'export const router = {};');
          write('tsconfig.json', JSON.stringify({ compilerOptions: { module: 'commonjs' } }, null, 2));
        } else {
          write('src/index.js', 'const express = require("express"); const app = express(); app.listen(3000);');
          write('src/routes/index.js', 'module.exports = {};');
        }
        break;

      case 'electron-app':
        write('package.json', JSON.stringify({ name, version: '1.0.0', main: isTs ? 'dist/main.js' : 'src/main.js', scripts: { dev: 'vite', build: 'electron-builder' } }, null, 2));
        if (isTs) {
          write('electron/main.ts', 'import { app, BrowserWindow } from "electron";');
          write('src/App.tsx', 'export default function App() { return <h1>Electron App</h1>; }');
          write('vite.config.ts', 'import { defineConfig } from "vite"; export default defineConfig({});');
          write('tsconfig.json', JSON.stringify({ compilerOptions: { target: 'ES2020' } }, null, 2));
        } else {
          write('electron/main.js', 'const { app, BrowserWindow } = require("electron");');
          write('src/App.jsx', 'export default function App() { return <h1>Electron App</h1>; }');
          write('vite.config.js', 'module.exports = {};');
        }
        break;

      case 'fastapi':
      case 'python-fastapi':
        write('main.py', 'from fastapi import FastAPI\napp = FastAPI()\n@app.get("/")\ndef read_root(): return {"Hello": "World"}\n');
        write('requirements.txt', 'fastapi>=0.100.0\nuvicorn>=0.22.0\n');
        write('README.md', `# ${name}\n\nFastAPI Application`);
        break;

      default:
        throw new Error(`Unsupported templateId: ${templateId}`);
    }
  }

  public reset(): void {
    this.invocations = [];
    this.progressEvents = [];
    this.progressListeners = [];
  }
}
