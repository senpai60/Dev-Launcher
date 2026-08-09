import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Code2,
  CornerDownLeft,
  FolderClosed,
  FolderOpen,
  LayoutGrid,
  Play,
  RotateCcw,
  Search,
  Terminal,
} from "lucide-react";
import { useProjectAPI, useSessionAPI } from "../../api/api";
import { fuzzyScoreFields } from "../../utils/fuzzy";
import type { ProjectWithStatus } from "../../../types/project";
import "./overlay.css";

type OverlayItem = {
  id: string;
  title: string;
  subtitle?: string;
  keywords?: string;
  group: "Resume" | "Commands" | "Projects" | "Dev Launcher";
  badge: string;
  icon: React.ReactNode;
  run: () => Promise<void> | void;
};

const GROUP_ORDER: OverlayItem["group"][] = ["Resume", "Commands", "Projects", "Dev Launcher"];

/** Turns an Electron accelerator into something worth showing a user. */
function formatAccelerator(accelerator: string | null): string | null {
  if (!accelerator) return null;

  const isMac = navigator.platform.toLowerCase().includes("mac");
  return accelerator
    .replace(/CommandOrControl|CmdOrCtrl/g, isMac ? "⌘" : "Ctrl")
    .replace(/\bCommand\b|\bCmd\b/g, "⌘")
    .replace(/\bControl\b/g, "Ctrl")
    .replace(/\bAlt\b/g, isMac ? "⌥" : "Alt")
    .replace(/\bShift\b/g, isMac ? "⇧" : "Shift")
    .replace(/\+/g, isMac ? "" : " + ");
}

/**
 * Global launcher overlay.
 *
 * Rendered into its own frameless window via the `#/overlay` route. It is a
 * separate window from the main UI, so it deliberately talks to the preload
 * APIs directly rather than sharing the app's React contexts.
 */
