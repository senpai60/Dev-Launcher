/**
 * IPC argument validation.
 *
 * Renderer input is never trusted (featured.md section 40). Every handler runs
 * its arguments through these guards before they reach a service.
 */

const MAX_STRING = 4096;

export function requireString(value: unknown, field: string): string {
  if (typeof value !== "string") {
    throw new Error(`${field} must be a string.`);
  }
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error(`${field} is required.`);
  }
  if (trimmed.length > MAX_STRING) {
    throw new Error(`${field} is too long.`);
  }
  if (trimmed.includes("\0")) {
    throw new Error(`${field} contains invalid characters.`);
  }
  return trimmed;
}

export function requireId(value: unknown, field: string): string {
  const id = requireString(value, field);
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(id)) {
    throw new Error(`${field} is not a valid identifier.`);
  }
  return id;
}

export function requireObject(value: unknown, field: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`${field} must be an object.`);
  }
  return value as Record<string, unknown>;
}

export function optionalBoolean(value: unknown, field: string): boolean {
  if (value === undefined || value === null) return false;
  if (typeof value !== "boolean") {
    throw new Error(`${field} must be a boolean.`);
  }
  return value;
}

/**
 * Wraps a handler so thrown errors reach the renderer as clean messages
 * instead of Electron's serialized stack traces.
 */
export function handler<Args extends unknown[], R>(
  name: string,
  fn: (...args: Args) => R | Promise<R>,
) {
  return async (_event: Electron.IpcMainInvokeEvent, ...args: Args): Promise<R> => {
    try {
      return await fn(...args);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      console.error(`IPC ${name} failed:`, message);
      throw new Error(message);
    }
  };
}
