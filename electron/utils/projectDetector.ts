import fs from "fs";
import path from "path";
import { createHash } from "node:crypto";
import type { DetectedProjectMeta, ProjectCommand } from "../../types/project";

export type { DetectedProjectMeta };

/**
 * Derives a command id from its content instead of the clock.
 *
 * Detection runs every time a project's detail view opens; timestamp-based ids
 * would produce a different id each run, which breaks edit and delete as soon
 * as those act on a detected command.
 */
/**
 * Best-effort starting command for projects without a package.json.
 * Returns null rather than inventing an `npm start` for a Rust crate.
 */
function fallbackCommand(
  folderPath: string,
): { name: string; command: string; description: string } | null {
  const has = (relative: string) => fs.existsSync(path.join(folderPath, relative));

  if (has("Cargo.toml")) {
    return { name: "Run", command: "cargo run", description: "Build and run the crate" };
  }
  if (has("go.mod")) {
    return { name: "Run", command: "go run .", description: "Build and run the module" };
  }
  if (has("manage.py")) {
    return {
      name: "Start Dev Server",
      command: "python manage.py runserver",
      description: "Start the Django development server",
    };
  }
  if (has("requirements.txt") || has("pyproject.toml") || has("Pipfile")) {
    return { name: "Run", command: "python main.py", description: "Run the entry point" };
  }
  if (has("pom.xml")) {
    return { name: "Run", command: "mvn spring-boot:run", description: "Run via Maven" };
  }
  if (has("build.gradle") || has("build.gradle.kts")) {
    return { name: "Run", command: "gradle run", description: "Run via Gradle" };
  }
  if (has("docker-compose.yml") || has("docker-compose.yaml") || has("compose.yml")) {
    return {
      name: "Compose Up",
      command: "docker compose up",
      description: "Start the Compose stack",
    };
  }
  if (has("Makefile")) {
    return { name: "Make", command: "make", description: "Run the default make target" };
  }

  return null;
}

function stableCommandId(folderPath: string, name: string, command: string): string {
  const digest = createHash("sha1")
    .update(`${path.resolve(folderPath)}::${name}::${command}`)
    .digest("hex")
    .slice(0, 12);
  return `cmd_${digest}`;
}

