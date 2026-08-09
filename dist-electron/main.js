import { app as f, ipcMain as d, BrowserWindow as k } from "electron";
import { createRequire as T } from "node:module";
import { fileURLToPath as F } from "node:url";
import c, { join as D } from "node:path";
import v, { readFileSync as L, writeFileSync as N, mkdirSync as J } from "fs";
import { randomUUID as U } from "node:crypto";
import { exec as g } from "child_process";
import w from "path";
const M = () => {
  const t = D(f.getPath("userData"), "DevLauncher");
  return J(t, { recursive: !0 }), t;
};
console.log(f.getPath("userData"));
const E = (t) => D(M(), `${t}.json`), O = (t) => {
  try {
    const n = L(E(t), "utf8");
    return JSON.parse(n);
  } catch {
    return [];
  }
}, y = (t, n) => {
  try {
    N(E(t), JSON.stringify(n));
  } catch (e) {
    console.error("Error saving data:", e);
  }
};
function m() {
  try {
    return O("projects");
  } catch {
    return [];
  }
}
function A(t) {
  y("projects", t);
}
function R(t = "id") {
  const n = U().replace(/-/g, "").slice(0, 12);
  return `${t}_${n}`;
}
function q(t, n = !1, e) {
  const r = c.resolve(t), s = `code ${n ? "-n" : "-r"} "${r}"`;
  g(s, (i, a, j) => {
    if (i) {
      console.error(`Failed to open VS Code: ${j}`), e && e(i, null);
      return;
    }
    console.log(`Opened ${r} in VS Code`), e && e(null, a);
  });
}
function B(t, n) {
  const e = c.resolve(t), r = `cursor "${e}"`;
  g(r, (o, s, i) => {
    if (o) {
      console.error(`Failed to open Cursor: ${i}`), n && n(o, null);
      return;
    }
    console.log(`Opened ${e} in Cursor`), n && n(null, s);
  });
}
function W(t, n) {
  const e = c.resolve(t), r = `agy "${e}"`;
  g(r, (o, s, i) => {
    if (o) {
      console.error(`Failed to open Antigravity: ${i}`), n && n(o, null);
      return;
    }
    console.log(`Opened ${e} in Antigravity`), n && n(null, s);
  });
}
function z(t, n) {
  const e = c.resolve(t), r = `start cmd /k cd "${e}"`;
  g(r, (o, s, i) => {
    if (o) {
      console.error(`error opening terminal: ${i}`, o), n && n(o, null);
      return;
    }
    console.log("terminal opend successfully", e), n && n(null, s);
  });
}
function H(t, n) {
  const e = c.resolve(t), r = `explorer.exe "${e}"`;
  g(r, (o, s, i) => {
    if (o) {
      console.error(`Failed to open Explorer: ${i}`), n && n(o, null);
      return;
    }
    console.log(`Opened ${e} in Explorer`), n && n(null, s);
  });
}
function K() {
  return m();
}
function $(t) {
  return m().find((e) => e.id === t);
}
function Q(t) {
  const n = m(), e = {
    ...t,
    id: t.id || R("proj"),
    tags: t.tags || [],
    isFavorite: t.isFavorite ?? !1,
    createdAt: t.createdAt || Date.now(),
    updatedAt: t.updatedAt || Date.now()
  };
  return n.push(e), A(n), e;
}
function I(t, n) {
  const e = m(), r = e.findIndex((s) => s.id === t);
  if (r === -1)
    return;
  const o = {
    ...e[r],
    ...n,
    updatedAt: Date.now()
  };
  return e[r] = o, A(e), o;
}
function X(t) {
  const n = m(), e = n.filter((r) => r.id !== t);
  return e.length === n.length ? !1 : (A(e), !0);
}
function Y(t, n, e = !1, r) {
  const o = $(t);
  if (!o) {
    r && r(new Error("Project not found"), null);
    return;
  }
  I(t, { lastOpenedAt: Date.now() });
  try {
    const s = o.path;
    switch (n.toLowerCase()) {
      case "open-in-vscode":
      case "vscode":
        q(s, e, r);
        break;
      case "open-in-cursor":
      case "cursor":
        B(s, r);
        break;
      case "open-in-antigravity":
      case "antigravity":
        W(s, r);
        break;
      case "open-in-terminal":
      case "terminal":
        z(s, r);
        break;
      case "folder":
      case "explorer":
      default:
        H(s, r);
        break;
    }
  } catch (s) {
    r(s, null);
  }
}
function Z(t) {
  const n = w.basename(t) || "New Project", e = /* @__PURE__ */ new Set(), r = [], o = [];
  let s, i;
  if (!t || !v.existsSync(t))
    return {
      name: n,
      tags: [],
      details: {
        languages: [],
        frameworks: [],
        hasGit: !1,
        hasDocker: !1
      }
    };
  const a = (p) => v.existsSync(w.join(t, p)), j = a(".git");
  j && e.add("Git");
  const x = a("Dockerfile") || a("docker-compose.yml") || a("docker-compose.yaml");
  x && e.add("Docker"), a("pnpm-lock.yaml") ? (s = "pnpm", e.add("pnpm")) : a("yarn.lock") ? (s = "yarn", e.add("yarn")) : a("bun.lockb") || a("bun.lock") ? (s = "bun", e.add("bun")) : a("package-lock.json") && (s = "npm", e.add("npm"));
  const S = w.join(t, "package.json");
  if (v.existsSync(S))
    try {
      const p = JSON.parse(v.readFileSync(S, "utf-8"));
      p.description && (i = p.description);
      const l = {
        ...p.dependencies || {},
        ...p.devDependencies || {}
      };
      l.typescript || a("tsconfig.json") ? (r.push("TypeScript"), e.add("TypeScript")) : (r.push("JavaScript"), e.add("JavaScript")), l.next ? (o.push("Next.js"), e.add("Next.js")) : l.react ? (o.push("React"), e.add("React")) : l.vue ? (o.push("Vue"), e.add("Vue")) : l["@angular/core"] ? (o.push("Angular"), e.add("Angular")) : l.svelte && (o.push("Svelte"), e.add("Svelte")), (l.vite || a("vite.config.ts") || a("vite.config.js")) && (o.push("Vite"), e.add("Vite")), l.express && (o.push("Express"), e.add("Express")), l.electron && (o.push("Electron"), e.add("Electron")), s || (s = "npm", e.add("npm"));
    } catch {
    }
  return (a("requirements.txt") || a("pyproject.toml") || a("Pipfile")) && (r.push("Python"), e.add("Python")), a("go.mod") && (r.push("Go"), e.add("Go")), a("Cargo.toml") && (r.push("Rust"), e.add("Rust")), (a("pom.xml") || a("build.gradle")) && (r.push("Java"), e.add("Java")), {
    name: n,
    tags: Array.from(e),
    description: i,
    details: {
      languages: r,
      frameworks: o,
      packageManager: s,
      hasGit: j,
      hasDocker: x
    }
  };
}
function b() {
  d.handle("projects:getAll", () => K()), d.handle("projects:get", (t, n) => $(n)), d.handle("projects:add", (t, n) => Q(n)), d.handle("projects:update", (t, n, e) => I(n, e)), d.handle("projects:delete", (t, n) => X(n)), d.handle("projects:detect", (t, n) => Z(n)), d.handle("projects:launch", async (t, n, e) => new Promise((r, o) => {
    Y(n, e, !1, (s, i) => {
      s ? o(s) : r(i);
    });
  }));
}
function h() {
  try {
    const t = O("groups");
    if (!Array.isArray(t) || t.length === 0) {
      const n = [
        { id: "group_freelance", name: "Freelance", sortOrder: 1, createdAt: Date.now(), updatedAt: Date.now() },
        { id: "group_personal", name: "Personal", sortOrder: 2, createdAt: Date.now(), updatedAt: Date.now() },
        { id: "group_experiments", name: "Experiments", sortOrder: 3, createdAt: Date.now(), updatedAt: Date.now() },
        { id: "group_learning", name: "Learning", sortOrder: 4, createdAt: Date.now(), updatedAt: Date.now() }
      ];
      return y("groups", n), n;
    }
    return t;
  } catch {
    return [];
  }
}
function _(t) {
  y("groups", t);
}
function ee() {
  return h();
}
function te(t) {
  return h().find((e) => e.id === t);
}
function ne(t) {
  const n = h(), e = {
    id: t.id || R("group"),
    name: t.name,
    icon: t.icon,
    color: t.color,
    sortOrder: t.sortOrder ?? n.length + 1,
    createdAt: t.createdAt || Date.now(),
    updatedAt: t.updatedAt || Date.now()
  };
  return n.push(e), _(n), e;
}
function re(t, n) {
  const e = h(), r = e.findIndex((s) => s.id === t);
  if (r === -1)
    return;
  const o = {
    ...e[r],
    ...n,
    updatedAt: Date.now()
  };
  return e[r] = o, _(e), o;
}
function oe(t) {
  const n = h(), e = n.filter((r) => r.id !== t);
  return e.length === n.length ? !1 : (_(e), !0);
}
function se() {
  d.handle("groups:getAll", () => ee()), d.handle("groups:get", (t, n) => te(n)), d.handle("groups:add", (t, n) => ne(n)), d.handle("groups:update", (t, n, e) => re(n, e)), d.handle("groups:delete", (t, n) => oe(n));
}
T(import.meta.url);
const G = c.dirname(F(import.meta.url));
process.env.APP_ROOT = c.join(G, "..");
const P = process.env.VITE_DEV_SERVER_URL, ge = c.join(process.env.APP_ROOT, "dist-electron"), V = c.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = P ? c.join(process.env.APP_ROOT, "public") : V;
let u;
function C() {
  u = new k({
    icon: c.join(process.env.VITE_PUBLIC, "electron-vite.svg"),
    webPreferences: {
      preload: c.join(G, "preload.mjs")
    }
  }), u.webContents.on("did-finish-load", () => {
    u == null || u.webContents.send("main-process-message", (/* @__PURE__ */ new Date()).toLocaleString());
  }), P ? u.loadURL(P) : u.loadFile(c.join(V, "index.html"));
}
f.on("window-all-closed", () => {
  process.platform !== "darwin" && (f.quit(), u = null);
});
f.on("activate", () => {
  k.getAllWindows().length === 0 && C();
});
f.whenReady().then(C);
b();
se();
export {
  ge as MAIN_DIST,
  V as RENDERER_DIST,
  P as VITE_DEV_SERVER_URL
};
