import { readData, writeData } from "../utils/dataOperation";
import type { Project } from "../../types/project";

export function readProjects(): Project[] {
  // Corruption is surfaced rather than swallowed -- returning [] here is what
  // used to make a bad file look like "no projects" and get overwritten.
  return readData<Project>("projects");
}

export function writeProjects(projects: Project[]) {
  writeData<Project>("projects", projects);
}
