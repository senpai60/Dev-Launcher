export type CredentialReference = {
  id: string;
  service:
    | "github"
    | "render"
    | "vercel"
    | "ssh"
    | "custom";
  label: string;
  createdAt: number;
};

export type GitHubRepository = {
  id: string;
  projectId: string;
  owner: string;
  repository: string;
  defaultBranch: string;
  url: string;
  connectedAt: number;
};

export type EnvironmentProfile = {
  id: string;
  projectId: string;
  name: string;
  description?: string;
  envFile?: string;
  variables?: Record<string, string>;
  createdAt: number;
  updatedAt: number;
};

export type AppMetadata = {
  schemaVersion: number;
  firstRunAt: number;
  lastRunAt: number;
  lastBackupAt?: number;
  onboardingCompleted: boolean;
};
