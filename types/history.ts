export type HistoryEntry = {
  id: string;
  type: "project" | "command" | "workspace" | "url";
  targetId: string;
  action: "open" | "run" | "launch";
  timestamp: number;
};
