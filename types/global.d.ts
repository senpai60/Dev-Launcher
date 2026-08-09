import type * as ProjectTypes from './project';
import type * as GroupTypes from './group';
import type * as WorkspaceTypes from './workspace';
import type * as SettingsTypes from './settings';
import type * as HistoryTypes from './history';
import type * as RuntimeTypes from './runtime';
import type * as IntegrationTypes from './integration';

export interface DetectedProjectMeta {
  name: string;
  tags: string[];
  description?: string;
  details: {
    languages: string[];
    frameworks: string[];
    packageManager?: string;
    hasGit: boolean;
    hasDocker: boolean;
  };
}

declare global {
  type Project = ProjectTypes.Project;
  type ProjectMetadata = ProjectTypes.ProjectMetadata;
  type ProjectGroup = GroupTypes.ProjectGroup;
  type ProjectCommand = ProjectTypes.ProjectCommand;
  type ProjectUrl = ProjectTypes.ProjectUrl;
  type ProjectNote = ProjectTypes.ProjectNote;

  type Workspace = WorkspaceTypes.Workspace;
  type WorkspaceEditor = WorkspaceTypes.WorkspaceEditor;
  type WorkspaceTerminal = WorkspaceTypes.WorkspaceTerminal;
  type WorkspaceUrl = WorkspaceTypes.WorkspaceUrl;
  type WorkspaceBrowser = WorkspaceTypes.WorkspaceBrowser;

  type Settings = SettingsTypes.Settings;

  type HistoryEntry = HistoryTypes.HistoryEntry;

  type RunningProcess = RuntimeTypes.RunningProcess;
  type GitStatus = RuntimeTypes.GitStatus;
  type DockerContainer = RuntimeTypes.DockerContainer;
  type DockerPort = RuntimeTypes.DockerPort;
  type DetectedTool = RuntimeTypes.DetectedTool;

  type CredentialReference = IntegrationTypes.CredentialReference;
  type GitHubRepository = IntegrationTypes.GitHubRepository;
  type EnvironmentProfile = IntegrationTypes.EnvironmentProfile;
  type AppMetadata = IntegrationTypes.AppMetadata;

  interface Window {
    api: {
      projectAPI: {
        getAll: () => Promise<Project[]>;
        get: (id: string) => Promise<Project>;
        add: (project: Partial<Project>) => Promise<Project>;
        update: (id: string, data: Partial<Project>) => Promise<void>;
        delete: (id: string) => Promise<void>;
        detect: (folderPath: string) => Promise<DetectedProjectMeta>;
        launch: (id: string, action: string) => Promise<void>;
      };
      groupAPI: {
        getAll: () => Promise<ProjectGroup[]>;
        get: (id: string) => Promise<ProjectGroup>;
        add: (group: Partial<ProjectGroup>) => Promise<ProjectGroup>;
        update: (id: string, data: Partial<ProjectGroup>) => Promise<void>;
        delete: (id: string) => Promise<void>;
      };
    };
  }
}

export {};
