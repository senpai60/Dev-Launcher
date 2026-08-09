import { spawn } from "child_process";
import fs from "fs";
import { promises as fsp } from "fs";
import path from "node:path";
import { addProject } from "./project.service";
import { detectProjectMeta } from "../utils/projectDetector";
import { generateId } from "../utils/idGenerator";
import { SCAFFOLD_TEMPLATES } from "../../types/generator";
import type {
  GeneratorProgress,
  GeneratorRequest,
  GeneratorResult,
  GeneratorStep,
  TemplateScaffoldDef,
} from "../../types/generator";

// ---------------------------------------------------------------------------
//  Helpers
// ---------------------------------------------------------------------------

/** Broadcast a progress event to all interested listeners. */
type ProgressCallback = (progress: GeneratorProgress) => void;

function report(
  onProgress: ProgressCallback,
  step: GeneratorStep,
  message: string,
  percentage: number,
  logLine?: string,
  done = false,
  error?: string,
): void {
  onProgress({ step, message, percentage, logLine, done, error });
}

/** Run a command and stream its output line-by-line. */
function runCommand(
  cmd: string,
  args: string[],
  cwd: string,
  onLine: (line: string) => void,
  env?: Record<string, string>,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      cwd,
      shell: process.platform === "win32",
      windowsHide: true,
      env: { ...process.env, ...env },
    });

    let stderr = "";
    const consume = (chunk: Buffer) => {
      const text = chunk.toString();
      stderr = (stderr + text).slice(-4000);
      for (const line of text.split(/\r?\n|\r/)) {
        const trimmed = line.trim();
        if (trimmed) onLine(trimmed);
      }
    };

    child.stdout?.on("data", consume);
    child.stderr?.on("data", consume);

    child.on("error", (err: NodeJS.ErrnoException) => {
      reject(
        err.code === "ENOENT"
          ? new Error(`"${cmd}" was not found on PATH.`)
          : err,
      );
    });

    child.on("close", (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      const detail = stderr.trim().split(/\r?\n/).slice(-3).join(" ");
      reject(new Error(detail || `"${cmd}" exited with code ${code}.`));
    });
  });
}

// ---------------------------------------------------------------------------
//  Template scaffolding helpers (local fallback for each template type)
// ---------------------------------------------------------------------------

async function writeFile(filePath: string, content: string): Promise<void> {
  await fsp.mkdir(path.dirname(filePath), { recursive: true });
  await fsp.writeFile(filePath, content, "utf-8");
}

/** React + Vite local scaffold (TypeScript or JavaScript). */
async function scaffoldReactVite(dir: string, name: string, variant: "ts" | "js"): Promise<void> {
  const isTs = variant === "ts";
  const ext = isTs ? "tsx" : "jsx";
  const tsxExt = isTs ? "tsx" : "jsx";

  await writeFile(
    path.join(dir, "package.json"),
    JSON.stringify(
      {
        name,
        version: "0.0.0",
        private: true,
        scripts: {
          dev: "vite",
          build: isTs ? "tsc && vite build" : "vite build",
          preview: "vite preview",
          ...(isTs ? { typecheck: "tsc --noEmit" } : {}),
        },
        dependencies: { react: "^18.2.0", "react-dom": "^18.2.0" },
        devDependencies: {
          "@vitejs/plugin-react": "^4.2.1",
          vite: "^5.2.0",
          ...(isTs
            ? {
                typescript: "^5.2.2",
                "@types/react": "^18.2.66",
                "@types/react-dom": "^18.2.22",
              }
            : {}),
        },
      },
      null,
      2,
    ),
  );

  await writeFile(
    path.join(dir, "vite.config." + (isTs ? "ts" : "js")),
    `import { defineConfig } from 'vite';\nimport react from '@vitejs/plugin-react';\n\nexport default defineConfig({\n  plugins: [react()],\n});\n`,
  );

  if (isTs) {
    await writeFile(
      path.join(dir, "tsconfig.json"),
      JSON.stringify(
        {
          compilerOptions: {
            target: "ES2020",
            useDefineForClassFields: true,
            lib: ["ES2020", "DOM", "DOM.Iterable"],
            module: "ESNext",
            skipLibCheck: true,
            moduleResolution: "bundler",
            allowImportingTsExtensions: true,
            resolveJsonModule: true,
            isolatedModules: true,
            noEmit: true,
            jsx: "react-jsx",
            strict: true,
          },
          include: ["src"],
        },
        null,
        2,
      ),
    );
  }

  await writeFile(path.join(dir, "index.html"), `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${name}</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.${tsxExt}"></script>
  </body>
</html>
`);

  await writeFile(
    path.join(dir, `src/main.${tsxExt}`),
    `import React from 'react';\nimport ReactDOM from 'react-dom/client';\nimport App from './App.${ext}';\n\nReactDOM.createRoot(document.getElementById('root')${isTs ? "!" : ""}).render(\n  <React.StrictMode>\n    <App />\n  </React.StrictMode>\n);\n`,
  );

  await writeFile(
    path.join(dir, `src/App.${ext}`),
    `import React from 'react';\n\nfunction App()${isTs ? ": JSX.Element" : ""} {\n  return (\n    <div>\n      <h1>${name}</h1>\n      <p>Built with React + Vite${isTs ? " + TypeScript" : ""}</p>\n    </div>\n  );\n}\n\nexport default App;\n`,
  );
}

