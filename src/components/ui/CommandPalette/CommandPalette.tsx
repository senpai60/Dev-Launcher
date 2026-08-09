import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AppWindow,
  Code2,
  Container,
  CornerDownLeft,
  FileCode2,
  FileWarning,
  FolderClosed,
  FolderOpen,
  GitBranch,
  HardDrive,
  Home,
  LayoutGrid,
  Play,
  Plug,
  Plus,
  Search,
  Settings,
  Wrench,
} from "lucide-react";
import { useProjectContext } from "../../../context/ProjectContext";
import { useCommandRunner } from "../../../hooks/useCommandRunner";
import { fuzzyScoreFields } from "../../../utils/fuzzy";
import "./commandPalette.css";

type PaletteCategory = "Commands" | "Projects" | "Quick Actions" | "Navigation";

export type CommandPaletteItem = {
  id: string;
  title: string;
  subtitle?: string;
  category: PaletteCategory;
  /** Extra text matched against the query but not displayed. */
  keywords?: string;
  badge?: string;
  icon: React.ReactNode;
  action: () => void;
};

const CATEGORY_ORDER: PaletteCategory[] = [
  "Commands",
  "Projects",
  "Quick Actions",
  "Navigation",
];

export const CommandPalette: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);

  const navigate = useNavigate();
  const projectCtx = useProjectContext();
  const { requestRun, confirmElement } = useCommandRunner();

  const allProjects = projectCtx?.allProjects;
  const openProject = projectCtx?.openProject;

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setSearchQuery("");
      setSelectedIndex(0);
      window.setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const close = () => setIsOpen(false);

  /**
   * Built once per project-list change rather than on every keystroke.
   */
  const items = useMemo<CommandPaletteItem[]>(() => {
    const list: CommandPaletteItem[] = [];
    const projects = allProjects ?? [];

    // 1. Runnable project commands -- the core Phase 5 palette entry.
    for (const project of projects) {
      for (const command of project.commands ?? []) {
        list.push({
          id: `cmd_${project.id}_${command.id}`,
          title: `${command.name} · ${project.name}`,
          subtitle: command.command,
          category: "Commands",
          keywords: `${command.description ?? ""} ${project.tags?.join(" ") ?? ""}`,
          badge: project.pathExists ? "Run" : "Folder missing",
          icon: <Play size={18} />,
          action: () => {
            close();
            if (project.pathExists) void requestRun(project, command);
          },
        });
      }
    }

    // 2. Projects
    for (const project of projects) {
      list.push({
        id: `proj_${project.id}`,
        title: project.name,
        subtitle: project.tags?.join(" · ") || project.path,
        category: "Projects",
        keywords: project.path,
        badge: "Open Code",
        icon: <FolderClosed size={18} />,
        action: () => {
          close();
          void openProject?.(project.id, "vscode");
        },
      });
    }

    // 3. Quick actions
    list.push({
      id: "action_new_project",
      title: "Create New Project",
      subtitle: "Add a project location to your workspace",
      category: "Quick Actions",
      icon: <Plus size={18} />,
      action: () => {
        close();
        navigate("/projects?action=create");
      },
    });

    // Previously these targeted `allProjects[0]`, which opened an arbitrary
    // project. They now route to the list so the user picks one.
    list.push({
      id: "action_open_folder",
      title: "Open a Project Folder",
      subtitle: "Browse your projects and reveal one in Explorer",
      category: "Quick Actions",
      icon: <FolderOpen size={18} />,
      action: () => {
        close();
        navigate("/projects");
      },
    });

    list.push({
      id: "action_favorites",
      title: "Show Favorite Projects",
      subtitle: "Jump to your starred projects",
      category: "Quick Actions",
      icon: <FolderClosed size={18} />,
      action: () => {
        close();
        navigate("/projects?filter=favorites");
      },
    });

    // 4. Developer tools -- deep-linked so one keystroke lands on the tool.
    const toolItems: Array<[string, string, string, React.ReactNode]> = [
      [
        "disk",
        "Reclaim Disk Space",
        "Find and delete stale node_modules folders",
        <HardDrive size={18} key="hd" />,
      ],
      [
        "ports",
        "Free a Busy Port",
        "See what's on port 3000 and stop it",
        <Plug size={18} key="pl" />,
      ],
      [
        "env",
        "Check .env Files",
        "Find missing environment keys across projects",
        <FileWarning size={18} key="fw" />,
      ],
      [
        "scripts",
        "Search All Scripts",
        "Find any package.json script across every project",
        <FileCode2 size={18} key="fc" />,
      ],
    ];

    for (const [tab, title, subtitle, icon] of toolItems) {
      list.push({
        id: `tool_${tab}`,
        title,
        subtitle,
        category: "Quick Actions",
        keywords: `tools ${tab} node_modules port env script disk`,
        icon,
        action: () => {
          close();
          navigate(`/tools?tab=${tab}`);
        },
      });
    }

    // 5. Navigation
    const navItems: Array<[string, string, React.ReactNode]> = [
      ["/", "Go to Dashboard", <Home size={18} key="h" />],
      ["/projects", "Go to Projects", <FolderClosed size={18} key="p" />],
      ["/commands", "Go to Commands", <Code2 size={18} key="c" />],
      ["/tools", "Go to Tools", <Wrench size={18} key="wr" />],
      ["/apps", "Go to Apps & Tools", <AppWindow size={18} key="a" />],
      ["/workspaces", "Go to Workspaces", <LayoutGrid size={18} key="w" />],
      ["/git", "Go to Git", <GitBranch size={18} key="g" />],
      ["/docker", "Go to Docker", <Container size={18} key="d" />],
      ["/settings", "Go to Settings", <Settings size={18} key="s" />],
    ];

    for (const [path, title, icon] of navItems) {
      list.push({
        id: `nav_${path}`,
        title,
        category: "Navigation",
        icon,
        action: () => {
          close();
          navigate(path);
        },
      });
    }

    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allProjects]);

  /** Fuzzy-ranked, then regrouped so categories stay in a stable order. */
  const { grouped, flatItems } = useMemo(() => {
    const query = searchQuery.trim();

    const matched = query
      ? items
          .map((item) => ({
            item,
            score: fuzzyScoreFields(
              [item.title, item.subtitle, item.keywords, item.category],
              query,
            ),
          }))
          .filter((e): e is { item: CommandPaletteItem; score: number } => e.score !== null)
          .sort((a, b) => b.score - a.score)
          .map((e) => e.item)
      : items;

    const byCategory = new Map<PaletteCategory, CommandPaletteItem[]>();
    for (const category of CATEGORY_ORDER) byCategory.set(category, []);
    for (const item of matched) byCategory.get(item.category)?.push(item);

    const ordered: Array<[PaletteCategory, CommandPaletteItem[]]> = CATEGORY_ORDER.map(
      (category) => [category, byCategory.get(category) ?? []],
    ).filter(([, list]) => list.length > 0) as Array<[PaletteCategory, CommandPaletteItem[]]>;

    return { grouped: ordered, flatItems: ordered.flatMap(([, list]) => list) };
  }, [items, searchQuery]);

  // Keep the highlighted row in range when the result set shrinks.
  useEffect(() => {
    if (selectedIndex >= flatItems.length) setSelectedIndex(0);
  }, [flatItems.length, selectedIndex]);

  // Keep the highlighted row scrolled into view during keyboard navigation.
  useEffect(() => {
    listRef.current
      ?.querySelector<HTMLElement>(`[data-index="${selectedIndex}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < flatItems.length - 1 ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : flatItems.length - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      flatItems[selectedIndex]?.action();
    } else if (e.key === "Escape") {
      e.preventDefault();
      close();
    }
  };

  if (!isOpen) {
    // The confirmation dialog must survive the palette closing, since running
    // a destructive command closes the palette first.
    return confirmElement;
  }

  let renderIndex = -1;

  return (
    <>
      <div
        className="cmd-palette-backdrop"
        onClick={(e) => {
          if (e.target === e.currentTarget) close();
        }}
      >
        <div className="cmd-palette-container" onKeyDown={handleKeyDown}>
          <div className="cmd-palette-header">
            <Search size={18} className="cmd-search-icon" />
            <input
              ref={inputRef}
              type="text"
              className="cmd-search-input"
              placeholder="Search projects, commands, or actions..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setSelectedIndex(0);
              }}
            />
            <span className="cmd-kbd-badge">ESC</span>
          </div>

          <div className="cmd-palette-results custom-scroller" ref={listRef}>
            {flatItems.length === 0 ? (
              <div className="cmd-palette-no-results">No results found for "{searchQuery}"</div>
            ) : (
              grouped.map(([category, categoryItems]) => (
                <div key={category}>
                  <div className="cmd-group-title">{category}</div>
                  {categoryItems.map((item) => {
                    renderIndex += 1;
                    const itemIdx = renderIndex;

                    return (
                      <div
                        key={item.id}
                        data-index={itemIdx}
                        className={`cmd-item ${itemIdx === selectedIndex ? "active" : ""}`}
                        onClick={() => item.action()}
                        onMouseEnter={() => setSelectedIndex(itemIdx)}
                      >
                        <div className="cmd-item-main">
                          <div className="cmd-item-icon">{item.icon}</div>
                          <div className="cmd-item-text">
                            <span className="cmd-item-title">{item.title}</span>
                            {item.subtitle && (
                              <span className="cmd-item-subtitle">{item.subtitle}</span>
                            )}
                          </div>
                        </div>
                        <span className="cmd-item-action-badge">{item.badge ?? "Select"}</span>
                      </div>
                    );
                  })}
                </div>
              ))
            )}
          </div>

          <div className="cmd-palette-footer">
            <div className="cmd-footer-tips">
              <span className="cmd-footer-tip">
                <span className="cmd-kbd-badge">↑↓</span> navigate
              </span>
              <span className="cmd-footer-tip">
                <span className="cmd-kbd-badge">
                  <CornerDownLeft size={10} />
                </span>{" "}
                select
              </span>
              <span className="cmd-footer-tip">
                <span className="cmd-kbd-badge">esc</span> close
              </span>
            </div>
            <span>Dev Launcher Palette</span>
          </div>
        </div>
      </div>

      {confirmElement}
    </>
  );
};

export default CommandPalette;