export function detectProjectMeta(folderPath: string): DetectedProjectMeta {
  const folderName = path.basename(folderPath) || "New Project";
  const tagsSet = new Set<string>();
  const languages: string[] = [];
  const frameworks: string[] = [];
  const commands: ProjectCommand[] = [];
  let packageManager: string | undefined = undefined;
  let description: string | undefined = undefined;

  if (!folderPath || !fs.existsSync(folderPath)) {
    return {
      name: folderName,
      tags: [],
      commands: [],
      details: {
        languages: [],
        frameworks: [],
        hasGit: false,
        hasDocker: false,
      },
    };
  }

  // Helper check for file/folder existence
  const exists = (relativePath: string) => fs.existsSync(path.join(folderPath, relativePath));

  // 1. Detect Git
  const hasGit = exists(".git");
  if (hasGit) tagsSet.add("Git");

  // 2. Detect Docker
  const hasDocker = exists("Dockerfile") || exists("docker-compose.yml") || exists("docker-compose.yaml");
  if (hasDocker) tagsSet.add("Docker");

  // 3. Detect Package Managers & Node.js ecosystem
  let pmPrefix = "npm run";
  if (exists("pnpm-lock.yaml")) {
    packageManager = "pnpm";
    pmPrefix = "pnpm";
    tagsSet.add("pnpm");
  } else if (exists("yarn.lock")) {
    packageManager = "yarn";
    pmPrefix = "yarn";
    tagsSet.add("yarn");
  } else if (exists("bun.lockb") || exists("bun.lock")) {
    packageManager = "bun";
    pmPrefix = "bun run";
    tagsSet.add("bun");
  } else if (exists("package-lock.json")) {
    packageManager = "npm";
    pmPrefix = "npm run";
    tagsSet.add("npm");
  }

  // 4. Inspect package.json if present
  const packageJsonPath = path.join(folderPath, "package.json");
  if (fs.existsSync(packageJsonPath)) {
    try {
      const content = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));
      if (content.description) {
        description = content.description;
      }
      
      const allDeps = {
        ...(content.dependencies || {}),
        ...(content.devDependencies || {}),
      };

      // Languages
      if (allDeps["typescript"] || exists("tsconfig.json")) {
        languages.push("TypeScript");
        tagsSet.add("TypeScript");
      } else {
        languages.push("JavaScript");
        tagsSet.add("JavaScript");
      }

      // Frameworks
      if (allDeps["next"]) {
        frameworks.push("Next.js");
        tagsSet.add("Next.js");
      } else if (allDeps["react"]) {
        frameworks.push("React");
        tagsSet.add("React");
      } else if (allDeps["vue"]) {
        frameworks.push("Vue");
        tagsSet.add("Vue");
      } else if (allDeps["@angular/core"]) {
        frameworks.push("Angular");
        tagsSet.add("Angular");
      } else if (allDeps["svelte"]) {
        frameworks.push("Svelte");
        tagsSet.add("Svelte");
      }

      if (allDeps["vite"] || exists("vite.config.ts") || exists("vite.config.js")) {
        frameworks.push("Vite");
        tagsSet.add("Vite");
      }

      if (allDeps["express"]) {
        frameworks.push("Express");
        tagsSet.add("Express");
      }

      if (allDeps["electron"]) {
        frameworks.push("Electron");
        tagsSet.add("Electron");
      }

      if (!packageManager) {
        packageManager = "npm";
        tagsSet.add("npm");
      }

      // Auto-detect commands from package.json scripts
      if (content.scripts && typeof content.scripts === "object") {
        const scripts = content.scripts as Record<string, string>;
        const now = Date.now();

        const addCommand = (
          name: string,
          command: string,
          description: string,
          isFavorite: boolean,
        ) => {
          commands.push({
            id: stableCommandId(folderPath, name, command),
            name,
            command,
            description,
            isFavorite,
            createdAt: now,
            updatedAt: now,
          });
        };

        // Recognised scripts get friendly names and a sensible favourite.
        const known: Array<[string, string, string, boolean]> = [
          ["dev", "Start Dev Server", "Launch local development server", true],
          ["start", "Start Application", "Start application process", !scripts.dev],
          ["build", "Build Production Bundle", "Compile production distribution assets", false],
          ["test", "Run Test Suite", "Execute test scripts", false],
          ["lint", "Lint & Format", "Run code linter", false],
          ["typecheck", "Type Check", "Run the TypeScript compiler", false],
          ["preview", "Preview Build", "Serve the production build locally", false],
        ];

        for (const [script, label, description, isFavorite] of known) {
          if (scripts[script]) {
            addCommand(label, `${pmPrefix} ${script}`, description, isFavorite);
          }
        }

        // Anything else in `scripts` is still worth surfacing -- the user knows
        // what `db:seed` does even if we do not.
        const claimed = new Set(known.map(([script]) => script));
        for (const script of Object.keys(scripts)) {
          if (claimed.has(script)) continue;
          if (script.startsWith("pre") || script.startsWith("post")) continue;
          addCommand(script, `${pmPrefix} ${script}`, `Run the "${script}" script`, false);
        }
      }
    } catch (e) {
      console.warn(`Could not parse package.json in ${folderPath}:`, e);
    }
  }

  // Non-Node projects still deserve a starting point.
  if (commands.length === 0) {
    const now = Date.now();
    const fallback = fallbackCommand(folderPath);
    if (fallback) {
      commands.push({
        id: stableCommandId(folderPath, fallback.name, fallback.command),
        ...fallback,
        isFavorite: true,
        createdAt: now,
        updatedAt: now,
      });
    }
  }

  // 5. Detect Python
  if (exists("requirements.txt") || exists("pyproject.toml") || exists("Pipfile")) {
    languages.push("Python");
    tagsSet.add("Python");
  }

  // 6. Detect Go
  if (exists("go.mod")) {
    languages.push("Go");
    tagsSet.add("Go");
  }

  // 7. Detect Rust
  if (exists("Cargo.toml")) {
    languages.push("Rust");
    tagsSet.add("Rust");
  }

  // 8. Detect Java
  if (exists("pom.xml") || exists("build.gradle")) {
    languages.push("Java");
    tagsSet.add("Java");
  }

  return {
    name: folderName,
    tags: Array.from(tagsSet),
    description,
    commands,
    details: {
      languages,
      frameworks,
      packageManager,
      hasGit,
      hasDocker,
    },
  };
}
