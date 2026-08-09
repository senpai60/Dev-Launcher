import { capture } from "../utils/capture";
import { isWindows } from "../utils/platform";
import type { KillPortResult, PortEntry, PortScanResult } from "../../types/tools";

/** Ports developers actually care about, with a label for the UI. */
const KNOWN_SERVICES: Record<number, string> = {
  80: "HTTP",
  443: "HTTPS",
  3000: "Node / Next.js",
  3001: "Node (alt)",
  4000: "Node / GraphQL",
  4200: "Angular",
  5000: "Flask / .NET",
  5173: "Vite",
  5174: "Vite (alt)",
  5432: "PostgreSQL",
  6379: "Redis",
  8000: "Django / FastAPI",
  8080: "HTTP alt / Tomcat",
  8081: "HTTP alt",
  9000: "PHP-FPM / SonarQube",
  27017: "MongoDB",
  3306: "MySQL",
  1433: "SQL Server",
  5672: "RabbitMQ",
  9200: "Elasticsearch",
  11434: "Ollama",
};

/** PIDs that must never be offered for termination. */
const PROTECTED_PIDS = new Set([0, 4]);

function classifyPort(port: number): { isDevPort: boolean; knownService?: string } {
  const knownService = KNOWN_SERVICES[port];
  const isDevPort =
    Boolean(knownService) || (port >= 3000 && port <= 9999) || (port >= 4000 && port <= 5999);
  return { isDevPort, knownService };
}

/**
 * Lists listening TCP ports and the processes holding them.
 *
 * Windows uses `netstat -ano` plus `tasklist` for names; Unix uses `lsof`.
 * Both are read-only diagnostics run through execFile with a fixed argv.
 */
export async function listPorts(): Promise<PortScanResult> {
  const warnings: string[] = [];
  const entries = isWindows
    ? await listPortsWindows(warnings)
    : await listPortsUnix(warnings);

  // One row per port: the same port can appear for IPv4 and IPv6.
  const byPort = new Map<string, PortEntry>();
  for (const entry of entries) {
    const key = `${entry.port}:${entry.pid}`;
    if (!byPort.has(key)) byPort.set(key, entry);
  }

  const deduped = [...byPort.values()].sort((a, b) => a.port - b.port);

  return { entries: deduped, scannedAt: Date.now(), warnings };
}

async function listPortsWindows(warnings: string[]): Promise<PortEntry[]> {
  const { stdout } = await capture("netstat", ["-ano", "-p", "TCP"]);
  const entries: PortEntry[] = [];

  for (const line of stdout.split(/\r?\n/)) {
    const parts = line.trim().split(/\s+/);
    // TCP  <local>  <foreign>  <state>  <pid>
    if (parts.length < 5 || parts[0].toUpperCase() !== "TCP") continue;
    if (parts[3].toUpperCase() !== "LISTENING") continue;

    const local = parts[1];
    const pid = Number(parts[4]);
    if (!Number.isFinite(pid)) continue;

    // Split host:port from the right so IPv6 ([::]:5173) parses correctly.
    const separator = local.lastIndexOf(":");
    if (separator === -1) continue;

    const port = Number(local.slice(separator + 1));
    if (!Number.isFinite(port) || port === 0) continue;

    const { isDevPort, knownService } = classifyPort(port);

    entries.push({
      port,
      pid,
      protocol: "TCP",
      address: local.slice(0, separator) || "0.0.0.0",
      state: "LISTENING",
      isDevPort,
      knownService,
      isProtected: PROTECTED_PIDS.has(pid),
    });
  }

  await attachWindowsProcessNames(entries, warnings);
  return entries;
}

async function attachWindowsProcessNames(entries: PortEntry[], warnings: string[]) {
  if (entries.length === 0) return;

  try {
    // CSV output is far easier to parse reliably than the default table.
    const { stdout } = await capture("tasklist", ["/FO", "CSV", "/NH"]);
    const names = new Map<number, string>();

    for (const line of stdout.split(/\r?\n/)) {
      // "image.exe","1234","Console","1","12,345 K"
      const fields = line.match(/"([^"]*)"/g);
      if (!fields || fields.length < 2) continue;

      const name = fields[0].replace(/"/g, "");
      const pid = Number(fields[1].replace(/"/g, ""));
      if (Number.isFinite(pid)) names.set(pid, name);
    }

    for (const entry of entries) {
      entry.processName = names.get(entry.pid);
    }
  } catch (e) {
    warnings.push(`Could not resolve process names: ${(e as Error).message}`);
  }
}

async function listPortsUnix(warnings: string[]): Promise<PortEntry[]> {
  try {
    const { stdout } = await capture("lsof", ["-nP", "-iTCP", "-sTCP:LISTEN"]);
    const entries: PortEntry[] = [];

    for (const line of stdout.split("\n").slice(1)) {
      const parts = line.trim().split(/\s+/);
      if (parts.length < 9) continue;

      const processName = parts[0];
      const pid = Number(parts[1]);
      const name = parts[8];
      if (!Number.isFinite(pid)) continue;

      const separator = name.lastIndexOf(":");
      if (separator === -1) continue;

      const port = Number(name.slice(separator + 1));
      if (!Number.isFinite(port) || port === 0) continue;

      const { isDevPort, knownService } = classifyPort(port);

      entries.push({
        port,
        pid,
        protocol: "TCP",
        address: name.slice(0, separator) || "*",
        state: "LISTEN",
        processName,
        isDevPort,
        knownService,
        isProtected: PROTECTED_PIDS.has(pid),
      });
    }

    return entries;
  } catch (e) {
    warnings.push((e as Error).message);
    return [];
  }
}

/**
 * Terminates the process holding a port.
 *
 * The renderer sends a PID that must still be listed as listening -- we re-scan
 * and verify rather than trusting the value, so a stale UI cannot kill a PID
 * that has since been recycled onto an unrelated process.
 */
export async function killByPid(pid: number, expectedPort: number): Promise<KillPortResult> {
  if (!Number.isInteger(pid) || pid <= 0) {
    throw new Error("Invalid process id.");
  }
  if (PROTECTED_PIDS.has(pid)) {
    throw new Error("That is a protected system process and cannot be stopped.");
  }

  const { entries } = await listPorts();
  const match = entries.find((e) => e.pid === pid && e.port === expectedPort);

  if (!match) {
    throw new Error(
      `Nothing is listening on port ${expectedPort} with PID ${pid} any more. Refresh the list.`,
    );
  }

  const result = isWindows
    ? await capture("taskkill", ["/PID", String(pid), "/F", "/T"])
    : await capture("kill", ["-9", String(pid)]);

  if (result.code !== 0) {
    const detail = (result.stderr || result.stdout).trim();
    throw new Error(
      detail.toLowerCase().includes("access is denied") || detail.toLowerCase().includes("not permitted")
        ? `Access denied stopping PID ${pid}. It may need administrator rights.`
        : detail || `Could not stop PID ${pid}.`,
    );
  }

  return {
    pid,
    killed: true,
    message: `Stopped ${match.processName ?? `PID ${pid}`} on port ${expectedPort}.`,
  };
}
