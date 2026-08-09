import fs from "fs";
import path from "path";

export interface DetectedProjectMeta {
  name: string;
  tags: string[];
  description?: string;
  details: {
    languages: string[];
    frameworks: string[];
    packageManager?: string;
    hasGit: boolean;
    hasDocker: boolean;
  };
}

export function detectProjectMeta(folderPath: string): DetectedProjectMeta {
  const folderName = path.basename(folderPath) || "New Project";
  const tagsSet = new Set<string>();
  const languages: string[] = [];
  const frameworks: string[] = [];
  let packageManager: string | undefined = undefined;
  let description: string | undefined = undefined;

  if (!folderPath || !fs.existsSync(folderPath)) {
    return {
      name: folderName,
      tags: [],
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
  if (exists("pnpm-lock.yaml")) {
    packageManager = "pnpm";
    tagsSet.add("pnpm");
  } else if (exists("yarn.lock")) {
    packageManager = "yarn";
    tagsSet.add("yarn");
  } else if (exists("bun.lockb") || exists("bun.lock")) {
    packageManager = "bun";
    tagsSet.add("bun");
  } else if (exists("package-lock.json")) {
    packageManager = "npm";
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
    } catch (e) {
      // Ignore JSON parse errors
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
    details: {
      languages,
      frameworks,
      packageManager,
      hasGit,
      hasDocker,
    },
  };
}
