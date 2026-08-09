import { Project } from "../../types/project";
import { ProjectGroup } from "../../types/group";
import { DetectedProjectMeta } from "../../types/global";

const PROJECTS_STORAGE_KEY = "dev_launcher_projects";
const GROUPS_STORAGE_KEY = "dev_launcher_groups";

export const useProjectAPI = () => {
  const projectApi = window?.api?.projectAPI;

  return {
    addProject: async (projectData: Partial<Project>) => {
      if (projectApi) {
        return await projectApi.add(projectData);
      } else {
        const stored: Project[] = JSON.parse(
          localStorage.getItem(PROJECTS_STORAGE_KEY) || "[]",
        );
        const newProj: Project = {
          id: projectData.id || `proj_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`,
          name: projectData.name || "Untitled Project",
          path: projectData.path || "",
          description: projectData.description,
          tags: projectData.tags || [],
          isFavorite: projectData.isFavorite ?? false,
          groupId: projectData.groupId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        stored.push(newProj);
        localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(stored));
        return newProj;
      }
    },

    updateProject: async (id: string, data: Partial<Project>) => {
      if (projectApi) {
        return await projectApi.update(id, data);
      } else {
        const stored: Project[] = JSON.parse(
          localStorage.getItem(PROJECTS_STORAGE_KEY) || "[]",
        );
        const updated = stored.map((p) =>
          p.id === id ? { ...p, ...data, updatedAt: Date.now() } : p,
        );
        localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(updated));
        return true;
      }
    },

    deleteProject: async (id: string) => {
      if (projectApi) {
        return await projectApi.delete(id);
      } else {
        const stored: Project[] = JSON.parse(
          localStorage.getItem(PROJECTS_STORAGE_KEY) || "[]",
        );
        const updated = stored.filter((p) => p.id !== id);
        localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(updated));
        return true;
      }
    },

    getAllProjects: async () => {
      if (projectApi) {
        return await projectApi.getAll();
      } else {
        return JSON.parse(localStorage.getItem(PROJECTS_STORAGE_KEY) || "[]");
      }
    },

    getProject: async (id: string) => {
      if (projectApi) {
        return await projectApi.get(id);
      } else {
        const stored: Project[] = JSON.parse(
          localStorage.getItem(PROJECTS_STORAGE_KEY) || "[]",
        );
        return stored.find((p) => p.id === id) || null;
      }
    },

    detectProject: async (folderPath: string): Promise<DetectedProjectMeta> => {
      if (projectApi && projectApi.detect) {
        return await projectApi.detect(folderPath);
      } else {
        const parts = folderPath.split(/[/\\]/);
        const name = parts[parts.length - 1] || "New Project";
        const lower = folderPath.toLowerCase();
        const tags: string[] = ["Git"];

        if (lower.includes("react")) tags.push("React");
        if (lower.includes("next")) tags.push("Next.js");
        if (lower.includes("node") || lower.includes("server") || lower.includes("api")) tags.push("Node.js");
        if (lower.includes("express")) tags.push("Express");
        if (lower.includes("vite")) tags.push("Vite");
        tags.push("TypeScript");
        tags.push("npm");

        return {
          name,
          tags: Array.from(new Set(tags)),
          commands: [
            { id: "cmd_dev", name: "Start Dev Server", command: "npm run dev", isFavorite: true, createdAt: Date.now(), updatedAt: Date.now() },
            { id: "cmd_build", name: "Build Production Bundle", command: "npm run build", isFavorite: false, createdAt: Date.now(), updatedAt: Date.now() },
          ],
          details: {
            languages: ["TypeScript", "JavaScript"],
            frameworks: ["React"],
            packageManager: "npm",
            hasGit: true,
            hasDocker: false,
          },
        };
      }
    },

    runCustomCommand: async (cmdString: string, projectPath: string) => {
      if (projectApi && projectApi.runCustomCommand) {
        return await projectApi.runCustomCommand(cmdString, projectPath);
      } else {
        console.log(`[Web Mode Mock Exec] Command: "${cmdString}" in ${projectPath}`);
        return true;
      }
    },

    launchProject: async (id: string, action: string) => {
      if (projectApi) {
        return await projectApi.launch(id, action);
      } else {
        const stored: Project[] = JSON.parse(
          localStorage.getItem(PROJECTS_STORAGE_KEY) || "[]",
        );
        const updated = stored.map((p) =>
          p.id === id ? { ...p, lastOpenedAt: Date.now() } : p
        );
        localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(updated));
        return true;
      }
    },
  };
};

export const useGroupAPI = () => {
  const groupApi = window?.api?.groupAPI;

  return {
    getAllGroups: async (): Promise<ProjectGroup[]> => {
      if (groupApi) {
        return await groupApi.getAll();
      } else {
        const stored = localStorage.getItem(GROUPS_STORAGE_KEY);
        if (!stored) {
          const defaultGroups: ProjectGroup[] = [
            { id: "group_freelance", name: "Freelance", sortOrder: 1, createdAt: Date.now(), updatedAt: Date.now() },
            { id: "group_personal", name: "Personal", sortOrder: 2, createdAt: Date.now(), updatedAt: Date.now() },
            { id: "group_experiments", name: "Experiments", sortOrder: 3, createdAt: Date.now(), updatedAt: Date.now() },
            { id: "group_learning", name: "Learning", sortOrder: 4, createdAt: Date.now(), updatedAt: Date.now() },
          ];
          localStorage.setItem(GROUPS_STORAGE_KEY, JSON.stringify(defaultGroups));
          return defaultGroups;
        }
        return JSON.parse(stored);
      }
    },

    addGroup: async (groupData: Partial<ProjectGroup>): Promise<ProjectGroup> => {
      if (groupApi) {
        return await groupApi.add(groupData);
      } else {
        const stored: ProjectGroup[] = JSON.parse(
          localStorage.getItem(GROUPS_STORAGE_KEY) || "[]"
        );
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
        localStorage.setItem(GROUPS_STORAGE_KEY, JSON.stringify(stored));
        return newGroup;
      }
    },

    updateGroup: async (id: string, data: Partial<ProjectGroup>) => {
      if (groupApi) {
        return await groupApi.update(id, data);
      } else {
        const stored: ProjectGroup[] = JSON.parse(
          localStorage.getItem(GROUPS_STORAGE_KEY) || "[]"
        );
        const updated = stored.map((g) =>
          g.id === id ? { ...g, ...data, updatedAt: Date.now() } : g
        );
        localStorage.setItem(GROUPS_STORAGE_KEY, JSON.stringify(updated));
        return true;
      }
    },

    deleteGroup: async (id: string) => {
      if (groupApi) {
        return await groupApi.delete(id);
      } else {
        const stored: ProjectGroup[] = JSON.parse(
          localStorage.getItem(GROUPS_STORAGE_KEY) || "[]"
        );
        const updated = stored.filter((g) => g.id !== id);
        localStorage.setItem(GROUPS_STORAGE_KEY, JSON.stringify(updated));
        return true;
      }
    },
  };
};