/** Next.js App Router local scaffold. */
async function scaffoldNextjs(dir: string, name: string, variant: "ts" | "js"): Promise<void> {
  const isTs = variant === "ts";

  await writeFile(
    path.join(dir, "package.json"),
    JSON.stringify(
      {
        name,
        version: "0.1.0",
        private: true,
        scripts: {
          dev: "next dev",
          build: "next build",
          start: "next start",
          lint: "next lint",
        },
        dependencies: {
          next: "14.2.3",
          react: "^18",
          "react-dom": "^18",
        },
        devDependencies: {
          ...(isTs
            ? {
                typescript: "^5",
                "@types/node": "^20",
                "@types/react": "^18",
                "@types/react-dom": "^18",
              }
            : {}),
          eslint: "^8",
          "eslint-config-next": "14.2.3",
        },
      },
      null,
      2,
    ),
  );

  await writeFile(
    path.join(dir, `next.config.${isTs ? "ts" : "js"}`),
    `/** @type {import('next').NextConfig} */\nconst nextConfig = {};\n\nexport default nextConfig;\n`,
  );

  if (isTs) {
    await writeFile(
      path.join(dir, "tsconfig.json"),
      JSON.stringify(
        {
          compilerOptions: {
            lib: ["dom", "dom.iterable", "esnext"],
            allowJs: true,
            skipLibCheck: true,
            strict: true,
            noEmit: true,
            esModuleInterop: true,
            module: "esnext",
            moduleResolution: "bundler",
            resolveJsonModule: true,
            isolatedModules: true,
            jsx: "preserve",
            incremental: true,
            plugins: [{ name: "next" }],
            paths: { "@/*": ["./src/*"] },
          },
          include: ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
          exclude: ["node_modules"],
        },
        null,
        2,
      ),
    );
  }

  const ext = isTs ? "tsx" : "jsx";
  await writeFile(
    path.join(dir, `src/app/page.${ext}`),
    `export default function Home() {\n  return (\n    <main>\n      <h1>${name}</h1>\n      <p>Welcome to your Next.js app.</p>\n    </main>\n  );\n}\n`,
  );

  await writeFile(
    path.join(dir, `src/app/layout.${ext}`),
    `export const metadata = { title: '${name}', description: 'Generated by Dev Launcher' };\n\nexport default function RootLayout({ children }${isTs ? ": { children: React.ReactNode }" : ""}) {\n  return (\n    <html lang="en">\n      <body>{children}</body>\n    </html>\n  );\n}\n`,
  );
}

