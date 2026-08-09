import { readData, writeData } from "../utils/dataOperation";
import type { ProjectSession } from "../../types/session";

export function readSessions(): ProjectSession[] {
  return readData<ProjectSession>("sessions");
}

export function writeSessions(sessions: ProjectSession[]) {
  writeData<ProjectSession>("sessions", sessions);
}