const OverlayPage: React.FC = () => {
  const projectApi = useProjectAPI();
  const sessionApi = useSessionAPI();

  const [projects, setProjects] = useState<ProjectWithStatus[]>([]);
  const [sessionCounts, setSessionCounts] = useState<Record<string, number>>({});
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [shortcut, setShortcut] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const overlay = window?.api?.overlayAPI;

  // Marks the document so overlay.css can make html/body transparent here
  // without affecting the main window, which shares the same CSS bundle.
  useEffect(() => {
    document.documentElement.classList.add("is-overlay-window");
    return () => document.documentElement.classList.remove("is-overlay-window");
  }, []);

  const reload = async () => {
    try {
      const [list, sessions] = await Promise.all([
        projectApi.getAllProjects(),
        sessionApi.isAvailable ? sessionApi.getAllSessions() : Promise.resolve([]),
      ]);
      setProjects(list);
      setSessionCounts(
        Object.fromEntries(
          sessions.map((s) => [s.projectId, s.steps.filter((step) => step.enabled).length]),
        ),
      );
    } catch {
      // An empty overlay is better than a broken one.
    }
  };

  useEffect(() => {
    void reload();
    void overlay?.getShortcut().then((accelerator) => setShortcut(formatAccelerator(accelerator)));

    // Reset and refresh every time the window is summoned.
    return overlay?.onShown(() => {
      setQuery("");
      setSelectedIndex(0);
      void reload();
      window.setTimeout(() => inputRef.current?.focus(), 30);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const dismiss = () => void overlay?.hide();

  const items = useMemo<OverlayItem[]>(() => {
    const list: OverlayItem[] = [];

    for (const project of projects) {
      const steps = sessionCounts[project.id] ?? 0;
      if (steps > 0) {
        list.push({
          id: `resume_${project.id}`,
          title: `Resume ${project.name}`,
          subtitle: `Replay ${steps} step${steps === 1 ? "" : "s"}`,
          keywords: "session continue restore",
          group: "Resume",
          badge: "Resume",
          icon: <RotateCcw size={16} />,
          run: async () => {
            await sessionApi.resumeSession(project.id);
          },
        });
      }
    }

    for (const project of projects) {
      for (const command of project.commands ?? []) {
        list.push({
          id: `cmd_${project.id}_${command.id}`,
          title: command.name,
          subtitle: `${project.name} · ${command.command}`,
          keywords: command.description ?? "",
          group: "Commands",
          badge: "Run",
          icon: <Play size={16} />,
          run: async () => {
            await projectApi.runCommand(project.id, command.id, false);
          },
        });
      }
    }

    for (const project of projects) {
      list.push({
        id: `open_${project.id}`,
        title: project.name,
        subtitle: project.tags?.join(" · ") || project.path,
        keywords: project.path,
        group: "Projects",
        badge: "VS Code",
        icon: <FolderClosed size={16} />,
        run: async () => {
          await projectApi.launchProject(project.id, "vscode");
        },
      });
      list.push({
        id: `term_${project.id}`,
        title: `Terminal in ${project.name}`,
        subtitle: project.path,
        keywords: "shell cmd console",
        group: "Projects",
        badge: "Terminal",
        icon: <Terminal size={16} />,
        run: async () => {
          await projectApi.launchProject(project.id, "terminal");
        },
      });
      list.push({
        id: `folder_${project.id}`,
        title: `Folder for ${project.name}`,
        subtitle: project.path,
        keywords: "explorer reveal directory",
        group: "Projects",
        badge: "Explorer",
        icon: <FolderOpen size={16} />,
        run: async () => {
          await projectApi.launchProject(project.id, "folder");
        },
      });
    }

    const jumps: Array<[string, string, React.ReactNode]> = [
      ["/", "Open Dev Launcher", <LayoutGrid size={16} key="d" />],
      ["/projects", "Open Projects", <FolderClosed size={16} key="p" />],
      ["/tools?tab=radar", "Open Project Radar", <Code2 size={16} key="r" />],
      ["/tools?tab=ports", "Open Port Manager", <Code2 size={16} key="o" />],
    ];

    for (const [route, title, icon] of jumps) {
      list.push({
        id: `nav_${route}`,
        title,
        keywords: "window show main",
        group: "Dev Launcher",
        badge: "Open",
        icon,
        run: async () => {
          await overlay?.focusMain(route);
        },
      });
    }

    return list;
    // The API hooks are rebuilt each render but stable in behaviour.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projects, sessionCounts]);

  const { grouped, flat } = useMemo(() => {
    const trimmed = query.trim();

    const matched = trimmed
      ? items
          .map((item) => ({
            item,
            score: fuzzyScoreFields([item.title, item.subtitle, item.keywords], trimmed),
          }))
          .filter((e): e is { item: OverlayItem; score: number } => e.score !== null)
          .sort((a, b) => b.score - a.score)
          .map((e) => e.item)
      : // With no query, lead with resumable sessions -- the fastest way back
        // into work -- then a short slice of everything else.
        [
          ...items.filter((i) => i.group === "Resume"),
          ...items.filter((i) => i.group === "Commands").slice(0, 5),
          ...items.filter((i) => i.group === "Projects" && i.id.startsWith("open_")).slice(0, 5),
          ...items.filter((i) => i.group === "Dev Launcher").slice(0, 1),
        ];

    const limited = matched.slice(0, 40);

    const buckets: Array<[OverlayItem["group"], OverlayItem[]]> = GROUP_ORDER.map((group) => [
      group,
      limited.filter((i) => i.group === group),
    ]);

    const ordered = buckets.filter(([, list]) => list.length > 0);
    return { grouped: ordered, flat: ordered.flatMap(([, list]) => list) };
  }, [items, query]);

  useEffect(() => {
    if (selectedIndex >= flat.length) setSelectedIndex(0);
  }, [flat.length, selectedIndex]);

  useEffect(() => {
    listRef.current
      ?.querySelector<HTMLElement>(`[data-index="${selectedIndex}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  const activate = async (item: OverlayItem) => {
    setBusyId(item.id);
    try {
      await item.run();
      // Navigation items manage their own dismissal via focusMain.
      if (!item.id.startsWith("nav_")) dismiss();
    } catch {
      // Keep the overlay open so the user can see nothing happened and retry.
    } finally {
      setBusyId(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < flat.length - 1 ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : flat.length - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const item = flat[selectedIndex];
      if (item) void activate(item);
    } else if (e.key === "Escape") {
      e.preventDefault();
      dismiss();
    }
  };

  let renderIndex = -1;

  return (
    <div className="overlay-root" onKeyDown={handleKeyDown}>
      <div className="overlay-panel">
        <div className="overlay-search">
          <Search size={18} className="overlay-search-icon" />
          <input
            ref={inputRef}
            autoFocus
            className="overlay-input"
            placeholder="Resume a project, run a command, open a folder..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
          />
          {shortcut && <span className="overlay-shortcut-hint">{shortcut}</span>}
        </div>

        <div className="overlay-results" ref={listRef}>
          {flat.length === 0 ? (
            <div className="overlay-empty">
              {projects.length === 0
                ? "No projects yet. Add one in Dev Launcher."
                : `Nothing matches "${query}"`}
            </div>
          ) : (
            grouped.map(([group, groupItems]) => (
              <div key={group}>
                <div className="overlay-group">{group}</div>
                {groupItems.map((item) => {
                  renderIndex += 1;
                  const index = renderIndex;

                  return (
                    <div
                      key={item.id}
                      data-index={index}
                      className={`overlay-item ${index === selectedIndex ? "is-active" : ""}`}
                      onMouseEnter={() => setSelectedIndex(index)}
                      onClick={() => void activate(item)}
                    >
                      <span className="overlay-item-icon">{item.icon}</span>
                      <div className="overlay-item-text">
                        <span className="overlay-item-title">{item.title}</span>
                        {item.subtitle && (
                          <span className="overlay-item-subtitle">{item.subtitle}</span>
                        )}
                      </div>
                      <span className="overlay-item-badge">
                        {busyId === item.id ? "..." : item.badge}
                      </span>
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>

        <div className="overlay-footer">
          <span>
            <kbd>↑↓</kbd> navigate
          </span>
          <span>
            <kbd>
              <CornerDownLeft size={9} />
            </kbd>{" "}
            run
          </span>
          <span>
            <kbd>esc</kbd> dismiss
          </span>
          <span className="overlay-footer-brand">Dev Launcher</span>
        </div>
      </div>
    </div>
  );
};

export default OverlayPage;