/** Express Node API local scaffold. */
async function scaffoldExpressApi(dir: string, name: string, variant: "ts" | "js"): Promise<void> {
  const isTs = variant === "ts";

  await writeFile(
    path.join(dir, "package.json"),
    JSON.stringify(
      {
        name,
        version: "1.0.0",
        private: true,
        scripts: {
          dev: isTs ? "tsx watch src/index.ts" : "nodemon src/index.js",
          start: isTs ? "node dist/index.js" : "node src/index.js",
          build: isTs ? "tsc" : undefined,
          lint: "eslint src/",
        },
        dependencies: {
          express: "^4.18.2",
          cors: "^2.8.5",
          dotenv: "^16.3.1",
        },
        devDependencies: {
          ...(isTs
            ? {
                typescript: "^5.2.2",
                tsx: "^4.7.0",
                "@types/express": "^4.17.21",
                "@types/cors": "^2.8.17",
                "@types/node": "^20.11.0",
              }
            : { nodemon: "^3.0.3" }),
        },
      },
      null,
      2,
    ),
  );

  if (isTs) {
    await writeFile(
      path.join(dir, "tsconfig.json"),
      JSON.stringify(
        {
          compilerOptions: {
            target: "ES2020",
            module: "commonjs",
            lib: ["ES2020"],
            outDir: "./dist",
            rootDir: "./src",
            strict: true,
            esModuleInterop: true,
            skipLibCheck: true,
            forceConsistentCasingInFileNames: true,
          },
          include: ["src/**/*"],
          exclude: ["node_modules", "dist"],
        },
        null,
        2,
      ),
    );
  }

  const indexFile = isTs ? "src/index.ts" : "src/index.js";
  await writeFile(
    path.join(dir, indexFile),
    `import express from 'express';\nimport cors from 'cors';\nimport dotenv from 'dotenv';\n\ndotenv.config();\n\nconst app = express();\nconst PORT = process.env.PORT || 3001;\n\napp.use(cors());\napp.use(express.json());\n\napp.get('/', (_req, res) => {\n  res.json({ message: 'Welcome to ${name} API', status: 'ok' });\n});\n\napp.get('/health', (_req, res) => {\n  res.json({ status: 'healthy', timestamp: new Date().toISOString() });\n});\n\napp.listen(PORT, () => {\n  console.log(\`Server running on http://localhost:\${PORT}\`);\n});\n`,
  );

  await writeFile(path.join(dir, ".env"), `PORT=3001\nNODE_ENV=development\n`);
  await writeFile(path.join(dir, ".env.example"), `PORT=3001\nNODE_ENV=development\n`);
}

/** Python FastAPI local scaffold. */
async function scaffoldPythonFastapi(dir: string, name: string): Promise<void> {
  const snakeName = name.replace(/[^a-z0-9]+/gi, "_").toLowerCase();

  await writeFile(
    path.join(dir, "main.py"),
    `from fastapi import FastAPI\nfrom fastapi.middleware.cors import CORSMiddleware\nimport uvicorn\n\napp = FastAPI(\n    title="${name}",\n    description="High-performance Python API built with FastAPI",\n    version="0.1.0",\n)\n\napp.add_middleware(\n    CORSMiddleware,\n    allow_origins=["*"],\n    allow_credentials=True,\n    allow_methods=["*"],\n    allow_headers=["*"],\n)\n\n@app.get("/")\nasync def root():\n    return {"message": "Welcome to ${name} API", "status": "ok"}\n\n@app.get("/health")\nasync def health():\n    return {"status": "healthy"}\n\nif __name__ == "__main__":\n    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)\n`,
  );

  await writeFile(
    path.join(dir, "requirements.txt"),
    `fastapi>=0.109.0\nuvicorn[standard]>=0.27.0\npython-dotenv>=1.0.0\n`,
  );

  await writeFile(
    path.join(dir, "pyproject.toml"),
    `[project]\nname = "${snakeName}"\nversion = "0.1.0"\ndescription = "${name} API"\n\n[tool.ruff]\nline-length = 100\n`,
  );

  await writeFile(path.join(dir, ".env"), `APP_ENV=development\n`);
  await writeFile(path.join(dir, ".env.example"), `APP_ENV=development\n`);
}

