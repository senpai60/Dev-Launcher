import { app as U, ipcMain as f, BrowserWindow as R, dialog as $e, shell as de, globalShortcut as Be, screen as Pe } from "electron";
import { fileURLToPath as ct } from "node:url";
import d, { join as he } from "node:path";
import h, { existsSync as ge, readFileSync as dt, writeFileSync as lt, renameSync as ut, unlinkSync as pt, copyFileSync as mt, mkdirSync as ft, promises as S } from "fs";
import { randomUUID as ht, createHash as gt } from "node:crypto";
import { spawn as we, execFile as wt } from "child_process";
import H from "path";
const Ge = 1, ze = () => {
  const e = he(U.getPath("userData"), "DevLauncher");
  return ft(e, { recursive: !0 }), e;
}, ye = (e) => he(ze(), `${e}.json`), yt = (e) => {
  const t = ye(e);
  if (!ge(t)) return null;
  const n = he(ze(), `${e}.corrupt-${Date.now()}.json`);
  try {
    return mt(t, n), n;
  } catch (o) {
    return console.error(`Could not quarantine ${e}.json:`, o), null;
  }
}, vt = (e, t) => {
  if (Array.isArray(e))
    return console.log(`Migrating ${t}.json from v0 (bare array) to v${Ge}`), e;
  if (e && typeof e == "object" && Array.isArray(e.data))
    return e.data;
  throw new Error(`Unrecognised shape in ${t}.json`);
}, ve = (e) => {
  const t = ye(e);
  if (!ge(t)) return [];
  let n;
  try {
    n = dt(t, "utf8");
  } catch (o) {
    throw console.error(`Could not read ${e}.json:`, o), new Error(`Unable to read ${e} storage.`);
  }
  if (n.trim() === "") return [];
  try {
    return vt(JSON.parse(n), e);
  } catch (o) {
    const s = yt(e);
    throw console.error(
      `${e}.json is corrupt and was backed up to ${s ?? "(backup failed)"}:`,
      o
    ), new Error(
      `${e}.json could not be read and was backed up. Starting from an empty list.`
    );
  }
}, Q = (e, t) => {
  const n = ye(e), o = `${n}.tmp`, s = { version: Ge, data: t };
  try {
    lt(o, JSON.stringify(s, null, 2), "utf8"), ut(o, n);
  } catch (i) {
    console.error(`Error saving ${e}.json:`, i);
    try {
      ge(o) && pt(o);
    } catch {
    }
    throw new Error(`Unable to save ${e}. Your changes were not written to disk.`);
  }
};
function M() {
  return ve("projects");
}
function be(e) {
  Q("projects", e);
}
function D(e = "id") {
  const t = ht().replace(/-/g, "").slice(0, 12);
  return `${e}_${t}`;
}
const Ne = 80, Te = 2e3, bt = [
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
function kt(e) {
  for (const { pattern: t, reason: n } of bt)
    if (t.test(e))
      return { destructive: !0, reason: n };
  return { destructive: !1 };
}
function B(e, t) {
  const n = [], o = (e.name ?? "").trim(), s = (e.command ?? "").trim(), i = (e.workingDirectory ?? "").trim();
  if (o ? o.length > Ne && n.push(`Command name must be ${Ne} characters or fewer.`) : n.push("Command name is required."), s ? s.length > Te && n.push(`Command string must be ${Te} characters or fewer.`) : n.push("Command string is required."), /[\r\n]/.test(s) && n.push("Command string cannot span multiple lines."), (/\0/.test(s) || /\0/.test(o)) && n.push("Command contains invalid characters."), i) {
    if (d.isAbsolute(i))
      n.push("Working directory must be relative to the project folder.");
    else if (i.split(/[/\\]/).includes(".."))
      n.push("Working directory cannot escape the project folder.");
    else if (t) {
      const c = d.resolve(t, i);
      c.startsWith(d.resolve(t)) ? h.existsSync(c) || n.push(`Working directory "${i}" does not exist.`) : n.push("Working directory cannot escape the project folder.");
    }
  }
  const { destructive: r, reason: a } = kt(s);
  return {
    valid: n.length === 0,
    errors: n,
    requiresConfirmation: r,
    destructiveReason: a
  };
}
function He(e, t) {
  const n = d.resolve(e);
  if (!t || !t.trim()) return n;
  const o = d.resolve(n, t.trim());
  if (!o.startsWith(n))
    throw new Error("Working directory escapes the project folder.");
  if (!h.existsSync(o))
    throw new Error(`Working directory "${t}" does not exist.`);
  return o;
}
const q = process.platform === "win32", Je = process.platform === "darwin";
function St(e) {
  return q ? { command: "explorer.exe", args: [e], detached: !0 } : Je ? { command: "open", args: [e], detached: !0 } : { command: "xdg-open", args: [e], detached: !0 };
}
function qe(e, t) {
  return q ? {
    command: "cmd",
    args: ["/c", "start", "", ...t ? ["cmd", "/k", t] : ["cmd", "/k"]],
    detached: !0
  } : Je ? t ? { command: "osascript", args: ["-e", `tell application "Terminal" to do script "cd ${xt(e)} && ${t.replace(/"/g, '\\"')}"`], detached: !0 } : { command: "open", args: ["-a", "Terminal", e], detached: !0 } : { command: "x-terminal-emulator", args: t ? ["-e", `bash -c '${t.replace(/'/g, "'\\''")}; exec bash'`] : [], detached: !0 };
}
const G = {
  vscode: { bin: "code", label: "VS Code" },
  cursor: { bin: "cursor", label: "Cursor" },
  antigravity: { bin: "agy", label: "Antigravity" }
};
function jt(e, t) {
  const n = (s) => s.startsWith("-") ? s : `"${s}"`;
  return {
    command: "cmd.exe",
    args: ["/d", "/s", "/c", `"${[e, ...t.map(n)].join(" ")}"`],
    detached: !1,
    verbatim: !0
  };
}
function Et(e, t, n) {
  const o = G[e];
  if (!o) return null;
  const s = e === "vscode" ? [n ? "-n" : "-r", t] : [t];
  return q ? jt(`${o.bin}.cmd`, s) : { command: o.bin, args: s, detached: !1 };
}
function xt(e) {
  return e.replace(/(["\s'$`\\])/g, "\\$1");
}
function ee(e, t) {
  return new Promise((n, o) => {
    var a;
    let s;
    try {
      s = we(e.command, e.args, {
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
      const l = r.trim().split(/\r?\n/).filter(Boolean).slice(-2).join(" ");
      o(new Error(l || `"${e.command}" exited with code ${c}.`));
    });
  });
}
function te(e) {
  const t = d.resolve(e);
  if (!h.existsSync(t))
    throw new Error(`The folder "${t}" no longer exists.`);
  return t;
}
async function ke(e, t, n = !1) {
  var i;
  const o = te(t), s = Et(e, o, n);
  if (!s)
    throw new Error(`Unknown editor "${e}".`);
  try {
    return await ee(s, o);
  } catch (r) {
    const a = ((i = G[e]) == null ? void 0 : i.label) ?? e, c = r instanceof Error ? r.message : String(r);
    throw c.includes("was not found on your PATH") || c.includes("exited with code 9009") || /is not recognized as an internal or external command/i.test(c) || /command not found/i.test(c) ? new Error(
      `${a} was not detected. Make sure its command-line launcher is installed and on your PATH.`
    ) : new Error(`Could not open ${a}: ${c}`);
  }
}
async function Ze(e) {
  const t = te(e);
  return ee(qe(t), t);
}
async function Ke(e) {
  const t = te(e);
  return ee(St(t), t);
}
async function ne(e, t) {
  const n = te(t);
  return ee(qe(n, e), n);
}
function oe() {
  return ve("sessions");
}
function Ye(e) {
  Q("sessions", e);
}
const Ct = 800, Xe = 6e4, Qe = 30;
function At(e) {
  return {
    projectId: e,
    steps: [],
    capturedAt: Date.now(),
    autoCapture: !0
  };
}
function Z(e) {
  return oe().find((t) => t.projectId === e) ?? At(e);
}
function $t() {
  return oe();
}
function se(e) {
  const t = oe(), n = t.findIndex((s) => s.projectId === e.projectId), o = {
    ...e,
    steps: e.steps.slice(0, Qe).map((s, i) => ({ ...s, sortOrder: i }))
  };
  return n === -1 ? t.push(o) : t[n] = o, Ye(t), o;
}
function le(e, t, n, o) {
  const s = Z(e);
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
    if (s.steps.length >= Qe) return;
    s.steps.push({
      id: D("step"),
      kind: t,
      target: n,
      label: o,
      delayMs: Ct,
      enabled: !0,
      sortOrder: s.steps.length
    });
  }
  s.capturedAt = Date.now(), se(s);
}
function Pt(e, t) {
  const n = Z(e);
  return t.autoCapture !== void 0 && (n.autoCapture = t.autoCapture), t.steps && (n.steps = t.steps.map((o, s) => ({
    id: o.id || D("step"),
    kind: o.kind,
    target: String(o.target ?? ""),
    label: String(o.label ?? "").slice(0, 120),
    delayMs: Math.min(Math.max(Number(o.delayMs) || 0, 0), Xe),
    enabled: o.enabled !== !1,
    sortOrder: s
  }))), se(n);
}
function Nt(e) {
  const t = Z(e);
  return t.steps = [], t.capturedAt = Date.now(), se(t);
}
const Tt = (e) => new Promise((t) => setTimeout(t, e));
async function Dt(e, t) {
  const n = M().find((r) => r.id === e);
  if (!n) throw new Error("Project not found.");
  if (!h.existsSync(n.path))
    throw new Error(`The folder "${n.path}" no longer exists.`);
  const o = Z(e), s = [...o.steps].sort((r, a) => r.sortOrder - a.sortOrder);
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
      await Rt(n, a), i.push({ stepId: a.id, label: a.label, kind: a.kind, status: "ok" });
    } catch (c) {
      i.push({
        stepId: a.id,
        label: a.label,
        kind: a.kind,
        status: "failed",
        error: c instanceof Error ? c.message : String(c)
      });
    }
    a.delayMs > 0 && r < s.length - 1 && await Tt(Math.min(a.delayMs, Xe));
  }
  return t == null || t({
    projectId: e,
    current: s.length,
    total: s.length,
    label: "",
    done: !0
  }), o.lastResumedAt = Date.now(), se(o), {
    projectId: e,
    projectName: n.name,
    steps: i,
    succeeded: i.filter((r) => r.status === "ok").length,
    failed: i.filter((r) => r.status === "failed").length,
    skipped: i.filter((r) => r.status === "skipped").length
  };
}
async function Rt(e, t) {
  switch (t.kind) {
    case "editor": {
      const n = G[t.target] ? t.target : "vscode";
      await ke(n, e.path, !1);
      return;
    }
    case "terminal":
      await Ze(e.path);
      return;
    case "folder":
      await Ke(e.path);
      return;
    case "command": {
      const n = (e.commands ?? []).find((i) => i.id === t.target);
      if (!n)
        throw new Error("That command has been deleted.");
      const o = B(
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
      const s = He(e.path, n.workingDirectory);
      await ne(n.command, s);
      return;
    }
    case "url":
      throw new Error("URL steps are not supported yet.");
    default:
      throw new Error(`Unknown step type "${t.kind}".`);
  }
}
function It() {
  const e = new Set(M().map((o) => o.id)), t = oe(), n = t.filter((o) => e.has(o.projectId));
  n.length !== t.length && Ye(n);
}
function F() {
  return M();
}
function ue(e) {
  return M().find((t) => t.id === e);
}
function Se(e) {
  const t = M(), n = {
    ...e,
    id: e.id || D("proj"),
    tags: e.tags || [],
    commands: e.commands || [],
    isFavorite: e.isFavorite ?? !1,
    createdAt: e.createdAt || Date.now(),
    updatedAt: e.updatedAt || Date.now()
  };
  return t.push(n), be(t), n;
}
function L(e, t) {
  const n = M(), o = n.findIndex((r) => r.id === e);
  if (o === -1) return;
  const s = { ...t };
  delete s.id, delete s.createdAt;
  const i = {
    ...n[o],
    ...s,
    updatedAt: Date.now()
  };
  return n[o] = i, be(n), i;
}
function _t(e) {
  const t = M(), n = t.filter((o) => o.id !== e);
  return n.length === t.length ? !1 : (be(n), !0);
}
function Ot(e, t) {
  const n = z(e);
  if (n.commands && n.commands.length > 0) return n;
  const o = Date.now(), s = t.map((i) => ({
    ...i,
    id: i.id || D("cmd"),
    projectId: e,
    isFavorite: i.isFavorite ?? !1,
    createdAt: i.createdAt || o,
    updatedAt: o
  }));
  return L(e, { commands: s });
}
function Mt(e, t) {
  var c, l;
  const n = z(e), o = B(
    { name: t.name, command: t.command, workingDirectory: t.workingDirectory },
    n.path
  );
  if (!o.valid)
    throw new Error(o.errors.join(" "));
  const s = Date.now(), i = {
    id: D("cmd"),
    projectId: e,
    name: (t.name ?? "").trim(),
    command: (t.command ?? "").trim(),
    description: ((c = t.description) == null ? void 0 : c.trim()) || void 0,
    workingDirectory: ((l = t.workingDirectory) == null ? void 0 : l.trim()) || void 0,
    shell: t.shell,
    isFavorite: t.isFavorite ?? !1,
    createdAt: s,
    updatedAt: s
  }, r = [...n.commands ?? [], i];
  return { project: L(e, { commands: r }), command: i };
}
function Ft(e, t, n) {
  const o = z(e), s = o.commands ?? [], i = s.findIndex((u) => u.id === t);
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
    const u = B(
      { name: r.name, command: r.command, workingDirectory: r.workingDirectory },
      o.path
    );
    if (!u.valid)
      throw new Error(u.errors.join(" "));
  }
  const c = [...s];
  return c[i] = r, { project: L(e, { commands: c }), command: r };
}
function Lt(e, t) {
  const o = z(e).commands ?? [], s = o.filter((i) => i.id !== t);
  if (s.length === o.length)
    throw new Error("Command not found.");
  return L(e, { commands: s });
}
async function Vt(e, t, n = !1) {
  const o = z(e), s = (o.commands ?? []).find((p) => p.id === t);
  if (!s)
    throw new Error("Command not found. It may have been deleted.");
  if (!h.existsSync(o.path))
    throw new Error(`The folder "${o.path}" no longer exists.`);
  const i = B(
    { name: s.name, command: s.command, workingDirectory: s.workingDirectory },
    o.path
  );
  if (!i.valid)
    throw new Error(i.errors.join(" "));
  if (i.requiresConfirmation && !n)
    throw new Error(
      `"${s.name}" ${i.destructiveReason}. It was not run because it has not been confirmed.`
    );
  const r = He(o.path, s.workingDirectory), a = await ne(s.command, r);
  le(e, "command", s.id, s.name);
  const c = Date.now(), l = (o.commands ?? []).map(
    (p) => p.id === t ? { ...p, lastRunAt: c } : p
  );
  return { project: L(e, { commands: l, lastCommandAt: c }), result: a };
}
const Wt = {
  "open-in-vscode": "vscode",
  vscode: "vscode",
  "open-in-cursor": "cursor",
  cursor: "cursor",
  "open-in-antigravity": "antigravity",
  antigravity: "antigravity"
};
async function Ut(e, t, n = !1) {
  var c;
  const o = z(e), s = t.toLowerCase();
  if (!h.existsSync(o.path))
    throw new Error(`The folder "${o.path}" no longer exists.`);
  let i;
  const r = Wt[s];
  return r ? (i = await ke(r, o.path, n), le(e, "editor", r, `Open in ${((c = G[r]) == null ? void 0 : c.label) ?? r}`)) : s === "terminal" || s === "open-in-terminal" ? (i = await Ze(o.path), le(e, "terminal", "", "Open terminal")) : i = await Ke(o.path), { project: L(e, { lastOpenedAt: Date.now() }), result: i };
}
function z(e) {
  const t = ue(e);
  if (!t)
    throw new Error("Project not found.");
  return t;
}
function Bt(e) {
  const t = (n) => h.existsSync(H.join(e, n));
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
function De(e, t, n) {
  return `cmd_${gt("sha1").update(`${H.resolve(e)}::${t}::${n}`).digest("hex").slice(0, 12)}`;
}
function je(e) {
  const t = H.basename(e) || "New Project", n = /* @__PURE__ */ new Set(), o = [], s = [], i = [];
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
  const c = (g) => h.existsSync(H.join(e, g)), l = c(".git");
  l && n.add("Git");
  const u = c("Dockerfile") || c("docker-compose.yml") || c("docker-compose.yaml");
  u && n.add("Docker");
  let p = "npm run";
  c("pnpm-lock.yaml") ? (r = "pnpm", p = "pnpm", n.add("pnpm")) : c("yarn.lock") ? (r = "yarn", p = "yarn", n.add("yarn")) : c("bun.lockb") || c("bun.lock") ? (r = "bun", p = "bun run", n.add("bun")) : c("package-lock.json") && (r = "npm", p = "npm run", n.add("npm"));
  const w = H.join(e, "package.json");
  if (h.existsSync(w))
    try {
      const g = JSON.parse(h.readFileSync(w, "utf-8"));
      g.description && (a = g.description);
      const m = {
        ...g.dependencies || {},
        ...g.devDependencies || {}
      };
      if (m.typescript || c("tsconfig.json") ? (o.push("TypeScript"), n.add("TypeScript")) : (o.push("JavaScript"), n.add("JavaScript")), m.next ? (s.push("Next.js"), n.add("Next.js")) : m.react ? (s.push("React"), n.add("React")) : m.vue ? (s.push("Vue"), n.add("Vue")) : m["@angular/core"] ? (s.push("Angular"), n.add("Angular")) : m.svelte && (s.push("Svelte"), n.add("Svelte")), (m.vite || c("vite.config.ts") || c("vite.config.js")) && (s.push("Vite"), n.add("Vite")), m.express && (s.push("Express"), n.add("Express")), m.electron && (s.push("Electron"), n.add("Electron")), r || (r = "npm", n.add("npm")), g.scripts && typeof g.scripts == "object") {
        const v = g.scripts, A = Date.now(), b = (x, Y, re, ie) => {
          i.push({
            id: De(e, x, Y),
            name: x,
            command: Y,
            description: re,
            isFavorite: ie,
            createdAt: A,
            updatedAt: A
          });
        }, $ = [
          ["dev", "Start Dev Server", "Launch local development server", !0],
          ["start", "Start Application", "Start application process", !v.dev],
          ["build", "Build Production Bundle", "Compile production distribution assets", !1],
          ["test", "Run Test Suite", "Execute test scripts", !1],
          ["lint", "Lint & Format", "Run code linter", !1],
          ["typecheck", "Type Check", "Run the TypeScript compiler", !1],
          ["preview", "Preview Build", "Serve the production build locally", !1]
        ];
        for (const [x, Y, re, ie] of $)
          v[x] && b(Y, `${p} ${x}`, re, ie);
        const P = new Set($.map(([x]) => x));
        for (const x of Object.keys(v))
          P.has(x) || x.startsWith("pre") || x.startsWith("post") || b(x, `${p} ${x}`, `Run the "${x}" script`, !1);
      }
    } catch (g) {
      console.warn(`Could not parse package.json in ${e}:`, g);
    }
  if (i.length === 0) {
    const g = Date.now(), m = Bt(e);
    m && i.push({
      id: De(e, m.name, m.command),
      ...m,
      isFavorite: !0,
      createdAt: g,
      updatedAt: g
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
      hasGit: l,
      hasDocker: u
    }
  };
}
const Gt = 4096;
function C(e, t) {
  if (typeof e != "string")
    throw new Error(`${t} must be a string.`);
  const n = e.trim();
  if (!n)
    throw new Error(`${t} is required.`);
  if (n.length > Gt)
    throw new Error(`${t} is too long.`);
  if (n.includes("\0"))
    throw new Error(`${t} contains invalid characters.`);
  return n;
}
function j(e, t) {
  const n = C(e, t);
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(n))
    throw new Error(`${t} is not a valid identifier.`);
  return n;
}
function T(e, t) {
  if (typeof e != "object" || e === null || Array.isArray(e))
    throw new Error(`${t} must be an object.`);
  return e;
}
function _(e, t) {
  if (e == null) return !1;
  if (typeof e != "boolean")
    throw new Error(`${t} must be a boolean.`);
  return e;
}
function y(e, t) {
  return async (n, ...o) => {
    try {
      return await t(...o);
    } catch (s) {
      const i = s instanceof Error ? s.message : String(s);
      throw console.error(`IPC ${e} failed:`, i), new Error(i);
    }
  };
}
function N(e) {
  return { ...e, pathExists: !!e.path && h.existsSync(e.path) };
}
function zt() {
  f.handle(
    "projects:getAll",
    y("projects:getAll", () => F().map(N))
  ), f.handle(
    "projects:get",
    y("projects:get", (e) => {
      const t = ue(j(e, "Project id"));
      return t ? N(t) : void 0;
    })
  ), f.handle(
    "projects:add",
    y("projects:add", (e) => {
      const t = T(e, "Project"), n = C(t.name, "Project name"), o = C(t.path, "Project path");
      if (!h.existsSync(o))
        throw new Error(`The folder "${o}" does not exist.`);
      if (!h.statSync(o).isDirectory())
        throw new Error(`"${o}" is a file, not a folder.`);
      return N(
        Se({
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
    y("projects:update", (e, t) => {
      const n = j(e, "Project id"), o = T(t, "Updates");
      if (o.path !== void 0) {
        const i = C(o.path, "Project path");
        if (!h.existsSync(i))
          throw new Error(`The folder "${i}" does not exist.`);
      }
      o.name !== void 0 && C(o.name, "Project name");
      const s = L(n, o);
      if (!s) throw new Error("Project not found.");
      return N(s);
    })
  ), f.handle(
    "projects:delete",
    y("projects:delete", (e) => _t(j(e, "Project id")))
  ), f.handle(
    "projects:detect",
    y(
      "projects:detect",
      (e) => je(C(e, "Folder path"))
    )
  ), f.handle(
    "projects:seedCommands",
    y("projects:seedCommands", (e, t) => {
      if (!Array.isArray(t)) throw new Error("Commands must be an array.");
      return N(
        Ot(j(e, "Project id"), t)
      );
    })
  ), f.handle(
    "projects:addCommand",
    y("projects:addCommand", (e, t) => {
      const n = T(t, "Command"), { project: o, command: s } = Mt(
        j(e, "Project id"),
        n
      );
      return { project: N(o), command: s };
    })
  ), f.handle(
    "projects:updateCommand",
    y("projects:updateCommand", (e, t, n) => {
      const o = T(n, "Updates"), { project: s, command: i } = Ft(
        j(e, "Project id"),
        j(t, "Command id"),
        o
      );
      return { project: N(s), command: i };
    })
  ), f.handle(
    "projects:deleteCommand",
    y(
      "projects:deleteCommand",
      (e, t) => N(
        Lt(
          j(e, "Project id"),
          j(t, "Command id")
        )
      )
    )
  ), f.handle(
    "projects:runCommand",
    y("projects:runCommand", async (e, t, n) => {
      const { project: o } = await Vt(
        j(e, "Project id"),
        j(t, "Command id"),
        _(n, "Confirmation flag")
      );
      return N(o);
    })
  ), f.handle(
    "projects:inspectCommand",
    y("projects:inspectCommand", (e, t) => {
      const n = ue(j(e, "Project id"));
      if (!n) throw new Error("Project not found.");
      const o = (n.commands ?? []).find(
        (s) => s.id === j(t, "Command id")
      );
      if (!o) throw new Error("Command not found.");
      return B(
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
    y("projects:validateCommand", (e, t) => {
      const n = T(e, "Command");
      return B(
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
    y("projects:launch", async (e, t, n) => {
      const { project: o } = await Ut(
        j(e, "Project id"),
        C(t, "Action"),
        _(n, "New window flag")
      );
      return N(o);
    })
  );
}
function K() {
  const e = ve("groups");
  if (e.length === 0) {
    const t = [
      { id: "group_freelance", name: "Freelance", sortOrder: 1, createdAt: Date.now(), updatedAt: Date.now() },
      { id: "group_personal", name: "Personal", sortOrder: 2, createdAt: Date.now(), updatedAt: Date.now() },
      { id: "group_experiments", name: "Experiments", sortOrder: 3, createdAt: Date.now(), updatedAt: Date.now() },
      { id: "group_learning", name: "Learning", sortOrder: 4, createdAt: Date.now(), updatedAt: Date.now() }
    ];
    return Q("groups", t), t;
  }
  return e;
}
function Ee(e) {
  Q("groups", e);
}
function Ht() {
  return K();
}
function Jt(e) {
  return K().find((n) => n.id === e);
}
function qt(e) {
  const t = K(), n = {
    id: e.id || D("group"),
    name: e.name,
    icon: e.icon,
    color: e.color,
    sortOrder: e.sortOrder ?? t.length + 1,
    createdAt: e.createdAt || Date.now(),
    updatedAt: e.updatedAt || Date.now()
  };
  return t.push(n), Ee(t), n;
}
function Zt(e, t) {
  const n = K(), o = n.findIndex((i) => i.id === e);
  if (o === -1)
    return;
  const s = {
    ...n[o],
    ...t,
    updatedAt: Date.now()
  };
  return n[o] = s, Ee(n), s;
}
function Kt(e) {
  const t = K(), n = t.filter((o) => o.id !== e);
  return n.length === t.length ? !1 : (Ee(n), !0);
}
function Yt() {
  f.handle("groups:getAll", () => Ht()), f.handle("groups:get", (e, t) => Jt(t)), f.handle("groups:add", (e, t) => qt(t)), f.handle("groups:update", (e, t, n) => Zt(t, n)), f.handle("groups:delete", (e, t) => Kt(t));
}
function Xt() {
  f.handle(
    "dialog:selectFolder",
    y("dialog:selectFolder", async (e) => {
      const t = R.getFocusedWindow() ?? R.getAllWindows()[0], n = {
        title: "Select project folder",
        properties: ["openDirectory", "createDirectory"]
      };
      typeof e == "string" && e && h.existsSync(e) && (n.defaultPath = e);
      const o = t ? await $e.showOpenDialog(t, n) : await $e.showOpenDialog(n);
      if (o.canceled || o.filePaths.length === 0) return null;
      const s = o.filePaths[0];
      return { path: s, name: d.basename(s) };
    })
  ), f.handle(
    "dialog:pathExists",
    y("dialog:pathExists", (e) => {
      const t = C(e, "Path");
      return h.existsSync(t) && h.statSync(t).isDirectory();
    })
  ), f.handle(
    "shell:openExternal",
    y("shell:openExternal", async (e) => {
      const t = C(e, "URL");
      let n;
      try {
        n = new URL(t);
      } catch {
        throw new Error("That is not a valid URL.");
      }
      if (n.protocol !== "http:" && n.protocol !== "https:")
        throw new Error("Only http and https links can be opened.");
      return await de.openExternal(n.toString()), !0;
    })
  );
}
async function et(e) {
  const t = { sizeBytes: 0, fileCount: 0, lastModified: 0 }, n = [e];
  for (; n.length > 0; ) {
    const o = n.pop();
    let s;
    try {
      s = await S.readdir(o, { withFileTypes: !0 });
    } catch {
      continue;
    }
    for (const i of s) {
      const r = d.join(o, i.name);
      if (i.isSymbolicLink()) {
        t.fileCount += 1;
        continue;
      }
      if (i.isDirectory()) {
        n.push(r);
        continue;
      }
      try {
        const a = await S.stat(r);
        t.sizeBytes += a.size, t.fileCount += 1, a.mtimeMs > t.lastModified && (t.lastModified = a.mtimeMs);
      } catch {
      }
    }
  }
  return t;
}
async function Qt(e, t = 3) {
  const n = [], o = [{ dir: e, depth: 0 }], s = /* @__PURE__ */ new Set([".git", ".next", "dist", "build", "out", ".cache", ".turbo"]);
  for (; o.length > 0; ) {
    const { dir: i, depth: r } = o.shift();
    let a;
    try {
      a = await S.readdir(i, { withFileTypes: !0 });
    } catch {
      continue;
    }
    for (const c of a)
      if (!(!c.isDirectory() || c.isSymbolicLink())) {
        if (c.name === "node_modules") {
          n.push(d.join(i, c.name));
          continue;
        }
        r < t && !s.has(c.name) && !c.name.startsWith(".") && o.push({ dir: d.join(i, c.name), depth: r + 1 });
      }
  }
  return n;
}
const Re = 30, Ie = 24 * 60 * 60 * 1e3;
async function en(e) {
  const t = F(), n = [], o = [];
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
      c = await Qt(a.path);
    } catch (l) {
      o.push(`Could not scan ${a.name}: ${l.message}`), i += 1;
      continue;
    }
    s += 1;
    for (const l of c) {
      const u = await et(l), p = a.lastOpenedAt ? Math.floor((Date.now() - a.lastOpenedAt) / Ie) : null, w = u.lastModified ? Math.floor((Date.now() - u.lastModified) / Ie) : null, g = p === null ? (w ?? 0) >= Re : p >= Re, m = d.relative(a.path, l);
      n.push({
        projectId: a.id,
        projectName: a.name,
        projectPath: a.path,
        modulesPath: l,
        relativeLabel: m || "node_modules",
        sizeBytes: u.sizeBytes,
        fileCount: u.fileCount,
        lastModified: u.lastModified,
        lastOpenedAt: a.lastOpenedAt,
        daysSinceOpened: p,
        isStale: g
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
async function tn(e) {
  const n = F().filter((s) => s.path).map((s) => d.resolve(s.path)), o = { deleted: [], failed: [], reclaimedBytes: 0 };
  for (const s of e) {
    const i = d.resolve(s), r = (u) => o.failed.push({ path: s, reason: u });
    if (d.basename(i) !== "node_modules") {
      r("Not a node_modules directory.");
      continue;
    }
    if (!n.find(
      (u) => i.startsWith(u + d.sep) && i !== u
    )) {
      r("Not inside a registered project folder.");
      continue;
    }
    let c;
    try {
      c = await S.lstat(i);
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
    const { sizeBytes: l } = await et(i);
    try {
      await S.rm(i, { recursive: !0, force: !0, maxRetries: 3, retryDelay: 200 }), o.deleted.push(i), o.reclaimedBytes += l;
    } catch (u) {
      const p = u.code === "EBUSY" ? "Files are in use. Close your editor or dev server and try again." : u.message;
      r(p);
    }
  }
  return o;
}
function O(e, t, n = 1e4) {
  return new Promise((o, s) => {
    wt(
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
const nn = {
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
}, xe = /* @__PURE__ */ new Set([0, 4]);
function tt(e) {
  const t = nn[e];
  return { isDevPort: !!t || e >= 3e3 && e <= 9999 || e >= 4e3 && e <= 5999, knownService: t };
}
async function nt() {
  const e = [], t = q ? await on(e) : await rn(e), n = /* @__PURE__ */ new Map();
  for (const s of t) {
    const i = `${s.port}:${s.pid}`;
    n.has(i) || n.set(i, s);
  }
  return { entries: [...n.values()].sort((s, i) => s.port - i.port), scannedAt: Date.now(), warnings: e };
}
async function on(e) {
  const { stdout: t } = await O("netstat", ["-ano", "-p", "TCP"]), n = [];
  for (const o of t.split(/\r?\n/)) {
    const s = o.trim().split(/\s+/);
    if (s.length < 5 || s[0].toUpperCase() !== "TCP" || s[3].toUpperCase() !== "LISTENING") continue;
    const i = s[1], r = Number(s[4]);
    if (!Number.isFinite(r)) continue;
    const a = i.lastIndexOf(":");
    if (a === -1) continue;
    const c = Number(i.slice(a + 1));
    if (!Number.isFinite(c) || c === 0) continue;
    const { isDevPort: l, knownService: u } = tt(c);
    n.push({
      port: c,
      pid: r,
      protocol: "TCP",
      address: i.slice(0, a) || "0.0.0.0",
      state: "LISTENING",
      isDevPort: l,
      knownService: u,
      isProtected: xe.has(r)
    });
  }
  return await sn(n, e), n;
}
async function sn(e, t) {
  if (e.length !== 0)
    try {
      const { stdout: n } = await O("tasklist", ["/FO", "CSV", "/NH"]), o = /* @__PURE__ */ new Map();
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
async function rn(e) {
  try {
    const { stdout: t } = await O("lsof", ["-nP", "-iTCP", "-sTCP:LISTEN"]), n = [];
    for (const o of t.split(`
`).slice(1)) {
      const s = o.trim().split(/\s+/);
      if (s.length < 9) continue;
      const i = s[0], r = Number(s[1]), a = s[8];
      if (!Number.isFinite(r)) continue;
      const c = a.lastIndexOf(":");
      if (c === -1) continue;
      const l = Number(a.slice(c + 1));
      if (!Number.isFinite(l) || l === 0) continue;
      const { isDevPort: u, knownService: p } = tt(l);
      n.push({
        port: l,
        pid: r,
        protocol: "TCP",
        address: a.slice(0, c) || "*",
        state: "LISTEN",
        processName: i,
        isDevPort: u,
        knownService: p,
        isProtected: xe.has(r)
      });
    }
    return n;
  } catch (t) {
    return e.push(t.message), [];
  }
}
async function an(e, t) {
  if (!Number.isInteger(e) || e <= 0)
    throw new Error("Invalid process id.");
  if (xe.has(e))
    throw new Error("That is a protected system process and cannot be stopped.");
  const { entries: n } = await nt(), o = n.find((i) => i.pid === e && i.port === t);
  if (!o)
    throw new Error(
      `Nothing is listening on port ${t} with PID ${e} any more. Refresh the list.`
    );
  const s = q ? await O("taskkill", ["/PID", String(e), "/F", "/T"]) : await O("kill", ["-9", String(e)]);
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
const cn = [".env.example", ".env.sample", ".env.template", ".env.dist"], _e = [".env", ".env.local", ".env.development", ".env.development.local"], dn = /^\.env(\..+)?$/, ln = 3, un = /* @__PURE__ */ new Set([
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
function pn(e) {
  const t = [], n = /* @__PURE__ */ new Set(), o = /* @__PURE__ */ new Set();
  for (const s of e.split(/\r?\n/)) {
    const i = s.trim();
    if (!i || i.startsWith("#")) continue;
    const r = i.startsWith("export ") ? i.slice(7).trim() : i, a = r.indexOf("=");
    if (a <= 0) continue;
    const c = r.slice(0, a).trim();
    if (!c || !/^[A-Za-z_][A-Za-z0-9_.]*$/.test(c)) continue;
    const p = r.slice(a + 1).trim().replace(/^(['"])(.*)\1$/s, "$2").trim().length === 0;
    o.has(c) || (o.add(c), t.push(c)), p ? n.add(c) : n.delete(c);
  }
  return { keys: t, emptyKeys: n };
}
async function mn(e) {
  try {
    const t = await S.readFile(e, "utf8");
    return pn(t);
  } catch {
    return null;
  }
}
async function fn(e) {
  const t = /* @__PURE__ */ new Map(), n = [{ dir: e, depth: 0 }];
  for (; n.length > 0; ) {
    const { dir: o, depth: s } = n.shift();
    let i;
    try {
      i = await S.readdir(o, { withFileTypes: !0 });
    } catch {
      continue;
    }
    const r = [];
    for (const a of i) {
      if (a.isFile() && dn.test(a.name)) {
        r.push(a.name);
        continue;
      }
      a.isDirectory() && !a.isSymbolicLink() && s < ln && !un.has(a.name) && n.push({ dir: d.join(o, a.name), depth: s + 1 });
    }
    r.length > 0 && t.set(d.relative(e, o), r.sort());
  }
  return t;
}
async function hn(e, t) {
  const n = [d.join(e, ".gitignore")];
  t && n.push(d.join(e, t, ".gitignore"));
  for (const o of n)
    try {
      if ((await S.readFile(o, "utf8")).split(/\r?\n/).map((r) => r.trim()).some(
        (r) => r === ".env" || r === ".env*" || r === "*.env" || r === ".env.*" || r === "**/.env" || r.endsWith("/.env")
      )) return !0;
    } catch {
    }
  return !1;
}
async function gn(e, t, n) {
  const o = [], s = d.join(e, t), i = /* @__PURE__ */ new Map(), r = [];
  for (const b of n) {
    const $ = await mn(d.join(s, b));
    if (!$) {
      o.push(`Could not read ${b}.`);
      continue;
    }
    i.set(b, $), r.push({
      fileName: b,
      keyCount: $.keys.length,
      emptyKeys: $.emptyKeys.size
    });
  }
  const a = cn.find((b) => i.has(b)), c = _e.find((b) => i.has(b)), l = a ? i.get(a) : void 0, u = c ? i.get(c) : void 0, p = [];
  let w = 0, g = 0, m = 0;
  if (l && u) {
    const b = new Set(u.keys);
    for (const P of l.keys)
      b.has(P) ? u.emptyKeys.has(P) ? (p.push({ key: P, status: "empty" }), g += 1) : p.push({ key: P, status: "ok" }) : (p.push({ key: P, status: "missing" }), w += 1);
    const $ = new Set(l.keys);
    for (const P of u.keys)
      $.has(P) || (p.push({ key: P, status: "extra" }), m += 1);
  } else if (u) {
    for (const b of u.keys) {
      const $ = u.emptyKeys.has(b);
      p.push({ key: b, status: $ ? "empty" : "ok" }), $ && (g += 1);
    }
    o.push("No .env.example here, so missing keys cannot be detected.");
  } else if (l) {
    for (const b of l.keys)
      p.push({ key: b, status: "missing" }), w += 1;
    o.push(`${a} exists but there is no .env file.`);
  }
  const A = _e.some((b) => i.has(b)) && !await hn(e, t);
  return {
    relativeDir: t,
    label: t ? t.replace(/\\/g, "/") : "project root",
    exampleFile: a,
    activeFile: c,
    files: r,
    keys: p,
    missingCount: w,
    emptyCount: g,
    extraCount: m,
    envNotIgnored: A,
    warnings: o
  };
}
async function wn(e) {
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
    o = await fn(e.path);
  } catch (r) {
    return t.push(`Could not scan the project folder: ${r.message}`), n;
  }
  if (o.size === 0) return n;
  const s = [];
  for (const [r, a] of o)
    s.push(await gn(e.path, r, a));
  s.sort((r, a) => {
    if (!r.relativeDir != !a.relativeDir) return r.relativeDir ? 1 : -1;
    const c = r.missingCount * 10 + r.emptyCount, l = a.missingCount * 10 + a.emptyCount;
    return c !== l ? l - c : r.label.localeCompare(a.label);
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
async function yn(e) {
  const t = F().filter((o) => !e || o.id === e), n = [];
  for (const o of t)
    n.push(await wn(o));
  return n.sort((o, s) => {
    const i = o.missingCount * 10 + o.emptyCount, r = s.missingCount * 10 + s.emptyCount;
    return i !== r ? r - i : o.projectName.localeCompare(s.projectName);
  }), {
    reports: n,
    projectsWithIssues: n.filter((o) => o.missingCount > 0 || o.emptyCount > 0).length,
    totalMissing: n.reduce((o, s) => o + s.missingCount, 0)
  };
}
const vn = [
  { file: "pnpm-lock.yaml", manager: "pnpm", prefix: "pnpm" },
  { file: "yarn.lock", manager: "yarn", prefix: "yarn" },
  { file: "bun.lockb", manager: "bun", prefix: "bun run" },
  { file: "bun.lock", manager: "bun", prefix: "bun run" },
  { file: "package-lock.json", manager: "npm", prefix: "npm run" }
];
function ot(e) {
  for (const { file: t, manager: n, prefix: o } of vn)
    if (h.existsSync(d.join(e, t))) return { manager: n, prefix: o };
  return { manager: "npm", prefix: "npm run" };
}
async function st(e) {
  const t = d.join(e, "package.json");
  if (!h.existsSync(t)) return null;
  try {
    const n = JSON.parse(await S.readFile(t, "utf8")), o = n == null ? void 0 : n.scripts;
    if (!o || typeof o != "object") return null;
    const s = {};
    for (const [i, r] of Object.entries(o))
      typeof r == "string" && (s[i] = r);
    return s;
  } catch {
    return null;
  }
}
async function bn() {
  const e = F(), t = [], n = [];
  let o = 0;
  for (const r of e) {
    const a = !!r.path && h.existsSync(r.path);
    if (!a) continue;
    const c = await st(r.path);
    if (!c) continue;
    o += 1;
    const { manager: l, prefix: u } = ot(r.path);
    for (const [p, w] of Object.entries(c))
      t.push({
        projectId: r.id,
        projectName: r.name,
        projectPath: r.path,
        pathExists: a,
        packageManager: l,
        scriptName: p,
        scriptBody: w,
        runCommand: `${u} ${p}`
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
async function kn(e, t) {
  const n = F().find((a) => a.id === e);
  if (!n) throw new Error("Project not found.");
  if (!h.existsSync(n.path))
    throw new Error(`The folder "${n.path}" no longer exists.`);
  const o = await st(n.path);
  if (!o)
    throw new Error(`${n.name} has no package.json scripts.`);
  if (!Object.prototype.hasOwnProperty.call(o, t))
    throw new Error(`"${t}" is not a script in ${n.name}.`);
  const { prefix: s } = ot(n.path), i = `${s} ${t}`, r = await ne(i, n.path);
  return { command: i, result: r };
}
const ae = {
  isRepository: !1,
  modifiedFiles: 0,
  untrackedFiles: 0,
  ahead: 0,
  behind: 0
};
function Sn(e) {
  return h.existsSync(d.join(e, ".git"));
}
async function X(e, t, n = 8e3) {
  return O("git", ["-C", e, ...t], n);
}
async function jn(e) {
  if (!Sn(e)) return { ...ae };
  const t = { ...ae, isRepository: !0 };
  try {
    const { stdout: n, code: o } = await X(e, ["rev-parse", "--abbrev-ref", "HEAD"]);
    if (o === 0) {
      const s = n.trim();
      s && (t.branch = s);
    }
  } catch {
    return { ...ae, isRepository: !0 };
  }
  try {
    const { stdout: n, code: o } = await X(e, ["status", "--porcelain"]);
    if (o === 0)
      for (const s of n.split(/\r?\n/))
        s.trim() && (s.startsWith("??") ? t.untrackedFiles += 1 : t.modifiedFiles += 1);
  } catch {
  }
  try {
    const { stdout: n, code: o } = await X(e, [
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
    const { stdout: n, code: o } = await X(e, [
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
async function En() {
  try {
    const { code: e } = await O("git", ["--version"], 5e3);
    return e === 0;
  } catch {
    return !1;
  }
}
function rt(e) {
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
function it(e) {
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
  return rt(t) ? { valid: !0 } : { valid: !1, reason: "Could not work out a folder name from that URL." };
}
const xn = 24 * 60 * 60 * 1e3, Cn = 90, An = 60, $n = [
  "pnpm-lock.yaml",
  "yarn.lock",
  "bun.lockb",
  "bun.lock",
  "package-lock.json"
];
function Oe(e, t) {
  return e ? Math.floor((t - e) / xn) : null;
}
async function Pn(e) {
  const t = d.join(e, "package.json"), n = h.existsSync(t);
  if (!n)
    return { hasPackageJson: n, hasNodeModules: !1, lockfileName: void 0, lockfileDrift: !1 };
  const o = h.existsSync(d.join(e, "node_modules")), s = $n.find((r) => h.existsSync(d.join(e, r)));
  let i = !1;
  if (s)
    try {
      const [r, a] = await Promise.all([
        S.stat(t),
        S.stat(d.join(e, s))
      ]);
      i = r.mtimeMs - a.mtimeMs > 6e4;
    } catch {
      i = !1;
    }
  return { hasPackageJson: n, hasNodeModules: o, lockfileName: s, lockfileDrift: i };
}
function Nn(e) {
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
    ), e.daysSinceCommit !== null && e.daysSinceCommit >= Cn && o(
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
  ) : e.daysSinceOpened >= An && o(
    {
      kind: "never-opened",
      severity: "low",
      label: `${e.daysSinceOpened}d untouched`,
      detail: `Not opened from Dev Launcher in ${e.daysSinceOpened} days.`
    },
    3
  ), { issues: t, score: n };
}
async function Tn(e) {
  const t = F(), n = [], o = [], s = await En();
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
    const c = !!a.path && h.existsSync(a.path), l = c && s ? await jn(a.path) : {
      isRepository: c ? h.existsSync(d.join(a.path, ".git")) : !1,
      modifiedFiles: 0,
      untrackedFiles: 0,
      ahead: 0,
      behind: 0,
      branch: void 0,
      lastCommitAt: void 0,
      lastCommitMessage: void 0
    }, u = c ? await Pn(a.path) : { hasPackageJson: !1, hasNodeModules: !1, lockfileName: void 0, lockfileDrift: !1 }, p = {
      projectId: a.id,
      projectName: a.name,
      projectPath: a.path,
      pathExists: c,
      isRepository: l.isRepository,
      branch: l.branch,
      modifiedFiles: l.modifiedFiles,
      untrackedFiles: l.untrackedFiles,
      ahead: l.ahead,
      behind: l.behind,
      lastCommitAt: l.lastCommitAt,
      lastCommitMessage: l.lastCommitMessage,
      daysSinceCommit: Oe(l.lastCommitAt, i),
      hasPackageJson: u.hasPackageJson,
      hasNodeModules: u.hasNodeModules,
      lockfileName: u.lockfileName,
      lockfileDrift: u.lockfileDrift,
      lastOpenedAt: a.lastOpenedAt,
      daysSinceOpened: Oe(a.lastOpenedAt, i)
    }, { issues: w, score: g } = Nn(p);
    o.push({ ...p, issues: w, score: g });
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
const Dn = [
  { lockfile: "pnpm-lock.yaml", command: "pnpm install" },
  { lockfile: "yarn.lock", command: "yarn install" },
  { lockfile: "bun.lockb", command: "bun install" },
  { lockfile: "bun.lock", command: "bun install" },
  { lockfile: "package-lock.json", command: "npm install" }
];
function Rn(e, t, n) {
  return new Promise((o, s) => {
    var c, l;
    const i = we(
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
    const a = (u) => {
      const p = u.toString();
      r = (r + p).slice(-4e3);
      for (const w of p.split(/\r?\n|\r/)) {
        const g = w.trim();
        g && n(g);
      }
    };
    (c = i.stdout) == null || c.on("data", a), (l = i.stderr) == null || l.on("data", a), i.on("error", (u) => {
      s(
        u.code === "ENOENT" ? new Error("git was not found on your PATH.") : u
      );
    }), i.on("close", (u) => {
      if (u === 0) {
        o();
        return;
      }
      const p = r.trim().split(/\r?\n/).slice(-3).join(" ");
      s(new Error(p || `git clone exited with code ${u}.`));
    });
  });
}
async function In(e, t) {
  const n = [], o = (m, v, A, b = !1) => t == null ? void 0 : t({ phase: m, message: v, detail: A, done: b });
  o("validating", "Checking the repository URL...");
  const s = String(e.url ?? "").trim(), i = it(s);
  if (!i.valid)
    throw new Error(i.reason ?? "That repository URL is not valid.");
  const r = d.resolve(String(e.destinationParent ?? "").trim());
  if (!r || !h.existsSync(r))
    throw new Error("Choose a destination folder that exists.");
  if (!h.statSync(r).isDirectory())
    throw new Error("The destination must be a folder.");
  const c = String(e.folderName ?? "").trim() || rt(s);
  if (!/^[A-Za-z0-9._-]+$/.test(c) || c === "." || c === "..")
    throw new Error("That folder name is not valid.");
  const l = d.join(r, c);
  if (!d.resolve(l).startsWith(r + d.sep))
    throw new Error("That folder name is not valid.");
  if (h.existsSync(l))
    throw new Error(`"${c}" already exists in that folder.`);
  o("cloning", `Cloning into ${c}...`);
  try {
    await Rn(s, l, (m) => {
      o("cloning", `Cloning into ${c}...`, m);
    });
  } catch (m) {
    try {
      h.existsSync(l) && await S.rm(l, { recursive: !0, force: !0, maxRetries: 2 });
    } catch {
      n.push(`A partial clone may remain at ${l}.`);
    }
    throw m;
  }
  o("detecting", "Detecting the project stack...");
  let u;
  try {
    u = je(l);
  } catch (m) {
    n.push(`Stack detection failed: ${m.message}`), u = {
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
  const p = Se({
    name: u.name || c,
    path: l,
    description: u.description,
    tags: u.tags,
    isFavorite: !1,
    commands: u.commands.map((m) => ({ ...m, id: m.id || D("cmd") }))
  });
  let w = !1;
  if (e.installDependencies) {
    const m = Dn.find(
      ({ lockfile: A }) => h.existsSync(d.join(l, A))
    );
    if (!h.existsSync(d.join(l, "package.json")))
      n.push("No package.json found, so dependencies were not installed.");
    else {
      const A = (m == null ? void 0 : m.command) ?? "npm install";
      o("installing", `Running ${A}...`);
      try {
        await ne(A, l), w = !0;
      } catch (b) {
        n.push(`Could not start the install: ${b.message}`);
      }
    }
  }
  let g = !1;
  if (e.openInEditor) {
    const m = e.openInEditor;
    if (!G[m])
      n.push(`Unknown editor "${m}".`);
    else {
      o("opening", `Opening ${G[m].label}...`);
      try {
        await ke(m, l, !1), g = !0;
      } catch (v) {
        n.push(v.message);
      }
    }
  }
  return o("done", `${p.name} is ready.`, void 0, !0), {
    projectId: p.id,
    projectName: p.name,
    projectPath: l,
    detectedTags: u.tags,
    commandCount: u.commands.length,
    installStarted: w,
    editorOpened: g,
    warnings: n
  };
}
const Me = 200;
function ce(e, t) {
  for (const n of R.getAllWindows())
    n.isDestroyed() || n.webContents.send(e, t);
}
function _n() {
  f.handle(
    "tools:scanDisk",
    y("tools:scanDisk", async (e, t) => en((n) => ce("tools:diskScanProgress", n)))
  ), f.handle(
    "tools:deleteModules",
    y("tools:deleteModules", (e) => {
      if (!Array.isArray(e))
        throw new Error("Expected a list of folders to delete.");
      if (e.length === 0)
        throw new Error("Nothing was selected.");
      if (e.length > Me)
        throw new Error(`Too many folders selected (limit ${Me}).`);
      const t = e.map((n, o) => C(n, `Target ${o + 1}`));
      return tn(t);
    })
  ), f.handle(
    "tools:listPorts",
    y("tools:listPorts", () => nt())
  ), f.handle(
    "tools:killPort",
    y("tools:killPort", (e, t) => {
      if (typeof e != "number" || !Number.isInteger(e) || e <= 0)
        throw new Error("Invalid process id.");
      if (typeof t != "number" || !Number.isInteger(t) || t <= 0 || t > 65535)
        throw new Error("Invalid port number.");
      return an(e, t);
    })
  ), f.handle(
    "tools:auditEnv",
    y(
      "tools:auditEnv",
      (e) => yn(
        e == null ? void 0 : j(e, "Project id")
      )
    )
  ), f.handle(
    "tools:indexScripts",
    y("tools:indexScripts", () => bn())
  ), f.handle(
    "tools:runScript",
    y("tools:runScript", async (e, t) => {
      const n = C(t, "Script name");
      if (!/^[A-Za-z0-9_.:\-/ ]{1,120}$/.test(n))
        throw new Error("That script name contains unsupported characters.");
      const { command: o } = await kn(j(e, "Project id"), n);
      return { command: o };
    })
  ), f.handle(
    "tools:scanRadar",
    y(
      "tools:scanRadar",
      () => Tn((e) => ce("tools:radarProgress", e))
    )
  ), f.handle(
    "tools:validateCloneUrl",
    y(
      "tools:validateCloneUrl",
      (e) => it(typeof e == "string" ? e : "")
    )
  ), f.handle(
    "tools:clone",
    y("tools:clone", (e) => {
      const t = T(e, "Clone request");
      return In(
        {
          url: C(t.url, "Repository URL"),
          destinationParent: C(t.destinationParent, "Destination folder"),
          folderName: typeof t.folderName == "string" && t.folderName.trim() ? t.folderName.trim() : void 0,
          installDependencies: _(
            t.installDependencies,
            "Install dependencies flag"
          ),
          openInEditor: typeof t.openInEditor == "string" && t.openInEditor ? t.openInEditor : void 0
        },
        (n) => ce("tools:cloneProgress", n)
      );
    })
  );
}
const On = ["editor", "command", "terminal", "folder", "url"], Fe = 30;
function Mn(e) {
  if (!Array.isArray(e)) throw new Error("Steps must be an array.");
  if (e.length > Fe) throw new Error(`A session can hold at most ${Fe} steps.`);
  return e.map((t, n) => {
    const o = T(t, `Step ${n + 1}`), s = String(o.kind ?? "");
    if (!On.includes(s))
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
function Fn() {
  f.handle(
    "sessions:get",
    y(
      "sessions:get",
      (e) => Z(j(e, "Project id"))
    )
  ), f.handle(
    "sessions:getAll",
    y("sessions:getAll", () => (It(), $t()))
  ), f.handle(
    "sessions:update",
    y("sessions:update", (e, t) => {
      const n = T(t, "Updates");
      return Pt(j(e, "Project id"), {
        steps: n.steps === void 0 ? void 0 : Mn(n.steps),
        autoCapture: n.autoCapture === void 0 ? void 0 : _(n.autoCapture, "Auto capture")
      });
    })
  ), f.handle(
    "sessions:clear",
    y(
      "sessions:clear",
      (e) => Nt(j(e, "Project id"))
    )
  ), f.handle(
    "sessions:resume",
    y("sessions:resume", async (e) => {
      const t = R.getAllWindows();
      return Dt(j(e, "Project id"), (n) => {
        for (const o of t)
          o.isDestroyed() || o.webContents.send("sessions:resumeProgress", n);
      });
    })
  );
}
const pe = 720, me = 460, Ln = [
  "CommandOrControl+Space",
  "Alt+Space",
  "CommandOrControl+Shift+Space"
];
let E = null, V = null;
function Vn() {
  return V;
}
function Wn(e, t, n) {
  const o = new R({
    width: pe,
    height: me,
    show: !1,
    frame: !1,
    transparent: !0,
    backgroundColor: "#00000000",
    resizable: !1,
    movable: !1,
    minimizable: !1,
    maximizable: !1,
    fullscreenable: !1,
    skipTaskbar: !0,
    alwaysOnTop: !0,
    // Keep it out of the window list; it is a transient palette, not an app
    // window the user should be able to alt-tab into.
    webPreferences: {
      preload: e,
      contextIsolation: !0,
      nodeIntegration: !1,
      sandbox: !0
    }
  });
  return o.setAlwaysOnTop(!0, "floating"), o.setVisibleOnAllWorkspaces(!0, { visibleOnFullScreen: !0 }), t ? o.loadURL(`${t}#/overlay`) : n && o.loadFile(d.join(n, "index.html"), { hash: "/overlay" }), o.on("close", (s) => {
    s.preventDefault(), o.hide();
  }), o.on("blur", () => {
    o.isVisible() && o.hide();
  }), o;
}
function Un(e) {
  const t = Pe.getCursorScreenPoint(), n = Pe.getDisplayNearestPoint(t), { x: o, y: s, width: i, height: r } = n.workArea;
  e.setBounds({
    x: Math.round(o + (i - pe) / 2),
    // Slightly above centre reads better than dead centre.
    y: Math.round(s + Math.max(60, (r - me) / 3)),
    width: pe,
    height: me
  });
}
function Bn() {
  !E || E.isDestroyed() || (Un(E), E.show(), E.focus(), E.webContents.send("overlay:shown"));
}
function fe() {
  E && !E.isDestroyed() && E.isVisible() && E.hide();
}
function Gn() {
  !E || E.isDestroyed() || (E.isVisible() ? fe() : Bn());
}
function zn(e) {
  E = Wn(
    e.preloadPath,
    e.devServerUrl,
    e.rendererDist
  );
  for (const t of Ln)
    try {
      if (Be.register(t, Gn)) {
        V = t;
        break;
      }
    } catch {
    }
  return V ? console.log(`Global launcher bound to ${V}`) : console.warn("Could not register a global launcher shortcut; all candidates were taken."), V;
}
function Hn() {
  Be.unregisterAll(), V = null, E && !E.isDestroyed() && (E.removeAllListeners("close"), E.destroy()), E = null;
}
function Jn(e) {
  f.handle(
    "overlay:hide",
    y("overlay:hide", () => (fe(), !0))
  ), f.handle(
    "overlay:getShortcut",
    y("overlay:getShortcut", () => Vn())
  ), f.handle(
    "overlay:focusMain",
    y("overlay:focusMain", (t) => {
      fe();
      const n = e();
      return !n || n.isDestroyed() ? !1 : (n.isMinimized() && n.restore(), n.show(), n.focus(), typeof t == "string" && /^\/[A-Za-z0-9?=&/_-]*$/.test(t) && n.webContents.send("overlay:navigate", t), !0);
    })
  );
}
const qn = [
  {
    id: "react-vite",
    name: "React + Vite",
    description: "Fast Single Page Application powered by Vite and React",
    category: "frontend",
    defaultVariant: "ts",
    supportedVariants: ["ts", "js"],
    icon: "Zap",
    defaultPort: 5173,
    tags: ["React", "Vite", "Frontend", "SPA"],
    cliCommand: "npm create vite@latest"
  },
  {
    id: "nextjs",
    name: "Next.js App Router",
    description: "Full-stack React framework with App Router, SSR, and API routes",
    category: "fullstack",
    defaultVariant: "ts",
    supportedVariants: ["ts", "js"],
    icon: "Globe",
    defaultPort: 3e3,
    tags: ["Next.js", "React", "Fullstack", "SSR"],
    cliCommand: "npx create-next-app@latest"
  },
  {
    id: "express-api",
    name: "Express Node API",
    description: "Lightweight RESTful API server powered by Express and Node.js",
    category: "backend",
    defaultVariant: "ts",
    supportedVariants: ["ts", "js"],
    icon: "Server",
    defaultPort: 3001,
    tags: ["Express", "Node.js", "Backend", "REST"],
    cliCommand: "npm init -y"
  },
  {
    id: "electron-app",
    name: "Electron App (Vite+React)",
    description: "Cross-platform desktop application powered by Electron, Vite, and React",
    category: "desktop",
    defaultVariant: "ts",
    supportedVariants: ["ts", "js"],
    icon: "Cpu",
    defaultPort: 5173,
    tags: ["Electron", "React", "Desktop", "Vite"],
    cliCommand: "npx create-electron-app"
  },
  {
    id: "python-fastapi",
    name: "Python FastAPI",
    description: "High-performance Python asynchronous REST API with automatic OpenAPI docs",
    category: "backend",
    defaultVariant: "ts",
    supportedVariants: ["ts", "js"],
    icon: "Terminal",
    defaultPort: 8e3,
    tags: ["Python", "FastAPI", "Backend", "REST"],
    cliCommand: "python -m venv venv"
  }
];
function Zn(e, t, n, o, s, i = !1, r) {
  e({ step: t, message: n, percentage: o, logLine: s, done: i, error: r });
}
function J(e, t, n, o, s) {
  return new Promise((i, r) => {
    var u, p;
    const a = we(e, t, {
      cwd: n,
      shell: process.platform === "win32",
      windowsHide: !0,
      env: { ...process.env, ...s }
    });
    let c = "";
    const l = (w) => {
      const g = w.toString();
      c = (c + g).slice(-4e3);
      for (const m of g.split(/\r?\n|\r/)) {
        const v = m.trim();
        v && o(v);
      }
    };
    (u = a.stdout) == null || u.on("data", l), (p = a.stderr) == null || p.on("data", l), a.on("error", (w) => {
      r(
        w.code === "ENOENT" ? new Error(`"${e}" was not found on PATH.`) : w
      );
    }), a.on("close", (w) => {
      if (w === 0) {
        i();
        return;
      }
      const g = c.trim().split(/\r?\n/).slice(-3).join(" ");
      r(new Error(g || `"${e}" exited with code ${w}.`));
    });
  });
}
async function k(e, t) {
  await S.mkdir(d.dirname(e), { recursive: !0 }), await S.writeFile(e, t, "utf-8");
}
async function Kn(e, t, n) {
  const o = n === "ts", s = o ? "tsx" : "jsx", i = o ? "tsx" : "jsx";
  await k(
    d.join(e, "package.json"),
    JSON.stringify(
      {
        name: t,
        version: "0.0.0",
        private: !0,
        scripts: {
          dev: "vite",
          build: o ? "tsc && vite build" : "vite build",
          preview: "vite preview",
          ...o ? { typecheck: "tsc --noEmit" } : {}
        },
        dependencies: { react: "^18.2.0", "react-dom": "^18.2.0" },
        devDependencies: {
          "@vitejs/plugin-react": "^4.2.1",
          vite: "^5.2.0",
          ...o ? {
            typescript: "^5.2.2",
            "@types/react": "^18.2.66",
            "@types/react-dom": "^18.2.22"
          } : {}
        }
      },
      null,
      2
    )
  ), await k(
    d.join(e, "vite.config." + (o ? "ts" : "js")),
    `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
});
`
  ), o && await k(
    d.join(e, "tsconfig.json"),
    JSON.stringify(
      {
        compilerOptions: {
          target: "ES2020",
          useDefineForClassFields: !0,
          lib: ["ES2020", "DOM", "DOM.Iterable"],
          module: "ESNext",
          skipLibCheck: !0,
          moduleResolution: "bundler",
          allowImportingTsExtensions: !0,
          resolveJsonModule: !0,
          isolatedModules: !0,
          noEmit: !0,
          jsx: "react-jsx",
          strict: !0
        },
        include: ["src"]
      },
      null,
      2
    )
  ), await k(d.join(e, "index.html"), `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${t}</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.${i}"><\/script>
  </body>
</html>
`), await k(
    d.join(e, `src/main.${i}`),
    `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.${s}';

ReactDOM.createRoot(document.getElementById('root')${o ? "!" : ""}).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
`
  ), await k(
    d.join(e, `src/App.${s}`),
    `import React from 'react';

function App()${o ? ": JSX.Element" : ""} {
  return (
    <div>
      <h1>${t}</h1>
      <p>Built with React + Vite${o ? " + TypeScript" : ""}</p>
    </div>
  );
}

export default App;
`
  );
}
async function Yn(e, t, n) {
  const o = n === "ts";
  await k(
    d.join(e, "package.json"),
    JSON.stringify(
      {
        name: t,
        version: "0.1.0",
        private: !0,
        scripts: {
          dev: "next dev",
          build: "next build",
          start: "next start",
          lint: "next lint"
        },
        dependencies: {
          next: "14.2.3",
          react: "^18",
          "react-dom": "^18"
        },
        devDependencies: {
          ...o ? {
            typescript: "^5",
            "@types/node": "^20",
            "@types/react": "^18",
            "@types/react-dom": "^18"
          } : {},
          eslint: "^8",
          "eslint-config-next": "14.2.3"
        }
      },
      null,
      2
    )
  ), await k(
    d.join(e, `next.config.${o ? "ts" : "js"}`),
    `/** @type {import('next').NextConfig} */
const nextConfig = {};

export default nextConfig;
`
  ), o && await k(
    d.join(e, "tsconfig.json"),
    JSON.stringify(
      {
        compilerOptions: {
          lib: ["dom", "dom.iterable", "esnext"],
          allowJs: !0,
          skipLibCheck: !0,
          strict: !0,
          noEmit: !0,
          esModuleInterop: !0,
          module: "esnext",
          moduleResolution: "bundler",
          resolveJsonModule: !0,
          isolatedModules: !0,
          jsx: "preserve",
          incremental: !0,
          plugins: [{ name: "next" }],
          paths: { "@/*": ["./src/*"] }
        },
        include: ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
        exclude: ["node_modules"]
      },
      null,
      2
    )
  );
  const s = o ? "tsx" : "jsx";
  await k(
    d.join(e, `src/app/page.${s}`),
    `export default function Home() {
  return (
    <main>
      <h1>${t}</h1>
      <p>Welcome to your Next.js app.</p>
    </main>
  );
}
`
  ), await k(
    d.join(e, `src/app/layout.${s}`),
    `export const metadata = { title: '${t}', description: 'Generated by Dev Launcher' };

export default function RootLayout({ children }${o ? ": { children: React.ReactNode }" : ""}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
`
  );
}
async function Le(e, t, n) {
  const o = n === "ts";
  await k(
    d.join(e, "package.json"),
    JSON.stringify(
      {
        name: t,
        version: "1.0.0",
        private: !0,
        scripts: {
          dev: o ? "tsx watch src/index.ts" : "nodemon src/index.js",
          start: o ? "node dist/index.js" : "node src/index.js",
          build: o ? "tsc" : void 0,
          lint: "eslint src/"
        },
        dependencies: {
          express: "^4.18.2",
          cors: "^2.8.5",
          dotenv: "^16.3.1"
        },
        devDependencies: {
          ...o ? {
            typescript: "^5.2.2",
            tsx: "^4.7.0",
            "@types/express": "^4.17.21",
            "@types/cors": "^2.8.17",
            "@types/node": "^20.11.0"
          } : { nodemon: "^3.0.3" }
        }
      },
      null,
      2
    )
  ), o && await k(
    d.join(e, "tsconfig.json"),
    JSON.stringify(
      {
        compilerOptions: {
          target: "ES2020",
          module: "commonjs",
          lib: ["ES2020"],
          outDir: "./dist",
          rootDir: "./src",
          strict: !0,
          esModuleInterop: !0,
          skipLibCheck: !0,
          forceConsistentCasingInFileNames: !0
        },
        include: ["src/**/*"],
        exclude: ["node_modules", "dist"]
      },
      null,
      2
    )
  );
  const s = o ? "src/index.ts" : "src/index.js";
  await k(
    d.join(e, s),
    `import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.get('/', (_req, res) => {
  res.json({ message: 'Welcome to ${t} API', status: 'ok' });
});

app.get('/health', (_req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(\`Server running on http://localhost:\${PORT}\`);
});
`
  ), await k(d.join(e, ".env"), `PORT=3001
NODE_ENV=development
`), await k(d.join(e, ".env.example"), `PORT=3001
NODE_ENV=development
`);
}
async function Ve(e, t) {
  const n = t.replace(/[^a-z0-9]+/gi, "_").toLowerCase();
  await k(
    d.join(e, "main.py"),
    `from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

app = FastAPI(
    title="${t}",
    description="High-performance Python API built with FastAPI",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "Welcome to ${t} API", "status": "ok"}

@app.get("/health")
async def health():
    return {"status": "healthy"}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
`
  ), await k(
    d.join(e, "requirements.txt"),
    `fastapi>=0.109.0
uvicorn[standard]>=0.27.0
python-dotenv>=1.0.0
`
  ), await k(
    d.join(e, "pyproject.toml"),
    `[project]
name = "${n}"
version = "0.1.0"
description = "${t} API"

[tool.ruff]
line-length = 100
`
  ), await k(d.join(e, ".env"), `APP_ENV=development
`), await k(d.join(e, ".env.example"), `APP_ENV=development
`);
}
async function We(e, t, n) {
  const o = n === "ts";
  await k(
    d.join(e, "package.json"),
    JSON.stringify(
      {
        name: t,
        version: "0.0.0",
        main: "dist-electron/main.js",
        private: !0,
        scripts: {
          dev: "vite",
          build: o ? "tsc && vite build" : "vite build",
          preview: "vite preview",
          "electron:dev": 'concurrently "npm run dev" "electron ."'
        },
        dependencies: { electron: "^28.1.0" },
        devDependencies: {
          "@vitejs/plugin-react": "^4.2.1",
          concurrently: "^8.2.2",
          react: "^18.2.0",
          "react-dom": "^18.2.0",
          vite: "^5.2.0",
          "vite-plugin-electron": "^0.28.4",
          ...o ? {
            typescript: "^5.2.2",
            "@types/react": "^18.2.66",
            "@types/react-dom": "^18.2.22",
            "@types/node": "^20.11.0"
          } : {}
        }
      },
      null,
      2
    )
  );
  const s = o ? "ts" : "js", i = o ? "tsx" : "jsx";
  await k(
    d.join(e, `electron/main.${s}`),
    `import { app, BrowserWindow } from 'electron';
import path from 'path';

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: { nodeIntegration: false, contextIsolation: true },
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

app.whenReady().then(createWindow);
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
`
  ), await k(
    d.join(e, `src/main.${i}`),
    `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.${i}';

ReactDOM.createRoot(document.getElementById('root')${o ? "!" : ""}).render(<React.StrictMode><App /></React.StrictMode>);
`
  ), await k(
    d.join(e, `src/App.${i}`),
    `import React from 'react';

function App()${o ? ": JSX.Element" : ""} {
  return <div><h1>${t}</h1><p>Electron + Vite + React${o ? " + TS" : ""}</p></div>;
}

export default App;
`
  ), await k(d.join(e, "index.html"), `<!doctype html>
<html lang="en">
  <head><meta charset="UTF-8" /><title>${t}</title></head>
  <body><div id="root"></div><script type="module" src="/src/main.${i}"><\/script></body>
</html>
`);
}
async function Xn(e, t, n) {
  const { templateId: o, name: s, variant: i } = e;
  switch (o) {
    case "react-vite": {
      const r = i === "ts" ? "react-ts" : "react";
      try {
        const a = "__vite_tmp__", c = d.join(d.dirname(t), a);
        await J(
          "npm",
          ["create", "vite@latest", a, "--", "--template", r],
          d.dirname(t),
          n,
          { npm_config_yes: "true" }
        ), await S.rename(c, t);
      } catch {
        n("[fallback] CLI unavailable, generating local scaffold..."), await S.mkdir(t, { recursive: !0 }), await Kn(t, s, i);
      }
      break;
    }
    case "nextjs": {
      try {
        await J(
          "npx",
          [
            "--yes",
            "create-next-app@latest",
            s,
            i === "ts" ? "--typescript" : "--no-typescript",
            "--eslint",
            "--app",
            "--no-tailwind",
            "--src-dir",
            "--no-import-alias"
          ],
          d.dirname(t),
          n
        );
      } catch {
        n("[fallback] CLI unavailable, generating local scaffold..."), await S.mkdir(t, { recursive: !0 }), await Yn(t, s, i);
      }
      break;
    }
    case "express-api": {
      try {
        await S.mkdir(t, { recursive: !0 }), await J("npm", ["init", "-y"], t, n), await Le(t, s, i);
      } catch {
        n("[fallback] Generating local scaffold..."), await S.mkdir(t, { recursive: !0 }), await Le(t, s, i);
      }
      break;
    }
    case "electron-app": {
      try {
        await S.mkdir(t, { recursive: !0 }), await We(t, s, i);
      } catch {
        n("[fallback] Generating local scaffold..."), await S.mkdir(t, { recursive: !0 }), await We(t, s, i);
      }
      break;
    }
    case "python-fastapi": {
      try {
        await S.mkdir(t, { recursive: !0 }), await Ve(t, s);
      } catch {
        n("[fallback] Generating local scaffold..."), await S.mkdir(t, { recursive: !0 }), await Ve(t, s);
      }
      break;
    }
    default:
      throw new Error(`Unknown template id: "${o}".`);
  }
}
function Qn(e) {
  const t = `# OS
.DS_Store
Thumbs.db

# Editor
.vscode/settings.json
.idea/
`, n = `
# Dependencies
node_modules/

# Build
dist/
dist-electron/
.next/
out/
build/

# Env
.env
.env.local

# Logs
*.log
npm-debug.log*
`, o = `
# Python
__pycache__/
*.pyc
*.pyo
venv/
.venv/
*.egg-info/
dist/
build/

# Env
.env
.env.local
`;
  return e === "python-fastapi" ? t + o : t + n;
}
function eo() {
  return qn;
}
const Ue = /* @__PURE__ */ new Map();
async function to(e, t) {
  const n = [], o = D("gen");
  Ue.set(o, !1);
  const s = (v, A, b, $, P = !1, x) => Zn(t, v, A, b, $, P, x);
  s("validating", "Validating project configuration…", 5);
  const { name: i, targetPath: r, templateId: a, gitInit: c, installDeps: l } = e, u = (i ?? "").trim();
  if (!u || !/^[A-Za-z0-9._-]+$/.test(u))
    throw new Error("Project name must contain only letters, numbers, dots, dashes, underscores.");
  const p = d.resolve((r ?? "").trim());
  if (!p || !h.existsSync(p))
    throw new Error("Choose a destination folder that already exists on disk.");
  if (!h.statSync(p).isDirectory())
    throw new Error("The destination path must be a folder.");
  const w = d.join(p, u);
  if (!d.resolve(w).startsWith(p + d.sep) && d.resolve(w) !== p)
    throw new Error("Invalid project name (path escape detected).");
  if (h.existsSync(w))
    throw new Error(`A folder named "${u}" already exists there.`);
  s("validating", "All checks passed.", 10), s("scaffolding", `Creating ${u} from template…`, 15);
  try {
    await Xn(e, w, (v) => {
      s("scaffolding", `Scaffolding ${u}…`, 30, v);
    });
  } catch (v) {
    try {
      h.existsSync(w) && await S.rm(w, { recursive: !0, force: !0, maxRetries: 2 });
    } catch {
      n.push(`A partial folder may remain at ${w}.`);
    }
    throw v;
  }
  try {
    const v = d.join(w, ".gitignore");
    h.existsSync(v) || await S.writeFile(v, Qn(a), "utf-8");
  } catch {
    n.push("Could not write .gitignore.");
  }
  if (s("scaffolding", "Scaffold complete.", 45), c) {
    s("git", "Initialising git repository…", 50);
    try {
      await J(
        "git",
        ["init"],
        w,
        (v) => s("git", "Initialising git…", 55, v)
      ), s("git", "Git repository ready.", 60);
    } catch (v) {
      n.push(`git init failed: ${v.message}`), s("git", "git init skipped (git not found on PATH).", 60);
    }
  }
  if (l && a !== "python-fastapi") {
    s("dependencies", "Installing dependencies…", 65);
    const v = e.packageManager ?? "npm", A = d.join(w, "package.json");
    if (h.existsSync(A))
      try {
        await J(
          v,
          ["install"],
          w,
          (b) => s("dependencies", `Running ${v} install…`, 75, b)
        ), s("dependencies", "Dependencies installed.", 80);
      } catch (b) {
        n.push(`${v} install failed: ${b.message}`), s("dependencies", `${v} install failed — open a terminal to install manually.`, 80);
      }
    else
      n.push("No package.json found; skipping dependency install.");
  }
  l && a === "python-fastapi" && (s("dependencies", "For Python: activate your venv and run 'pip install -r requirements.txt'.", 80), n.push("Python deps not auto-installed. Run: pip install -r requirements.txt")), s("indexing", "Detecting project metadata…", 85);
  let g;
  try {
    g = je(w);
  } catch (v) {
    n.push(`Metadata detection failed: ${v.message}`), g = {
      name: u,
      tags: [],
      commands: [],
      details: { languages: [], frameworks: [], hasGit: c, hasDocker: !1 }
    };
  }
  s("indexing", "Registering in Dev Launcher…", 90);
  const m = Se({
    name: g.name || u,
    path: w,
    description: g.description,
    tags: g.tags,
    isFavorite: !1,
    commands: g.commands.map((v) => ({ ...v, id: v.id || D("cmd") }))
  });
  return s("complete", `${m.name} is ready!`, 100, void 0, !0), Ue.delete(o), {
    success: !0,
    projectPath: w,
    projectId: m.id,
    warnings: n,
    project: { ...m, pathExists: !0 },
    detectedMeta: g
  };
}
function no(e) {
  for (const t of R.getAllWindows())
    t.isDestroyed() || t.webContents.send("generator:progress", e);
}
function oo() {
  f.handle(
    "generator:getTemplates",
    y("generator:getTemplates", () => eo())
  ), f.handle(
    "generator:create",
    y("generator:create", (e) => {
      const t = T(e, "Generator request"), n = C(t.templateId, "Template ID"), o = C(t.name, "Project name"), s = C(t.targetPath, "Target path"), i = typeof t.variant == "string" && ["ts", "js"].includes(t.variant) ? t.variant : "ts", r = _(t.gitInit ?? !0, "Git init flag"), a = _(t.installDeps ?? !0, "Install deps flag"), c = _(t.openEditor ?? !1, "Open editor flag"), l = typeof t.packageManager == "string" && ["npm", "pnpm", "yarn", "bun"].includes(t.packageManager) ? t.packageManager : "npm";
      return to(
        {
          templateId: n,
          name: o,
          targetPath: s,
          variant: i,
          gitInit: r,
          installDeps: a,
          openEditor: c,
          packageManager: l
        },
        no
      );
    })
  ), f.handle(
    "generator:cancel",
    y("generator:cancel", () => !0)
  );
}
const Ce = d.dirname(ct(import.meta.url));
process.env.APP_ROOT = d.join(Ce, "..");
const W = process.env.VITE_DEV_SERVER_URL, po = d.join(process.env.APP_ROOT, "dist-electron"), Ae = d.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = W ? d.join(process.env.APP_ROOT, "public") : Ae;
let I;
function at() {
  I = new R({
    icon: d.join(process.env.VITE_PUBLIC, "electron-vite.svg"),
    width: 1280,
    height: 820,
    minWidth: 940,
    minHeight: 600,
    backgroundColor: "#181818",
    webPreferences: {
      preload: d.join(Ce, "preload.mjs"),
      // Set explicitly rather than relying on Electron's defaults, so a major
      // version bump can never silently weaken the sandbox.
      contextIsolation: !0,
      nodeIntegration: !1,
      sandbox: !0,
      webviewTag: !1
    }
  }), I.webContents.setWindowOpenHandler(({ url: e }) => ((e.startsWith("http://") || e.startsWith("https://")) && de.openExternal(e), { action: "deny" })), I.webContents.on("will-navigate", (e, t) => {
    !(W && t.startsWith(W)) && !t.startsWith("file://") && (e.preventDefault(), (t.startsWith("http://") || t.startsWith("https://")) && de.openExternal(t));
  }), W ? I.loadURL(W) : I.loadFile(d.join(Ae, "index.html"));
}
U.on("window-all-closed", () => {
  process.platform !== "darwin" && (U.quit(), I = null);
});
U.on("will-quit", Hn);
U.on("activate", () => {
  R.getAllWindows().length === 0 && at();
});
U.whenReady().then(() => {
  zt(), Yt(), Xt(), _n(), Fn(), Jn(() => I), oo(), at(), zn({
    preloadPath: d.join(Ce, "preload.mjs"),
    devServerUrl: W,
    rendererDist: Ae
  });
});
export {
  po as MAIN_DIST,
  Ae as RENDERER_DIST,
  W as VITE_DEV_SERVER_URL
};
