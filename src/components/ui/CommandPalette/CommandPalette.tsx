import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  FolderClosed,
  Code2,
  Terminal,
  Home,
  LayoutGrid,
  GitBranch,
  Container,
  Settings,
  AppWindow,
  Plus,
  FolderOpen,
  CornerDownLeft,
} from "lucide-react";
import { useProjectContext } from "../../../context/ProjectContext";
import "./commandPalette.css";

export type CommandPaletteItem = {
  id: string;
  title: string;
  subtitle?: string;
  category: "Projects" | "Quick Actions" | "Navigation";
  icon: React.ReactNode;
  action: () => void;
};

export const CommandPalette: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);

  const navigate = useNavigate();
  const projectCtx = useProjectContext();
  const allProjects = projectCtx?.allProjects;
  const openProject = projectCtx?.openProject;

  const inputRef = useRef<HTMLInputElement>(null);

  // Global Keyboard Listener for Ctrl+K / Cmd+K
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

  // Reset search and focus input when palette opens
  useEffect(() => {
    if (isOpen) {
      setSearchQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Build command palette items
  const items: CommandPaletteItem[] = [];

  // 1. Projects
  if (allProjects && allProjects.length > 0) {
    allProjects.forEach((p) => {
      items.push({
        id: `proj_${p.id}`,
        title: p.name,
        subtitle: p.tags?.join(" · ") || p.path,
        category: "Projects",
        icon: <FolderClosed size={18} />,
        action: () => {
          openProject?.(p.id, "vscode");
          setIsOpen(false);
        },
      });
    });
  }

  // 2. Quick Actions
  items.push({
    id: "action_new_project",
    title: "Create New Project",
    subtitle: "Add a project location to workspace",
    category: "Quick Actions",
    icon: <Plus size={18} />,
    action: () => {
      navigate("/projects?action=create");
      setIsOpen(false);
    },
  });

  items.push({
    id: "action_open_folder",
    title: "Open Folder in Explorer",
    subtitle: "Browse local directory",
    category: "Quick Actions",
    icon: <FolderOpen size={18} />,
    action: () => {
      if (allProjects && allProjects.length > 0) {
        openProject?.(allProjects[0].id, "folder");
      }
      setIsOpen(false);
    },
  });

  items.push({
    id: "action_terminal",
    title: "Open Terminal",
    subtitle: "Launch command prompt / terminal",
    category: "Quick Actions",
    icon: <Terminal size={18} />,
    action: () => {
      if (allProjects && allProjects.length > 0) {
        openProject?.(allProjects[0].id, "terminal");
      }
      setIsOpen(false);
    },
  });

  // 3. Navigation
  items.push({
    id: "nav_home",
    title: "Go to Dashboard / Home",
    category: "Navigation",
    icon: <Home size={18} />,
    action: () => {
      navigate("/");
      setIsOpen(false);
    },
  });

  items.push({
    id: "nav_projects",
    title: "Go to Projects",
    category: "Navigation",
    icon: <FolderClosed size={18} />,
    action: () => {
      navigate("/projects");
      setIsOpen(false);
    },
  });

  items.push({
    id: "nav_apps",
    title: "Go to Apps & Tools",
    category: "Navigation",
    icon: <AppWindow size={18} />,
    action: () => {
      navigate("/apps");
      setIsOpen(false);
    },
  });

  items.push({
    id: "nav_workspaces",
    title: "Go to Workspaces",
    category: "Navigation",
    icon: <LayoutGrid size={18} />,
    action: () => {
      navigate("/workspaces");
      setIsOpen(false);
    },
  });

  items.push({
    id: "nav_commands",
    title: "Go to Commands",
    category: "Navigation",
    icon: <Code2 size={18} />,
    action: () => {
      navigate("/commands");
      setIsOpen(false);
    },
  });

  items.push({
    id: "nav_git",
    title: "Go to Git",
    category: "Navigation",
    icon: <GitBranch size={18} />,
    action: () => {
      navigate("/git");
      setIsOpen(false);
    },
  });

  items.push({
    id: "nav_docker",
    title: "Go to Docker",
    category: "Navigation",
    icon: <Container size={18} />,
    action: () => {
      navigate("/docker");
      setIsOpen(false);
    },
  });

  items.push({
    id: "nav_settings",
    title: "Go to Settings",
    category: "Navigation",
    icon: <Settings size={18} />,
    action: () => {
      navigate("/settings");
      setIsOpen(false);
    },
  });

  // Filter items by search query
  const filteredItems = items.filter(
    (item) =>
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.subtitle && item.subtitle.toLowerCase().includes(searchQuery.toLowerCase())) ||
      item.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Keyboard navigation within the palette
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < filteredItems.length - 1 ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : filteredItems.length - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filteredItems[selectedIndex]) {
        filteredItems[selectedIndex].action();
      }
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  if (!isOpen) return null;

  // Group items by category for rendering
  const groupedCategories = ["Projects", "Quick Actions", "Navigation"] as const;

  return (
    <div
      className="cmd-palette-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) setIsOpen(false);
      }}
    >
      <div className="cmd-palette-container" onKeyDown={handleKeyDown}>
        <div className="cmd-palette-header">
          <Search size={18} className="cmd-search-icon" />
          <input
            ref={inputRef}
            type="text"
            className="cmd-search-input"
            placeholder="Type a project, action, or command..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setSelectedIndex(0);
            }}
          />
          <span className="cmd-kbd-badge">ESC</span>
        </div>

        <div className="cmd-palette-results custom-scroller">
          {filteredItems.length === 0 ? (
            <div style={{ padding: "var(--space-5)", textAlign: "center", color: "var(--text-tertiary)" }}>
              No results found for "{searchQuery}"
            </div>
          ) : (
            letItemIndexCounter(-1, (getNextIndex) =>
              groupedCategories.map((category) => {
                const categoryItems = filteredItems.filter((i) => i.category === category);
                if (categoryItems.length === 0) return null;

                return (
                  <div key={category}>
                    <div className="cmd-group-title">{category}</div>
                    {categoryItems.map((item) => {
                      const itemIdx = getNextIndex();
                      const isActive = itemIdx === selectedIndex;

                      return (
                        <div
                          key={item.id}
                          className={`cmd-item ${isActive ? "active" : ""}`}
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
                          <span className="cmd-item-action-badge">
                            {item.category === "Projects" ? "Open Code" : "Select"}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                );
              })
            )
          )}
        </div>

        <div className="cmd-palette-footer">
          <div className="cmd-footer-tips">
            <span className="cmd-footer-tip">
              <span className="cmd-kbd-badge">↑↓</span> navigate
            </span>
            <span className="cmd-footer-tip">
              <span className="cmd-kbd-badge"><CornerDownLeft size={10} /></span> select
            </span>
            <span className="cmd-footer-tip">
              <span className="cmd-kbd-badge">esc</span> close
            </span>
          </div>
          <span>Dev Launcher Palette</span>
        </div>
      </div>
    </div>
  );
};

// Helper function to calculate linear indexes across grouped categories
function letItemIndexCounter(
  startIndex: number,
  render: (getNextIndex: () => number) => React.ReactNode
) {
  let counter = startIndex;
  return render(() => {
    counter += 1;
    return counter;
  });
}

export default CommandPalette;