/** Electron + Vite + React local scaffold (minimal). */
async function scaffoldElectronApp(dir: string, name: string, variant: "ts" | "js"): Promise<void> {
  const isTs = variant === "ts";

  await writeFile(
    path.join(dir, "package.json"),
    JSON.stringify(
      {
        name,
        version: "0.0.0",
        main: "dist-electron/main.js",
        private: true,
        scripts: {
          dev: "vite",
          build: isTs ? "tsc && vite build" : "vite build",
          preview: "vite preview",
          "electron:dev": "concurrently \"npm run dev\" \"electron .\"",
        },
        dependencies: { electron: "^28.1.0" },
        devDependencies: {
          "@vitejs/plugin-react": "^4.2.1",
          concurrently: "^8.2.2",
          react: "^18.2.0",
          "react-dom": "^18.2.0",
          vite: "^5.2.0",
          "vite-plugin-electron": "^0.28.4",
          ...(isTs
            ? {
                typescript: "^5.2.2",
                "@types/react": "^18.2.66",
                "@types/react-dom": "^18.2.22",
                "@types/node": "^20.11.0",
              }
            : {}),
        },
      },
      null,
      2,
    ),
  );

  const ext = isTs ? "ts" : "js";
  const reactExt = isTs ? "tsx" : "jsx";

  await writeFile(
    path.join(dir, `electron/main.${ext}`),
    `import { app, BrowserWindow } from 'electron';\nimport path from 'path';\n\nfunction createWindow() {\n  const win = new BrowserWindow({\n    width: 1200,\n    height: 800,\n    webPreferences: { nodeIntegration: false, contextIsolation: true },\n  });\n\n  if (process.env.VITE_DEV_SERVER_URL) {\n    win.loadURL(process.env.VITE_DEV_SERVER_URL);\n  } else {\n    win.loadFile(path.join(__dirname, '../dist/index.html'));\n  }\n}\n\napp.whenReady().then(createWindow);\napp.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });\n`,
  );

  await writeFile(
    path.join(dir, `src/main.${reactExt}`),
    `import React from 'react';\nimport ReactDOM from 'react-dom/client';\nimport App from './App.${reactExt}';\n\nReactDOM.createRoot(document.getElementById('root')${isTs ? "!" : ""}).render(<React.StrictMode><App /></React.StrictMode>);\n`,
  );

  await writeFile(
    path.join(dir, `src/App.${reactExt}`),
    `import React from 'react';\n\nfunction App()${isTs ? ": JSX.Element" : ""} {\n  return <div><h1>${name}</h1><p>Electron + Vite + React${isTs ? " + TS" : ""}</p></div>;\n}\n\nexport default App;\n`,
  );

  await writeFile(path.join(dir, "index.html"), `<!doctype html>\n<html lang="en">\n  <head><meta charset="UTF-8" /><title>${name}</title></head>\n  <body><div id="root"></div><script type="module" src="/src/main.${reactExt}"></script></body>\n</html>\n`);
}

// ---------------------------------------------------------------------------
//  Template map: try CLI first, fall back to local scaffold
// ---------------------------------------------------------------------------

type ScaffoldFn = (dir: string, name: string, variant: "ts" | "js") => Promise<void>;

