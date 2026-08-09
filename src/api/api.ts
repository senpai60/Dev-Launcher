import type {
  DetectedProjectMeta,
  Project,
  ProjectCommand,
  ProjectWithStatus,
} from "../../types/project";
import type { ProjectGroup } from "../../types/group";
import type { CommandValidationResult, SelectedFolder } from "../../types/global";

const PROJECTS_STORAGE_KEY = "dev_launcher_projects";
const GROUPS_STORAGE_KEY = "dev_launcher_groups";

/**
 * The browser fallback exists so `npm run dev` in a plain browser tab still
 * renders. It cannot touch the filesystem or spawn processes, so anything that
 * needs the OS throws a clear message rather than pretending to succeed.
 */
const NO_DESKTOP = "This action needs the desktop app.";

const isDesktop = () => Boolean(window?.api?.projectAPI);

const readLocal = <T>(key: string): T[] => {
  try {
    return JSON.parse(localStorage.getItem(key) || "[]");
  } catch {
    return [];
  }
};

const writeLocal = <T>(key: string, value: T[]) =>
  localStorage.setItem(key, JSON.stringify(value));

/** Browser-mode projects have no real folder, so they are always "missing". */
const asStatus = (p: Project): ProjectWithStatus => ({ ...p, pathExists: false });

