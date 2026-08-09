import { app as h, ipcMain as l, BrowserWindow as R } from "electron";
import { createRequire as J } from "node:module";
import { fileURLToPath as U } from "node:url";
import u, { join as O } from "node:path";
import P, { readFileSync as B, writeFileSync as M, mkdirSync as b } from "fs";
import { randomUUID as q } from "node:crypto";
import { exec as v } from "child_process";
import _ from "path";
const W = () => {
  const t = O(h.getPath("userData"), "DevLauncher");
  return b(t, { recursive: !0 }), t;
};
console.log(h.getPath("userData"));
const I = (t) => O(W(), `${t}.json`), C = (t) => {
  try {
    const n = B(I(t), "utf8");
    return JSON.parse(n);
  } catch {
    return [];
  }
}, $ = (t, n) => {
  try {
    M(I(t), JSON.stringify(n));
  } catch (e) {
    console.error("Error saving data:", e);
  }
};
function j() {
  try {
    return C("projects");
  } catch {
    return [];
  }
}
function x(t) {
  $("projects", t);
}
function F(t = "id") {
  const n = q().replace(/-/g, "").slice(0, 12);
  return `${t}_${n}`;
}
function z(t, n = !1, e) {
  const o = u.resolve(t), r = `code ${n ? "-n" : "-r"} "${o}"`;
  v(r, (a, g, i) => {
    if (a) {
      console.error(`Failed to open VS Code: ${i}`), e && e(a, null);
      return;
    }
    console.log(`Opened ${o} in VS Code`), e && e(null, g);
  });
}
function H(t, n) {
  const e = u.resolve(t), o = `cursor "${e}"`;
  v(o, (s, r, a) => {
    if (s) {
      console.error(`Failed to open Cursor: ${a}`), n && n(s, null);
      return;
    }
    console.log(`Opened ${e} in Cursor`), n && n(null, r);
  });
}
function K(t, n) {
  const e = u.resolve(t), o = `agy "${e}"`;
  v(o, (s, r, a) => {
    if (s) {
      console.error(`Failed to open Antigravity: ${a}`), n && n(s, null);
      return;
    }
    console.log(`Opened ${e} in Antigravity`), n && n(null, r);
  });
}
function Q(t, n) {
  const e = u.resolve(t), o = `start cmd /k cd /d "${e}"`;
  v(o, (s, r, a) => {
    if (s) {
      console.error(`error opening terminal: ${a}`, s), n && n(s, null);
      return;
    }
    console.log("terminal opened successfully", e), n && n(null, r);
  });
}
function X(t, n) {
  const e = u.resolve(t), o = `explorer.exe "${e}"`;
  v(o, (s, r, a) => {
    if (s) {
      console.error(`Failed to open Explorer: ${a}`), n && n(s, null);
      return;
    }
    console.log(`Opened ${e} in Explorer`), n && n(null, r);
  });
}
function Y(t, n, e) {
  const o = u.resolve(n), s = `start cmd /k "cd /d "${o}" && ${t}"`;
  v(s, (r, a, g) => {
    if (r) {
      console.error(`Failed to execute command "${t}": ${g}`, r), e && e(r, null);
      return;
    }
    console.log(`Executing "${t}" in ${o}`), e && e(null, a);
  });
}
function Z() {
  return j();
}
function G(t) {
  return j().find((e) => e.id === t);
}
function ee(t) {
  const n = j(), e = {
    ...t,
    id: t.id || F("proj"),
    tags: t.tags || [],
    isFavorite: t.isFavorite ?? !1,
    createdAt: t.createdAt || Date.now(),
    updatedAt: t.updatedAt || Date.now()
  };
  return n.push(e), x(n), e;
}
function T(t, n) {
  const e = j(), o = e.findIndex((r) => r.id === t);
  if (o === -1)
    return;
  const s = {
    ...e[o],
    ...n,
    updatedAt: Date.now()
  };
  return e[o] = s, x(e), s;
}
function te(t) {
  const n = j(), e = n.filter((o) => o.id !== t);
  return e.length === n.length ? !1 : (x(e), !0);
}
function ne(t, n, e = !1, o) {
  const s = G(t);
  if (!s) {
    o && o(new Error("Project not found"), null);
    return;
  }
  T(t, { lastOpenedAt: Date.now() });
  try {
    const r = s.path;
    switch (n.toLowerCase()) {
      case "open-in-vscode":
      case "vscode":
        z(r, e, o);
        break;
      case "open-in-cursor":
      case "cursor":
        H(r, o);
        break;
      case "open-in-antigravity":
      case "antigravity":
        K(r, o);
        break;
      case "open-in-terminal":
      case "terminal":
        Q(r, o);
        break;
      case "folder":
      case "explorer":
      default:
        X(r, o);
        break;
    }
  } catch (r) {
    o(r, null);
  }
}
function oe(t) {
  const n = _.basename(t) || "New Project", e = /* @__PURE__ */ new Set(), o = [], s = [], r = [];
  let a, g;
  if (!t || !P.existsSync(t))
    return {
      name: n,
      tags: [],
      commands: [],
      details: {
        languages: [],
        frameworks: [],
        hasGit: !1,
        hasDocker: !1
      }
    };
  const i = (c) => P.existsSync(_.join(t, c)), D = i(".git");
  D && e.add("Git");
  const k = i("Dockerfile") || i("docker-compose.yml") || i("docker-compose.yaml");
  k && e.add("Docker");
  let p = "npm run";
  i("pnpm-lock.yaml") ? (a = "pnpm", p = "pnpm", e.add("pnpm")) : i("yarn.lock") ? (a = "yarn", p = "yarn", e.add("yarn")) : i("bun.lockb") || i("bun.lock") ? (a = "bun", p = "bun run", e.add("bun")) : i("package-lock.json") && (a = "npm", p = "npm run", e.add("npm"));
  const E = _.join(t, "package.json");
  if (P.existsSync(E))
    try {
      const c = JSON.parse(P.readFileSync(E, "utf-8"));
      c.description && (g = c.description);
      const f = {
        ...c.dependencies || {},
        ...c.devDependencies || {}
      };
      if (f.typescript || i("tsconfig.json") ? (o.push("TypeScript"), e.add("TypeScript")) : (o.push("JavaScript"), e.add("JavaScript")), f.next ? (s.push("Next.js"), e.add("Next.js")) : f.react ? (s.push("React"), e.add("React")) : f.vue ? (s.push("Vue"), e.add("Vue")) : f["@angular/core"] ? (s.push("Angular"), e.add("Angular")) : f.svelte && (s.push("Svelte"), e.add("Svelte")), (f.vite || i("vite.config.ts") || i("vite.config.js")) && (s.push("Vite"), e.add("Vite")), f.express && (s.push("Express"), e.add("Express")), f.electron && (s.push("Electron"), e.add("Electron")), a || (a = "npm", e.add("npm")), c.scripts && typeof c.scripts == "object") {
        const A = c.scripts, d = Date.now();
        A.dev ? r.push({
          id: `cmd_dev_${d}`,
          name: "Start Dev Server",
          command: `${p} dev`,
          description: "Launch local development server",
          isFavorite: !0,
          createdAt: d,
          updatedAt: d
        }) : A.start && r.push({
          id: `cmd_start_${d}`,
          name: "Start Application",
          command: `${p} start`,
          description: "Start application process",
          isFavorite: !0,
          createdAt: d,
          updatedAt: d
        }), A.build && r.push({
          id: `cmd_build_${d}`,
          name: "Build Production Bundle",
          command: `${p} build`,
          description: "Compile production distribution assets",
          isFavorite: !1,
          createdAt: d,
          updatedAt: d
        }), A.test && r.push({
          id: `cmd_test_${d}`,
          name: "Run Test Suite",
          command: `${p} test`,
          description: "Execute test scripts",
          isFavorite: !1,
          createdAt: d,
          updatedAt: d
        }), A.lint && r.push({
          id: `cmd_lint_${d}`,
          name: "Lint & Format",
          command: `${p} lint`,
          description: "Run code linter",
          isFavorite: !1,
          createdAt: d,
          updatedAt: d
        });
      }
    } catch {
    }
  if (r.length === 0) {
    const c = Date.now();
    r.push({
      id: `cmd_default_${c}`,
      name: "Start Application",
      command: `${p} start`,
      description: "Default application start command",
      isFavorite: !0,
      createdAt: c,
      updatedAt: c
    });
  }
  return (i("requirements.txt") || i("pyproject.toml") || i("Pipfile")) && (o.push("Python"), e.add("Python")), i("go.mod") && (o.push("Go"), e.add("Go")), i("Cargo.toml") && (o.push("Rust"), e.add("Rust")), (i("pom.xml") || i("build.gradle")) && (o.push("Java"), e.add("Java")), {
    name: n,
    tags: Array.from(e),
    description: g,
    commands: r,
    details: {
      languages: o,
      frameworks: s,
      packageManager: a,
      hasGit: D,
      hasDocker: k
    }
  };
}
function re() {
  l.handle("projects:getAll", () => Z()), l.handle("projects:get", (t, n) => G(n)), l.handle("projects:add", (t, n) => ee(n)), l.handle("projects:update", (t, n, e) => T(n, e)), l.handle("projects:delete", (t, n) => te(n)), l.handle("projects:detect", (t, n) => oe(n)), l.handle("projects:runCustomCommand", async (t, n, e) => new Promise((o, s) => {
    Y(n, e, (r, a) => {
      r ? s(r) : o(a);
    });
  })), l.handle("projects:launch", async (t, n, e) => new Promise((o, s) => {
    ne(n, e, !1, (r, a) => {
      r ? s(r) : o(a);
    });
  }));
}
function w() {
  try {
    const t = C("groups");
    if (!Array.isArray(t) || t.length === 0) {
      const n = [
        { id: "group_freelance", name: "Freelance", sortOrder: 1, createdAt: Date.now(), updatedAt: Date.now() },
        { id: "group_personal", name: "Personal", sortOrder: 2, createdAt: Date.now(), updatedAt: Date.now() },
        { id: "group_experiments", name: "Experiments", sortOrder: 3, createdAt: Date.now(), updatedAt: Date.now() },
        { id: "group_learning", name: "Learning", sortOrder: 4, createdAt: Date.now(), updatedAt: Date.now() }
      ];
      return $("groups", n), n;
    }
    return t;
  } catch {
    return [];
  }
}
function S(t) {
  $("groups", t);
}
function se() {
  return w();
}
function ae(t) {
  return w().find((e) => e.id === t);
}
function ie(t) {
  const n = w(), e = {
    id: t.id || F("group"),
    name: t.name,
    icon: t.icon,
    color: t.color,
    sortOrder: t.sortOrder ?? n.length + 1,
    createdAt: t.createdAt || Date.now(),
    updatedAt: t.updatedAt || Date.now()
  };
  return n.push(e), S(n), e;
}
function de(t, n) {
  const e = w(), o = e.findIndex((r) => r.id === t);
  if (o === -1)
    return;
  const s = {
    ...e[o],
    ...n,
    updatedAt: Date.now()
  };
  return e[o] = s, S(e), s;
}
function ce(t) {
  const n = w(), e = n.filter((o) => o.id !== t);
  return e.length === n.length ? !1 : (S(e), !0);
}
function ue() {
  l.handle("groups:getAll", () => se()), l.handle("groups:get", (t, n) => ae(n)), l.handle("groups:add", (t, n) => ie(n)), l.handle("groups:update", (t, n, e) => de(n, e)), l.handle("groups:delete", (t, n) => ce(n));
}
J(import.meta.url);
const V = u.dirname(U(import.meta.url));
process.env.APP_ROOT = u.join(V, "..");
const y = process.env.VITE_DEV_SERVER_URL, je = u.join(process.env.APP_ROOT, "dist-electron"), L = u.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = y ? u.join(process.env.APP_ROOT, "public") : L;
let m;
function N() {
  m = new R({
    icon: u.join(process.env.VITE_PUBLIC, "electron-vite.svg"),
    webPreferences: {
      preload: u.join(V, "preload.mjs")
    }
  }), m.webContents.on("did-finish-load", () => {
    m == null || m.webContents.send("main-process-message", (/* @__PURE__ */ new Date()).toLocaleString());
  }), y ? m.loadURL(y) : m.loadFile(u.join(L, "index.html"));
}
h.on("window-all-closed", () => {
  process.platform !== "darwin" && (h.quit(), m = null);
});
h.on("activate", () => {
  R.getAllWindows().length === 0 && N();
});
h.whenReady().then(N);
re();
ue();
export {
  je as MAIN_DIST,
  L as RENDERER_DIST,
  y as VITE_DEV_SERVER_URL
};