async function scaffoldWithCLIOrFallback(
  request: GeneratorRequest,
  projectDir: string,
  onLine: (line: string) => void,
): Promise<void> {
  const { templateId, name, variant } = request;

  switch (templateId) {
    case "react-vite": {
      const template = variant === "ts" ? "react-ts" : "react";
      try {
        // npm create vite@latest creates a subdir — we create in a temp name then move
        const tmpName = "__vite_tmp__";
        const tmpDir = path.join(path.dirname(projectDir), tmpName);
        await runCommand(
          "npm",
          ["create", "vite@latest", tmpName, "--", "--template", template],
          path.dirname(projectDir),
          onLine,
          { npm_config_yes: "true" },
        );
        await fsp.rename(tmpDir, projectDir);
      } catch {
        onLine("[fallback] CLI unavailable, generating local scaffold...");
        await fsp.mkdir(projectDir, { recursive: true });
        await (scaffoldReactVite as ScaffoldFn)(projectDir, name, variant);
      }
      break;
    }

    case "nextjs": {
      try {
        await runCommand(
          "npx",
          [
            "--yes",
            "create-next-app@latest",
            name,
            variant === "ts" ? "--typescript" : "--no-typescript",
            "--eslint",
            "--app",
            "--no-tailwind",
            "--src-dir",
            "--no-import-alias",
          ],
          path.dirname(projectDir),
          onLine,
        );
      } catch {
        onLine("[fallback] CLI unavailable, generating local scaffold...");
        await fsp.mkdir(projectDir, { recursive: true });
        await (scaffoldNextjs as ScaffoldFn)(projectDir, name, variant);
      }
      break;
    }

    case "express-api": {
      try {
        await fsp.mkdir(projectDir, { recursive: true });
        await runCommand("npm", ["init", "-y"], projectDir, onLine);
        await (scaffoldExpressApi as ScaffoldFn)(projectDir, name, variant);
      } catch {
        onLine("[fallback] Generating local scaffold...");
        await fsp.mkdir(projectDir, { recursive: true });
        await (scaffoldExpressApi as ScaffoldFn)(projectDir, name, variant);
      }
      break;
    }

    case "electron-app": {
      try {
        await fsp.mkdir(projectDir, { recursive: true });
        await (scaffoldElectronApp as ScaffoldFn)(projectDir, name, variant);
      } catch {
        onLine("[fallback] Generating local scaffold...");
        await fsp.mkdir(projectDir, { recursive: true });
        await (scaffoldElectronApp as ScaffoldFn)(projectDir, name, variant);
      }
      break;
    }

    case "python-fastapi": {
      try {
        await fsp.mkdir(projectDir, { recursive: true });
        await scaffoldPythonFastapi(projectDir, name);
      } catch {
        onLine("[fallback] Generating local scaffold...");
        await fsp.mkdir(projectDir, { recursive: true });
        await scaffoldPythonFastapi(projectDir, name);
      }
      break;
    }

    default:
      throw new Error(`Unknown template id: "${templateId}".`);
  }
}

// ---------------------------------------------------------------------------
//  gitignore
// ---------------------------------------------------------------------------

function getGitignore(templateId: string): string {
  const common = `# OS\n.DS_Store\nThumbs.db\n\n# Editor\n.vscode/settings.json\n.idea/\n`;
  const nodeIgnore = `\n# Dependencies\nnode_modules/\n\n# Build\ndist/\ndist-electron/\n.next/\nout/\nbuild/\n\n# Env\n.env\n.env.local\n\n# Logs\n*.log\nnpm-debug.log*\n`;
  const pythonIgnore = `\n# Python\n__pycache__/\n*.pyc\n*.pyo\nvenv/\n.venv/\n*.egg-info/\ndist/\nbuild/\n\n# Env\n.env\n.env.local\n`;

  if (templateId === "python-fastapi") return common + pythonIgnore;
  return common + nodeIgnore;
}

// ---------------------------------------------------------------------------
//  Public API
// ---------------------------------------------------------------------------

/** Returns the full template catalogue. */
export function getTemplates(): TemplateScaffoldDef[] {
  return SCAFFOLD_TEMPLATES;
}

/** Cancellation token map (jobId -> AbortController). */
const activeJobs = new Map<string, boolean>();

