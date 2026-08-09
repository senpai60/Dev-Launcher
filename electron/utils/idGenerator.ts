import { randomUUID } from "node:crypto";

/**
 * Utility function for backend ID generation using Node's crypto API
 * @param prefix Optional prefix e.g. "proj" -> "proj_a1b2c3d4e5f6"
 */
export function generateId(prefix: string = "id"): string {
  const uuid = randomUUID().replace(/-/g, "").slice(0, 12);
  return `${prefix}_${uuid}`;
}
