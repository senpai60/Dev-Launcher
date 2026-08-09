import { Project } from "../types/project.type";
import { readData, writeData } from "../utils/dataOperation";

export function readProjects(): Project[] {
  try {
    return readData("projects");
  } catch {
    return [];
  }
}

export function writeProjects(projects: Project[]) {
  writeData("projects", projects);
}
