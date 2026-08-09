import { app as u, ipcMain as c, BrowserWindow as w } from "electron";
import { createRequire as x } from "node:module";
import { fileURLToPath as C } from "node:url";
import a, { join as j } from "node:path";
import { readFileSync as S, writeFileSync as T, mkdirSync as G } from "fs";
import { randomUUID as V } from "node:crypto";
import { exec as l } from "child_process";
const F = () => {
  const n = j(u.getPath("userData"), "DevLauncher");
  return G(n, { recursive: !0 }), n;
};
console.log(u.getPath("userData"));
const A = (n) => j(F(), `${n}.json`), _ = (n) => {
  try {
    const e = S(A(n), "utf8");
    return JSON.parse(e);
  } catch {
    return [];
  }
}, m = (n, e) => {
  try {
    T(A(n), JSON.stringify(e));
  } catch (t) {
    console.error("Error saving data:", t);
  }
};
function p() {
  try {
    return _("projects");
  } catch {
    return [];
  }
}
function h(n) {
  m("projects", n);
}
function v(n = "id") {
  const e = V().replace(/-/g, "").slice(0, 12);
  return `${n}_${e}`;
}
function L(n, e = !1, t) {
  const r = a.resolve(n), s = `code ${e ? "-n" : "-r"} "${r}"`;
  l(s, (i, D, R) => {
    if (i) {
      console.error(`Failed to open VS Code: ${R}`), t && t(i, null);
      return;
    }
    console.log(`Opened ${r} in VS Code`), t && t(null, D);
  });
}
function U(n, e) {
  const t = a.resolve(n), r = `cursor "${t}"`;
  l(r, (o, s, i) => {
    if (o) {
      console.error(`Failed to open Cursor: ${i}`), e && e(o, null);
      return;
    }
    console.log(`Opened ${t} in Cursor`), e && e(null, s);
  });
}
function k(n, e) {
  const t = a.resolve(n), r = `agy "${t}"`;
  l(r, (o, s, i) => {
    if (o) {
      console.error(`Failed to open Antigravity: ${i}`), e && e(o, null);
      return;
    }
    console.log(`Opened ${t} in Antigravity`), e && e(null, s);
  });
}
function N(n, e) {
  const t = a.resolve(n), r = `start cmd /k cd "${t}"`;
  l(r, (o, s, i) => {
    if (o) {
      console.error(`error opening terminal: ${i}`, o), e && e(o, null);
      return;
    }
    console.log("terminal opend successfully", t), e && e(null, s);
  });
}
function B(n, e) {
  const t = a.resolve(n), r = `explorer.exe "${t}"`;
  l(r, (o, s, i) => {
    if (o) {
      console.error(`Failed to open Explorer: ${i}`), e && e(o, null);
      return;
    }
    console.log(`Opened ${t} in Explorer`), e && e(null, s);
  });
}
function W() {
  return p();
}
function O(n) {
  return p().find((t) => t.id === n);
}
function q(n) {
  const e = p(), t = {
    ...n,
    id: n.id || v("proj"),
    tags: n.tags || [],
    isFavorite: n.isFavorite ?? !1,
    createdAt: n.createdAt || Date.now(),
    updatedAt: n.updatedAt || Date.now()
  };
  return e.push(t), h(e), t;
}
function y(n, e) {
  const t = p(), r = t.findIndex((s) => s.id === n);
  if (r === -1)
    return;
  const o = {
    ...t[r],
    ...e,
    updatedAt: Date.now()
  };
  return t[r] = o, h(t), o;
}
function J(n) {
  const e = p(), t = e.filter((r) => r.id !== n);
  return t.length === e.length ? !1 : (h(t), !0);
}
function M(n, e, t = !1, r) {
  const o = O(n);
  if (!o) {
    r && r(new Error("Project not found"), null);
    return;
  }
  y(n, { lastOpenedAt: Date.now() });
  try {
    const s = o.path;
    switch (e.toLowerCase()) {
      case "open-in-vscode":
      case "vscode":
        L(s, t, r);
        break;
      case "open-in-cursor":
      case "cursor":
        U(s, r);
        break;
      case "open-in-antigravity":
      case "antigravity":
        k(s, r);
        break;
      case "open-in-terminal":
      case "terminal":
        N(s, r);
        break;
      case "folder":
      case "explorer":
      default:
        B(s, r);
        break;
    }
  } catch (s) {
    r(s, null);
  }
}
function z() {
  c.handle("projects:getAll", () => W()), c.handle("projects:get", (n, e) => O(e)), c.handle("projects:add", (n, e) => q(e)), c.handle("projects:update", (n, e, t) => y(e, t)), c.handle("projects:delete", (n, e) => J(e)), c.handle("projects:launch", async (n, e, t) => new Promise((r, o) => {
    M(e, t, !1, (s, i) => {
      s ? o(s) : r(i);
    });
  }));
}
function f() {
  try {
    const n = _("groups");
    if (!Array.isArray(n) || n.length === 0) {
      const e = [
        { id: "group_freelance", name: "Freelance", sortOrder: 1, createdAt: Date.now(), updatedAt: Date.now() },
        { id: "group_personal", name: "Personal", sortOrder: 2, createdAt: Date.now(), updatedAt: Date.now() },
        { id: "group_experiments", name: "Experiments", sortOrder: 3, createdAt: Date.now(), updatedAt: Date.now() },
        { id: "group_learning", name: "Learning", sortOrder: 4, createdAt: Date.now(), updatedAt: Date.now() }
      ];
      return m("groups", e), e;
    }
    return n;
  } catch {
    return [];
  }
}
function P(n) {
  m("groups", n);
}
function H() {
  return f();
}
function K(n) {
  return f().find((t) => t.id === n);
}
function Q(n) {
  const e = f(), t = {
    id: n.id || v("group"),
    name: n.name,
    icon: n.icon,
    color: n.color,
    sortOrder: n.sortOrder ?? e.length + 1,
    createdAt: n.createdAt || Date.now(),
    updatedAt: n.updatedAt || Date.now()
  };
  return e.push(t), P(e), t;
}
function X(n, e) {
  const t = f(), r = t.findIndex((s) => s.id === n);
  if (r === -1)
    return;
  const o = {
    ...t[r],
    ...e,
    updatedAt: Date.now()
  };
  return t[r] = o, P(t), o;
}
function Y(n) {
  const e = f(), t = e.filter((r) => r.id !== n);
  return t.length === e.length ? !1 : (P(t), !0);
}
function Z() {
  c.handle("groups:getAll", () => H()), c.handle("groups:get", (n, e) => K(e)), c.handle("groups:add", (n, e) => Q(e)), c.handle("groups:update", (n, e, t) => X(e, t)), c.handle("groups:delete", (n, e) => Y(e));
}
x(import.meta.url);
const E = a.dirname(C(import.meta.url));
process.env.APP_ROOT = a.join(E, "..");
const g = process.env.VITE_DEV_SERVER_URL, ae = a.join(process.env.APP_ROOT, "dist-electron"), I = a.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = g ? a.join(process.env.APP_ROOT, "public") : I;
let d;
function $() {
  d = new w({
    icon: a.join(process.env.VITE_PUBLIC, "electron-vite.svg"),
    webPreferences: {
      preload: a.join(E, "preload.mjs")
    }
  }), d.webContents.on("did-finish-load", () => {
    d == null || d.webContents.send("main-process-message", (/* @__PURE__ */ new Date()).toLocaleString());
  }), g ? d.loadURL(g) : d.loadFile(a.join(I, "index.html"));
}
u.on("window-all-closed", () => {
  process.platform !== "darwin" && (u.quit(), d = null);
});
u.on("activate", () => {
  w.getAllWindows().length === 0 && $();
});
u.whenReady().then($);
z();
Z();
export {
  ae as MAIN_DIST,
  I as RENDERER_DIST,
  g as VITE_DEV_SERVER_URL
};
