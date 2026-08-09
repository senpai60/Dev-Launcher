import { readData, writeData } from "../utils/dataOperation";
import { ProjectGroup } from "../../types/group";

export function readGroups(): ProjectGroup[] {
  try {
    const data = readData("groups");
    if (!Array.isArray(data) || data.length === 0) {
      // Default seed groups matching documentation
      const defaultGroups: ProjectGroup[] = [
        { id: "group_freelance", name: "Freelance", sortOrder: 1, createdAt: Date.now(), updatedAt: Date.now() },
        { id: "group_personal", name: "Personal", sortOrder: 2, createdAt: Date.now(), updatedAt: Date.now() },
        { id: "group_experiments", name: "Experiments", sortOrder: 3, createdAt: Date.now(), updatedAt: Date.now() },
        { id: "group_learning", name: "Learning", sortOrder: 4, createdAt: Date.now(), updatedAt: Date.now() },
      ];
      writeData("groups", defaultGroups);
      return defaultGroups;
    }
    return data;
  } catch {
    return [];
  }
}

export function writeGroups(groups: ProjectGroup[]) {
  writeData("groups", groups);
}
