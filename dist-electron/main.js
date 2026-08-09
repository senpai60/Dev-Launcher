import { app as D, ipcMain as c, BrowserWindow as _, dialog as K, shell as G } from "electron";
import { fileURLToPath as fe } from "node:url";
import l, { join as L } from "node:path";
import u, { existsSync as q, readFileSync as he, writeFileSync as ge, renameSync as we, unlinkSync as ye, copyFileSync as ve, mkdirSync as je } from "fs";
import { randomUUID as be, createHash as Ee } from "node:crypto";
import { spawn as ke } from "child_process";
import C from "path";
const oe = 1, se = () => {
  const e = L(D.getPath("userData"), "DevLauncher");
  return je(e, { recursive: !0 }), e;
}, B = (e) => L(se(), `${e}.json`), Ae = (e) => {
  const t = B(e);
  if (!q(t)) return null;
  const r = L(se(), `${e}.corrupt-${Date.now()}.json`);
  try {
    return ve(t, r), r;
  } catch (n) {
    return console.error(`Could not quarantine ${e}.json:`, n), null;
  }
}, Se = (e, t) => {
  if (Array.isArray(e))
    return console.log(`Migrating ${t}.json from v0 (bare array) to v${oe}`), e;
  if (e && typeof e == "object" && Array.isArray(e.data))
    return e.data;
  throw new Error(`Unrecognised shape in ${t}.json`);
}, ae = (e) => {
  const t = B(e);
  if (!q(t)) return [];
  let r;
  try {
    r = he(t, "utf8");
  } catch (n) {
    throw console.error(`Could not read ${e}.json:`, n), new Error(`Unable to read ${e} storage.`);
  }
  if (r.trim() === "") return [];
  try {
    return Se(JSON.parse(r), e);
  } catch (n) {
    const o = Ae(e);
    throw console.error(
      `${e}.json is corrupt and was backed up to ${o ?? "(backup failed)"}:`,
      n
    ), new Error(
      `${e}.json could not be read and was backed up. Starting from an empty list.`
    );
  }
}, V = (e, t) => {
  const r = B(e), n = `${r}.tmp`, o = { version: oe, data: t };
  try {
    ge(n, JSON.stringify(o, null, 2), "utf8"), we(n, r);
  } catch (s) {
    console.error(`Error saving ${e}.json:`, s);
    try {
      q(n) && ye(n);
    } catch {
    }
    throw new Error(`Unable to save ${e}. Your changes were not written to disk.`);
  }
};
function $() {
  return ae("projects");
}
function H(e) {
  V("projects", e);
}
function O(e = "id") {
  const t = be().replace(/-/g, "").slice(0, 12);
  return `${e}_${t}`;
}
const ee = 80, te = 2e3, xe = [
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
function Ce(e) {
  for (const { pattern: t, reason: r } of xe)
    if (t.test(e))
      return { destructive: !0, reason: r };
  return { destructive: !1 };
}
function P(e, t) {
  const r = [], n = (e.name ?? "").trim(), o = (e.command ?? "").trim(), s = (e.workingDirectory ?? "").trim();
  if (n ? n.length > ee && r.push(`Command name must be ${ee} characters or fewer.`) : r.push("Command name is required."), o ? o.length > te && r.push(`Command string must be ${te} characters or fewer.`) : r.push("Command string is required."), /[\r\n]/.test(o) && r.push("Command string cannot span multiple lines."), (/\0/.test(o) || /\0/.test(n)) && r.push("Command contains invalid characters."), s) {
    if (l.isAbsolute(s))
      r.push("Working directory must be relative to the project folder.");
    else if (s.split(/[/\\]/).includes(".."))
      r.push("Working directory cannot escape the project folder.");
    else if (t) {
      const i = l.resolve(t, s);
      i.startsWith(l.resolve(t)) ? u.existsSync(i) || r.push(`Working directory "${s}" does not exist.`) : r.push("Working directory cannot escape the project folder.");
    }
  }
  const { destructive: a, reason: g } = Ce(o);
  return {
    valid: r.length === 0,
    errors: r,
    requiresConfirmation: a,
    destructiveReason: g
  };
}
function De(e, t) {
  const r = l.resolve(e);
  if (!t || !t.trim()) return r;
  const n = l.resolve(r, t.trim());
  if (!n.startsWith(r))
    throw new Error("Working directory escapes the project folder.");
  if (!u.existsSync(n))
    throw new Error(`Working directory "${t}" does not exist.`);
  return n;
}
const J = process.platform === "win32", ie = process.platform === "darwin";
function Pe(e) {
  return J ? { command: "explorer.exe", args: [e], detached: !0 } : ie ? { command: "open", args: [e], detached: !0 } : { command: "xdg-open", args: [e], detached: !0 };
}
function ce(e, t) {
  return J ? {
    command: "cmd",
    args: ["/c", "start", "", ...t ? ["cmd", "/k", t] : ["cmd", "/k"]],
    detached: !0
  } : ie ? t ? { command: "osascript", args: ["-e", `tell application "Terminal" to do script "cd ${Re(e)} && ${t.replace(/"/g, '\\"')}"`], detached: !0 } : { command: "open", args: ["-a", "Terminal", e], detached: !0 } : { command: "x-terminal-emulator", args: t ? ["-e", `bash -c '${t.replace(/'/g, "'\\''")}; exec bash'`] : [], detached: !0 };
}
const de = {
  vscode: { bin: "code", label: "VS Code" },
  cursor: { bin: "cursor", label: "Cursor" },
  antigravity: { bin: "agy", label: "Antigravity" }
};
function $e(e, t, r) {
  const n = de[e];
  if (!n) return null;
  const o = e === "vscode" ? [r ? "-n" : "-r", t] : [t];
  return {
    command: J ? `${n.bin}.cmd` : n.bin,
    args: o,
    detached: !1
  };
}
function Re(e) {
  return e.replace(/(["\s'$`\\])/g, "\\$1");
}
function I(e, t) {
  return new Promise((r, n) => {
    let o;
    try {
      o = ke(e.command, e.args, {
        cwd: t,
        shell: !1,
        detached: e.detached,
        stdio: "ignore",
        windowsHide: !1
      });
    } catch (a) {
      n(a);
      return;
    }
    let s = !1;
    if (o.on("error", (a) => {
      s || (s = !0, n(
        a.code === "ENOENT" ? new Error(`"${e.command}" was not found on your PATH.`) : a
      ));
    }), e.detached) {
      o.unref(), setTimeout(() => {
        s || (s = !0, r({ ok: !0, detached: !0 }));
      }, 100);
      return;
    }
    o.on("close", (a) => {
      s || (s = !0, a === 0 || a === null ? r({ ok: !0, detached: !1 }) : n(new Error(`"${e.command}" exited with code ${a}.`)));
    });
  });
}
function W(e) {
  const t = l.resolve(e);
  if (!u.existsSync(t))
    throw new Error(`The folder "${t}" no longer exists.`);
  return t;
}
async function Te(e, t, r = !1) {
  var s;
  const n = W(t), o = $e(e, n, r);
  if (!o)
    throw new Error(`Unknown editor "${e}".`);
  try {
    return await I(o, n);
  } catch (a) {
    const g = ((s = de[e]) == null ? void 0 : s.label) ?? e, i = a instanceof Error ? a.message : String(a);
    throw i.includes("was not found on your PATH") ? new Error(
      `${g} was not detected. Make sure its command-line launcher is installed and on your PATH.`
    ) : new Error(`Could not open ${g}: ${i}`);
  }
}
async function _e(e) {
  const t = W(e);
  return I(ce(t), t);
}
async function Oe(e) {
  const t = W(e);
  return I(Pe(t), t);
}
async function Ie(e, t) {
  const r = W(t);
  return I(ce(r, e), r);
}
function We() {
  return $();
}
function M(e) {
  return $().find((t) => t.id === e);
}
function Ne(e) {
  const t = $(), r = {
    ...e,
    id: e.id || O("proj"),
    tags: e.tags || [],
    commands: e.commands || [],
    isFavorite: e.isFavorite ?? !1,
    createdAt: e.createdAt || Date.now(),
    updatedAt: e.updatedAt || Date.now()
  };
  return t.push(r), H(t), r;
}
function E(e, t) {
  const r = $(), n = r.findIndex((a) => a.id === e);
  if (n === -1) return;
  const o = { ...t };
  delete o.id, delete o.createdAt;
  const s = {
    ...r[n],
    ...o,
    updatedAt: Date.now()
  };
  return r[n] = s, H(r), s;
}
function Fe(e) {
  const t = $(), r = t.filter((n) => n.id !== e);
  return r.length === t.length ? !1 : (H(r), !0);
}
function Ue(e, t) {
  const r = A(e);
  if (r.commands && r.commands.length > 0) return r;
  const n = Date.now(), o = t.map((s) => ({
    ...s,
    id: s.id || O("cmd"),
    projectId: e,
    isFavorite: s.isFavorite ?? !1,
    createdAt: s.createdAt || n,
    updatedAt: n
  }));
  return E(e, { commands: o });
}
function Ge(e, t) {
  var i, j;
  const r = A(e), n = P(
    { name: t.name, command: t.command, workingDirectory: t.workingDirectory },
    r.path
  );
  if (!n.valid)
    throw new Error(n.errors.join(" "));
  const o = Date.now(), s = {
    id: O("cmd"),
    projectId: e,
    name: (t.name ?? "").trim(),
    command: (t.command ?? "").trim(),
    description: ((i = t.description) == null ? void 0 : i.trim()) || void 0,
    workingDirectory: ((j = t.workingDirectory) == null ? void 0 : j.trim()) || void 0,
    shell: t.shell,
    isFavorite: t.isFavorite ?? !1,
    createdAt: o,
    updatedAt: o
  }, a = [...r.commands ?? [], s];
  return { project: E(e, { commands: a }), command: s };
}
function Me(e, t, r) {
  const n = A(e), o = n.commands ?? [], s = o.findIndex((b) => b.id === t);
  if (s === -1)
    throw new Error("Command not found.");
  const a = {
    ...o[s],
    ...r,
    id: o[s].id,
    projectId: e,
    createdAt: o[s].createdAt,
    updatedAt: Date.now()
  };
  if (r.name !== void 0 || r.command !== void 0 || r.workingDirectory !== void 0) {
    const b = P(
      { name: a.name, command: a.command, workingDirectory: a.workingDirectory },
      n.path
    );
    if (!b.valid)
      throw new Error(b.errors.join(" "));
  }
  const i = [...o];
  return i[s] = a, { project: E(e, { commands: i }), command: a };
}
function Le(e, t) {
  const n = A(e).commands ?? [], o = n.filter((s) => s.id !== t);
  if (o.length === n.length)
    throw new Error("Command not found.");
  return E(e, { commands: o });
}
async function qe(e, t, r = !1) {
  const n = A(e), o = (n.commands ?? []).find((w) => w.id === t);
  if (!o)
    throw new Error("Command not found. It may have been deleted.");
  if (!u.existsSync(n.path))
    throw new Error(`The folder "${n.path}" no longer exists.`);
  const s = P(
    { name: o.name, command: o.command, workingDirectory: o.workingDirectory },
    n.path
  );
  if (!s.valid)
    throw new Error(s.errors.join(" "));
  if (s.requiresConfirmation && !r)
    throw new Error(
      `"${o.name}" ${s.destructiveReason}. It was not run because it has not been confirmed.`
    );
  const a = De(n.path, o.workingDirectory), g = await Ie(o.command, a), i = Date.now(), j = (n.commands ?? []).map(
    (w) => w.id === t ? { ...w, lastRunAt: i } : w
  );
  return { project: E(e, { commands: j, lastCommandAt: i }), result: g };
}
const Be = {
  "open-in-vscode": "vscode",
  vscode: "vscode",
  "open-in-cursor": "cursor",
  cursor: "cursor",
  "open-in-antigravity": "antigravity",
  antigravity: "antigravity"
};
async function Ve(e, t, r = !1) {
  const n = A(e), o = t.toLowerCase();
  if (!u.existsSync(n.path))
    throw new Error(`The folder "${n.path}" no longer exists.`);
  let s;
  const a = Be[o];
  return a ? s = await Te(a, n.path, r) : o === "terminal" || o === "open-in-terminal" ? s = await _e(n.path) : s = await Oe(n.path), { project: E(e, { lastOpenedAt: Date.now() }), result: s };
}
function A(e) {
  const t = M(e);
  if (!t)
    throw new Error("Project not found.");
  return t;
}
function He(e) {
  const t = (r) => u.existsSync(C.join(e, r));
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
function re(e, t, r) {
  return `cmd_${Ee("sha1").update(`${C.resolve(e)}::${t}::${r}`).digest("hex").slice(0, 12)}`;
}
function Je(e) {
  const t = C.basename(e) || "New Project", r = /* @__PURE__ */ new Set(), n = [], o = [], s = [];
  let a, g;
  if (!e || !u.existsSync(e))
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
  const i = (m) => u.existsSync(C.join(e, m)), j = i(".git");
  j && r.add("Git");
  const b = i("Dockerfile") || i("docker-compose.yml") || i("docker-compose.yaml");
  b && r.add("Docker");
  let w = "npm run";
  i("pnpm-lock.yaml") ? (a = "pnpm", w = "pnpm", r.add("pnpm")) : i("yarn.lock") ? (a = "yarn", w = "yarn", r.add("yarn")) : i("bun.lockb") || i("bun.lock") ? (a = "bun", w = "bun run", r.add("bun")) : i("package-lock.json") && (a = "npm", w = "npm run", r.add("npm"));
  const X = C.join(e, "package.json");
  if (u.existsSync(X))
    try {
      const m = JSON.parse(u.readFileSync(X, "utf-8"));
      m.description && (g = m.description);
      const p = {
        ...m.dependencies || {},
        ...m.devDependencies || {}
      };
      if (p.typescript || i("tsconfig.json") ? (n.push("TypeScript"), r.add("TypeScript")) : (n.push("JavaScript"), r.add("JavaScript")), p.next ? (o.push("Next.js"), r.add("Next.js")) : p.react ? (o.push("React"), r.add("React")) : p.vue ? (o.push("Vue"), r.add("Vue")) : p["@angular/core"] ? (o.push("Angular"), r.add("Angular")) : p.svelte && (o.push("Svelte"), r.add("Svelte")), (p.vite || i("vite.config.ts") || i("vite.config.js")) && (o.push("Vite"), r.add("Vite")), p.express && (o.push("Express"), r.add("Express")), p.electron && (o.push("Electron"), r.add("Electron")), a || (a = "npm", r.add("npm")), m.scripts && typeof m.scripts == "object") {
        const N = m.scripts, Q = Date.now(), Y = (f, T, F, U) => {
          s.push({
            id: re(e, f, T),
            name: f,
            command: T,
            description: F,
            isFavorite: U,
            createdAt: Q,
            updatedAt: Q
          });
        }, Z = [
          ["dev", "Start Dev Server", "Launch local development server", !0],
          ["start", "Start Application", "Start application process", !N.dev],
          ["build", "Build Production Bundle", "Compile production distribution assets", !1],
          ["test", "Run Test Suite", "Execute test scripts", !1],
          ["lint", "Lint & Format", "Run code linter", !1],
          ["typecheck", "Type Check", "Run the TypeScript compiler", !1],
          ["preview", "Preview Build", "Serve the production build locally", !1]
        ];
        for (const [f, T, F, U] of Z)
          N[f] && Y(T, `${w} ${f}`, F, U);
        const pe = new Set(Z.map(([f]) => f));
        for (const f of Object.keys(N))
          pe.has(f) || f.startsWith("pre") || f.startsWith("post") || Y(f, `${w} ${f}`, `Run the "${f}" script`, !1);
      }
    } catch (m) {
      console.warn(`Could not parse package.json in ${e}:`, m);
    }
  if (s.length === 0) {
    const m = Date.now(), p = He(e);
    p && s.push({
      id: re(e, p.name, p.command),
      ...p,
      isFavorite: !0,
      createdAt: m,
      updatedAt: m
    });
  }
  return (i("requirements.txt") || i("pyproject.toml") || i("Pipfile")) && (n.push("Python"), r.add("Python")), i("go.mod") && (n.push("Go"), r.add("Go")), i("Cargo.toml") && (n.push("Rust"), r.add("Rust")), (i("pom.xml") || i("build.gradle")) && (n.push("Java"), r.add("Java")), {
    name: t,
    tags: Array.from(r),
    description: g,
    commands: s,
    details: {
      languages: n,
      frameworks: o,
      packageManager: a,
      hasGit: j,
      hasDocker: b
    }
  };
}
const ze = 4096;
function v(e, t) {
  if (typeof e != "string")
    throw new Error(`${t} must be a string.`);
  const r = e.trim();
  if (!r)
    throw new Error(`${t} is required.`);
  if (r.length > ze)
    throw new Error(`${t} is too long.`);
  if (r.includes("\0"))
    throw new Error(`${t} contains invalid characters.`);
  return r;
}
function h(e, t) {
  const r = v(e, t);
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(r))
    throw new Error(`${t} is not a valid identifier.`);
  return r;
}
function S(e, t) {
  if (typeof e != "object" || e === null || Array.isArray(e))
    throw new Error(`${t} must be an object.`);
  return e;
}
function ne(e, t) {
  if (e == null) return !1;
  if (typeof e != "boolean")
    throw new Error(`${t} must be a boolean.`);
  return e;
}
function d(e, t) {
  return async (r, ...n) => {
    try {
      return await t(...n);
    } catch (o) {
      const s = o instanceof Error ? o.message : String(o);
      throw console.error(`IPC ${e} failed:`, s), new Error(s);
    }
  };
}
function y(e) {
  return { ...e, pathExists: !!e.path && u.existsSync(e.path) };
}
function Xe() {
  c.handle(
    "projects:getAll",
    d("projects:getAll", () => We().map(y))
  ), c.handle(
    "projects:get",
    d("projects:get", (e) => {
      const t = M(h(e, "Project id"));
      return t ? y(t) : void 0;
    })
  ), c.handle(
    "projects:add",
    d("projects:add", (e) => {
      const t = S(e, "Project"), r = v(t.name, "Project name"), n = v(t.path, "Project path");
      if (!u.existsSync(n))
        throw new Error(`The folder "${n}" does not exist.`);
      if (!u.statSync(n).isDirectory())
        throw new Error(`"${n}" is a file, not a folder.`);
      return y(
        Ne({
          ...t,
          name: r,
          path: n,
          tags: Array.isArray(t.tags) ? t.tags : [],
          isFavorite: !!t.isFavorite
        })
      );
    })
  ), c.handle(
    "projects:update",
    d("projects:update", (e, t) => {
      const r = h(e, "Project id"), n = S(t, "Updates");
      if (n.path !== void 0) {
        const s = v(n.path, "Project path");
        if (!u.existsSync(s))
          throw new Error(`The folder "${s}" does not exist.`);
      }
      n.name !== void 0 && v(n.name, "Project name");
      const o = E(r, n);
      if (!o) throw new Error("Project not found.");
      return y(o);
    })
  ), c.handle(
    "projects:delete",
    d("projects:delete", (e) => Fe(h(e, "Project id")))
  ), c.handle(
    "projects:detect",
    d(
      "projects:detect",
      (e) => Je(v(e, "Folder path"))
    )
  ), c.handle(
    "projects:seedCommands",
    d("projects:seedCommands", (e, t) => {
      if (!Array.isArray(t)) throw new Error("Commands must be an array.");
      return y(
        Ue(h(e, "Project id"), t)
      );
    })
  ), c.handle(
    "projects:addCommand",
    d("projects:addCommand", (e, t) => {
      const r = S(t, "Command"), { project: n, command: o } = Ge(
        h(e, "Project id"),
        r
      );
      return { project: y(n), command: o };
    })
  ), c.handle(
    "projects:updateCommand",
    d("projects:updateCommand", (e, t, r) => {
      const n = S(r, "Updates"), { project: o, command: s } = Me(
        h(e, "Project id"),
        h(t, "Command id"),
        n
      );
      return { project: y(o), command: s };
    })
  ), c.handle(
    "projects:deleteCommand",
    d(
      "projects:deleteCommand",
      (e, t) => y(
        Le(
          h(e, "Project id"),
          h(t, "Command id")
        )
      )
    )
  ), c.handle(
    "projects:runCommand",
    d("projects:runCommand", async (e, t, r) => {
      const { project: n } = await qe(
        h(e, "Project id"),
        h(t, "Command id"),
        ne(r, "Confirmation flag")
      );
      return y(n);
    })
  ), c.handle(
    "projects:inspectCommand",
    d("projects:inspectCommand", (e, t) => {
      const r = M(h(e, "Project id"));
      if (!r) throw new Error("Project not found.");
      const n = (r.commands ?? []).find(
        (o) => o.id === h(t, "Command id")
      );
      if (!n) throw new Error("Command not found.");
      return P(
        {
          name: n.name,
          command: n.command,
          workingDirectory: n.workingDirectory
        },
        r.path
      );
    })
  ), c.handle(
    "projects:validateCommand",
    d("projects:validateCommand", (e, t) => {
      const r = S(e, "Command");
      return P(
        {
          name: typeof r.name == "string" ? r.name : "",
          command: typeof r.command == "string" ? r.command : "",
          workingDirectory: typeof r.workingDirectory == "string" ? r.workingDirectory : void 0
        },
        typeof t == "string" ? t : void 0
      );
    })
  ), c.handle(
    "projects:launch",
    d("projects:launch", async (e, t, r) => {
      const { project: n } = await Ve(
        h(e, "Project id"),
        v(t, "Action"),
        ne(r, "New window flag")
      );
      return y(n);
    })
  );
}
function R() {
  const e = ae("groups");
  if (e.length === 0) {
    const t = [
      { id: "group_freelance", name: "Freelance", sortOrder: 1, createdAt: Date.now(), updatedAt: Date.now() },
      { id: "group_personal", name: "Personal", sortOrder: 2, createdAt: Date.now(), updatedAt: Date.now() },
      { id: "group_experiments", name: "Experiments", sortOrder: 3, createdAt: Date.now(), updatedAt: Date.now() },
      { id: "group_learning", name: "Learning", sortOrder: 4, createdAt: Date.now(), updatedAt: Date.now() }
    ];
    return V("groups", t), t;
  }
  return e;
}
function z(e) {
  V("groups", e);
}
function Qe() {
  return R();
}
function Ye(e) {
  return R().find((r) => r.id === e);
}
function Ze(e) {
  const t = R(), r = {
    id: e.id || O("group"),
    name: e.name,
    icon: e.icon,
    color: e.color,
    sortOrder: e.sortOrder ?? t.length + 1,
    createdAt: e.createdAt || Date.now(),
    updatedAt: e.updatedAt || Date.now()
  };
  return t.push(r), z(t), r;
}
function Ke(e, t) {
  const r = R(), n = r.findIndex((s) => s.id === e);
  if (n === -1)
    return;
  const o = {
    ...r[n],
    ...t,
    updatedAt: Date.now()
  };
  return r[n] = o, z(r), o;
}
function et(e) {
  const t = R(), r = t.filter((n) => n.id !== e);
  return r.length === t.length ? !1 : (z(r), !0);
}
function tt() {
  c.handle("groups:getAll", () => Qe()), c.handle("groups:get", (e, t) => Ye(t)), c.handle("groups:add", (e, t) => Ze(t)), c.handle("groups:update", (e, t, r) => Ke(t, r)), c.handle("groups:delete", (e, t) => et(t));
}
function rt() {
  c.handle(
    "dialog:selectFolder",
    d("dialog:selectFolder", async (e) => {
      const t = _.getFocusedWindow() ?? _.getAllWindows()[0], r = {
        title: "Select project folder",
        properties: ["openDirectory", "createDirectory"]
      };
      typeof e == "string" && e && u.existsSync(e) && (r.defaultPath = e);
      const n = t ? await K.showOpenDialog(t, r) : await K.showOpenDialog(r);
      if (n.canceled || n.filePaths.length === 0) return null;
      const o = n.filePaths[0];
      return { path: o, name: l.basename(o) };
    })
  ), c.handle(
    "dialog:pathExists",
    d("dialog:pathExists", (e) => {
      const t = v(e, "Path");
      return u.existsSync(t) && u.statSync(t).isDirectory();
    })
  ), c.handle(
    "shell:openExternal",
    d("shell:openExternal", async (e) => {
      const t = v(e, "URL");
      let r;
      try {
        r = new URL(t);
      } catch {
        throw new Error("That is not a valid URL.");
      }
      if (r.protocol !== "http:" && r.protocol !== "https:")
        throw new Error("Only http and https links can be opened.");
      return await G.openExternal(r.toString()), !0;
    })
  );
}
const ue = l.dirname(fe(import.meta.url));
process.env.APP_ROOT = l.join(ue, "..");
const x = process.env.VITE_DEV_SERVER_URL, ut = l.join(process.env.APP_ROOT, "dist-electron"), le = l.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = x ? l.join(process.env.APP_ROOT, "public") : le;
let k;
function me() {
  k = new _({
    icon: l.join(process.env.VITE_PUBLIC, "electron-vite.svg"),
    width: 1280,
    height: 820,
    minWidth: 940,
    minHeight: 600,
    backgroundColor: "#181818",
    webPreferences: {
      preload: l.join(ue, "preload.mjs"),
      // Set explicitly rather than relying on Electron's defaults, so a major
      // version bump can never silently weaken the sandbox.
      contextIsolation: !0,
      nodeIntegration: !1,
      sandbox: !0,
      webviewTag: !1
    }
  }), k.webContents.setWindowOpenHandler(({ url: e }) => ((e.startsWith("http://") || e.startsWith("https://")) && G.openExternal(e), { action: "deny" })), k.webContents.on("will-navigate", (e, t) => {
    !(x && t.startsWith(x)) && !t.startsWith("file://") && (e.preventDefault(), (t.startsWith("http://") || t.startsWith("https://")) && G.openExternal(t));
  }), x ? k.loadURL(x) : k.loadFile(l.join(le, "index.html"));
}
D.on("window-all-closed", () => {
  process.platform !== "darwin" && (D.quit(), k = null);
});
D.on("activate", () => {
  _.getAllWindows().length === 0 && me();
});
D.whenReady().then(() => {
  Xe(), tt(), rt(), me();
});
export {
  ut as MAIN_DIST,
  le as RENDERER_DIST,
  x as VITE_DEV_SERVER_URL
};
