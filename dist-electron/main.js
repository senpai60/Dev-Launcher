import { app as B, ipcMain as f, BrowserWindow as _, dialog as ge, shell as re } from "electron";
import { fileURLToPath as Ke } from "node:url";
import p, { join as ce } from "node:path";
import h, { existsSync as de, readFileSync as Ye, writeFileSync as Ze, renameSync as Xe, unlinkSync as Qe, copyFileSync as et, mkdirSync as tt, promises as j } from "fs";
import { randomUUID as nt, createHash as ot } from "node:crypto";
import { spawn as Ae, execFile as st } from "child_process";
import W from "path";
const xe = 1, Ne = () => {
  const e = ce(B.getPath("userData"), "DevLauncher");
  return tt(e, { recursive: !0 }), e;
}, le = (e) => ce(Ne(), `${e}.json`), rt = (e) => {
  const t = le(e);
  if (!de(t)) return null;
  const n = ce(Ne(), `${e}.corrupt-${Date.now()}.json`);
  try {
    return et(t, n), n;
  } catch (o) {
    return console.error(`Could not quarantine ${e}.json:`, o), null;
  }
}, it = (e, t) => {
  if (Array.isArray(e))
    return console.log(`Migrating ${t}.json from v0 (bare array) to v${xe}`), e;
  if (e && typeof e == "object" && Array.isArray(e.data))
    return e.data;
  throw new Error(`Unrecognised shape in ${t}.json`);
}, ue = (e) => {
  const t = le(e);
  if (!de(t)) return [];
  let n;
  try {
    n = Ye(t, "utf8");
  } catch (o) {
    throw console.error(`Could not read ${e}.json:`, o), new Error(`Unable to read ${e} storage.`);
  }
  if (n.trim() === "") return [];
  try {
    return it(JSON.parse(n), e);
  } catch (o) {
    const s = rt(e);
    throw console.error(
      `${e}.json is corrupt and was backed up to ${s ?? "(backup failed)"}:`,
      o
    ), new Error(
      `${e}.json could not be read and was backed up. Starting from an empty list.`
    );
  }
}, K = (e, t) => {
  const n = le(e), o = `${n}.tmp`, s = { version: xe, data: t };
  try {
    Ze(o, JSON.stringify(s, null, 2), "utf8"), Xe(o, n);
  } catch (i) {
    console.error(`Error saving ${e}.json:`, i);
    try {
      de(o) && Qe(o);
    } catch {
    }
    throw new Error(`Unable to save ${e}. Your changes were not written to disk.`);
  }
};
function P() {
  return ue("projects");
}
function pe(e) {
  K("projects", e);
}
function T(e = "id") {
  const t = nt().replace(/-/g, "").slice(0, 12);
  return `${e}_${t}`;
}
const we = 80, ye = 2e3, at = [
  { pattern: /\brm\s+(-[a-z]*[rf][a-z]*\s+)+/i, reason: "recursively deletes files (rm -rf)" },
  { pattern: /\brmdir\s+\/s\b/i, reason: "recursively deletes a directory (rmdir /s)" },
  { pattern: /\bdel\s+\/[qsf]/i, reason: "force-deletes files (del /f)" },
  { pattern: /\bRemove-Item\b[^|]*-Recurse/i, reason: "recursively deletes files (Remove-Item -Recurse)" },
  { pattern: /\bgit\s+reset\s+--hard\b/i, reason: "discards all uncommitted changes (git reset --hard)" },
  { pattern: /\bgit\s+clean\s+-[a-z]*[fd]/i, reason: "deletes untracked files (git clean -fd)" },
  { pattern: /\bgit\s+push\b[^|]*(--force|-f)\b/i, reason: "force-pushes and can overwrite remote history" },
  { pattern: /\bgit\s+branch\s+-D\b/i, reason: "force-deletes a branch" },
  { pattern: /\bdocker\s+system\s+prune\b/i, reason: "removes Docker images, containers and volumes" },
  { pattern: /\bdocker\s+volume\s+rm\b/i, reason: "deletes a Docker volume and its data" },
  { pattern: /\bDROP\s+(TABLE|DATABASE|SCHEMA)\b/i, reason: "drops a database object" },
  { pattern: /\bTRUNCATE\s+TABLE\b/i, reason: "empties a database table" },
  { pattern: /\b(mkfs|format)\s+/i, reason: "formats a filesystem" },
  { pattern: /\bdd\s+if=/i, reason: "writes raw disk data (dd)" },
  { pattern: /\bnpm\s+unpublish\b/i, reason: "removes a published package from the registry" },
  { pattern: /\b(shutdown|reboot)\b/i, reason: "shuts down or restarts the machine" },
  { pattern: />\s*\/dev\/sd[a-z]/i, reason: "writes directly to a block device" }
];
function ct(e) {
  for (const { pattern: t, reason: n } of at)
    if (t.test(e))
      return { destructive: !0, reason: n };
  return { destructive: !1 };
}
function O(e, t) {
  const n = [], o = (e.name ?? "").trim(), s = (e.command ?? "").trim(), i = (e.workingDirectory ?? "").trim();
  if (o ? o.length > we && n.push(`Command name must be ${we} characters or fewer.`) : n.push("Command name is required."), s ? s.length > ye && n.push(`Command string must be ${ye} characters or fewer.`) : n.push("Command string is required."), /[\r\n]/.test(s) && n.push("Command string cannot span multiple lines."), (/\0/.test(s) || /\0/.test(o)) && n.push("Command contains invalid characters."), i) {
    if (p.isAbsolute(i))
      n.push("Working directory must be relative to the project folder.");
    else if (i.split(/[/\\]/).includes(".."))
      n.push("Working directory cannot escape the project folder.");
    else if (t) {
      const c = p.resolve(t, i);
      c.startsWith(p.resolve(t)) ? h.existsSync(c) || n.push(`Working directory "${i}" does not exist.`) : n.push("Working directory cannot escape the project folder.");
    }
  }
  const { destructive: r, reason: a } = ct(s);
  return {
    valid: n.length === 0,
    errors: n,
    requiresConfirmation: r,
    destructiveReason: a
  };
}
function De(e, t) {
  const n = p.resolve(e);
  if (!t || !t.trim()) return n;
  const o = p.resolve(n, t.trim());
  if (!o.startsWith(n))
    throw new Error("Working directory escapes the project folder.");
  if (!h.existsSync(o))
    throw new Error(`Working directory "${t}" does not exist.`);
  return o;
}
const G = process.platform === "win32", $e = process.platform === "darwin";
function dt(e) {
  return G ? { command: "explorer.exe", args: [e], detached: !0 } : $e ? { command: "open", args: [e], detached: !0 } : { command: "xdg-open", args: [e], detached: !0 };
}
function Pe(e, t) {
  return G ? {
    command: "cmd",
    args: ["/c", "start", "", ...t ? ["cmd", "/k", t] : ["cmd", "/k"]],
    detached: !0
  } : $e ? t ? { command: "osascript", args: ["-e", `tell application "Terminal" to do script "cd ${pt(e)} && ${t.replace(/"/g, '\\"')}"`], detached: !0 } : { command: "open", args: ["-a", "Terminal", e], detached: !0 } : { command: "x-terminal-emulator", args: t ? ["-e", `bash -c '${t.replace(/'/g, "'\\''")}; exec bash'`] : [], detached: !0 };
}
const F = {
  vscode: { bin: "code", label: "VS Code" },
  cursor: { bin: "cursor", label: "Cursor" },
  antigravity: { bin: "agy", label: "Antigravity" }
};
function lt(e, t) {
  const n = (s) => s.startsWith("-") ? s : `"${s}"`;
  return {
    command: "cmd.exe",
    args: ["/d", "/s", "/c", `"${[e, ...t.map(n)].join(" ")}"`],
    detached: !1,
    verbatim: !0
  };
}
function ut(e, t, n) {
  const o = F[e];
  if (!o) return null;
  const s = e === "vscode" ? [n ? "-n" : "-r", t] : [t];
  return G ? lt(`${o.bin}.cmd`, s) : { command: o.bin, args: s, detached: !1 };
}
function pt(e) {
  return e.replace(/(["\s'$`\\])/g, "\\$1");
}
function Y(e, t) {
  return new Promise((n, o) => {
    var a;
    let s;
    try {
      s = Ae(e.command, e.args, {
        cwd: t,
        shell: !1,
        detached: e.detached,
        // Detached windows own their own console. For everything else we keep
        // stderr so a failure can be explained instead of reported as a bare
        // exit code.
        stdio: e.detached ? "ignore" : ["ignore", "ignore", "pipe"],
        windowsHide: !1,
        windowsVerbatimArguments: e.verbatim ?? !1
      });
    } catch (c) {
      o(c);
      return;
    }
    let i = !1, r = "";
    if ((a = s.stderr) == null || a.on("data", (c) => {
      r = (r + c.toString()).slice(-2e3);
    }), s.on("error", (c) => {
      i || (i = !0, o(
        c.code === "ENOENT" ? new Error(`"${e.command}" was not found on your PATH.`) : c
      ));
    }), e.detached) {
      s.unref(), setTimeout(() => {
        i || (i = !0, n({ ok: !0, detached: !0 }));
      }, 100);
      return;
    }
    s.on("close", (c) => {
      if (i) return;
      if (i = !0, c === 0 || c === null) {
        n({ ok: !0, detached: !1 });
        return;
      }
      const d = r.trim().split(/\r?\n/).filter(Boolean).slice(-2).join(" ");
      o(new Error(d || `"${e.command}" exited with code ${c}.`));
    });
  });
}
function Z(e) {
  const t = p.resolve(e);
  if (!h.existsSync(t))
    throw new Error(`The folder "${t}" no longer exists.`);
  return t;
}
async function me(e, t, n = !1) {
  var i;
  const o = Z(t), s = ut(e, o, n);
  if (!s)
    throw new Error(`Unknown editor "${e}".`);
  try {
    return await Y(s, o);
  } catch (r) {
    const a = ((i = F[e]) == null ? void 0 : i.label) ?? e, c = r instanceof Error ? r.message : String(r);
    throw c.includes("was not found on your PATH") || c.includes("exited with code 9009") || /is not recognized as an internal or external command/i.test(c) || /command not found/i.test(c) ? new Error(
      `${a} was not detected. Make sure its command-line launcher is installed and on your PATH.`
    ) : new Error(`Could not open ${a}: ${c}`);
  }
}
async function Te(e) {
  const t = Z(e);
  return Y(Pe(t), t);
}
async function Re(e) {
  const t = Z(e);
  return Y(dt(t), t);
}
async function X(e, t) {
  const n = Z(t);
  return Y(Pe(n, e), n);
}
function Q() {
  return ue("sessions");
}
function Me(e) {
  K("sessions", e);
}
const mt = 800, Ie = 6e4, _e = 30;
function ft(e) {
  return {
    projectId: e,
    steps: [],
    capturedAt: Date.now(),
    autoCapture: !0
  };
}
function z(e) {
  return Q().find((t) => t.projectId === e) ?? ft(e);
}
function ht() {
  return Q();
}
function ee(e) {
  const t = Q(), n = t.findIndex((s) => s.projectId === e.projectId), o = {
    ...e,
    steps: e.steps.slice(0, _e).map((s, i) => ({ ...s, sortOrder: i }))
  };
  return n === -1 ? t.push(o) : t[n] = o, Me(t), o;
}
function ie(e, t, n, o) {
  const s = z(e);
  if (!s.autoCapture) return;
  const i = s.steps.findIndex(
    (r) => t === "editor" ? r.kind === "editor" : r.kind === t && r.target === n
  );
  if (i !== -1)
    s.steps[i] = {
      ...s.steps[i],
      target: n,
      label: o
    };
  else {
    if (s.steps.length >= _e) return;
    s.steps.push({
      id: T("step"),
      kind: t,
      target: n,
      label: o,
      delayMs: mt,
      enabled: !0,
      sortOrder: s.steps.length
    });
  }
  s.capturedAt = Date.now(), ee(s);
}
function gt(e, t) {
  const n = z(e);
  return t.autoCapture !== void 0 && (n.autoCapture = t.autoCapture), t.steps && (n.steps = t.steps.map((o, s) => ({
    id: o.id || T("step"),
    kind: o.kind,
    target: String(o.target ?? ""),
    label: String(o.label ?? "").slice(0, 120),
    delayMs: Math.min(Math.max(Number(o.delayMs) || 0, 0), Ie),
    enabled: o.enabled !== !1,
    sortOrder: s
  }))), ee(n);
}
function wt(e) {
  const t = z(e);
  return t.steps = [], t.capturedAt = Date.now(), ee(t);
}
const yt = (e) => new Promise((t) => setTimeout(t, e));
async function vt(e, t) {
  const n = P().find((r) => r.id === e);
  if (!n) throw new Error("Project not found.");
  if (!h.existsSync(n.path))
    throw new Error(`The folder "${n.path}" no longer exists.`);
  const o = z(e), s = [...o.steps].sort((r, a) => r.sortOrder - a.sortOrder);
  if (s.length === 0)
    throw new Error(
      "This project has no saved session yet. Open it and run a command, then try again."
    );
  const i = [];
  for (let r = 0; r < s.length; r += 1) {
    const a = s[r];
    if (t == null || t({
      projectId: e,
      current: r + 1,
      total: s.length,
      label: a.label,
      done: !1
    }), !a.enabled) {
      i.push({ stepId: a.id, label: a.label, kind: a.kind, status: "skipped" });
      continue;
    }
    try {
      await kt(n, a), i.push({ stepId: a.id, label: a.label, kind: a.kind, status: "ok" });
    } catch (c) {
      i.push({
        stepId: a.id,
        label: a.label,
        kind: a.kind,
        status: "failed",
        error: c instanceof Error ? c.message : String(c)
      });
    }
    a.delayMs > 0 && r < s.length - 1 && await yt(Math.min(a.delayMs, Ie));
  }
  return t == null || t({
    projectId: e,
    current: s.length,
    total: s.length,
    label: "",
    done: !0
  }), o.lastResumedAt = Date.now(), ee(o), {
    projectId: e,
    projectName: n.name,
    steps: i,
    succeeded: i.filter((r) => r.status === "ok").length,
    failed: i.filter((r) => r.status === "failed").length,
    skipped: i.filter((r) => r.status === "skipped").length
  };
}
async function kt(e, t) {
  switch (t.kind) {
    case "editor": {
      const n = F[t.target] ? t.target : "vscode";
      await me(n, e.path, !1);
      return;
    }
    case "terminal":
      await Te(e.path);
      return;
    case "folder":
      await Re(e.path);
      return;
    case "command": {
      const n = (e.commands ?? []).find((i) => i.id === t.target);
      if (!n)
        throw new Error("That command has been deleted.");
      const o = O(
        {
          name: n.name,
          command: n.command,
          workingDirectory: n.workingDirectory
        },
        e.path
      );
      if (!o.valid) throw new Error(o.errors.join(" "));
      if (o.requiresConfirmation)
        throw new Error(
          `Skipped because it ${o.destructiveReason}. Run it manually if you meant to.`
        );
      const s = De(e.path, n.workingDirectory);
      await X(n.command, s);
      return;
    }
    case "url":
      throw new Error("URL steps are not supported yet.");
    default:
      throw new Error(`Unknown step type "${t.kind}".`);
  }
}
function bt() {
  const e = new Set(P().map((o) => o.id)), t = Q(), n = t.filter((o) => e.has(o.projectId));
  n.length !== t.length && Me(n);
}
function R() {
  return P();
}
function ae(e) {
  return P().find((t) => t.id === e);
}
function Oe(e) {
  const t = P(), n = {
    ...e,
    id: e.id || T("proj"),
    tags: e.tags || [],
    commands: e.commands || [],
    isFavorite: e.isFavorite ?? !1,
    createdAt: e.createdAt || Date.now(),
    updatedAt: e.updatedAt || Date.now()
  };
  return t.push(n), pe(t), n;
}
function M(e, t) {
  const n = P(), o = n.findIndex((r) => r.id === e);
  if (o === -1) return;
  const s = { ...t };
  delete s.id, delete s.createdAt;
  const i = {
    ...n[o],
    ...s,
    updatedAt: Date.now()
  };
  return n[o] = i, pe(n), i;
}
function St(e) {
  const t = P(), n = t.filter((o) => o.id !== e);
  return n.length === t.length ? !1 : (pe(n), !0);
}
function Et(e, t) {
  const n = L(e);
  if (n.commands && n.commands.length > 0) return n;
  const o = Date.now(), s = t.map((i) => ({
    ...i,
    id: i.id || T("cmd"),
    projectId: e,
    isFavorite: i.isFavorite ?? !1,
    createdAt: i.createdAt || o,
    updatedAt: o
  }));
  return M(e, { commands: s });
}
function jt(e, t) {
  var c, d;
  const n = L(e), o = O(
    { name: t.name, command: t.command, workingDirectory: t.workingDirectory },
    n.path
  );
  if (!o.valid)
    throw new Error(o.errors.join(" "));
  const s = Date.now(), i = {
    id: T("cmd"),
    projectId: e,
    name: (t.name ?? "").trim(),
    command: (t.command ?? "").trim(),
    description: ((c = t.description) == null ? void 0 : c.trim()) || void 0,
    workingDirectory: ((d = t.workingDirectory) == null ? void 0 : d.trim()) || void 0,
    shell: t.shell,
    isFavorite: t.isFavorite ?? !1,
    createdAt: s,
    updatedAt: s
  }, r = [...n.commands ?? [], i];
  return { project: M(e, { commands: r }), command: i };
}
function Ct(e, t, n) {
  const o = L(e), s = o.commands ?? [], i = s.findIndex((l) => l.id === t);
  if (i === -1)
    throw new Error("Command not found.");
  const r = {
    ...s[i],
    ...n,
    id: s[i].id,
    projectId: e,
    createdAt: s[i].createdAt,
    updatedAt: Date.now()
  };
  if (n.name !== void 0 || n.command !== void 0 || n.workingDirectory !== void 0) {
    const l = O(
      { name: r.name, command: r.command, workingDirectory: r.workingDirectory },
      o.path
    );
    if (!l.valid)
      throw new Error(l.errors.join(" "));
  }
  const c = [...s];
  return c[i] = r, { project: M(e, { commands: c }), command: r };
}
function At(e, t) {
  const o = L(e).commands ?? [], s = o.filter((i) => i.id !== t);
  if (s.length === o.length)
    throw new Error("Command not found.");
  return M(e, { commands: s });
}
async function xt(e, t, n = !1) {
  const o = L(e), s = (o.commands ?? []).find((u) => u.id === t);
  if (!s)
    throw new Error("Command not found. It may have been deleted.");
  if (!h.existsSync(o.path))
    throw new Error(`The folder "${o.path}" no longer exists.`);
  const i = O(
    { name: s.name, command: s.command, workingDirectory: s.workingDirectory },
    o.path
  );
  if (!i.valid)
    throw new Error(i.errors.join(" "));
  if (i.requiresConfirmation && !n)
    throw new Error(
      `"${s.name}" ${i.destructiveReason}. It was not run because it has not been confirmed.`
    );
  const r = De(o.path, s.workingDirectory), a = await X(s.command, r);
  ie(e, "command", s.id, s.name);
  const c = Date.now(), d = (o.commands ?? []).map(
    (u) => u.id === t ? { ...u, lastRunAt: c } : u
  );
  return { project: M(e, { commands: d, lastCommandAt: c }), result: a };
}
const Nt = {
  "open-in-vscode": "vscode",
  vscode: "vscode",
  "open-in-cursor": "cursor",
  cursor: "cursor",
  "open-in-antigravity": "antigravity",
  antigravity: "antigravity"
};
async function Dt(e, t, n = !1) {
  var c;
  const o = L(e), s = t.toLowerCase();
  if (!h.existsSync(o.path))
    throw new Error(`The folder "${o.path}" no longer exists.`);
  let i;
  const r = Nt[s];
  return r ? (i = await me(r, o.path, n), ie(e, "editor", r, `Open in ${((c = F[r]) == null ? void 0 : c.label) ?? r}`)) : s === "terminal" || s === "open-in-terminal" ? (i = await Te(o.path), ie(e, "terminal", "", "Open terminal")) : i = await Re(o.path), { project: M(e, { lastOpenedAt: Date.now() }), result: i };
}
function L(e) {
  const t = ae(e);
  if (!t)
    throw new Error("Project not found.");
  return t;
}
function $t(e) {
  const t = (n) => h.existsSync(W.join(e, n));
  return t("Cargo.toml") ? { name: "Run", command: "cargo run", description: "Build and run the crate" } : t("go.mod") ? { name: "Run", command: "go run .", description: "Build and run the module" } : t("manage.py") ? {
    name: "Start Dev Server",
    command: "python manage.py runserver",
    description: "Start the Django development server"
  } : t("requirements.txt") || t("pyproject.toml") || t("Pipfile") ? { name: "Run", command: "python main.py", description: "Run the entry point" } : t("pom.xml") ? { name: "Run", command: "mvn spring-boot:run", description: "Run via Maven" } : t("build.gradle") || t("build.gradle.kts") ? { name: "Run", command: "gradle run", description: "Run via Gradle" } : t("docker-compose.yml") || t("docker-compose.yaml") || t("compose.yml") ? {
    name: "Compose Up",
    command: "docker compose up",
    description: "Start the Compose stack"
  } : t("Makefile") ? { name: "Make", command: "make", description: "Run the default make target" } : null;
}
function ve(e, t, n) {
  return `cmd_${ot("sha1").update(`${W.resolve(e)}::${t}::${n}`).digest("hex").slice(0, 12)}`;
}
function Fe(e) {
  const t = W.basename(e) || "New Project", n = /* @__PURE__ */ new Set(), o = [], s = [], i = [];
  let r, a;
  if (!e || !h.existsSync(e))
    return {
      name: t,
      tags: [],
      commands: [],
      details: {
        languages: [],
        frameworks: [],
        hasGit: !1,
        hasDocker: !1
      }
    };
  const c = (w) => h.existsSync(W.join(e, w)), d = c(".git");
  d && n.add("Git");
  const l = c("Dockerfile") || c("docker-compose.yml") || c("docker-compose.yaml");
  l && n.add("Docker");
  let u = "npm run";
  c("pnpm-lock.yaml") ? (r = "pnpm", u = "pnpm", n.add("pnpm")) : c("yarn.lock") ? (r = "yarn", u = "yarn", n.add("yarn")) : c("bun.lockb") || c("bun.lock") ? (r = "bun", u = "bun run", n.add("bun")) : c("package-lock.json") && (r = "npm", u = "npm run", n.add("npm"));
  const k = W.join(e, "package.json");
  if (h.existsSync(k))
    try {
      const w = JSON.parse(h.readFileSync(k, "utf-8"));
      w.description && (a = w.description);
      const m = {
        ...w.dependencies || {},
        ...w.devDependencies || {}
      };
      if (m.typescript || c("tsconfig.json") ? (o.push("TypeScript"), n.add("TypeScript")) : (o.push("JavaScript"), n.add("JavaScript")), m.next ? (s.push("Next.js"), n.add("Next.js")) : m.react ? (s.push("React"), n.add("React")) : m.vue ? (s.push("Vue"), n.add("Vue")) : m["@angular/core"] ? (s.push("Angular"), n.add("Angular")) : m.svelte && (s.push("Svelte"), n.add("Svelte")), (m.vite || c("vite.config.ts") || c("vite.config.js")) && (s.push("Vite"), n.add("Vite")), m.express && (s.push("Express"), n.add("Express")), m.electron && (s.push("Electron"), n.add("Electron")), r || (r = "npm", n.add("npm")), w.scripts && typeof w.scripts == "object") {
        const N = w.scripts, C = Date.now(), y = (b, H, te, ne) => {
          i.push({
            id: ve(e, b, H),
            name: b,
            command: H,
            description: te,
            isFavorite: ne,
            createdAt: C,
            updatedAt: C
          });
        }, E = [
          ["dev", "Start Dev Server", "Launch local development server", !0],
          ["start", "Start Application", "Start application process", !N.dev],
          ["build", "Build Production Bundle", "Compile production distribution assets", !1],
          ["test", "Run Test Suite", "Execute test scripts", !1],
          ["lint", "Lint & Format", "Run code linter", !1],
          ["typecheck", "Type Check", "Run the TypeScript compiler", !1],
          ["preview", "Preview Build", "Serve the production build locally", !1]
        ];
        for (const [b, H, te, ne] of E)
          N[b] && y(H, `${u} ${b}`, te, ne);
        const A = new Set(E.map(([b]) => b));
        for (const b of Object.keys(N))
          A.has(b) || b.startsWith("pre") || b.startsWith("post") || y(b, `${u} ${b}`, `Run the "${b}" script`, !1);
      }
    } catch (w) {
      console.warn(`Could not parse package.json in ${e}:`, w);
    }
  if (i.length === 0) {
    const w = Date.now(), m = $t(e);
    m && i.push({
      id: ve(e, m.name, m.command),
      ...m,
      isFavorite: !0,
      createdAt: w,
      updatedAt: w
    });
  }
  return (c("requirements.txt") || c("pyproject.toml") || c("Pipfile")) && (o.push("Python"), n.add("Python")), c("go.mod") && (o.push("Go"), n.add("Go")), c("Cargo.toml") && (o.push("Rust"), n.add("Rust")), (c("pom.xml") || c("build.gradle")) && (o.push("Java"), n.add("Java")), {
    name: t,
    tags: Array.from(n),
    description: a,
    commands: i,
    details: {
      languages: o,
      frameworks: s,
      packageManager: r,
      hasGit: d,
      hasDocker: l
    }
  };
}
const Pt = 4096;
function S(e, t) {
  if (typeof e != "string")
    throw new Error(`${t} must be a string.`);
  const n = e.trim();
  if (!n)
    throw new Error(`${t} is required.`);
  if (n.length > Pt)
    throw new Error(`${t} is too long.`);
  if (n.includes("\0"))
    throw new Error(`${t} contains invalid characters.`);
  return n;
}
function v(e, t) {
  const n = S(e, t);
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(n))
    throw new Error(`${t} is not a valid identifier.`);
  return n;
}
function D(e, t) {
  if (typeof e != "object" || e === null || Array.isArray(e))
    throw new Error(`${t} must be an object.`);
  return e;
}
function J(e, t) {
  if (e == null) return !1;
  if (typeof e != "boolean")
    throw new Error(`${t} must be a boolean.`);
  return e;
}
function g(e, t) {
  return async (n, ...o) => {
    try {
      return await t(...o);
    } catch (s) {
      const i = s instanceof Error ? s.message : String(s);
      throw console.error(`IPC ${e} failed:`, i), new Error(i);
    }
  };
}
function x(e) {
  return { ...e, pathExists: !!e.path && h.existsSync(e.path) };
}
function Tt() {
  f.handle(
    "projects:getAll",
    g("projects:getAll", () => R().map(x))
  ), f.handle(
    "projects:get",
    g("projects:get", (e) => {
      const t = ae(v(e, "Project id"));
      return t ? x(t) : void 0;
    })
  ), f.handle(
    "projects:add",
    g("projects:add", (e) => {
      const t = D(e, "Project"), n = S(t.name, "Project name"), o = S(t.path, "Project path");
      if (!h.existsSync(o))
        throw new Error(`The folder "${o}" does not exist.`);
      if (!h.statSync(o).isDirectory())
        throw new Error(`"${o}" is a file, not a folder.`);
      return x(
        Oe({
          ...t,
          name: n,
          path: o,
          tags: Array.isArray(t.tags) ? t.tags : [],
          isFavorite: !!t.isFavorite
        })
      );
    })
  ), f.handle(
    "projects:update",
    g("projects:update", (e, t) => {
      const n = v(e, "Project id"), o = D(t, "Updates");
      if (o.path !== void 0) {
        const i = S(o.path, "Project path");
        if (!h.existsSync(i))
          throw new Error(`The folder "${i}" does not exist.`);
      }
      o.name !== void 0 && S(o.name, "Project name");
      const s = M(n, o);
      if (!s) throw new Error("Project not found.");
      return x(s);
    })
  ), f.handle(
    "projects:delete",
    g("projects:delete", (e) => St(v(e, "Project id")))
  ), f.handle(
    "projects:detect",
    g(
      "projects:detect",
      (e) => Fe(S(e, "Folder path"))
    )
  ), f.handle(
    "projects:seedCommands",
    g("projects:seedCommands", (e, t) => {
      if (!Array.isArray(t)) throw new Error("Commands must be an array.");
      return x(
        Et(v(e, "Project id"), t)
      );
    })
  ), f.handle(
    "projects:addCommand",
    g("projects:addCommand", (e, t) => {
      const n = D(t, "Command"), { project: o, command: s } = jt(
        v(e, "Project id"),
        n
      );
      return { project: x(o), command: s };
    })
  ), f.handle(
    "projects:updateCommand",
    g("projects:updateCommand", (e, t, n) => {
      const o = D(n, "Updates"), { project: s, command: i } = Ct(
        v(e, "Project id"),
        v(t, "Command id"),
        o
      );
      return { project: x(s), command: i };
    })
  ), f.handle(
    "projects:deleteCommand",
    g(
      "projects:deleteCommand",
      (e, t) => x(
        At(
          v(e, "Project id"),
          v(t, "Command id")
        )
      )
    )
  ), f.handle(
    "projects:runCommand",
    g("projects:runCommand", async (e, t, n) => {
      const { project: o } = await xt(
        v(e, "Project id"),
        v(t, "Command id"),
        J(n, "Confirmation flag")
      );
      return x(o);
    })
  ), f.handle(
    "projects:inspectCommand",
    g("projects:inspectCommand", (e, t) => {
      const n = ae(v(e, "Project id"));
      if (!n) throw new Error("Project not found.");
      const o = (n.commands ?? []).find(
        (s) => s.id === v(t, "Command id")
      );
      if (!o) throw new Error("Command not found.");
      return O(
        {
          name: o.name,
          command: o.command,
          workingDirectory: o.workingDirectory
        },
        n.path
      );
    })
  ), f.handle(
    "projects:validateCommand",
    g("projects:validateCommand", (e, t) => {
      const n = D(e, "Command");
      return O(
        {
          name: typeof n.name == "string" ? n.name : "",
          command: typeof n.command == "string" ? n.command : "",
          workingDirectory: typeof n.workingDirectory == "string" ? n.workingDirectory : void 0
        },
        typeof t == "string" ? t : void 0
      );
    })
  ), f.handle(
    "projects:launch",
    g("projects:launch", async (e, t, n) => {
      const { project: o } = await Dt(
        v(e, "Project id"),
        S(t, "Action"),
        J(n, "New window flag")
      );
      return x(o);
    })
  );
}
function V() {
  const e = ue("groups");
  if (e.length === 0) {
    const t = [
      { id: "group_freelance", name: "Freelance", sortOrder: 1, createdAt: Date.now(), updatedAt: Date.now() },
      { id: "group_personal", name: "Personal", sortOrder: 2, createdAt: Date.now(), updatedAt: Date.now() },
      { id: "group_experiments", name: "Experiments", sortOrder: 3, createdAt: Date.now(), updatedAt: Date.now() },
      { id: "group_learning", name: "Learning", sortOrder: 4, createdAt: Date.now(), updatedAt: Date.now() }
    ];
    return K("groups", t), t;
  }
  return e;
}
function fe(e) {
  K("groups", e);
}
function Rt() {
  return V();
}
function Mt(e) {
  return V().find((n) => n.id === e);
}
function It(e) {
  const t = V(), n = {
    id: e.id || T("group"),
    name: e.name,
    icon: e.icon,
    color: e.color,
    sortOrder: e.sortOrder ?? t.length + 1,
    createdAt: e.createdAt || Date.now(),
    updatedAt: e.updatedAt || Date.now()
  };
  return t.push(n), fe(t), n;
}
function _t(e, t) {
  const n = V(), o = n.findIndex((i) => i.id === e);
  if (o === -1)
    return;
  const s = {
    ...n[o],
    ...t,
    updatedAt: Date.now()
  };
  return n[o] = s, fe(n), s;
}
function Ot(e) {
  const t = V(), n = t.filter((o) => o.id !== e);
  return n.length === t.length ? !1 : (fe(n), !0);
}
function Ft() {
  f.handle("groups:getAll", () => Rt()), f.handle("groups:get", (e, t) => Mt(t)), f.handle("groups:add", (e, t) => It(t)), f.handle("groups:update", (e, t, n) => _t(t, n)), f.handle("groups:delete", (e, t) => Ot(t));
}
function Lt() {
  f.handle(
    "dialog:selectFolder",
    g("dialog:selectFolder", async (e) => {
      const t = _.getFocusedWindow() ?? _.getAllWindows()[0], n = {
        title: "Select project folder",
        properties: ["openDirectory", "createDirectory"]
      };
      typeof e == "string" && e && h.existsSync(e) && (n.defaultPath = e);
      const o = t ? await ge.showOpenDialog(t, n) : await ge.showOpenDialog(n);
      if (o.canceled || o.filePaths.length === 0) return null;
      const s = o.filePaths[0];
      return { path: s, name: p.basename(s) };
    })
  ), f.handle(
    "dialog:pathExists",
    g("dialog:pathExists", (e) => {
      const t = S(e, "Path");
      return h.existsSync(t) && h.statSync(t).isDirectory();
    })
  ), f.handle(
    "shell:openExternal",
    g("shell:openExternal", async (e) => {
      const t = S(e, "URL");
      let n;
      try {
        n = new URL(t);
      } catch {
        throw new Error("That is not a valid URL.");
      }
      if (n.protocol !== "http:" && n.protocol !== "https:")
        throw new Error("Only http and https links can be opened.");
      return await re.openExternal(n.toString()), !0;
    })
  );
}
async function Le(e) {
  const t = { sizeBytes: 0, fileCount: 0, lastModified: 0 }, n = [e];
  for (; n.length > 0; ) {
    const o = n.pop();
    let s;
    try {
      s = await j.readdir(o, { withFileTypes: !0 });
    } catch {
      continue;
    }
    for (const i of s) {
      const r = p.join(o, i.name);
      if (i.isSymbolicLink()) {
        t.fileCount += 1;
        continue;
      }
      if (i.isDirectory()) {
        n.push(r);
        continue;
      }
      try {
        const a = await j.stat(r);
        t.sizeBytes += a.size, t.fileCount += 1, a.mtimeMs > t.lastModified && (t.lastModified = a.mtimeMs);
      } catch {
      }
    }
  }
  return t;
}
async function Ut(e, t = 3) {
  const n = [], o = [{ dir: e, depth: 0 }], s = /* @__PURE__ */ new Set([".git", ".next", "dist", "build", "out", ".cache", ".turbo"]);
  for (; o.length > 0; ) {
    const { dir: i, depth: r } = o.shift();
    let a;
    try {
      a = await j.readdir(i, { withFileTypes: !0 });
    } catch {
      continue;
    }
    for (const c of a)
      if (!(!c.isDirectory() || c.isSymbolicLink())) {
        if (c.name === "node_modules") {
          n.push(p.join(i, c.name));
          continue;
        }
        r < t && !s.has(c.name) && !c.name.startsWith(".") && o.push({ dir: p.join(i, c.name), depth: r + 1 });
      }
  }
  return n;
}
const ke = 30, be = 24 * 60 * 60 * 1e3;
async function Wt(e) {
  const t = R(), n = [], o = [];
  let s = 0, i = 0;
  for (let r = 0; r < t.length; r += 1) {
    const a = t[r];
    if (e == null || e({
      current: r + 1,
      total: t.length,
      projectName: a.name,
      done: !1
    }), !a.path || !h.existsSync(a.path)) {
      i += 1;
      continue;
    }
    let c;
    try {
      c = await Ut(a.path);
    } catch (d) {
      o.push(`Could not scan ${a.name}: ${d.message}`), i += 1;
      continue;
    }
    s += 1;
    for (const d of c) {
      const l = await Le(d), u = a.lastOpenedAt ? Math.floor((Date.now() - a.lastOpenedAt) / be) : null, k = l.lastModified ? Math.floor((Date.now() - l.lastModified) / be) : null, w = u === null ? (k ?? 0) >= ke : u >= ke, m = p.relative(a.path, d);
      n.push({
        projectId: a.id,
        projectName: a.name,
        projectPath: a.path,
        modulesPath: d,
        relativeLabel: m || "node_modules",
        sizeBytes: l.sizeBytes,
        fileCount: l.fileCount,
        lastModified: l.lastModified,
        lastOpenedAt: a.lastOpenedAt,
        daysSinceOpened: u,
        isStale: w
      });
    }
  }
  return e == null || e({
    current: t.length,
    total: t.length,
    projectName: "",
    done: !0
  }), n.sort((r, a) => a.sizeBytes - r.sizeBytes), {
    entries: n,
    totalBytes: n.reduce((r, a) => r + a.sizeBytes, 0),
    staleBytes: n.filter((r) => r.isStale).reduce((r, a) => r + a.sizeBytes, 0),
    scannedProjects: s,
    skippedProjects: i,
    warnings: o
  };
}
async function Bt(e) {
  const n = R().filter((s) => s.path).map((s) => p.resolve(s.path)), o = { deleted: [], failed: [], reclaimedBytes: 0 };
  for (const s of e) {
    const i = p.resolve(s), r = (l) => o.failed.push({ path: s, reason: l });
    if (p.basename(i) !== "node_modules") {
      r("Not a node_modules directory.");
      continue;
    }
    if (!n.find(
      (l) => i.startsWith(l + p.sep) && i !== l
    )) {
      r("Not inside a registered project folder.");
      continue;
    }
    let c;
    try {
      c = await j.lstat(i);
    } catch {
      r("Folder no longer exists.");
      continue;
    }
    if (c.isSymbolicLink()) {
      r("Refusing to follow a symlink.");
      continue;
    }
    if (!c.isDirectory()) {
      r("Not a directory.");
      continue;
    }
    const { sizeBytes: d } = await Le(i);
    try {
      await j.rm(i, { recursive: !0, force: !0, maxRetries: 3, retryDelay: 200 }), o.deleted.push(i), o.reclaimedBytes += d;
    } catch (l) {
      const u = l.code === "EBUSY" ? "Files are in use. Close your editor or dev server and try again." : l.message;
      r(u);
    }
  }
  return o;
}
function $(e, t, n = 1e4) {
  return new Promise((o, s) => {
    st(
      e,
      t,
      { timeout: n, windowsHide: !0, maxBuffer: 8 * 1024 * 1024 },
      (i, r, a) => {
        if (i) {
          const c = i;
          if (c.code === "ENOENT") {
            s(new Error(`"${e}" is not available on this system.`));
            return;
          }
          o({
            stdout: r ?? "",
            stderr: a ?? "",
            code: typeof c.code == "number" ? c.code : 1
          });
          return;
        }
        o({ stdout: r, stderr: a, code: 0 });
      }
    );
  });
}
const Gt = {
  80: "HTTP",
  443: "HTTPS",
  3e3: "Node / Next.js",
  3001: "Node (alt)",
  4e3: "Node / GraphQL",
  4200: "Angular",
  5e3: "Flask / .NET",
  5173: "Vite",
  5174: "Vite (alt)",
  5432: "PostgreSQL",
  6379: "Redis",
  8e3: "Django / FastAPI",
  8080: "HTTP alt / Tomcat",
  8081: "HTTP alt",
  9e3: "PHP-FPM / SonarQube",
  27017: "MongoDB",
  3306: "MySQL",
  1433: "SQL Server",
  5672: "RabbitMQ",
  9200: "Elasticsearch",
  11434: "Ollama"
}, he = /* @__PURE__ */ new Set([0, 4]);
function Ue(e) {
  const t = Gt[e];
  return { isDevPort: !!t || e >= 3e3 && e <= 9999 || e >= 4e3 && e <= 5999, knownService: t };
}
async function We() {
  const e = [], t = G ? await zt(e) : await Ht(e), n = /* @__PURE__ */ new Map();
  for (const s of t) {
    const i = `${s.port}:${s.pid}`;
    n.has(i) || n.set(i, s);
  }
  return { entries: [...n.values()].sort((s, i) => s.port - i.port), scannedAt: Date.now(), warnings: e };
}
async function zt(e) {
  const { stdout: t } = await $("netstat", ["-ano", "-p", "TCP"]), n = [];
  for (const o of t.split(/\r?\n/)) {
    const s = o.trim().split(/\s+/);
    if (s.length < 5 || s[0].toUpperCase() !== "TCP" || s[3].toUpperCase() !== "LISTENING") continue;
    const i = s[1], r = Number(s[4]);
    if (!Number.isFinite(r)) continue;
    const a = i.lastIndexOf(":");
    if (a === -1) continue;
    const c = Number(i.slice(a + 1));
    if (!Number.isFinite(c) || c === 0) continue;
    const { isDevPort: d, knownService: l } = Ue(c);
    n.push({
      port: c,
      pid: r,
      protocol: "TCP",
      address: i.slice(0, a) || "0.0.0.0",
      state: "LISTENING",
      isDevPort: d,
      knownService: l,
      isProtected: he.has(r)
    });
  }
  return await Vt(n, e), n;
}
async function Vt(e, t) {
  if (e.length !== 0)
    try {
      const { stdout: n } = await $("tasklist", ["/FO", "CSV", "/NH"]), o = /* @__PURE__ */ new Map();
      for (const s of n.split(/\r?\n/)) {
        const i = s.match(/"([^"]*)"/g);
        if (!i || i.length < 2) continue;
        const r = i[0].replace(/"/g, ""), a = Number(i[1].replace(/"/g, ""));
        Number.isFinite(a) && o.set(a, r);
      }
      for (const s of e)
        s.processName = o.get(s.pid);
    } catch (n) {
      t.push(`Could not resolve process names: ${n.message}`);
    }
}
async function Ht(e) {
  try {
    const { stdout: t } = await $("lsof", ["-nP", "-iTCP", "-sTCP:LISTEN"]), n = [];
    for (const o of t.split(`
`).slice(1)) {
      const s = o.trim().split(/\s+/);
      if (s.length < 9) continue;
      const i = s[0], r = Number(s[1]), a = s[8];
      if (!Number.isFinite(r)) continue;
      const c = a.lastIndexOf(":");
      if (c === -1) continue;
      const d = Number(a.slice(c + 1));
      if (!Number.isFinite(d) || d === 0) continue;
      const { isDevPort: l, knownService: u } = Ue(d);
      n.push({
        port: d,
        pid: r,
        protocol: "TCP",
        address: a.slice(0, c) || "*",
        state: "LISTEN",
        processName: i,
        isDevPort: l,
        knownService: u,
        isProtected: he.has(r)
      });
    }
    return n;
  } catch (t) {
    return e.push(t.message), [];
  }
}
async function qt(e, t) {
  if (!Number.isInteger(e) || e <= 0)
    throw new Error("Invalid process id.");
  if (he.has(e))
    throw new Error("That is a protected system process and cannot be stopped.");
  const { entries: n } = await We(), o = n.find((i) => i.pid === e && i.port === t);
  if (!o)
    throw new Error(
      `Nothing is listening on port ${t} with PID ${e} any more. Refresh the list.`
    );
  const s = G ? await $("taskkill", ["/PID", String(e), "/F", "/T"]) : await $("kill", ["-9", String(e)]);
  if (s.code !== 0) {
    const i = (s.stderr || s.stdout).trim();
    throw new Error(
      i.toLowerCase().includes("access is denied") || i.toLowerCase().includes("not permitted") ? `Access denied stopping PID ${e}. It may need administrator rights.` : i || `Could not stop PID ${e}.`
    );
  }
  return {
    pid: e,
    killed: !0,
    message: `Stopped ${o.processName ?? `PID ${e}`} on port ${t}.`
  };
}
const Jt = [".env.example", ".env.sample", ".env.template", ".env.dist"], Se = [".env", ".env.local", ".env.development", ".env.development.local"], Kt = /^\.env(\..+)?$/, Yt = 3, Zt = /* @__PURE__ */ new Set([
  "node_modules",
  ".git",
  "dist",
  "build",
  "out",
  ".next",
  ".nuxt",
  ".output",
  "coverage",
  ".cache",
  ".turbo",
  ".vercel",
  "vendor",
  "target",
  "__pycache__",
  ".venv",
  "venv",
  ".idea",
  ".vscode"
]);
function Xt(e) {
  const t = [], n = /* @__PURE__ */ new Set(), o = /* @__PURE__ */ new Set();
  for (const s of e.split(/\r?\n/)) {
    const i = s.trim();
    if (!i || i.startsWith("#")) continue;
    const r = i.startsWith("export ") ? i.slice(7).trim() : i, a = r.indexOf("=");
    if (a <= 0) continue;
    const c = r.slice(0, a).trim();
    if (!c || !/^[A-Za-z_][A-Za-z0-9_.]*$/.test(c)) continue;
    const u = r.slice(a + 1).trim().replace(/^(['"])(.*)\1$/s, "$2").trim().length === 0;
    o.has(c) || (o.add(c), t.push(c)), u ? n.add(c) : n.delete(c);
  }
  return { keys: t, emptyKeys: n };
}
async function Qt(e) {
  try {
    const t = await j.readFile(e, "utf8");
    return Xt(t);
  } catch {
    return null;
  }
}
async function en(e) {
  const t = /* @__PURE__ */ new Map(), n = [{ dir: e, depth: 0 }];
  for (; n.length > 0; ) {
    const { dir: o, depth: s } = n.shift();
    let i;
    try {
      i = await j.readdir(o, { withFileTypes: !0 });
    } catch {
      continue;
    }
    const r = [];
    for (const a of i) {
      if (a.isFile() && Kt.test(a.name)) {
        r.push(a.name);
        continue;
      }
      a.isDirectory() && !a.isSymbolicLink() && s < Yt && !Zt.has(a.name) && n.push({ dir: p.join(o, a.name), depth: s + 1 });
    }
    r.length > 0 && t.set(p.relative(e, o), r.sort());
  }
  return t;
}
async function tn(e, t) {
  const n = [p.join(e, ".gitignore")];
  t && n.push(p.join(e, t, ".gitignore"));
  for (const o of n)
    try {
      if ((await j.readFile(o, "utf8")).split(/\r?\n/).map((r) => r.trim()).some(
        (r) => r === ".env" || r === ".env*" || r === "*.env" || r === ".env.*" || r === "**/.env" || r.endsWith("/.env")
      )) return !0;
    } catch {
    }
  return !1;
}
async function nn(e, t, n) {
  const o = [], s = p.join(e, t), i = /* @__PURE__ */ new Map(), r = [];
  for (const y of n) {
    const E = await Qt(p.join(s, y));
    if (!E) {
      o.push(`Could not read ${y}.`);
      continue;
    }
    i.set(y, E), r.push({
      fileName: y,
      keyCount: E.keys.length,
      emptyKeys: E.emptyKeys.size
    });
  }
  const a = Jt.find((y) => i.has(y)), c = Se.find((y) => i.has(y)), d = a ? i.get(a) : void 0, l = c ? i.get(c) : void 0, u = [];
  let k = 0, w = 0, m = 0;
  if (d && l) {
    const y = new Set(l.keys);
    for (const A of d.keys)
      y.has(A) ? l.emptyKeys.has(A) ? (u.push({ key: A, status: "empty" }), w += 1) : u.push({ key: A, status: "ok" }) : (u.push({ key: A, status: "missing" }), k += 1);
    const E = new Set(d.keys);
    for (const A of l.keys)
      E.has(A) || (u.push({ key: A, status: "extra" }), m += 1);
  } else if (l) {
    for (const y of l.keys) {
      const E = l.emptyKeys.has(y);
      u.push({ key: y, status: E ? "empty" : "ok" }), E && (w += 1);
    }
    o.push("No .env.example here, so missing keys cannot be detected.");
  } else if (d) {
    for (const y of d.keys)
      u.push({ key: y, status: "missing" }), k += 1;
    o.push(`${a} exists but there is no .env file.`);
  }
  const C = Se.some((y) => i.has(y)) && !await tn(e, t);
  return {
    relativeDir: t,
    label: t ? t.replace(/\\/g, "/") : "project root",
    exampleFile: a,
    activeFile: c,
    files: r,
    keys: u,
    missingCount: k,
    emptyCount: w,
    extraCount: m,
    envNotIgnored: C,
    warnings: o
  };
}
async function on(e) {
  const t = [], n = {
    projectId: e.id,
    projectName: e.name,
    projectPath: e.path,
    pathExists: !0,
    locations: [],
    missingCount: 0,
    emptyCount: 0,
    extraCount: 0,
    hasEnvFiles: !1,
    envNotIgnored: !1,
    warnings: t
  };
  if (!e.path || !h.existsSync(e.path))
    return { ...n, pathExists: !1 };
  let o;
  try {
    o = await en(e.path);
  } catch (r) {
    return t.push(`Could not scan the project folder: ${r.message}`), n;
  }
  if (o.size === 0) return n;
  const s = [];
  for (const [r, a] of o)
    s.push(await nn(e.path, r, a));
  s.sort((r, a) => {
    if (!r.relativeDir != !a.relativeDir) return r.relativeDir ? 1 : -1;
    const c = r.missingCount * 10 + r.emptyCount, d = a.missingCount * 10 + a.emptyCount;
    return c !== d ? d - c : r.label.localeCompare(a.label);
  });
  const i = (r) => s.reduce((a, c) => a + r(c), 0);
  return {
    ...n,
    locations: s,
    missingCount: i((r) => r.missingCount),
    emptyCount: i((r) => r.emptyCount),
    extraCount: i((r) => r.extraCount),
    hasEnvFiles: s.some((r) => r.files.length > 0),
    envNotIgnored: s.some((r) => r.envNotIgnored),
    warnings: t
  };
}
async function sn(e) {
  const t = R().filter((o) => !e || o.id === e), n = [];
  for (const o of t)
    n.push(await on(o));
  return n.sort((o, s) => {
    const i = o.missingCount * 10 + o.emptyCount, r = s.missingCount * 10 + s.emptyCount;
    return i !== r ? r - i : o.projectName.localeCompare(s.projectName);
  }), {
    reports: n,
    projectsWithIssues: n.filter((o) => o.missingCount > 0 || o.emptyCount > 0).length,
    totalMissing: n.reduce((o, s) => o + s.missingCount, 0)
  };
}
const rn = [
  { file: "pnpm-lock.yaml", manager: "pnpm", prefix: "pnpm" },
  { file: "yarn.lock", manager: "yarn", prefix: "yarn" },
  { file: "bun.lockb", manager: "bun", prefix: "bun run" },
  { file: "bun.lock", manager: "bun", prefix: "bun run" },
  { file: "package-lock.json", manager: "npm", prefix: "npm run" }
];
function Be(e) {
  for (const { file: t, manager: n, prefix: o } of rn)
    if (h.existsSync(p.join(e, t))) return { manager: n, prefix: o };
  return { manager: "npm", prefix: "npm run" };
}
async function Ge(e) {
  const t = p.join(e, "package.json");
  if (!h.existsSync(t)) return null;
  try {
    const n = JSON.parse(await j.readFile(t, "utf8")), o = n == null ? void 0 : n.scripts;
    if (!o || typeof o != "object") return null;
    const s = {};
    for (const [i, r] of Object.entries(o))
      typeof r == "string" && (s[i] = r);
    return s;
  } catch {
    return null;
  }
}
async function an() {
  const e = R(), t = [], n = [];
  let o = 0;
  for (const r of e) {
    const a = !!r.path && h.existsSync(r.path);
    if (!a) continue;
    const c = await Ge(r.path);
    if (!c) continue;
    o += 1;
    const { manager: d, prefix: l } = Be(r.path);
    for (const [u, k] of Object.entries(c))
      t.push({
        projectId: r.id,
        projectName: r.name,
        projectPath: r.path,
        pathExists: a,
        packageManager: d,
        scriptName: u,
        scriptBody: k,
        runCommand: `${l} ${u}`
      });
  }
  const s = /* @__PURE__ */ new Map();
  for (const r of t)
    s.set(r.scriptName, (s.get(r.scriptName) ?? 0) + 1);
  const i = [...s.entries()].filter(([, r]) => r > 1).sort((r, a) => a[1] - r[1] || r[0].localeCompare(a[0])).map(([r]) => r);
  return t.sort(
    (r, a) => r.projectName.localeCompare(a.projectName) || r.scriptName.localeCompare(a.scriptName)
  ), { scripts: t, projectsIndexed: o, sharedNames: i, warnings: n };
}
async function cn(e, t) {
  const n = R().find((a) => a.id === e);
  if (!n) throw new Error("Project not found.");
  if (!h.existsSync(n.path))
    throw new Error(`The folder "${n.path}" no longer exists.`);
  const o = await Ge(n.path);
  if (!o)
    throw new Error(`${n.name} has no package.json scripts.`);
  if (!Object.prototype.hasOwnProperty.call(o, t))
    throw new Error(`"${t}" is not a script in ${n.name}.`);
  const { prefix: s } = Be(n.path), i = `${s} ${t}`, r = await X(i, n.path);
  return { command: i, result: r };
}
const oe = {
  isRepository: !1,
  modifiedFiles: 0,
  untrackedFiles: 0,
  ahead: 0,
  behind: 0
};
function dn(e) {
  return h.existsSync(p.join(e, ".git"));
}
async function q(e, t, n = 8e3) {
  return $("git", ["-C", e, ...t], n);
}
async function ln(e) {
  if (!dn(e)) return { ...oe };
  const t = { ...oe, isRepository: !0 };
  try {
    const { stdout: n, code: o } = await q(e, ["rev-parse", "--abbrev-ref", "HEAD"]);
    if (o === 0) {
      const s = n.trim();
      s && (t.branch = s);
    }
  } catch {
    return { ...oe, isRepository: !0 };
  }
  try {
    const { stdout: n, code: o } = await q(e, ["status", "--porcelain"]);
    if (o === 0)
      for (const s of n.split(/\r?\n/))
        s.trim() && (s.startsWith("??") ? t.untrackedFiles += 1 : t.modifiedFiles += 1);
  } catch {
  }
  try {
    const { stdout: n, code: o } = await q(e, [
      "rev-list",
      "--count",
      "--left-right",
      "@{upstream}...HEAD"
    ]);
    if (o === 0) {
      const [s, i] = n.trim().split(/\s+/).map(Number);
      Number.isFinite(s) && (t.behind = s), Number.isFinite(i) && (t.ahead = i);
    }
  } catch {
  }
  try {
    const { stdout: n, code: o } = await q(e, [
      "log",
      "-1",
      "--format=%ct%x00%s"
    ]);
    if (o === 0 && n.trim()) {
      const [s, i] = n.trim().split("\0"), r = Number(s);
      Number.isFinite(r) && (t.lastCommitAt = r * 1e3), i && (t.lastCommitMessage = i.trim());
    }
  } catch {
  }
  return t;
}
async function un() {
  try {
    const { code: e } = await $("git", ["--version"], 5e3);
    return e === 0;
  } catch {
    return !1;
  }
}
function ze(e) {
  const t = e.trim(), n = /^[A-Za-z0-9_.-]+@[A-Za-z0-9_.-]+:(.+)$/.exec(t);
  let s = n ? n[1] : null;
  if (!s)
    try {
      const a = new URL(t);
      if (!["https:", "http:", "ssh:", "git:"].includes(a.protocol)) return null;
      s = a.pathname;
    } catch {
      return null;
    }
  const i = s.split("/").filter(Boolean).pop();
  if (!i) return null;
  const r = i.replace(/\.git$/i, "");
  return !/^[A-Za-z0-9._-]+$/.test(r) || r === "." || r === ".." ? null : r;
}
function Ve(e) {
  const t = e.trim();
  if (!t) return { valid: !1, reason: "Enter a repository URL." };
  if (/[\r\n\0]/.test(t))
    return { valid: !1, reason: "That URL contains invalid characters." };
  if (t.startsWith("-"))
    return { valid: !1, reason: "That URL is not valid." };
  if (/^(ext|file|fd)::/i.test(t) || t.startsWith("file://"))
    return { valid: !1, reason: "Only http(s) and ssh remotes can be cloned." };
  if (!/^[A-Za-z0-9_.-]+@[A-Za-z0-9_.-]+:.+$/.test(t)) {
    let o;
    try {
      o = new URL(t);
    } catch {
      return { valid: !1, reason: "That is not a valid repository URL." };
    }
    if (!["https:", "http:", "ssh:", "git:"].includes(o.protocol))
      return { valid: !1, reason: "Only http(s) and ssh remotes can be cloned." };
  }
  return ze(t) ? { valid: !0 } : { valid: !1, reason: "Could not work out a folder name from that URL." };
}
const pn = 24 * 60 * 60 * 1e3, mn = 90, fn = 60, hn = [
  "pnpm-lock.yaml",
  "yarn.lock",
  "bun.lockb",
  "bun.lock",
  "package-lock.json"
];
function Ee(e, t) {
  return e ? Math.floor((t - e) / pn) : null;
}
async function gn(e) {
  const t = p.join(e, "package.json"), n = h.existsSync(t);
  if (!n)
    return { hasPackageJson: n, hasNodeModules: !1, lockfileName: void 0, lockfileDrift: !1 };
  const o = h.existsSync(p.join(e, "node_modules")), s = hn.find((r) => h.existsSync(p.join(e, r)));
  let i = !1;
  if (s)
    try {
      const [r, a] = await Promise.all([
        j.stat(t),
        j.stat(p.join(e, s))
      ]);
      i = r.mtimeMs - a.mtimeMs > 6e4;
    } catch {
      i = !1;
    }
  return { hasPackageJson: n, hasNodeModules: o, lockfileName: s, lockfileDrift: i };
}
function wn(e) {
  const t = [];
  let n = 0;
  const o = (s, i) => {
    t.push(s), n += i;
  };
  if (!e.pathExists)
    return o(
      {
        kind: "path-missing",
        severity: "high",
        label: "Folder missing",
        detail: "The project folder no longer exists on disk."
      },
      100
    ), { issues: t, score: n };
  if (e.isRepository) {
    const s = e.modifiedFiles + e.untrackedFiles;
    s > 0 && o(
      {
        kind: "uncommitted-changes",
        severity: s > 20 ? "high" : "medium",
        label: `${s} uncommitted`,
        detail: `${e.modifiedFiles} modified, ${e.untrackedFiles} untracked. This work only exists on this machine.`
      },
      Math.min(s, 30) + 10
    ), e.ahead > 0 && o(
      {
        kind: "unpushed-commits",
        severity: e.ahead > 5 ? "high" : "medium",
        label: `${e.ahead} unpushed`,
        detail: `${e.ahead} commit${e.ahead === 1 ? "" : "s"} on ${e.branch ?? "this branch"} have not been pushed.`
      },
      e.ahead * 3 + 10
    ), e.daysSinceCommit !== null && e.daysSinceCommit >= mn && o(
      {
        kind: "stale-commits",
        severity: "low",
        label: `${e.daysSinceCommit}d since commit`,
        detail: `Last commit was ${e.daysSinceCommit} days ago.`
      },
      5
    );
  } else
    o(
      {
        kind: "no-git",
        severity: "low",
        label: "Not a repo",
        detail: "This folder is not under version control."
      },
      4
    );
  return e.hasPackageJson && !e.hasNodeModules && o(
    {
      kind: "deps-not-installed",
      severity: "medium",
      label: "Deps not installed",
      detail: "package.json exists but node_modules is missing. Install before running."
    },
    15
  ), e.lockfileDrift && o(
    {
      kind: "lockfile-drift",
      severity: "medium",
      label: "Lockfile behind",
      detail: `package.json is newer than ${e.lockfileName}. Dependencies may be out of sync.`
    },
    12
  ), e.daysSinceOpened === null ? o(
    {
      kind: "never-opened",
      severity: "low",
      label: "Never opened",
      detail: "This project has never been opened from Dev Launcher."
    },
    2
  ) : e.daysSinceOpened >= fn && o(
    {
      kind: "never-opened",
      severity: "low",
      label: `${e.daysSinceOpened}d untouched`,
      detail: `Not opened from Dev Launcher in ${e.daysSinceOpened} days.`
    },
    3
  ), { issues: t, score: n };
}
async function yn(e) {
  const t = R(), n = [], o = [], s = await un();
  s || n.push("git was not found on your PATH, so repository checks were skipped.");
  const i = Date.now();
  for (let r = 0; r < t.length; r += 1) {
    const a = t[r];
    e == null || e({
      current: r + 1,
      total: t.length,
      projectName: a.name,
      done: !1
    });
    const c = !!a.path && h.existsSync(a.path), d = c && s ? await ln(a.path) : {
      isRepository: c ? h.existsSync(p.join(a.path, ".git")) : !1,
      modifiedFiles: 0,
      untrackedFiles: 0,
      ahead: 0,
      behind: 0,
      branch: void 0,
      lastCommitAt: void 0,
      lastCommitMessage: void 0
    }, l = c ? await gn(a.path) : { hasPackageJson: !1, hasNodeModules: !1, lockfileName: void 0, lockfileDrift: !1 }, u = {
      projectId: a.id,
      projectName: a.name,
      projectPath: a.path,
      pathExists: c,
      isRepository: d.isRepository,
      branch: d.branch,
      modifiedFiles: d.modifiedFiles,
      untrackedFiles: d.untrackedFiles,
      ahead: d.ahead,
      behind: d.behind,
      lastCommitAt: d.lastCommitAt,
      lastCommitMessage: d.lastCommitMessage,
      daysSinceCommit: Ee(d.lastCommitAt, i),
      hasPackageJson: l.hasPackageJson,
      hasNodeModules: l.hasNodeModules,
      lockfileName: l.lockfileName,
      lockfileDrift: l.lockfileDrift,
      lastOpenedAt: a.lastOpenedAt,
      daysSinceOpened: Ee(a.lastOpenedAt, i)
    }, { issues: k, score: w } = wn(u);
    o.push({ ...u, issues: k, score: w });
  }
  return e == null || e({ current: t.length, total: t.length, projectName: "", done: !0 }), o.sort((r, a) => a.score - r.score || r.projectName.localeCompare(a.projectName)), {
    entries: o,
    scannedAt: i,
    healthyCount: o.filter((r) => r.issues.length === 0).length,
    needsAttentionCount: o.filter(
      (r) => r.issues.some((a) => a.severity === "high" || a.severity === "medium")
    ).length,
    warnings: n
  };
}
const vn = [
  { lockfile: "pnpm-lock.yaml", command: "pnpm install" },
  { lockfile: "yarn.lock", command: "yarn install" },
  { lockfile: "bun.lockb", command: "bun install" },
  { lockfile: "bun.lock", command: "bun install" },
  { lockfile: "package-lock.json", command: "npm install" }
];
function kn(e, t, n) {
  return new Promise((o, s) => {
    var c, d;
    const i = Ae(
      "git",
      ["clone", "--progress", "--", e, t],
      {
        shell: !1,
        windowsHide: !0,
        // Stop git from popping a GUI credential prompt that would hang us.
        env: { ...process.env, GIT_TERMINAL_PROMPT: "0", GCM_INTERACTIVE: "never" }
      }
    );
    let r = "";
    const a = (l) => {
      const u = l.toString();
      r = (r + u).slice(-4e3);
      for (const k of u.split(/\r?\n|\r/)) {
        const w = k.trim();
        w && n(w);
      }
    };
    (c = i.stdout) == null || c.on("data", a), (d = i.stderr) == null || d.on("data", a), i.on("error", (l) => {
      s(
        l.code === "ENOENT" ? new Error("git was not found on your PATH.") : l
      );
    }), i.on("close", (l) => {
      if (l === 0) {
        o();
        return;
      }
      const u = r.trim().split(/\r?\n/).slice(-3).join(" ");
      s(new Error(u || `git clone exited with code ${l}.`));
    });
  });
}
async function bn(e, t) {
  const n = [], o = (m, N, C, y = !1) => t == null ? void 0 : t({ phase: m, message: N, detail: C, done: y });
  o("validating", "Checking the repository URL...");
  const s = String(e.url ?? "").trim(), i = Ve(s);
  if (!i.valid)
    throw new Error(i.reason ?? "That repository URL is not valid.");
  const r = p.resolve(String(e.destinationParent ?? "").trim());
  if (!r || !h.existsSync(r))
    throw new Error("Choose a destination folder that exists.");
  if (!h.statSync(r).isDirectory())
    throw new Error("The destination must be a folder.");
  const c = String(e.folderName ?? "").trim() || ze(s);
  if (!/^[A-Za-z0-9._-]+$/.test(c) || c === "." || c === "..")
    throw new Error("That folder name is not valid.");
  const d = p.join(r, c);
  if (!p.resolve(d).startsWith(r + p.sep))
    throw new Error("That folder name is not valid.");
  if (h.existsSync(d))
    throw new Error(`"${c}" already exists in that folder.`);
  o("cloning", `Cloning into ${c}...`);
  try {
    await kn(s, d, (m) => {
      o("cloning", `Cloning into ${c}...`, m);
    });
  } catch (m) {
    try {
      h.existsSync(d) && await j.rm(d, { recursive: !0, force: !0, maxRetries: 2 });
    } catch {
      n.push(`A partial clone may remain at ${d}.`);
    }
    throw m;
  }
  o("detecting", "Detecting the project stack...");
  let l;
  try {
    l = Fe(d);
  } catch (m) {
    n.push(`Stack detection failed: ${m.message}`), l = {
      name: c,
      tags: [],
      commands: [],
      details: {
        languages: [],
        frameworks: [],
        hasGit: !0,
        hasDocker: !1
      }
    };
  }
  o("registering", "Adding it to your projects...");
  const u = Oe({
    name: l.name || c,
    path: d,
    description: l.description,
    tags: l.tags,
    isFavorite: !1,
    commands: l.commands.map((m) => ({ ...m, id: m.id || T("cmd") }))
  });
  let k = !1;
  if (e.installDependencies) {
    const m = vn.find(
      ({ lockfile: C }) => h.existsSync(p.join(d, C))
    );
    if (!h.existsSync(p.join(d, "package.json")))
      n.push("No package.json found, so dependencies were not installed.");
    else {
      const C = (m == null ? void 0 : m.command) ?? "npm install";
      o("installing", `Running ${C}...`);
      try {
        await X(C, d), k = !0;
      } catch (y) {
        n.push(`Could not start the install: ${y.message}`);
      }
    }
  }
  let w = !1;
  if (e.openInEditor) {
    const m = e.openInEditor;
    if (!F[m])
      n.push(`Unknown editor "${m}".`);
    else {
      o("opening", `Opening ${F[m].label}...`);
      try {
        await me(m, d, !1), w = !0;
      } catch (N) {
        n.push(N.message);
      }
    }
  }
  return o("done", `${u.name} is ready.`, void 0, !0), {
    projectId: u.id,
    projectName: u.name,
    projectPath: d,
    detectedTags: l.tags,
    commandCount: l.commands.length,
    installStarted: k,
    editorOpened: w,
    warnings: n
  };
}
const je = 200;
function se(e, t) {
  for (const n of _.getAllWindows())
    n.isDestroyed() || n.webContents.send(e, t);
}
function Sn() {
  f.handle(
    "tools:scanDisk",
    g("tools:scanDisk", async (e, t) => Wt((n) => se("tools:diskScanProgress", n)))
  ), f.handle(
    "tools:deleteModules",
    g("tools:deleteModules", (e) => {
      if (!Array.isArray(e))
        throw new Error("Expected a list of folders to delete.");
      if (e.length === 0)
        throw new Error("Nothing was selected.");
      if (e.length > je)
        throw new Error(`Too many folders selected (limit ${je}).`);
      const t = e.map((n, o) => S(n, `Target ${o + 1}`));
      return Bt(t);
    })
  ), f.handle(
    "tools:listPorts",
    g("tools:listPorts", () => We())
  ), f.handle(
    "tools:killPort",
    g("tools:killPort", (e, t) => {
      if (typeof e != "number" || !Number.isInteger(e) || e <= 0)
        throw new Error("Invalid process id.");
      if (typeof t != "number" || !Number.isInteger(t) || t <= 0 || t > 65535)
        throw new Error("Invalid port number.");
      return qt(e, t);
    })
  ), f.handle(
    "tools:auditEnv",
    g(
      "tools:auditEnv",
      (e) => sn(
        e == null ? void 0 : v(e, "Project id")
      )
    )
  ), f.handle(
    "tools:indexScripts",
    g("tools:indexScripts", () => an())
  ), f.handle(
    "tools:runScript",
    g("tools:runScript", async (e, t) => {
      const n = S(t, "Script name");
      if (!/^[A-Za-z0-9_.:\-/ ]{1,120}$/.test(n))
        throw new Error("That script name contains unsupported characters.");
      const { command: o } = await cn(v(e, "Project id"), n);
      return { command: o };
    })
  ), f.handle(
    "tools:scanRadar",
    g(
      "tools:scanRadar",
      () => yn((e) => se("tools:radarProgress", e))
    )
  ), f.handle(
    "tools:validateCloneUrl",
    g(
      "tools:validateCloneUrl",
      (e) => Ve(typeof e == "string" ? e : "")
    )
  ), f.handle(
    "tools:clone",
    g("tools:clone", (e) => {
      const t = D(e, "Clone request");
      return bn(
        {
          url: S(t.url, "Repository URL"),
          destinationParent: S(t.destinationParent, "Destination folder"),
          folderName: typeof t.folderName == "string" && t.folderName.trim() ? t.folderName.trim() : void 0,
          installDependencies: J(
            t.installDependencies,
            "Install dependencies flag"
          ),
          openInEditor: typeof t.openInEditor == "string" && t.openInEditor ? t.openInEditor : void 0
        },
        (n) => se("tools:cloneProgress", n)
      );
    })
  );
}
const En = ["editor", "command", "terminal", "folder", "url"], Ce = 30;
function jn(e) {
  if (!Array.isArray(e)) throw new Error("Steps must be an array.");
  if (e.length > Ce) throw new Error(`A session can hold at most ${Ce} steps.`);
  return e.map((t, n) => {
    const o = D(t, `Step ${n + 1}`), s = String(o.kind ?? "");
    if (!En.includes(s))
      throw new Error(`Step ${n + 1} has an unknown type.`);
    return {
      id: typeof o.id == "string" ? o.id : "",
      kind: s,
      target: typeof o.target == "string" ? o.target : "",
      label: typeof o.label == "string" ? o.label : s,
      delayMs: Number(o.delayMs) || 0,
      enabled: o.enabled !== !1,
      sortOrder: n
    };
  });
}
function Cn() {
  f.handle(
    "sessions:get",
    g(
      "sessions:get",
      (e) => z(v(e, "Project id"))
    )
  ), f.handle(
    "sessions:getAll",
    g("sessions:getAll", () => (bt(), ht()))
  ), f.handle(
    "sessions:update",
    g("sessions:update", (e, t) => {
      const n = D(t, "Updates");
      return gt(v(e, "Project id"), {
        steps: n.steps === void 0 ? void 0 : jn(n.steps),
        autoCapture: n.autoCapture === void 0 ? void 0 : J(n.autoCapture, "Auto capture")
      });
    })
  ), f.handle(
    "sessions:clear",
    g(
      "sessions:clear",
      (e) => wt(v(e, "Project id"))
    )
  ), f.handle(
    "sessions:resume",
    g("sessions:resume", async (e) => {
      const t = _.getAllWindows();
      return vt(v(e, "Project id"), (n) => {
        for (const o of t)
          o.isDestroyed() || o.webContents.send("sessions:resumeProgress", n);
      });
    })
  );
}
const He = p.dirname(Ke(import.meta.url));
process.env.APP_ROOT = p.join(He, "..");
const U = process.env.VITE_DEV_SERVER_URL, Rn = p.join(process.env.APP_ROOT, "dist-electron"), qe = p.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = U ? p.join(process.env.APP_ROOT, "public") : qe;
let I;
function Je() {
  I = new _({
    icon: p.join(process.env.VITE_PUBLIC, "electron-vite.svg"),
    width: 1280,
    height: 820,
    minWidth: 940,
    minHeight: 600,
    backgroundColor: "#181818",
    webPreferences: {
      preload: p.join(He, "preload.mjs"),
      // Set explicitly rather than relying on Electron's defaults, so a major
      // version bump can never silently weaken the sandbox.
      contextIsolation: !0,
      nodeIntegration: !1,
      sandbox: !0,
      webviewTag: !1
    }
  }), I.webContents.setWindowOpenHandler(({ url: e }) => ((e.startsWith("http://") || e.startsWith("https://")) && re.openExternal(e), { action: "deny" })), I.webContents.on("will-navigate", (e, t) => {
    !(U && t.startsWith(U)) && !t.startsWith("file://") && (e.preventDefault(), (t.startsWith("http://") || t.startsWith("https://")) && re.openExternal(t));
  }), U ? I.loadURL(U) : I.loadFile(p.join(qe, "index.html"));
}
B.on("window-all-closed", () => {
  process.platform !== "darwin" && (B.quit(), I = null);
});
B.on("activate", () => {
  _.getAllWindows().length === 0 && Je();
});
B.whenReady().then(() => {
  Tt(), Ft(), Lt(), Sn(), Cn(), Je();
});
export {
  Rn as MAIN_DIST,
  qe as RENDERER_DIST,
  U as VITE_DEV_SERVER_URL
};
