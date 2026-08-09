import React, { createContext, useContext, useState } from "react";

const ProjectContext = createContext<ProjectContextValue | null>(null);

type ProjectContextValue = {
  project: Project | null;
  setProject: React.Dispatch<React.SetStateAction<Project | null>>;
  allProjects: Project[] | null;
  setAllProjects: React.Dispatch<React.SetStateAction<Project[] | null>>;
};

export const ProjectContextProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [project, setProject] = useState<Project | null>(null);
  const [allProjects, setAllProjects] = useState<Array<Project> | null>(null);

  // hooks

  

  const value: ProjectContextValue = {
    allProjects,
    setAllProjects,
    project,
    setProject,
  };

  return (
    <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>
  );
};

export const useProjectContext = () => useContext(ProjectContext);