/** Scaffolds a project and streams progress to the callback. */
export async function generateProject(
  request: GeneratorRequest,
  onProgress: ProgressCallback,
): Promise<GeneratorResult> {
  const warnings: string[] = [];
  const jobId = generateId("gen");
  activeJobs.set(jobId, false);

  const step = (
    s: GeneratorStep,
    msg: string,
    pct: number,
    line?: string,
    done = false,
    error?: string,
  ) => report(onProgress, s, msg, pct, line, done, error);

  // ---- 1. Validate ---------------------------------------------------------
  step("validating", "Validating project configuration…", 5);

  const { name, targetPath, templateId, gitInit, installDeps } = request;

  const safeName = (name ?? "").trim();
  if (!safeName || !/^[A-Za-z0-9._-]+$/.test(safeName)) {
    throw new Error("Project name must contain only letters, numbers, dots, dashes, underscores.");
  }

  const parent = path.resolve((targetPath ?? "").trim());
  if (!parent || !fs.existsSync(parent)) {
    throw new Error("Choose a destination folder that already exists on disk.");
  }
  if (!fs.statSync(parent).isDirectory()) {
    throw new Error("The destination path must be a folder.");
  }

  const projectDir = path.join(parent, safeName);
  if (!path.resolve(projectDir).startsWith(parent + path.sep) && path.resolve(projectDir) !== parent) {
    throw new Error("Invalid project name (path escape detected).");
  }
  if (fs.existsSync(projectDir)) {
    throw new Error(`A folder named "${safeName}" already exists there.`);
  }

  step("validating", "All checks passed.", 10);

  // ---- 2. Scaffold ---------------------------------------------------------
  step("scaffolding", `Creating ${safeName} from template…`, 15);

  try {
    await scaffoldWithCLIOrFallback(request, projectDir, (line) => {
      step("scaffolding", `Scaffolding ${safeName}…`, 30, line);
    });
  } catch (e) {
    // Clean up any partial directory.
    try {
      if (fs.existsSync(projectDir)) {
        await fsp.rm(projectDir, { recursive: true, force: true, maxRetries: 2 });
      }
    } catch {
      warnings.push(`A partial folder may remain at ${projectDir}.`);
    }
    throw e;
  }

  // Write .gitignore
  try {
    const gitignorePath = path.join(projectDir, ".gitignore");
    if (!fs.existsSync(gitignorePath)) {
      await fsp.writeFile(gitignorePath, getGitignore(templateId), "utf-8");
    }
  } catch {
    warnings.push("Could not write .gitignore.");
  }

  step("scaffolding", "Scaffold complete.", 45);

  // ---- 3. Git init ---------------------------------------------------------
  if (gitInit) {
    step("git", "Initialising git repository…", 50);
    try {
      await runCommand("git", ["init"], projectDir, (line) =>
        step("git", "Initialising git…", 55, line),
      );
      step("git", "Git repository ready.", 60);
    } catch (e) {
      warnings.push(`git init failed: ${(e as Error).message}`);
      step("git", "git init skipped (git not found on PATH).", 60);
    }
  }

  // ---- 4. Dependency install -----------------------------------------------
  if (installDeps && templateId !== "python-fastapi") {
    step("dependencies", "Installing dependencies…", 65);

    const pm = request.packageManager ?? "npm";
    const packageJsonPath = path.join(projectDir, "package.json");

    if (fs.existsSync(packageJsonPath)) {
      try {
        await runCommand(pm, ["install"], projectDir, (line) =>
          step("dependencies", `Running ${pm} install…`, 75, line),
        );
        step("dependencies", "Dependencies installed.", 80);
      } catch (e) {
        warnings.push(`${pm} install failed: ${(e as Error).message}`);
        step("dependencies", `${pm} install failed — open a terminal to install manually.`, 80);
      }
    } else {
      warnings.push("No package.json found; skipping dependency install.");
    }
  }

  if (installDeps && templateId === "python-fastapi") {
    // Notify user to activate virtualenv and install manually (safer).
    step("dependencies", "For Python: activate your venv and run 'pip install -r requirements.txt'.", 80);
    warnings.push("Python deps not auto-installed. Run: pip install -r requirements.txt");
  }

  // ---- 5. Index into Dev Launcher -----------------------------------------
  step("indexing", "Detecting project metadata…", 85);

  let detectedMeta;
  try {
    detectedMeta = detectProjectMeta(projectDir);
  } catch (e) {
    warnings.push(`Metadata detection failed: ${(e as Error).message}`);
    detectedMeta = {
      name: safeName,
      tags: [] as string[],
      commands: [],
      details: { languages: [], frameworks: [], hasGit: gitInit, hasDocker: false },
    };
  }

  step("indexing", "Registering in Dev Launcher…", 90);

  const project = addProject({
    name: detectedMeta.name || safeName,
    path: projectDir,
    description: detectedMeta.description,
    tags: detectedMeta.tags,
    isFavorite: false,
    commands: detectedMeta.commands.map((c) => ({ ...c, id: c.id || generateId("cmd") })),
  });

  step("complete", `${project.name} is ready!`, 100, undefined, true);

  activeJobs.delete(jobId);

  return {
    success: true,
    projectPath: projectDir,
    projectId: project.id,
    warnings,
    project: { ...project, pathExists: true },
    detectedMeta,
  };
}
