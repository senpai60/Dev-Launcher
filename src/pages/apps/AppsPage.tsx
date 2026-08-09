import React, { useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Search,
  Star,
  ExternalLink,
  Code2,
  Terminal,
  Globe,
  Layout,
  MoreVertical,
  Trash2,
  Edit,
  Copy,
  AppWindow,
} from "lucide-react";
import PageNavbar from "../../components/layout/navbar/PageNavbar";
import Dialog from "../../components/ui/Dialog/Dialog";
import Input from "../../components/ui/Form/Input";
import FolderPicker from "../../components/ui/Form/FolderPicker";
import ContextMenu, { ContextMenuItem } from "../../components/ui/ContextMenu/ContextMenu";
import EmptyState from "../../components/ui/EmptyState/EmptyState";
import vscodeIcon from "../../app-icons/vscode.svg";
import antigravityIcon from "../../app-icons/antigravity-color.svg";
import cursorIcon from "../../app-icons/cursor.svg";
import "./apps.css";

export type AppItem = {
  id: string;
  name: string;
  category: "IDEs & Editors" | "Terminal & CLI" | "Design & Proto" | "Database & Cloud" | "Browsers";
  executablePath: string;
  iconType: "vscode" | "antigravity" | "cursor" | "terminal" | "globe" | "design" | "database" | "app";
  isFavorite: boolean;
  description?: string;
};

const initialApps: AppItem[] = [
  {
    id: "app_1",
    name: "VS Code",
    category: "IDEs & Editors",
    executablePath: "code",
    iconType: "vscode",
    isFavorite: true,
    description: "Code editing redefined",
  },
  {
    id: "app_2",
    name: "Antigravity",
    category: "IDEs & Editors",
    executablePath: "agy",
    iconType: "antigravity",
    isFavorite: true,
    description: "Agentic AI Coding Assistant",
  },
  {
    id: "app_3",
    name: "Cursor",
    category: "IDEs & Editors",
    executablePath: "cursor",
    iconType: "cursor",
    isFavorite: true,
    description: "AI-first Code Editor",
  },
  {
    id: "app_4",
    name: "Windows Terminal",
    category: "Terminal & CLI",
    executablePath: "wt.exe",
    iconType: "terminal",
    isFavorite: false,
    description: "Command line & PowerShell",
  },
  {
    id: "app_5",
    name: "Google Chrome",
    category: "Browsers",
    executablePath: "chrome.exe",
    iconType: "globe",
    isFavorite: false,
    description: "Web Browser",
  },
  {
    id: "app_6",
    name: "Postman",
    category: "Database & Cloud",
    executablePath: "postman.exe",
    iconType: "app",
    isFavorite: true,
    description: "API Development Platform",
  },
  {
    id: "app_7",
    name: "Figma",
    category: "Design & Proto",
    executablePath: "figma.exe",
    iconType: "design",
    isFavorite: false,
    description: "Collaborative Design",
  },
  {
    id: "app_8",
    name: "DBeaver",
    category: "Database & Cloud",
    executablePath: "dbeaver.exe",
    iconType: "database",
    isFavorite: false,
    description: "Universal Database Tool",
  },
];

const AppsPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const filterParam = searchParams.get("filter") || "all";
  const categoryParam = searchParams.get("category") || "";

  const [apps, setApps] = useState<AppItem[]>(initialApps);
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  // Form State
  const [formName, setFormName] = useState("");
  const [formExecPath, setFormExecPath] = useState("");
  const [formCategory, setFormCategory] = useState<AppItem["category"]>("IDEs & Editors");
  const [formDescription, setFormDescription] = useState("");
  const [formError, setFormError] = useState("");

  const toggleFavorite = (id: string) => {
    setApps((prev) =>
      prev.map((app) => (app.id === id ? { ...app, isFavorite: !app.isFavorite } : app))
    );
  };

  const handleLaunch = (app: AppItem) => {
    console.log(`Launching application: ${app.name} (${app.executablePath})`);
    alert(`Launching ${app.name}...`);
  };

  const handleDeleteApp = (id: string) => {
    setApps((prev) => prev.filter((a) => a.id !== id));
  };

  const handleAddAppSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      setFormError("App name is required.");
      return;
    }
    if (!formExecPath.trim()) {
      setFormError("Executable path is required.");
      return;
    }

    const newApp: AppItem = {
      id: `app_${Date.now()}`,
      name: formName.trim(),
      executablePath: formExecPath.trim(),
      category: formCategory,
      description: formDescription.trim(),
      iconType: "app",
      isFavorite: false,
    };

    setApps((prev) => [...prev, newApp]);
    setFormName("");
    setFormExecPath("");
    setFormDescription("");
    setFormError("");
    setIsAddModalOpen(false);
  };

  // Filter & Search Logic
  let filteredApps = apps.filter((app) =>
    app.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    app.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
    app.executablePath.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (filterParam === "favorites") {
    filteredApps = filteredApps.filter((a) => a.isFavorite);
  } else if (categoryParam) {
    filteredApps = filteredApps.filter((a) => a.category.toLowerCase().includes(categoryParam.toLowerCase()));
  }

  const renderAppIcon = (type: AppItem["iconType"]) => {
    switch (type) {
      case "vscode":
        return <img src={vscodeIcon} alt="VS Code" className="app-icon-img" />;
      case "antigravity":
        return <img src={antigravityIcon} alt="Antigravity" className="app-icon-img" />;
      case "cursor":
        return <img src={cursorIcon} alt="Cursor" className="app-icon-img" />;
      case "terminal":
        return <Terminal size={20} className="text-section-title" />;
      case "globe":
        return <Globe size={20} className="text-section-title" />;
      case "design":
        return <Layout size={20} className="text-section-title" />;
      case "database":
        return <Code2 size={20} className="text-section-title" />;
      default:
        return <AppWindow size={20} className="text-section-title" />;
    }
  };

  const getContextMenuItems = (app: AppItem): ContextMenuItem[] => [
    {
      id: "launch",
      label: "Launch App",
      icon: <ExternalLink size={14} />,
      onClick: () => handleLaunch(app),
    },
    {
      id: "copy",
      label: "Copy Executable Path",
      icon: <Copy size={14} />,
      onClick: () => navigator.clipboard.writeText(app.executablePath),
    },
    {
      id: "edit",
      label: "Edit App Details",
      icon: <Edit size={14} />,
      onClick: () => console.log("Editing app", app.name),
    },
    { id: "div1", isDivider: true },
    {
      id: "delete",
      label: "Remove App",
      icon: <Trash2 size={14} />,
      isDanger: true,
      onClick: () => handleDeleteApp(app.id),
    },
  ];

  const getPageTitle = () => {
    if (filterParam === "favorites") return "Apps / Favorites";
    if (categoryParam) return `Apps / ${categoryParam.toUpperCase()}`;
    return "Apps / All Applications";
  };

  return (
    <section className="apps-page">
      <PageNavbar title={getPageTitle()}>
        <button
          className="action-btn text-button"
          style={{ padding: "var(--space-2) var(--space-4)", textAlign: "center" }}
          onClick={() => {
            setFormName("");
            setFormExecPath("");
            setFormDescription("");
            setFormError("");
            setIsAddModalOpen(true);
          }}
        >
          + Add App
        </button>
      </PageNavbar>

      <div className="apps-content">
        {/* Search Bar */}
        <div className="search-container">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            className="search-input"
            placeholder="Search applications & tools..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Apps Grid or Empty State */}
        {filteredApps.length === 0 ? (
          <EmptyState
            icon={<AppWindow size={32} strokeWidth={1.5} />}
            title="No applications found"
            description="Add your developer apps and tools for quick one-click launching."
            actionLabel="Add App"
            onAction={() => setIsAddModalOpen(true)}
          />
        ) : (
          <div className="apps-grid">
            {filteredApps.map((app) => (
              <div key={app.id} className="app-card">
                <div className="app-card-header">
                  <div className="app-icon-wrapper">{renderAppIcon(app.iconType)}</div>
                  <div className="app-card-title-group">
                    <h3 className="app-card-name">{app.name}</h3>
                    <span className="app-card-category">{app.category}</span>
                  </div>
                  <button
                    className={`app-fav-btn ${app.isFavorite ? "is-fav" : ""}`}
                    onClick={() => toggleFavorite(app.id)}
                    title={app.isFavorite ? "Remove from Favorites" : "Add to Favorites"}
                  >
                    <Star size={16} fill={app.isFavorite ? "#f59e0b" : "none"} />
                  </button>
                </div>

                <div className="app-card-body">
                  <span className="app-card-exec" title={app.executablePath}>
                    {app.executablePath}
                  </span>
                  {app.description && (
                    <span className="text-meta" style={{ fontSize: "var(--text-xs)" }}>
                      {app.description}
                    </span>
                  )}
                </div>

                <div className="app-card-footer">
                  <button
                    className="app-launch-btn text-button"
                    onClick={() => handleLaunch(app)}
                  >
                    <ExternalLink size={14} />
                    <span>Launch</span>
                  </button>

                  <ContextMenu
                    isOpen={activeMenuId === app.id}
                    onClose={() => setActiveMenuId(null)}
                    items={getContextMenuItems(app)}
                    position="top-right"
                    trigger={
                      <button
                        className="icon-btn"
                        style={{ background: "transparent", border: "none", color: "var(--text-secondary)" }}
                        onClick={() => setActiveMenuId(activeMenuId === app.id ? null : app.id)}
                      >
                        <MoreVertical size={16} />
                      </button>
                    }
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ADD APP DIALOG */}
      <Dialog
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add Application / Tool"
        footer={
          <>
            <button
              className="action-btn text-button"
              style={{ padding: "8px 16px" }}
              onClick={() => setIsAddModalOpen(false)}
            >
              Cancel
            </button>
            <button
              className="primary-action-btn text-button"
              onClick={handleAddAppSubmit}
            >
              Add App
            </button>
          </>
        }
      >
        <form onSubmit={handleAddAppSubmit}>
          <FolderPicker
            label="Executable / App Path"
            value={formExecPath}
            onChange={(selectedPath, extractedName) => {
              setFormExecPath(selectedPath);
              if (extractedName && !formName) {
                setFormName(extractedName);
              }
              if (selectedPath) setFormError("");
            }}
            placeholder="Click Browse or enter app executable..."
          />

          <Input
            label="Application Name"
            placeholder="e.g. VS Code, Postman, Docker"
            value={formName}
            onChange={(e) => {
              setFormName(e.target.value);
              if (e.target.value) setFormError("");
            }}
            error={formError}
            required
          />

          <div className="form-field">
            <label className="form-label">Category</label>
            <select
              className="form-input"
              value={formCategory}
              onChange={(e) => setFormCategory(e.target.value as AppItem["category"])}
            >
              <option value="IDEs & Editors">IDEs & Editors</option>
              <option value="Terminal & CLI">Terminal & CLI</option>
              <option value="Design & Proto">Design & Proto</option>
              <option value="Database & Cloud">Database & Cloud</option>
              <option value="Browsers">Browsers</option>
            </select>
          </div>

          <Input
            label="Description (Optional)"
            placeholder="e.g. API Development Platform"
            value={formDescription}
            onChange={(e) => setFormDescription(e.target.value)}
          />
        </form>
      </Dialog>
    </section>
  );
};

export default AppsPage;
