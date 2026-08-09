export const useProjectAPI = () => {
  const projectApi = window.api.projectAPI;

  return {
    addProject: async (project: Project) => {
      const res = await projectApi.add(project);
      return res;
    },

    updateProject: async (id: string, data: Partial<Project>) => {
      const res = await projectApi.update(id, data);
      return res;
    },
    deleteProject: async (id: string) => {
      const res = await projectApi.delete(id);
      return res;
    },
    getAllProjects: async () => {
      const res = await projectApi.getAll();
      return res;
    },
    getProject: async (id: string) => {
      const res = await projectApi.get(id);
      return res;
    },
  };
};
