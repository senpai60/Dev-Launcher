export type RunningProcess = {
  id: string;
  projectId?: string;
  commandId?: string;
  pid: number;
  name: string;
  command: string;
  status:
    | "starting"
    | "running"
    | "stopping"
    | "stopped"
    | "failed";
  startedAt: number;
  stoppedAt?: number;
  exitCode?: number;
};

export type GitStatus = {
  isRepository: boolean;
  branch?: string;
  isClean: boolean;
  modifiedFiles: number;
  stagedFiles: number;
  untrackedFiles: number;
  ahead: number;
  behind: number;
  lastCommit?: {
    hash: string;
    message: string;
    author: string;
    timestamp: number;
  };
};

export type DockerContainer = {
  id: string;
  name: string;
  image: string;
  status: string;
  state: "running" | "stopped" | "paused" | "unknown";
  ports: DockerPort[];
};

export type DockerPort = {
  containerPort: number;
  hostPort?: number;
  protocol: "tcp" | "udp";
};

export type DetectedTool = {
  id: string;
  name: string;
  type:
    | "editor"
    | "terminal"
    | "git"
    | "node"
    | "package-manager"
    | "docker"
    | "browser"
    | "other";
  executablePath?: string;
  version?: string;
  isAvailable: boolean;
  detectedAt: number;
};
