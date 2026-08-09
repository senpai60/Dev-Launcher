import React, { createContext, useContext, useState } from "react";
import { useProjectAPI } from "../api/api";
const ProjectContext = createContext<ProjectContextValue | null>(null);

type ProjectContextValue = {
  project: Project | null;
  allProjects: Project[] | null;
  createProject: (project: Project) => Promise<void>;
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

  // hooks

  const createProject = async (project: Project) => {
    await addProject(project);
    setAllProjects((prev) => (prev ? [...prev, project] : [project]));
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
    const project = await getProject(id);
    setProject(project);
  };

  const openProject = async (id: string, action: string) => {
    await launchProject(id, action);
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
