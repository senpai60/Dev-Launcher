import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import { useProjectAPI } from "../api/api";
import { describeError, useToast } from "../components/ui/Toast/ToastContext";
import type { Project, ProjectCommand, ProjectWithStatus } from "../../types/project";
import type { CommandValidationResult } from "../../types/global";

type ProjectContextValue = {
  project: ProjectWithStatus | null;
  allProjects: ProjectWithStatus[] | null;
  isLoading: boolean;

  createProject: (projectData: Partial<Project>) => Promise<ProjectWithStatus | null>;
  deleteProjectItem: (id: string) => Promise<boolean>;
  editProject: (id: string, data: Partial<Project>) => Promise<ProjectWithStatus | null>;
  loadAllProjects: () => Promise<void>;
  loadProject: (id: string) => Promise<void>;
  openProject: (id: string, action: string) => Promise<void>;

  seedCommands: (projectId: string, commands: ProjectCommand[]) => Promise<void>;
  addCommand: (projectId: string, command: Partial<ProjectCommand>) => Promise<boolean>;
  updateCommand: (
    projectId: string,
    commandId: string,
    updates: Partial<ProjectCommand>,
  ) => Promise<boolean>;
  deleteCommand: (projectId: string, commandId: string) => Promise<void>;
  runCommand: (
    projectId: string,
    commandId: string,
    confirmedDestructive?: boolean,
  ) => Promise<void>;
  inspectCommand: (projectId: string, commandId: string) => Promise<CommandValidationResult | null>;
};

const ProjectContext = createContext<ProjectContextValue | null>(null);

/** Human-readable label for the action names the launcher accepts. */
const ACTION_LABELS: Record<string, string> = {
  vscode: "VS Code",
  cursor: "Cursor",
  antigravity: "Antigravity",
  terminal: "Terminal",
  folder: "Explorer",
  explorer: "Explorer",
};

export const ProjectContextProvider = ({ children }: { children: React.ReactNode }) => {
  const [project, setProject] = useState<ProjectWithStatus | null>(null);
  const [allProjects, setAllProjects] = useState<ProjectWithStatus[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const toast = useToast();
  const api = useProjectAPI();

  /** Replaces one project in the cached list with the copy main just returned. */
  const mergeProject = useCallback((updated: ProjectWithStatus) => {
    setAllProjects((prev) =>
      prev ? prev.map((p) => (p.id === updated.id ? updated : p)) : [updated],
    );
    setProject((prev) => (prev && prev.id === updated.id ? updated : prev));
  }, []);

  const loadAllProjects = useCallback(async () => {
    setIsLoading(true);
    try {
      setAllProjects(await api.getAllProjects());
    } catch (e) {
      toast.error("Could not load your projects", describeError(e));
      setAllProjects([]);
    } finally {
      setIsLoading(false);
    }
    // `api` and `toast` are rebuilt each render but are stable in behaviour.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadProject = useCallback(async (id: string) => {
    try {
      setProject((await api.getProject(id)) ?? null);
    } catch (e) {
      toast.error("Could not load that project", describeError(e));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const createProject = async (projectData: Partial<Project>) => {
    try {
      const created = await api.addProject(projectData);
      setAllProjects((prev) => (prev ? [...prev, created] : [created]));
      toast.success(`Added ${created.name}`);
      return created;
    } catch (e) {
      toast.error("Could not add project", describeError(e));
      return null;
    }
  };

  const deleteProjectItem = async (id: string) => {
    const name = allProjects?.find((p) => p.id === id)?.name;
    try {
      await api.deleteProject(id);
      setAllProjects((prev) => prev?.filter((p) => p.id !== id) ?? null);
      toast.success(name ? `Removed ${name}` : "Project removed", "The folder itself was not deleted.");
      return true;
    } catch (e) {
      toast.error("Could not remove project", describeError(e));
      return false;
    }
  };

  const editProject = async (id: string, data: Partial<Project>) => {
    try {
      const updated = await api.updateProject(id, data);
      mergeProject(updated);
      return updated;
    } catch (e) {
      toast.error("Could not save changes", describeError(e));
      return null;
    }
  };

  /**
   * Launches a project. Main records `lastOpenedAt` and returns the updated
   * record, so the renderer no longer issues a second write of its own.
   */
  const openProject = async (id: string, action: string) => {
    try {
      const updated = await api.launchProject(id, action);
      mergeProject(updated);
    } catch (e) {
      const label = ACTION_LABELS[action.toLowerCase()] ?? action;
      toast.error(`Couldn't open ${label}`, describeError(e));
    }
  };

  const seedCommands = async (projectId: string, commands: ProjectCommand[]) => {
    if (commands.length === 0) return;
    try {
      mergeProject(await api.seedCommands(projectId, commands));
    } catch (e) {
      // Seeding is a convenience; a failure should not interrupt the user.
      console.warn("Could not persist detected commands:", describeError(e));
    }
  };

  const addCommand = async (projectId: string, command: Partial<ProjectCommand>) => {
    try {
      const { project: updated, command: created } = await api.addCommand(projectId, command);
      mergeProject(updated);
      toast.success(`Saved "${created.name}"`);
      return true;
    } catch (e) {
      toast.error("Could not save command", describeError(e));
      return false;
    }
  };

  const updateCommand = async (
    projectId: string,
    commandId: string,
    updates: Partial<ProjectCommand>,
  ) => {
    try {
      const { project: updated } = await api.updateCommand(projectId, commandId, updates);
      mergeProject(updated);
      return true;
    } catch (e) {
      toast.error("Could not update command", describeError(e));
      return false;
    }
  };

  const deleteCommand = async (projectId: string, commandId: string) => {
    try {
      mergeProject(await api.deleteCommand(projectId, commandId));
      toast.success("Command deleted");
    } catch (e) {
      toast.error("Could not delete command", describeError(e));
    }
  };

  const runCommand = async (
    projectId: string,
    commandId: string,
    confirmedDestructive = false,
  ) => {
    const name =
      allProjects
        ?.find((p) => p.id === projectId)
        ?.commands?.find((c) => c.id === commandId)?.name ?? "Command";

    try {
      mergeProject(await api.runCommand(projectId, commandId, confirmedDestructive));
      toast.success(`Running "${name}"`, "Opened in a new terminal window.");
    } catch (e) {
      toast.error(`Couldn't run "${name}"`, describeError(e));
    }
  };

  const inspectCommand = async (projectId: string, commandId: string) => {
    try {
      return await api.inspectCommand(projectId, commandId);
    } catch (e) {
      toast.error("Could not check command", describeError(e));
      return null;
    }
  };

  const value = useMemo<ProjectContextValue>(
    () => ({
      allProjects,
      project,
      isLoading,
      createProject,
      deleteProjectItem,
      editProject,
      loadAllProjects,
      loadProject,
      openProject,
      seedCommands,
      addCommand,
      updateCommand,
      deleteCommand,
      runCommand,
      inspectCommand,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [allProjects, project, isLoading],
  );

  return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>;
};

export const useProjectContext = () => useContext(ProjectContext);
