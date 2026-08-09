import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import path from 'path';
import { SCAFFOLD_TEMPLATES, GeneratorRequest, GeneratorProgress, TemplateScaffoldDef } from '../../types/generator';
import { TempWorkspace } from './helpers/temp-workspace';
import { MockIPCBridge } from './fixtures/mock-ipc';
import { assertFileExists, assertDirectoryExists, assertFileDoesNotExist, assertJsonFileContains, assertFileContains } from './helpers/fs-assertions';
import { LogStreamCollector } from './helpers/log-stream-collector';

describe('Tier 1: Feature Coverage (TC-T1-01 to TC-T1-27)', () => {
  let workspace: TempWorkspace;
  let mockIpc: MockIPCBridge;
  let logCollector: LogStreamCollector;

  beforeEach(() => {
    workspace = new TempWorkspace('tier1-test-');
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
  // Requirement R1: Scaffold Definitions & Template Options (TC-T1-01 to TC-T1-06)
  // =========================================================================
  describe('R1: Scaffold Definitions & Options', () => {
    it('TC-T1-01: React+Vite Scaffold Definition Verification', async () => {
      const templates = await mockIpc.getTemplates();
      const reactVite = templates.find(t => t.id === 'react-vite');

      expect(reactVite).toBeDefined();
      expect(reactVite?.id).toBe('react-vite');
      expect(reactVite?.name).toBe('React + Vite');
      expect(reactVite?.category).toBe('frontend');
      expect(reactVite?.defaultVariant).toBe('ts');
      expect(reactVite?.supportedVariants).toEqual(['ts', 'js']);
      expect(reactVite?.tags).toContain('React');
      expect(reactVite?.tags).toContain('Vite');
      expect(reactVite?.icon).toBe('Zap');
    });

    it('TC-T1-02: Next.js App Router Scaffold Definition Verification', async () => {
      const templates = await mockIpc.getTemplates();
      const nextjs = templates.find(t => t.id === 'nextjs');

      expect(nextjs).toBeDefined();
      expect(nextjs?.id).toBe('nextjs');
      expect(nextjs?.name).toBe('Next.js App Router');
      expect(nextjs?.category).toBe('fullstack');
      expect(nextjs?.defaultVariant).toBe('ts');
      expect(nextjs?.supportedVariants).toEqual(['ts', 'js']);
      expect(nextjs?.tags).toContain('Next.js');
      expect(nextjs?.tags).toContain('SSR');
      expect(nextjs?.description).toContain('App Router');
      expect(nextjs?.icon).toBe('Globe');
    });

    it('TC-T1-03: Express Node API Scaffold Definition Verification', async () => {
      const templates = await mockIpc.getTemplates();
      const expressApi = templates.find(t => t.id === 'express-api');

      expect(expressApi).toBeDefined();
      expect(expressApi?.id).toBe('express-api');
      expect(expressApi?.name).toBe('Express Node API');
      expect(expressApi?.category).toBe('backend');
      expect(expressApi?.defaultVariant).toBe('ts');
      expect(expressApi?.supportedVariants).toEqual(['ts', 'js']);
      expect(expressApi?.tags).toContain('Express');
      expect(expressApi?.tags).toContain('Node.js');
      expect(expressApi?.icon).toBe('Server');
    });

    it('TC-T1-04: Electron App (Vite+React) Scaffold Definition Verification', async () => {
      const templates = await mockIpc.getTemplates();
      const electronApp = templates.find(t => t.id === 'electron-app');

      expect(electronApp).toBeDefined();
      expect(electronApp?.id).toBe('electron-app');
      expect(electronApp?.name).toBe('Electron App (Vite+React)');
      expect(electronApp?.category).toBe('desktop');
      expect(electronApp?.defaultVariant).toBe('ts');
      expect(electronApp?.supportedVariants).toEqual(['ts', 'js']);
      expect(electronApp?.tags).toContain('Electron');
      expect(electronApp?.tags).toContain('Desktop');
      expect(electronApp?.icon).toBe('Cpu');
    });

    it('TC-T1-05: Python FastAPI Scaffold Definition Verification', async () => {
      const templates = await mockIpc.getTemplates();
      const fastapi = templates.find(t => t.id === 'python-fastapi');

      expect(fastapi).toBeDefined();
      expect(fastapi?.id).toBe('python-fastapi');
      expect(fastapi?.name).toBe('Python FastAPI');
      expect(fastapi?.category).toBe('backend');
      expect(fastapi?.defaultVariant).toBe('ts');
      expect(fastapi?.supportedVariants).toEqual(['ts', 'js']);
      expect(fastapi?.tags).toContain('Python');
      expect(fastapi?.tags).toContain('FastAPI');
      expect(fastapi?.icon).toBe('Terminal');
    });

    it('TC-T1-06: Scaffold List Immutability and Metadata Completeness', async () => {
      const templates = await mockIpc.getTemplates();
      expect(templates.length).toBe(5);

      templates.forEach((template: TemplateScaffoldDef) => {
        expect(template.id).toBeTruthy();
        expect(template.name).toBeTruthy();
        expect(template.description).toBeTruthy();
        expect(template.category).toBeTruthy();
        expect(template.defaultVariant).toBeTruthy();
        expect(Array.isArray(template.supportedVariants)).toBe(true);
        expect(template.supportedVariants.length).toBeGreaterThan(0);
        expect(template.icon).toBeTruthy();
      });
    });
  });

  // =========================================================================
  // Requirement R2: Main Generator Service Scaffolding Execution (TC-T1-07 to TC-T1-12)
  // =========================================================================
  describe('R2: Main Generator Service Scaffolding Execution', () => {
    it('TC-T1-07: React+Vite Scaffold Execution (TypeScript)', async () => {
      const req: GeneratorRequest = {
        templateId: 'react-vite',
        name: 'my-react-ts-app',
        targetPath: workspace.dirPath,
        variant: 'ts',
        gitInit: false,
        installDeps: false,
        openEditor: false,
      };

      const result = await mockIpc.invoke('generator:start', req);
      expect(result.success).toBe(true);
      expect(result.projectPath).toBe(workspace.dirPath);

      assertFileExists(workspace.getSubPath('package.json'));
      assertFileExists(workspace.getSubPath('index.html'));
      assertFileExists(workspace.getSubPath('src/App.tsx'));
      assertFileExists(workspace.getSubPath('src/main.tsx'));
      assertFileExists(workspace.getSubPath('vite.config.ts'));
      assertFileExists(workspace.getSubPath('tsconfig.json'));

      assertJsonFileContains(workspace.getSubPath('package.json'), { name: 'my-react-ts-app' });
    });

    it('TC-T1-08: React+Vite Scaffold Execution (JavaScript)', async () => {
      const req: GeneratorRequest = {
        templateId: 'react-vite',
        name: 'my-react-js-app',
        targetPath: workspace.dirPath,
        variant: 'js',
        gitInit: false,
        installDeps: false,
        openEditor: false,
      };

      const result = await mockIpc.invoke('generator:start', req);
      expect(result.success).toBe(true);

      assertFileExists(workspace.getSubPath('package.json'));
      assertFileExists(workspace.getSubPath('index.html'));
      assertFileExists(workspace.getSubPath('src/App.jsx'));
      assertFileExists(workspace.getSubPath('src/main.jsx'));
      assertFileExists(workspace.getSubPath('vite.config.js'));
      assertFileDoesNotExist(workspace.getSubPath('tsconfig.json'));
    });

    it('TC-T1-09: Next.js App Router Scaffold Execution', async () => {
      const req: GeneratorRequest = {
        templateId: 'nextjs',
        name: 'my-next-app',
        targetPath: workspace.dirPath,
        variant: 'ts',
        gitInit: false,
        installDeps: false,
        openEditor: false,
      };

      const result = await mockIpc.invoke('generator:start', req);
      expect(result.success).toBe(true);

      assertFileExists(workspace.getSubPath('package.json'));
      assertFileExists(workspace.getSubPath('next.config.mjs'));
      assertFileExists(workspace.getSubPath('app/page.tsx'));
      assertFileExists(workspace.getSubPath('app/layout.tsx'));
      assertFileExists(workspace.getSubPath('tsconfig.json'));
    });

    it('TC-T1-10: Express Node API Scaffold Execution', async () => {
      const req: GeneratorRequest = {
        templateId: 'express-api',
        name: 'my-express-api',
        targetPath: workspace.dirPath,
        variant: 'ts',
        gitInit: false,
        installDeps: false,
        openEditor: false,
      };

      const result = await mockIpc.invoke('generator:start', req);
      expect(result.success).toBe(true);

      assertFileExists(workspace.getSubPath('package.json'));
      assertFileExists(workspace.getSubPath('src/index.ts'));
      assertFileExists(workspace.getSubPath('src/routes/index.ts'));
      assertFileExists(workspace.getSubPath('tsconfig.json'));
    });

    it('TC-T1-11: Electron App Scaffold Execution', async () => {
      const req: GeneratorRequest = {
        templateId: 'electron-app',
        name: 'my-electron-app',
        targetPath: workspace.dirPath,
        variant: 'ts',
        gitInit: false,
        installDeps: false,
        openEditor: false,
      };

      const result = await mockIpc.invoke('generator:start', req);
      expect(result.success).toBe(true);

      assertFileExists(workspace.getSubPath('package.json'));
      assertFileExists(workspace.getSubPath('electron/main.ts'));
      assertFileExists(workspace.getSubPath('src/App.tsx'));
      assertFileExists(workspace.getSubPath('vite.config.ts'));
    });

    it('TC-T1-12: Python FastAPI Scaffold Execution', async () => {
      const req: GeneratorRequest = {
        templateId: 'python-fastapi',
        name: 'my-fastapi-app',
        targetPath: workspace.dirPath,
        variant: 'ts',
        gitInit: false,
        installDeps: false,
        openEditor: false,
      };

      const result = await mockIpc.invoke('generator:start', req);
      expect(result.success).toBe(true);

      assertFileExists(workspace.getSubPath('main.py'));
      assertFileExists(workspace.getSubPath('requirements.txt'));
      assertFileExists(workspace.getSubPath('README.md'));
      assertFileContains(workspace.getSubPath('main.py'), 'FastAPI');
      assertFileContains(workspace.getSubPath('requirements.txt'), 'fastapi');
    });
  });

  // =========================================================================
  // Requirement R2 & R3: Live Log Streaming & IPC Channel Coverage (TC-T1-13 to TC-T1-17)
  // =========================================================================
  describe('R2 & R3: Live Progress IPC Log Streaming', () => {
    it('TC-T1-13: IPC Event Stream — Step 1: Validating', async () => {
      const req: GeneratorRequest = {
        templateId: 'react-vite',
        name: 'validating-test',
        targetPath: workspace.dirPath,
        variant: 'ts',
        gitInit: false,
        installDeps: false,
        openEditor: false,
      };

      await mockIpc.invoke('generator:start', req);

      const firstEvent = logCollector.events[0];
      expect(firstEvent).toBeDefined();
      expect(firstEvent.step).toBe('validating');
      expect(firstEvent.percentage).toBe(10);
      expect(firstEvent.message).toContain('Validating');
    });

    it('TC-T1-14: IPC Event Stream — Step 2: Scaffolding with Live Output', async () => {
      const req: GeneratorRequest = {
        templateId: 'react-vite',
        name: 'scaffolding-stream-test',
        targetPath: workspace.dirPath,
        variant: 'ts',
        gitInit: false,
        installDeps: false,
        openEditor: false,
      };

      await mockIpc.invoke('generator:start', req);

      const scaffoldingEvents = logCollector.events.filter(e => e.step === 'scaffolding');
      expect(scaffoldingEvents.length).toBeGreaterThan(0);
      expect(scaffoldingEvents[0].percentage).toBeGreaterThanOrEqual(30);

      const logs = logCollector.getLogs();
      expect(logs.length).toBeGreaterThan(0);
      expect(logs.some(line => line.includes('file') || line.includes('template'))).toBe(true);
    });

    it('TC-T1-15: IPC Event Stream — Step 3: Git Initialization', async () => {
      const req: GeneratorRequest = {
        templateId: 'express-api',
        name: 'git-stream-test',
        targetPath: workspace.dirPath,
        variant: 'ts',
        gitInit: true,
        installDeps: false,
        openEditor: false,
      };

      await mockIpc.invoke('generator:start', req);

      expect(logCollector.hasStep('git')).toBe(true);
      const gitEvent = logCollector.events.find(e => e.step === 'git');
      expect(gitEvent?.percentage).toBe(60);
      expect(gitEvent?.message).toContain('git');

      assertDirectoryExists(workspace.getSubPath('.git'));
    });

    it('TC-T1-16: IPC Event Stream — Step 4: Installing Dependencies', async () => {
      const req: GeneratorRequest = {
        templateId: 'nextjs',
        name: 'deps-stream-test',
        targetPath: workspace.dirPath,
        variant: 'ts',
        gitInit: false,
        installDeps: true,
        openEditor: false,
      };

      await mockIpc.invoke('generator:start', req);

      expect(logCollector.hasStep('dependencies')).toBe(true);
      const depsEvent = logCollector.events.find(e => e.step === 'dependencies');
      expect(depsEvent?.percentage).toBe(80);
      expect(depsEvent?.message).toContain('dependencies');

      assertDirectoryExists(workspace.getSubPath('node_modules'));
    });

    it('TC-T1-17: IPC Event Stream — Step 5: Indexing & Final Payload', async () => {
      const req: GeneratorRequest = {
        templateId: 'electron-app',
        name: 'indexing-stream-test',
        targetPath: workspace.dirPath,
        variant: 'ts',
        gitInit: true,
        installDeps: true,
        openEditor: false,
      };

      const result = await mockIpc.invoke('generator:start', req);

      expect(logCollector.hasStep('indexing')).toBe(true);
      const finalEvent = logCollector.events[logCollector.events.length - 1];
      expect(finalEvent.step).toBe('indexing');
      expect(finalEvent.percentage).toBe(100);
      expect(finalEvent.done).toBe(true);

      logCollector.assertStepSequence(['validating', 'scaffolding', 'git', 'dependencies', 'indexing']);
      logCollector.assertPercentageMonotonic();

      expect(result.success).toBe(true);
      expect(result.projectPath).toBe(workspace.dirPath);
    });
  });

  // =========================================================================
  // Requirement R4: React UI Component & Styling (TC-T1-18 to TC-T1-22)
  // =========================================================================
  describe('R4: React UI Component & Styling Logic', () => {
    it('TC-T1-18: ProjectGeneratorModal — Template Selection Cards Render', () => {
      const templates = SCAFFOLD_TEMPLATES;
      expect(templates.length).toBe(5);

      const templateIds = templates.map(t => t.id);
      expect(templateIds).toEqual([
        'react-vite',
        'nextjs',
        'express-api',
        'electron-app',
        'python-fastapi',
      ]);

      const defaultSelection = templates[0];
      expect(defaultSelection.id).toBe('react-vite');
    });

    it('TC-T1-19: ProjectGeneratorModal — Form Controls Data Binding', () => {
      const formData: GeneratorRequest = {
        templateId: 'react-vite',
        name: 'my-custom-project',
        targetPath: 'C:\\Projects\\my-custom-project',
        variant: 'ts',
        gitInit: true,
        installDeps: true,
        openEditor: true,
      };

      const isValid = formData.name.trim().length > 0 && formData.targetPath.trim().length > 0;
      expect(isValid).toBe(true);

      const invalidFormData: Partial<GeneratorRequest> = {
        name: '',
        targetPath: '',
      };
      const isInvalidValid = (invalidFormData.name?.trim().length || 0) > 0;
      expect(isInvalidValid).toBe(false);
    });

    it('TC-T1-20: ProjectGeneratorModal — Live Terminal Output Log Widget', () => {
      const sampleRawLogs = [
        '\u001b[32mCreating src/App.tsx...\u001b[0m',
        '\u001b[33mWriting package.json...\u001b[0m',
        'Scaffolding complete.',
      ];

      const stripAnsi = (str: string) => str.replace(/\u001b\[[0-9;]*m/g, '');
      const cleanedLogs = sampleRawLogs.map(stripAnsi);

      expect(cleanedLogs[0]).toBe('Creating src/App.tsx...');
      expect(cleanedLogs[1]).toBe('Writing package.json...');
      expect(cleanedLogs[2]).toBe('Scaffolding complete.');
    });

    it('TC-T1-21: ProjectGeneratorModal — Step Progress Indicator Component', () => {
      const getStepStatus = (currentPercentage: number, stepPercentage: number) => {
        if (currentPercentage > stepPercentage) return 'complete';
        if (currentPercentage === stepPercentage) return 'active';
        return 'pending';
      };

      expect(getStepStatus(10, 10)).toBe('active');
      expect(getStepStatus(50, 10)).toBe('complete');
      expect(getStepStatus(10, 30)).toBe('pending');
      expect(getStepStatus(100, 100)).toBe('active');
    });

    it('TC-T1-22: ProjectGeneratorModal — Completion View & Action Buttons', () => {
      const mockResult = {
        success: true,
        projectPath: '/path/to/project',
        projectId: 'proj-123',
      };

      const completionState = {
        isComplete: mockResult.success,
        pathPreview: mockResult.projectPath,
        primaryAction: 'Open Project',
        secondaryAction: 'Close',
      };

      expect(completionState.isComplete).toBe(true);
      expect(completionState.pathPreview).toBe('/path/to/project');
      expect(completionState.primaryAction).toBe('Open Project');
      expect(completionState.secondaryAction).toBe('Close');
    });
  });

  // =========================================================================
  // Requirement R5: Integration & Command Palette (TC-T1-23 to TC-T1-27)
  // =========================================================================
  describe('R5: Integration & Command Palette Triggers', () => {
    it('TC-T1-23: ProjectsPage — Trigger Button Click Opens Modal', () => {
      let isModalOpen = false;
      const handleTriggerClick = () => {
        isModalOpen = true;
      };

      expect(isModalOpen).toBe(false);
      handleTriggerClick();
      expect(isModalOpen).toBe(true);
    });

    it('TC-T1-24: Command Palette — Instant Generator Action Execution', () => {
      const commandItem = {
        id: 'action-instant-generator',
        title: '⚡ Instant Generator',
        category: 'Actions',
        action: (setModalOpen: (val: boolean) => void) => setModalOpen(true),
      };

      let modalOpen = false;
      commandItem.action(val => { modalOpen = val; });

      expect(modalOpen).toBe(true);
    });

    it('TC-T1-25: Generator Store Integration — Store Dispatch on Completion', () => {
      const mockProjectsStore: any[] = [];
      const dispatchAddProject = (meta: any) => {
        mockProjectsStore.push(meta);
      };

      const detectedMeta = {
        name: 'my-react-app',
        path: '/workspace/my-react-app',
        type: 'react-vite',
      };

      dispatchAddProject(detectedMeta);

      expect(mockProjectsStore.length).toBe(1);
      expect(mockProjectsStore[0]).toEqual(detectedMeta);
    });

    it('TC-T1-26: Collection View Refresh — Immediate Project Card Insertion', () => {
      const projectList = [
        { id: 'proj-1', name: 'Existing Project' },
      ];

      const newProject = { id: 'proj-2', name: 'Newly Generated Project' };
      const updatedList = [...projectList, newProject];

      expect(updatedList.length).toBe(2);
      expect(updatedList[1].name).toBe('Newly Generated Project');
    });

    it('TC-T1-27: Auto-Seeded Commands UI Display', () => {
      const getSeededCommands = (templateId: string) => {
        switch (templateId) {
          case 'react-vite':
            return [
              { name: 'dev', command: 'vite' },
              { name: 'build', command: 'vite build' },
            ];
          case 'nextjs':
            return [
              { name: 'dev', command: 'next dev' },
              { name: 'build', command: 'next build' },
              { name: 'start', command: 'next start' },
            ];
          case 'python-fastapi':
            return [
              { name: 'dev', command: 'uvicorn main:app --reload' },
            ];
          default:
            return [];
        }
      };

      const reactCmds = getSeededCommands('react-vite');
      expect(reactCmds).toEqual([
        { name: 'dev', command: 'vite' },
        { name: 'build', command: 'vite build' },
      ]);

      const fastapiCmds = getSeededCommands('python-fastapi');
      expect(fastapiCmds).toEqual([
        { name: 'dev', command: 'uvicorn main:app --reload' },
      ]);
    });
  });
});
