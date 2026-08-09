import {
  readFileSync,
  writeFileSync,
  renameSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  unlinkSync,
} from "fs";
import { app } from "electron";
import { join } from "node:path";

/**
 * Current on-disk schema version. Bump this whenever the shape of a stored
 * collection changes, and add a matching step to `migrate()`.
 */
export const SCHEMA_VERSION = 1;

type Envelope<T> = {
  version: number;
  data: T[];
};

const dataDir = (): string => {
  const dir = join(app.getPath("userData"), "DevLauncher");
  mkdirSync(dir, { recursive: true });
  return dir;
};

const dataPath = (filename: string): string => join(dataDir(), `${filename}.json`);

/**
 * Moves an unreadable file aside so the user can recover it manually instead of
 * having it silently overwritten by the next write.
 */
const quarantine = (filename: string) => {
  const source = dataPath(filename);
  if (!existsSync(source)) return null;

  const backup = join(dataDir(), `${filename}.corrupt-${Date.now()}.json`);
  try {
    copyFileSync(source, backup);
    return backup;
  } catch (e) {
    console.error(`Could not quarantine ${filename}.json:`, e);
    return null;
  }
};

/**
 * Brings a parsed payload up to SCHEMA_VERSION.
 *
 * v0 -> v1: the original format was a bare JSON array with no version marker.
 */
const migrate = <T>(parsed: unknown, filename: string): T[] => {
  if (Array.isArray(parsed)) {
    console.log(`Migrating ${filename}.json from v0 (bare array) to v${SCHEMA_VERSION}`);
    return parsed as T[];
  }

  if (parsed && typeof parsed === "object" && Array.isArray((parsed as Envelope<T>).data)) {
    return (parsed as Envelope<T>).data;
  }

  throw new Error(`Unrecognised shape in ${filename}.json`);
};

export const readData = <T>(filename: string): T[] => {
  const source = dataPath(filename);

  // A missing file is the normal first-run case, not an error.
  if (!existsSync(source)) return [];

  let raw: string;
  try {
    raw = readFileSync(source, "utf8");
  } catch (e) {
    console.error(`Could not read ${filename}.json:`, e);
    throw new Error(`Unable to read ${filename} storage.`);
  }

  // An empty file is what a crash mid-write used to leave behind.
  if (raw.trim() === "") return [];

  try {
    return migrate<T>(JSON.parse(raw), filename);
  } catch (e) {
    const backup = quarantine(filename);
    console.error(
      `${filename}.json is corrupt and was backed up to ${backup ?? "(backup failed)"}:`,
      e,
    );
    throw new Error(
      `${filename}.json could not be read and was backed up. Starting from an empty list.`,
    );
  }
};

/**
 * Writes to a temp file and renames it over the target. `rename` is atomic on
 * both NTFS and POSIX filesystems, so a crash mid-write leaves the previous
 * good copy intact rather than a truncated file.
 */
export const writeData = <T>(filename: string, data: T[]) => {
  const target = dataPath(filename);
  const temp = `${target}.tmp`;

  const envelope: Envelope<T> = { version: SCHEMA_VERSION, data };

  try {
    writeFileSync(temp, JSON.stringify(envelope, null, 2), "utf8");
    renameSync(temp, target);
  } catch (e) {
    console.error(`Error saving ${filename}.json:`, e);
    try {
      if (existsSync(temp)) unlinkSync(temp);
    } catch {
      // Nothing further we can do about a stranded temp file.
    }
    throw new Error(`Unable to save ${filename}. Your changes were not written to disk.`);
  }
};
