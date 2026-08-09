import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { app } from "electron";
import { join } from "node:path";

const dataDir = (): string => {
  const dir = join(app.getPath("userData"), "DevLauncher");
  mkdirSync(dir, { recursive: true });
  return dir;
};

const dataPath = (filename: string): string => {
  return join(dataDir(), `${filename}.json`);
};

export const readData = (filename: string) => {
  try {
    const data = readFileSync(dataPath(filename), "utf8");
    return JSON.parse(data);
  } catch {
    return [];
  }
};

export const writeData = (filename: string, data: any) => {
  try {
    writeFileSync(dataPath(filename), JSON.stringify(data));
  } catch (e) {
    console.error("Error saving data:", e);
  }
};
