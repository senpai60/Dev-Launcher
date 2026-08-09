import { readProjects, writeProjects } from "../storage/project.storage";
import { generateId } from "../utils/idGenerator";
import {
  openInExplorer,
  openInVsCode,
  openInCursor,
  openInAntigravity,
  openTerminal,
} from "../integrations/launcher";

export function getProjects(): Project[] {
  return readProjects();
}

export function getProject(id: string): Project | undefined {
  const projects = readProjects();
  return projects.find((project) => project.id === id);
}

export function addProject(
  projectData: Omit<Project, "id" | "createdAt" | "updatedAt"> & {
    id?: string;
    createdAt?: number;
    updatedAt?: number;
  }
): Project {
  const projects = readProjects();

  const newProject: Project = {
    ...projectData,
    id: projectData.id || generateId("proj"),
    tags: projectData.tags || [],
    isFavorite: projectData.isFavorite ?? false,
    createdAt: projectData.createdAt || Date.now(),
    updatedAt: projectData.updatedAt || Date.now(),
  };

  projects.push(newProject);
  writeProjects(projects);

  return newProject;
}

export function updateProject(
  id: string,
  updates: Partial<Project>,
): Project | undefined {
  const projects = readProjects();

  const index = projects.findIndex((project) => project.id === id);

  if (index === -1) {
    return undefined;
  }

  const updatedProject = {
    ...projects[index],
    ...updates,
    updatedAt: Date.now(),
  };

  projects[index] = updatedProject;
  writeProjects(projects);

  return updatedProject;
}

export function deleteProject(id: string): boolean {
  const projects = readProjects();

  const filteredProjects = projects.filter((project) => project.id !== id);

  if (filteredProjects.length === projects.length) {
    return false;
  }

  writeProjects(filteredProjects);

  return true;
}

export function launchProject(
  id: string,
  action: string,
  newWindow: boolean = false,
  cb: (error: Error | null, stdout: string | null) => void,
) {
  const project = getProject(id);
  if (!project) {
    if (cb) cb(new Error("Project not found"), null);
    return;
  }

  // Phase 2: Automatically update lastOpenedAt timestamp on launch
  updateProject(id, { lastOpenedAt: Date.now() });

  try {
    const projectPath = project.path;
    switch (action.toLowerCase()) {
      case "open-in-vscode":
      case "vscode":
        openInVsCode(projectPath, newWindow, cb);
        break;
      case "open-in-cursor":
      case "cursor":
        openInCursor(projectPath, cb);
        break;
      case "open-in-antigravity":
      case "antigravity":
        openInAntigravity(projectPath, cb);
        break;
      case "open-in-terminal":
      case "terminal":
        openTerminal(projectPath, cb);
        break;
      case "folder":
      case "explorer":
      default:
        openInExplorer(projectPath, cb);
        break;
    }
  } catch (error) {
    cb(error as Error, null);
  }
}
