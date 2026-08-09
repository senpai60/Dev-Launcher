import { Project } from "../types/project.type";
import { readProjects, writeProjects } from "../storage/project.storage";

export function getProjects(): Project[] {
  return readProjects();
}

export function getProject(id: string): Project | undefined {
  const projects = readProjects();
  return projects.find((project) => project.id === id);
}

export function addProject(project: Project): Project {
  const projects = readProjects();

  projects.push(project);
  writeProjects(projects);

  return project;
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
