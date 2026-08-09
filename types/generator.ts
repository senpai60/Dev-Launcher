import type { ProjectWithStatus, DetectedProjectMeta } from './project';

/**
 * Supported template identifiers for project scaffolding.
 */
export type TemplateId =
  | 'react-vite'
  | 'nextjs'
  | 'express-api'
  | 'electron-app'
  | 'python-fastapi';

/**
 * Supported programming language variants for project scaffolding.
 */
export type GeneratorVariant = 'ts' | 'js';

/**
 * Category classification for template UI grouping and filtering.
 */
export type TemplateCategory = 'frontend' | 'fullstack' | 'backend' | 'desktop';

/**
 * Sequential lifecycle steps emitted during background project generation.
 */
export type GeneratorStep =
  | 'validating'
  | 'scaffolding'
  | 'git'
  | 'dependencies'
  | 'indexing'
  | 'complete'
  | 'failed'
  | 'error';

/**
 * Definition metadata for a project scaffold template.
 */
export interface TemplateScaffoldDef {
  id: TemplateId;
  name: string;
  description: string;
  category: TemplateCategory;
  defaultVariant: GeneratorVariant;
  supportedVariants: GeneratorVariant[];
  icon: string;
  defaultPort?: number;
  tags?: string[];
  cliCommand?: string;
}

/**
 * Request payload passed to initiate project scaffolding.
 */
export interface GeneratorRequest {
  templateId: TemplateId;
  name: string;
  targetPath: string;
  variant: GeneratorVariant;
  gitInit: boolean;
  installDeps: boolean;
  openEditor: boolean;
  packageManager?: 'npm' | 'pnpm' | 'yarn' | 'bun';
}

/**
 * Progress event structure emitted during generation process execution.
 */
export interface GeneratorProgress {
  step: GeneratorStep;
  percentage: number;
  message: string;
  logLine?: string;
  done?: boolean;
  error?: string;
}

/**
 * Final execution result returned upon completion of the scaffolding task.
 */
export interface GeneratorResult {
  success: boolean;
  projectPath?: string;
  projectId?: string;
  error?: string;
  warnings?: string[];
  project?: ProjectWithStatus;
  detectedMeta?: DetectedProjectMeta;
}

/**
 * Preload IPC API bridge interface exposed on `window.api.generatorAPI`.
 */
export interface GeneratorAPI {
  getTemplates: () => Promise<TemplateScaffoldDef[]>;
  create: (request: GeneratorRequest) => Promise<GeneratorResult>;
  startGenerator: (request: GeneratorRequest) => Promise<GeneratorResult>;
  cancel: (jobId?: string) => Promise<boolean>;
  cancelGenerator: (jobId?: string) => Promise<boolean>;
  onProgress: (callback: (progress: GeneratorProgress) => void) => () => void;
}

/**
 * Constant array containing definitions for all 5 core scaffold templates.
 */
export const SCAFFOLD_TEMPLATES: TemplateScaffoldDef[] = [
  {
    id: 'react-vite',
    name: 'React + Vite',
    description: 'Fast Single Page Application powered by Vite and React',
    category: 'frontend',
    defaultVariant: 'ts',
    supportedVariants: ['ts', 'js'],
    icon: 'Zap',
    defaultPort: 5173,
    tags: ['React', 'Vite', 'Frontend', 'SPA'],
    cliCommand: 'npm create vite@latest',
  },
  {
    id: 'nextjs',
    name: 'Next.js App Router',
    description: 'Full-stack React framework with App Router, SSR, and API routes',
    category: 'fullstack',
    defaultVariant: 'ts',
    supportedVariants: ['ts', 'js'],
    icon: 'Globe',
    defaultPort: 3000,
    tags: ['Next.js', 'React', 'Fullstack', 'SSR'],
    cliCommand: 'npx create-next-app@latest',
  },
  {
    id: 'express-api',
    name: 'Express Node API',
    description: 'Lightweight RESTful API server powered by Express and Node.js',
    category: 'backend',
    defaultVariant: 'ts',
    supportedVariants: ['ts', 'js'],
    icon: 'Server',
    defaultPort: 3001,
    tags: ['Express', 'Node.js', 'Backend', 'REST'],
    cliCommand: 'npm init -y',
  },
  {
    id: 'electron-app',
    name: 'Electron App (Vite+React)',
    description: 'Cross-platform desktop application powered by Electron, Vite, and React',
    category: 'desktop',
    defaultVariant: 'ts',
    supportedVariants: ['ts', 'js'],
    icon: 'Cpu',
    defaultPort: 5173,
    tags: ['Electron', 'React', 'Desktop', 'Vite'],
    cliCommand: 'npx create-electron-app',
  },
  {
    id: 'python-fastapi',
    name: 'Python FastAPI',
    description: 'High-performance Python asynchronous REST API with automatic OpenAPI docs',
    category: 'backend',
    defaultVariant: 'ts',
    supportedVariants: ['ts', 'js'],
    icon: 'Terminal',
    defaultPort: 8000,
    tags: ['Python', 'FastAPI', 'Backend', 'REST'],
    cliCommand: 'python -m venv venv',
  },
];
