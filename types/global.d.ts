import type * as ProjectTypes from './project';
import type * as GroupTypes from './group';
import type * as WorkspaceTypes from './workspace';
import type * as SettingsTypes from './settings';
import type * as HistoryTypes from './history';
import type * as RuntimeTypes from './runtime';
import type * as IntegrationTypes from './integration';
import type * as ToolTypes from './tools';
import type * as SessionTypes from './session';

/** Result of validating a command configuration in the main process. */
export interface CommandValidationResult {
  valid: boolean;
  errors: string[];
  requiresConfirmation: boolean;
  destructiveReason?: string;
}

export interface SelectedFolder {
  path: string;
  name: string;
}

declare global {
  type Project = ProjectTypes.Project;
  type ProjectWithStatus = ProjectTypes.ProjectWithStatus;
  type ProjectMetadata = ProjectTypes.ProjectMetadata;
  type DetectedProjectMeta = ProjectTypes.DetectedProjectMeta;
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
        getAll: () => Promise<ProjectWithStatus[]>;
        get: (id: string) => Promise<ProjectWithStatus | undefined>;
        add: (project: Partial<Project>) => Promise<ProjectWithStatus>;
        update: (id: string, data: Partial<Project>) => Promise<ProjectWithStatus>;
        delete: (id: string) => Promise<boolean>;
        detect: (folderPath: string) => Promise<DetectedProjectMeta>;

        seedCommands: (
          projectId: string,
          commands: ProjectCommand[],
        ) => Promise<ProjectWithStatus>;
        addCommand: (
          projectId: string,
          command: Partial<ProjectCommand>,
        ) => Promise<{ project: ProjectWithStatus; command: ProjectCommand }>;
        updateCommand: (
          projectId: string,
          commandId: string,
          updates: Partial<ProjectCommand>,
        ) => Promise<{ project: ProjectWithStatus; command: ProjectCommand }>;
        deleteCommand: (projectId: string, commandId: string) => Promise<ProjectWithStatus>;
        runCommand: (
          projectId: string,
          commandId: string,
          confirmedDestructive?: boolean,
        ) => Promise<ProjectWithStatus>;
        inspectCommand: (
          projectId: string,
          commandId: string,
        ) => Promise<CommandValidationResult>;
        validateCommand: (
          draft: Partial<ProjectCommand>,
          projectPath?: string,
        ) => Promise<CommandValidationResult>;

        launch: (
          id: string,
          action: string,
          newWindow?: boolean,
        ) => Promise<ProjectWithStatus>;
      };
      groupAPI: {
        getAll: () => Promise<ProjectGroup[]>;
        get: (id: string) => Promise<ProjectGroup>;
        add: (group: Partial<ProjectGroup>) => Promise<ProjectGroup>;
        update: (id: string, data: Partial<ProjectGroup>) => Promise<void>;
        delete: (id: string) => Promise<void>;
      };
      systemAPI: {
        selectFolder: (defaultPath?: string) => Promise<SelectedFolder | null>;
        pathExists: (target: string) => Promise<boolean>;
        openExternal: (url: string) => Promise<boolean>;
      };
      toolsAPI: {
        scanDisk: () => Promise<ToolTypes.DiskScanResult>;
        deleteModules: (targets: string[]) => Promise<ToolTypes.DeleteModulesResult>;
        onDiskScanProgress: (
          callback: (progress: ToolTypes.DiskScanProgress) => void,
        ) => () => void;

        listPorts: () => Promise<ToolTypes.PortScanResult>;
        killPort: (pid: number, port: number) => Promise<ToolTypes.KillPortResult>;

        auditEnv: (projectId?: string) => Promise<ToolTypes.EnvAuditResult>;

        indexScripts: () => Promise<ToolTypes.ScriptIndexResult>;
        runScript: (projectId: string, scriptName: string) => Promise<{ command: string }>;

        scanRadar: () => Promise<ToolTypes.RadarResult>;
        onRadarProgress: (
          callback: (progress: ToolTypes.RadarProgress) => void,
        ) => () => void;

        validateCloneUrl: (url: string) => Promise<{ valid: boolean; reason?: string }>;
        clone: (request: ToolTypes.CloneRequest) => Promise<ToolTypes.CloneResult>;
        onCloneProgress: (
          callback: (progress: ToolTypes.CloneProgress) => void,
        ) => () => void;
      };
      sessionAPI: {
        get: (projectId: string) => Promise<SessionTypes.ProjectSession>;
        getAll: () => Promise<SessionTypes.ProjectSession[]>;
        update: (
          projectId: string,
          updates: { steps?: SessionTypes.SessionStep[]; autoCapture?: boolean },
        ) => Promise<SessionTypes.ProjectSession>;
        clear: (projectId: string) => Promise<SessionTypes.ProjectSession>;
        resume: (projectId: string) => Promise<SessionTypes.ResumeResult>;
        onResumeProgress: (
          callback: (progress: SessionTypes.ResumeProgress) => void,
        ) => () => void;
      };
    };
  }
}

export {};
