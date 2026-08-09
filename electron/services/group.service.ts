import { readGroups, writeGroups } from "../storage/group.storage";
import { generateId } from "../utils/idGenerator";
import { ProjectGroup } from "../../types/group";

export function getGroups(): ProjectGroup[] {
  return readGroups();
}

export function getGroup(id: string): ProjectGroup | undefined {
  const groups = readGroups();
  return groups.find((group) => group.id === id);
}

export function addGroup(
  groupData: Omit<ProjectGroup, "id" | "createdAt" | "updatedAt"> & {
    id?: string;
    createdAt?: number;
    updatedAt?: number;
  }
): ProjectGroup {
  const groups = readGroups();

  const newGroup: ProjectGroup = {
    id: groupData.id || generateId("group"),
    name: groupData.name,
    icon: groupData.icon,
    color: groupData.color,
    sortOrder: groupData.sortOrder ?? groups.length + 1,
    createdAt: groupData.createdAt || Date.now(),
    updatedAt: groupData.updatedAt || Date.now(),
  };

  groups.push(newGroup);
  writeGroups(groups);

  return newGroup;
}

export function updateGroup(
  id: string,
  updates: Partial<ProjectGroup>
): ProjectGroup | undefined {
  const groups = readGroups();
  const index = groups.findIndex((g) => g.id === id);

  if (index === -1) {
    return undefined;
  }

  const updatedGroup = {
    ...groups[index],
    ...updates,
    updatedAt: Date.now(),
  };

  groups[index] = updatedGroup;
  writeGroups(groups);

  return updatedGroup;
}

export function deleteGroup(id: string): boolean {
  const groups = readGroups();
  const filtered = groups.filter((g) => g.id !== id);

  if (filtered.length === groups.length) {
    return false;
  }

  writeGroups(filtered);
  return true;
}
