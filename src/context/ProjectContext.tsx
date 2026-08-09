import React, { createContext, useContext, useState } from "react";
import { useProjectAPI } from "../api/api";
import { Project } from "../../types/project";

const ProjectContext = createContext<ProjectContextValue | null>(null);

type ProjectContextValue = {
  project: Project | null;
  allProjects: Project[] | null;
  createProject: (projectData: Partial<Project>) => Promise<Project>;
  deleteProjectItem: (id: string) => Promise<void>;
  editProject: (id: string, data: Partial<Project>) => Promise<void>;
  loadAllProjects: () => Promise<void>;
  loadProject: (id: string) => Promise<void>;
  openProject: (id: string, action: string) => Promise<void>;
};

export const ProjectContextProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [project, setProject] = useState<Project | null>(null);
  const [allProjects, setAllProjects] = useState<Array<Project> | null>(null);

  const {
    addProject,
    updateProject,
    deleteProject,
    getAllProjects,
    getProject,
    launchProject,
  } = useProjectAPI();

  const createProject = async (projectData: Partial<Project>): Promise<Project> => {
    const created = await addProject(projectData);
    setAllProjects((prev) => (prev ? [...prev, created] : [created]));
    return created;
  };

  const deleteProjectItem = async (id: string) => {
    await deleteProject(id);
    setAllProjects((prev) => prev?.filter((p) => p.id !== id) || null);
  };

  const editProject = async (id: string, data: Partial<Project>) => {
    await updateProject(id, data);
    setAllProjects(
      (prev) => prev?.map((p) => (p.id === id ? { ...p, ...data } : p)) || null,
    );
  };

  const loadAllProjects = async () => {
    const projects = await getAllProjects();
    setAllProjects(projects);
  };

  const loadProject = async (id: string) => {
    const projectItem = await getProject(id);
    setProject(projectItem);
  };

  const openProject = async (id: string, action: string) => {
    await launchProject(id, action);
    const now = Date.now();
    await updateProject(id, { lastOpenedAt: now });
    setAllProjects((prev) =>
      prev
        ? prev.map((p) => (p.id === id ? { ...p, lastOpenedAt: now } : p))
        : null
    );
  };

  const value: ProjectContextValue = {
    allProjects,
    project,
    createProject,
    deleteProjectItem,
    editProject,
    loadAllProjects,
    loadProject,
    openProject,
  };

  return (
    <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>
  );
};

export const useProjectContext = () => useContext(ProjectContext);
