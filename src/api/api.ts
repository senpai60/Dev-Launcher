import { Project } from "../../types/project";

const STORAGE_KEY = "dev_launcher_projects";

export const useProjectAPI = () => {
  const projectApi = window?.api?.projectAPI;

  return {
    addProject: async (project: Project) => {
      if (projectApi) {
        return await projectApi.add(project);
      } else {
        const stored: Project[] = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
        stored.push(project);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
        return project;
      }
    },

    updateProject: async (id: string, data: Partial<Project>) => {
      if (projectApi) {
        return await projectApi.update(id, data);
      } else {
        const stored: Project[] = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
        const updated = stored.map((p) => (p.id === id ? { ...p, ...data } : p));
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        return true;
      }
    },

    deleteProject: async (id: string) => {
      if (projectApi) {
        return await projectApi.delete(id);
      } else {
        const stored: Project[] = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
        const updated = stored.filter((p) => p.id !== id);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        return true;
      }
    },

    getAllProjects: async () => {
      if (projectApi) {
        return await projectApi.getAll();
      } else {
        return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      }
    },

    getProject: async (id: string) => {
      if (projectApi) {
        return await projectApi.get(id);
      } else {
        const stored: Project[] = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
        return stored.find((p) => p.id === id) || null;
      }
    },
  };
};
