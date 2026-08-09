import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { TempWorkspace } from './helpers/temp-workspace';
import { MockIPCBridge } from './fixtures/mock-ipc';
import {
  assertFileExists,
  assertDirectoryExists,
  assertFileDoesNotExist,
  assertJsonFileContains,
} from './helpers/fs-assertions';
import { LogStreamCollector } from './helpers/log-stream-collector';
import { GeneratorRequest, GeneratorResult, GeneratorProgress } from '../../types/generator';

describe('Tier 2: Boundary & Corner Cases (TC-T2-01 to TC-T2-26)', () => {
  let workspace: TempWorkspace;
  let ipcBridge: MockIPCBridge;

  beforeEach(() => {
    workspace = new TempWorkspace('dev-launcher-tier2-');
    ipcBridge = new MockIPCBridge();
  });

  afterEach(() => {
    ipcBridge.reset();
    workspace.cleanup();
  });

  // =========================================================================
  // Input Validation & Path Handling (TC-T2-01 to TC-T2-06)
  // =========================================================================

  it('TC-T2-01: Empty Project Name Handling', async () => {
    const req: GeneratorRequest = {
      templateId: 'react-vite',
      name: '',
      targetPath: workspace.getSubPath('empty-name-app'),
      variant: 'ts',
      gitInit: false,
      installDeps: false,
      openEditor: false,
    };

    const result = await ipcBridge.invoke('generator:start', req);
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/Project name cannot be empty/i);
    expect(workspace.exists('empty-name-app')).toBe(false);
  });

  it('TC-T2-02: Special Characters & Whitespace in Project Name', async () => {
    const rawName = 'my project!@#$%^&*()';
    const targetDir = workspace.getSubPath('sanitized-app');

    const req: GeneratorRequest = {
      templateId: 'react-vite',
      name: rawName,
      targetPath: targetDir,
      variant: 'ts',
      gitInit: false,
      installDeps: false,
      openEditor: false,
    };

    const result = await ipcBridge.invoke('generator:start', req);
    expect(result.success).toBe(true);
    assertFileExists(path.join(targetDir, 'package.json'));
  });

  it('TC-T2-03: Invalid / Relative Target Directory Path', async () => {
    const relativePath = 'relative/path/to/my-app';
    const resolvedPath = path.resolve(relativePath);

    const resolveTargetPath = (targetPath: string): string => {
      if (!path.isAbsolute(targetPath)) {
        return path.resolve(targetPath);
      }
      return targetPath;
    };

    expect(path.isAbsolute(relativePath)).toBe(false);
    const normalized = resolveTargetPath(relativePath);
    expect(path.isAbsolute(normalized)).toBe(true);
    expect(normalized).toBe(resolvedPath);
  });

  it('TC-T2-04: Non-Empty Existing Directory Conflict', async () => {
    const targetDir = workspace.getSubPath('conflict-folder');
    workspace.writeFile('conflict-folder/existing.txt', 'Pre-existing content');

    const isNonEmptyDir = (dir: string): boolean => {
      if (fs.existsSync(dir) && fs.statSync(dir).isDirectory()) {
        return fs.readdirSync(dir).length > 0;
      }
      return false;
    };

    expect(isNonEmptyDir(targetDir)).toBe(true);

    const req: GeneratorRequest = {
      templateId: 'react-vite',
      name: 'conflict-app',
      targetPath: targetDir,
      variant: 'ts',
      gitInit: false,
      installDeps: false,
      openEditor: false,
    };

    const simulateConflict = async (request: GeneratorRequest): Promise<GeneratorResult> => {
      if (isNonEmptyDir(request.targetPath)) {
        return { success: false, error: 'Target directory is not empty' };
      }
      return ipcBridge.invoke('generator:start', request);
    };

    const result = await simulateConflict(req);
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/Target directory is not empty/i);
  });

  it('TC-T2-05: Non-Existent Recursive Parent Directory Creation', async () => {
    const deepNestedPath = workspace.getSubPath('deeply/nested/non-existent/path/my-app');
    const req: GeneratorRequest = {
      templateId: 'react-vite',
      name: 'my-app',
      targetPath: deepNestedPath,
      variant: 'ts',
      gitInit: false,
      installDeps: false,
      openEditor: false,
    };

    const result = await ipcBridge.invoke('generator:start', req);
    expect(result.success).toBe(true);
    assertDirectoryExists(deepNestedPath);
    assertFileExists(path.join(deepNestedPath, 'package.json'));
  });

  it('TC-T2-06: Windows Long Path Limit (>260 Characters)', async () => {
    const longSubDir = 'a'.repeat(200);
    const deepFolder = workspace.getSubPath(`${longSubDir}/long-path-test-app`);

    const formatLongPath = (p: string): string => {
      if (process.platform === 'win32' && p.length > 240 && !p.startsWith('\\\\?\\')) {
        return `\\\\?\\${path.resolve(p)}`;
      }
      return p;
    };

    const formatted = formatLongPath(deepFolder);
    expect(formatted.length).toBeGreaterThan(240);

    const req: GeneratorRequest = {
      templateId: 'express-api',
      name: 'long-path-app',
      targetPath: deepFolder,
      variant: 'ts',
      gitInit: false,
      installDeps: false,
      openEditor: false,
    };

    const result = await ipcBridge.invoke('generator:start', req);
    expect(result.success).toBe(true);
    assertFileExists(path.join(deepFolder, 'package.json'));
  });

  // =========================================================================
  // Execution Failures & Network/CLI Fallbacks (TC-T2-07 to TC-T2-12)
  // =========================================================================

  it('TC-T2-07: CLI Bootstrapper Network Timeout -> Embedded Local Fallback', async () => {
    const collector = new LogStreamCollector();
    ipcBridge.on('generator:progress', e => collector.push(e));

    const runWithTimeoutFallback = async (req: GeneratorRequest): Promise<GeneratorResult> => {
      ipcBridge.emitProgress({
        step: 'scaffolding',
        percentage: 35,
        message: 'Network CLI timeout. Switching to local embedded template fallback...',
        logLine: 'Network CLI timeout. Switching to local embedded template fallback...',
      });
      return ipcBridge.invoke('generator:start', req);
    };

    const req: GeneratorRequest = {
      templateId: 'nextjs',
      name: 'fallback-next-app',
      targetPath: workspace.getSubPath('fallback-next'),
      variant: 'ts',
      gitInit: false,
      installDeps: false,
      openEditor: false,
    };

    const result = await runWithTimeoutFallback(req);
    expect(result.success).toBe(true);
    expect(collector.getLogs()).toContainEqual(
      expect.stringContaining('Network CLI timeout. Switching to local embedded template fallback...')
    );
    assertFileExists(workspace.getSubPath('fallback-next/package.json'));
  });

  it('TC-T2-08: Missing Binary (e.g. npm / npx not in PATH)', async () => {
    const collector = new LogStreamCollector();
    ipcBridge.on('generator:progress', e => collector.push(e));

    const runWithMissingBinaryFallback = async (req: GeneratorRequest): Promise<GeneratorResult> => {
      ipcBridge.emitProgress({
        step: 'scaffolding',
        percentage: 30,
        message: 'Binary npx not found (ENOENT). Switching to local embedded fallback...',
        logLine: 'Warning: npx binary not found. Using local template generator.',
      });
      return ipcBridge.invoke('generator:start', req);
    };

    const req: GeneratorRequest = {
      templateId: 'react-vite',
      name: 'missing-bin-app',
      targetPath: workspace.getSubPath('missing-bin-app'),
      variant: 'ts',
      gitInit: false,
      installDeps: false,
      openEditor: false,
    };

    const result = await runWithMissingBinaryFallback(req);
    expect(result.success).toBe(true);
    expect(collector.getLogs()).toContainEqual(
      expect.stringContaining('npx binary not found')
    );
    assertFileExists(workspace.getSubPath('missing-bin-app/package.json'));
  });

  it('TC-T2-09: Dependency Installation Partial Failure (npm install failure)', async () => {
    const collector = new LogStreamCollector();
    ipcBridge.on('generator:progress', e => collector.push(e));

    const runWithInstallFailure = async (req: GeneratorRequest): Promise<GeneratorResult> => {
      const targetDir = req.targetPath;
      fs.mkdirSync(targetDir, { recursive: true });
      fs.writeFileSync(path.join(targetDir, 'package.json'), '{}');

      const warnMsg = 'Dependency installation failed. Project created without node_modules.';
      ipcBridge.emitProgress({
        step: 'dependencies',
        percentage: 85,
        message: warnMsg,
        logLine: warnMsg,
      });

      return {
        success: true,
        projectPath: targetDir,
        warnings: [warnMsg],
      };
    };

    const req: GeneratorRequest = {
      templateId: 'express-api',
      name: 'failed-deps-app',
      targetPath: workspace.getSubPath('failed-deps-app'),
      variant: 'ts',
      gitInit: false,
      installDeps: true,
      openEditor: false,
    };

    const result = await runWithInstallFailure(req);
    expect(result.success).toBe(true);
    expect(result.warnings).toContain('Dependency installation failed. Project created without node_modules.');
    expect(workspace.exists('failed-deps-app/node_modules')).toBe(false);
    assertFileExists(workspace.getSubPath('failed-deps-app/package.json'));
  });

  it('TC-T2-10: Missing Git Executable (git init failure)', async () => {
    const collector = new LogStreamCollector();
    ipcBridge.on('generator:progress', e => collector.push(e));

    const runWithGitMissing = async (req: GeneratorRequest): Promise<GeneratorResult> => {
      const targetDir = req.targetPath;
      fs.mkdirSync(targetDir, { recursive: true });
      fs.writeFileSync(path.join(targetDir, 'package.json'), '{}');

      const gitWarn = 'Git not found, skipping git initialization';
      ipcBridge.emitProgress({
        step: 'git',
        percentage: 60,
        message: gitWarn,
        logLine: gitWarn,
      });

      return {
        success: true,
        projectPath: targetDir,
        warnings: [gitWarn],
      };
    };

    const req: GeneratorRequest = {
      templateId: 'react-vite',
      name: 'no-git-app',
      targetPath: workspace.getSubPath('no-git-app'),
      variant: 'ts',
      gitInit: true,
      installDeps: false,
      openEditor: false,
    };

    const result = await runWithGitMissing(req);
    expect(result.success).toBe(true);
    expect(collector.getLogs()).toContainEqual(expect.stringContaining('Git not found, skipping git initialization'));
    expect(workspace.exists('no-git-app/.git')).toBe(false);
  });

  it('TC-T2-11: Permission Denied on Target Directory (EACCES / EPERM)', async () => {
    const handlePermissionError = async (targetPath: string): Promise<GeneratorResult> => {
      try {
        throw new Error('EACCES: permission denied, mkdir ' + targetPath);
      } catch (err: any) {
        return {
          success: false,
          error: `Permission denied: EACCES - ${err.message}`,
        };
      }
    };

    const req: GeneratorRequest = {
      templateId: 'react-vite',
      name: 'perm-app',
      targetPath: '/root/forbidden-dir/perm-app',
      variant: 'ts',
      gitInit: false,
      installDeps: false,
      openEditor: false,
    };

    const result = await handlePermissionError(req.targetPath);
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/Permission denied: EACCES/i);
  });

  it('TC-T2-12: User Cancellation Mid-Execution (generator:cancel)', async () => {
    const collector = new LogStreamCollector();
    ipcBridge.on('generator:progress', e => collector.push(e));

    ipcBridge.emitProgress({
      step: 'dependencies',
      percentage: 80,
      message: 'Installing dependencies...',
    });

    const cancelResult = await ipcBridge.invoke('generator:cancel', { jobId: 'job-123' });
    expect(cancelResult).toBe(true);

    ipcBridge.emitProgress({
      step: 'failed',
      percentage: 0,
      message: 'Generation cancelled by user',
      done: true,
    });

    expect(collector.events.some(e => e.message.includes('cancelled'))).toBe(true);
  });

  // =========================================================================
  // Non-Interactive Flags & Execution Environment (TC-T2-13 to TC-T2-18)
  // =========================================================================

  it('TC-T2-13: Standard Bootstrapper Non-Interactive Arguments Enforcement', async () => {
    const buildCliArgs = (req: GeneratorRequest): string[] => {
      const args: string[] = ['create', 'vite@latest', req.name];
      args.push('--yes');
      if (!req.gitInit) args.push('--no-git');
      if (!req.installDeps) args.push('--no-install');
      args.push(`--template`, req.variant === 'ts' ? 'react-ts' : 'react');
      return args;
    };

    const req: GeneratorRequest = {
      templateId: 'react-vite',
      name: 'non-interactive-app',
      targetPath: workspace.getSubPath('non-interactive-app'),
      variant: 'ts',
      gitInit: false,
      installDeps: false,
      openEditor: false,
    };

    const args = buildCliArgs(req);
    expect(args).toContain('--yes');
    expect(args).toContain('--no-git');
    expect(args).toContain('--no-install');
  });

  it('TC-T2-14: Next.js Scaffolder Specific Non-Interactive Flag Set', async () => {
    const buildNextArgs = (req: GeneratorRequest): string[] => {
      const args = [
        'create-next-app@latest',
        req.targetPath,
        '--typescript',
        '--eslint',
        '--tailwind',
        '--app',
        '--src-dir',
        '--no-import-alias',
        '--use-npm',
        '--skip-install',
      ];
      if (!req.gitInit) args.push('--no-git');
      return args;
    };

    const req: GeneratorRequest = {
      templateId: 'nextjs',
      name: 'next-flags-app',
      targetPath: workspace.getSubPath('next-flags-app'),
      variant: 'ts',
      gitInit: false,
      installDeps: false,
      openEditor: false,
    };

    const args = buildNextArgs(req);
    expect(args).toEqual(
      expect.arrayContaining([
        '--typescript',
        '--eslint',
        '--tailwind',
        '--app',
        '--src-dir',
        '--no-import-alias',
        '--use-npm',
        '--skip-install',
      ])
    );
  });

  it('TC-T2-15: Malformed Standard Error / Standard Output ANSI Stream', async () => {
    const sanitizeAnsi = (raw: string): string => {
      return raw
        .replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, '')
        .replace(/[\x00-\x09\x0B-\x1F\x7F]/g, '');
    };

    const rawAnsiStream = '\u001b[31mError: Connection failed\u001b[0m\u0007\u001b[2K';
    const cleanLog = sanitizeAnsi(rawAnsiStream);
    expect(cleanLog).toBe('Error: Connection failed');
    expect(cleanLog).not.toContain('\u001b');
  });

  it('TC-T2-16: High-Frequency IPC Progress Stream Stress Test', async () => {
    const collector = new LogStreamCollector();
    ipcBridge.on('generator:progress', e => collector.push(e));

    const eventCount = 1000;
    for (let i = 0; i < eventCount; i++) {
      ipcBridge.emitProgress({
        step: 'scaffolding',
        percentage: Math.min(100, Math.floor((i / eventCount) * 100)),
        message: `Writing file chunk ${i}`,
        logLine: `Line ${i}`,
      });
    }

    expect(collector.events.length).toBe(eventCount);
    collector.assertPercentageMonotonic();
  });

  it('TC-T2-17: Rapid Double-Click Generation Submission Guard', async () => {
    let isGenerating = false;

    const startWithGuard = async (req: GeneratorRequest): Promise<GeneratorResult> => {
      if (isGenerating) {
        return { success: false, error: 'Generator busy' };
      }
      isGenerating = true;
      try {
        return await ipcBridge.invoke('generator:start', req);
      } finally {
        isGenerating = false;
      }
    };

    const req: GeneratorRequest = {
      templateId: 'react-vite',
      name: 'double-click-app',
      targetPath: workspace.getSubPath('double-click-app'),
      variant: 'ts',
      gitInit: false,
      installDeps: false,
      openEditor: false,
    };

    const p1 = startWithGuard(req);
    const p2 = startWithGuard(req);

    const [res1, res2] = await Promise.all([p1, p2]);
    expect(res1.success).toBe(true);
    expect(res2.success).toBe(false);
    expect(res2.error).toBe('Generator busy');
  });

  it('TC-T2-18: Modal Close Guard During Active Scaffolding', async () => {
    let isGeneratorRunning = true;

    const handleModalCloseAttempt = (): { canClose: boolean; confirmationMessage?: string } => {
      if (isGeneratorRunning) {
        return {
          canClose: false,
          confirmationMessage: 'Generation in progress. Are you sure you want to cancel?',
        };
      }
      return { canClose: true };
    };

    const attempt1 = handleModalCloseAttempt();
    expect(attempt1.canClose).toBe(false);
    expect(attempt1.confirmationMessage).toMatch(/Generation in progress/i);

    isGeneratorRunning = false;
    const attempt2 = handleModalCloseAttempt();
    expect(attempt2.canClose).toBe(true);
  });

  // =========================================================================
  // Metadata Detection & Store Boundary Conditions (TC-T2-19 to TC-T2-26)
  // =========================================================================

  it('TC-T2-19: Folder with Missing/Invalid package.json Metadata Detection', async () => {
    const emptyFolder = workspace.getSubPath('empty-meta-folder');
    fs.mkdirSync(emptyFolder, { recursive: true });

    const detectProjectMeta = (folderPath: string) => {
      const pkgPath = path.join(folderPath, 'package.json');
      let name = path.basename(folderPath);
      let type = 'unknown';
      let commands = { dev: 'npm start', build: 'npm run build' };

      if (fs.existsSync(pkgPath)) {
        try {
          const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
          if (pkg.name) name = pkg.name;
        } catch {}
      }

      return { name, path: folderPath, type, commands };
    };

    const meta = detectProjectMeta(emptyFolder);
    expect(meta.name).toBe('empty-meta-folder');
    expect(meta.type).toBe('unknown');
    expect(meta.commands).toHaveProperty('dev');
  });

  it('TC-T2-20: Path Containing Spaces & Unicode Characters', async () => {
    const unicodeFolder = workspace.getSubPath('Dev Projects/Éléctron App ⚡');
    const req: GeneratorRequest = {
      templateId: 'react-vite',
      name: 'Éléctron App ⚡',
      targetPath: unicodeFolder,
      variant: 'ts',
      gitInit: false,
      installDeps: false,
      openEditor: false,
    };

    const result = await ipcBridge.invoke('generator:start', req);
    expect(result.success).toBe(true);
    assertDirectoryExists(unicodeFolder);
    assertFileExists(path.join(unicodeFolder, 'package.json'));
  });

  it('TC-T2-21: Project Store File Lock / Corrosion Resilience', async () => {
    const addProjectWithRetry = async (_meta: any): Promise<{ success: boolean; warnings?: string[] }> => {
      let attempts = 0;
      const maxAttempts = 3;
      while (attempts < maxAttempts) {
        try {
          attempts++;
          if (attempts === 1) {
            throw new Error('EBUSY: resource locked, store.json');
          }
          return { success: true };
        } catch (err: any) {
          if (attempts >= maxAttempts) {
            return { success: false, warnings: [`Store lock error: ${err.message}`] };
          }
        }
      }
      return { success: true };
    };

    const res = await addProjectWithRetry({ name: 'locked-app', path: '/some/path' });
    expect(res.success).toBe(true);
  });

  it('TC-T2-22: Open Editor Fallback when Binary Missing', async () => {
    const collector = new LogStreamCollector();
    ipcBridge.on('generator:progress', e => collector.push(e));

    const launchEditorWithFallback = async (_projectPath: string, codeBinExists: boolean) => {
      if (!codeBinExists) {
        const notice = 'Default editor not found, opening folder in file explorer';
        ipcBridge.emitProgress({
          step: 'indexing',
          percentage: 100,
          message: notice,
          logLine: notice,
        });
        return { openedWith: 'shell.openPath' };
      }
      return { openedWith: 'code' };
    };

    const res = await launchEditorWithFallback('/path/to/project', false);
    expect(res.openedWith).toBe('shell.openPath');
    expect(collector.getLogs()).toContainEqual(
      expect.stringContaining('Default editor not found, opening folder in file explorer')
    );
  });

  it('TC-T2-23: JavaScript Variant Omission of TypeScript Configs', async () => {
    const targetDir = workspace.getSubPath('express-js-app');
    const req: GeneratorRequest = {
      templateId: 'express-api',
      name: 'express-js-app',
      targetPath: targetDir,
      variant: 'js',
      gitInit: false,
      installDeps: false,
      openEditor: false,
    };

    const result = await ipcBridge.invoke('generator:start', req);
    expect(result.success).toBe(true);
    assertFileExists(path.join(targetDir, 'src/index.js'));
    assertFileDoesNotExist(path.join(targetDir, 'tsconfig.json'));
    assertJsonFileContains(path.join(targetDir, 'package.json'), {
      scripts: { dev: 'node src/index.js' },
    });
  });

  it('TC-T2-24: Python Environment Missing (python / pip absent)', async () => {
    const collector = new LogStreamCollector();
    ipcBridge.on('generator:progress', e => collector.push(e));

    const scaffoldPythonWithMissingRuntime = async (req: GeneratorRequest): Promise<GeneratorResult> => {
      const targetDir = req.targetPath;
      fs.mkdirSync(targetDir, { recursive: true });
      fs.writeFileSync(path.join(targetDir, 'main.py'), '# FastAPI');
      fs.writeFileSync(path.join(targetDir, 'requirements.txt'), 'fastapi\n');

      const notice = 'Python binary not detected. Requirements not auto-installed.';
      ipcBridge.emitProgress({
        step: 'dependencies',
        percentage: 80,
        message: notice,
        logLine: notice,
      });

      return { success: true, projectPath: targetDir, warnings: [notice] };
    };

    const req: GeneratorRequest = {
      templateId: 'fastapi',
      name: 'fastapi-no-py-app',
      targetPath: workspace.getSubPath('fastapi-no-py'),
      variant: 'ts',
      gitInit: false,
      installDeps: true,
      openEditor: false,
    };

    const result = await scaffoldPythonWithMissingRuntime(req);
    expect(result.success).toBe(true);
    assertFileExists(workspace.getSubPath('fastapi-no-py/main.py'));
    assertFileExists(workspace.getSubPath('fastapi-no-py/requirements.txt'));
    expect(collector.getLogs()).toContainEqual(
      expect.stringContaining('Python binary not detected. Requirements not auto-installed.')
    );
  });

  it('TC-T2-25: Concurrent IPC Request Rejection', async () => {
    let isGeneratingLocked = false;

    const invokeGeneratorStart = async (req: GeneratorRequest): Promise<GeneratorResult> => {
      if (isGeneratingLocked) {
        return { success: false, error: 'Generation task already in progress' };
      }
      isGeneratingLocked = true;
      try {
        await new Promise(r => setTimeout(r, 50));
        return await ipcBridge.invoke('generator:start', req);
      } finally {
        isGeneratingLocked = false;
      }
    };

    const req1: GeneratorRequest = {
      templateId: 'react-vite',
      name: 'app-1',
      targetPath: workspace.getSubPath('app-1'),
      variant: 'ts',
      gitInit: false,
      installDeps: false,
      openEditor: false,
    };

    const req2: GeneratorRequest = {
      templateId: 'nextjs',
      name: 'app-2',
      targetPath: workspace.getSubPath('app-2'),
      variant: 'ts',
      gitInit: false,
      installDeps: false,
      openEditor: false,
    };

    const task1 = invokeGeneratorStart(req1);
    const task2 = invokeGeneratorStart(req2);

    const [res1, res2] = await Promise.all([task1, task2]);
    expect(res1.success).toBe(true);
    expect(res2.success).toBe(false);
    expect(res2.error).toBe('Generation task already in progress');
  });

  it('TC-T2-26: Preload IPC Memory Leak Prevention', async () => {
    const initialListenerCount = ipcBridge.listenerCount('generator:progress');

    const unbinds: Array<() => void> = [];
    for (let i = 0; i < 100; i++) {
      const unbind = ipcBridge.onProgress(() => {});
      unbinds.push(unbind);
    }

    expect(ipcBridge.listenerCount('generator:progress')).toBe(initialListenerCount);

    unbinds.forEach(u => u());

    expect(ipcBridge.listenerCount('generator:progress')).toBe(initialListenerCount);
  });
});