export const useProjectAPI = () => {
  const projectApi = window?.api?.projectAPI;

  return {
    addProject: async (projectData: Partial<Project>): Promise<ProjectWithStatus> => {
      if (projectApi) return projectApi.add(projectData);

      const stored = readLocal<Project>(PROJECTS_STORAGE_KEY);
      const newProj: Project = {
        id: projectData.id || `proj_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`,
        name: projectData.name || "Untitled Project",
        path: projectData.path || "",
        description: projectData.description,
        tags: projectData.tags || [],
        commands: projectData.commands || [],
        isFavorite: projectData.isFavorite ?? false,
        groupId: projectData.groupId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      stored.push(newProj);
      writeLocal(PROJECTS_STORAGE_KEY, stored);
      return asStatus(newProj);
    },

    updateProject: async (id: string, data: Partial<Project>): Promise<ProjectWithStatus> => {
      if (projectApi) return projectApi.update(id, data);

      const stored = readLocal<Project>(PROJECTS_STORAGE_KEY);
      const updated = stored.map((p) =>
        p.id === id ? { ...p, ...data, updatedAt: Date.now() } : p,
      );
      writeLocal(PROJECTS_STORAGE_KEY, updated);
      const found = updated.find((p) => p.id === id);
      if (!found) throw new Error("Project not found.");
      return asStatus(found);
    },

    deleteProject: async (id: string) => {
      if (projectApi) return projectApi.delete(id);

      const stored = readLocal<Project>(PROJECTS_STORAGE_KEY);
      writeLocal(
        PROJECTS_STORAGE_KEY,
        stored.filter((p) => p.id !== id),
      );
      return true;
    },

    getAllProjects: async (): Promise<ProjectWithStatus[]> => {
      if (projectApi) return projectApi.getAll();
      return readLocal<Project>(PROJECTS_STORAGE_KEY).map(asStatus);
    },

    getProject: async (id: string): Promise<ProjectWithStatus | undefined> => {
      if (projectApi) return projectApi.get(id);
      const found = readLocal<Project>(PROJECTS_STORAGE_KEY).find((p) => p.id === id);
      return found ? asStatus(found) : undefined;
    },

    detectProject: async (folderPath: string): Promise<DetectedProjectMeta> => {
      if (projectApi) return projectApi.detect(folderPath);

      // Without filesystem access there is nothing to detect; return an empty
      // result rather than inventing a stack the project may not have.
      const name = folderPath.split(/[/\\]/).filter(Boolean).pop() || "New Project";
      return {
        name,
        tags: [],
        commands: [],
        details: {
          languages: [],
          frameworks: [],
          hasGit: false,
          hasDocker: false,
        },
      };
    },

    /* ------------------------------------------------------------------ */
    /*  Phase 5 — commands                                                 */
    /* ------------------------------------------------------------------ */

    seedCommands: async (
      projectId: string,
      commands: ProjectCommand[],
    ): Promise<ProjectWithStatus> => {
      if (projectApi) return projectApi.seedCommands(projectId, commands);
      throw new Error(NO_DESKTOP);
    },

    addCommand: async (projectId: string, command: Partial<ProjectCommand>) => {
      if (projectApi) return projectApi.addCommand(projectId, command);
      throw new Error(NO_DESKTOP);
    },

    updateCommand: async (
      projectId: string,
      commandId: string,
      updates: Partial<ProjectCommand>,
    ) => {
      if (projectApi) return projectApi.updateCommand(projectId, commandId, updates);
      throw new Error(NO_DESKTOP);
    },

    deleteCommand: async (projectId: string, commandId: string): Promise<ProjectWithStatus> => {
      if (projectApi) return projectApi.deleteCommand(projectId, commandId);
      throw new Error(NO_DESKTOP);
    },

    runCommand: async (
      projectId: string,
      commandId: string,
      confirmedDestructive = false,
    ): Promise<ProjectWithStatus> => {
      if (projectApi) return projectApi.runCommand(projectId, commandId, confirmedDestructive);
      throw new Error(NO_DESKTOP);
    },

    inspectCommand: async (
      projectId: string,
      commandId: string,
    ): Promise<CommandValidationResult> => {
      if (projectApi) return projectApi.inspectCommand(projectId, commandId);
      return { valid: true, errors: [], requiresConfirmation: false };
    },

    validateCommand: async (
      draft: Partial<ProjectCommand>,
      projectPath?: string,
    ): Promise<CommandValidationResult> => {
      if (projectApi) return projectApi.validateCommand(draft, projectPath);

      const errors: string[] = [];
      if (!draft.name?.trim()) errors.push("Command name is required.");
      if (!draft.command?.trim()) errors.push("Command string is required.");
      return { valid: errors.length === 0, errors, requiresConfirmation: false };
    },

    launchProject: async (
      id: string,
      action: string,
      newWindow = false,
    ): Promise<ProjectWithStatus> => {
      if (projectApi) return projectApi.launch(id, action, newWindow);
      throw new Error(NO_DESKTOP);
    },
  };
};

export const useSystemAPI = () => {
  const systemApi = window?.api?.systemAPI;

  return {
    isDesktop,

    /** Opens the OS directory picker. Resolves to null when cancelled. */
    selectFolder: async (defaultPath?: string): Promise<SelectedFolder | null> => {
      if (systemApi) return systemApi.selectFolder(defaultPath);
      throw new Error(NO_DESKTOP);
    },

    pathExists: async (target: string): Promise<boolean> => {
      if (systemApi) return systemApi.pathExists(target);
      return false;
    },

    openExternal: async (url: string) => {
      if (systemApi) return systemApi.openExternal(url);
      window.open(url, "_blank", "noopener,noreferrer");
      return true;
    },
  };
};

export const useGroupAPI = () => {
  const groupApi = window?.api?.groupAPI;

  return {
    getAllGroups: async (): Promise<ProjectGroup[]> => {
      if (groupApi) return groupApi.getAll();

      const stored = localStorage.getItem(GROUPS_STORAGE_KEY);
      if (!stored) {
        const defaultGroups: ProjectGroup[] = [
          { id: "group_freelance", name: "Freelance", sortOrder: 1, createdAt: Date.now(), updatedAt: Date.now() },
          { id: "group_personal", name: "Personal", sortOrder: 2, createdAt: Date.now(), updatedAt: Date.now() },
          { id: "group_experiments", name: "Experiments", sortOrder: 3, createdAt: Date.now(), updatedAt: Date.now() },
          { id: "group_learning", name: "Learning", sortOrder: 4, createdAt: Date.now(), updatedAt: Date.now() },
        ];
        writeLocal(GROUPS_STORAGE_KEY, defaultGroups);
        return defaultGroups;
      }
      return JSON.parse(stored);
    },

    addGroup: async (groupData: Partial<ProjectGroup>): Promise<ProjectGroup> => {
      if (groupApi) return groupApi.add(groupData);

      const stored = readLocal<ProjectGroup>(GROUPS_STORAGE_KEY);
      const newGroup: ProjectGroup = {
        id: groupData.id || `group_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`,
        name: groupData.name || "New Collection",
        icon: groupData.icon,
        color: groupData.color,
        sortOrder: groupData.sortOrder ?? stored.length + 1,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      stored.push(newGroup);
      writeLocal(GROUPS_STORAGE_KEY, stored);
      return newGroup;
    },

    updateGroup: async (id: string, data: Partial<ProjectGroup>) => {
      if (groupApi) return groupApi.update(id, data);

      const stored = readLocal<ProjectGroup>(GROUPS_STORAGE_KEY);
      writeLocal(
        GROUPS_STORAGE_KEY,
        stored.map((g) => (g.id === id ? { ...g, ...data, updatedAt: Date.now() } : g)),
      );
      return true;
    },

    deleteGroup: async (id: string) => {
      if (groupApi) return groupApi.delete(id);

      const stored = readLocal<ProjectGroup>(GROUPS_STORAGE_KEY);
      writeLocal(
        GROUPS_STORAGE_KEY,
        stored.filter((g) => g.id !== id),
      );
      return true;
    },
  };
};
