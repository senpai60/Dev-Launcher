import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Search,
  Code2,
  Terminal,
  Folder,
  Play,
  GitBranch,
  Copy,
  Edit,
  Trash2,
  FolderOpen,
  Zap,
  Info,
  Cpu,
} from "lucide-react";
import PageNavbar from "../../components/layout/navbar/PageNavbar";
import {
  ProjectCard,
  ProjectCardData,
} from "../../components/ui/ProjectCard/ProjectCard";
import { ContextMenuItem } from "../../components/ui/ContextMenu/ContextMenu";
import EmptyState from "../../components/ui/EmptyState/EmptyState";
import Dialog from "../../components/ui/Dialog/Dialog";
import Drawer from "../../components/ui/Drawer/Drawer";
import Input from "../../components/ui/Form/Input";
import Checkbox from "../../components/ui/Form/Checkbox";
import TagInput from "../../components/ui/Form/TagInput";
import FolderPicker from "../../components/ui/Form/FolderPicker";
import { useProjectContext } from "../../context/ProjectContext";
import { useGroupContext } from "../../context/GroupContext";
import { useProjectAPI } from "../../api/api";
import { Project } from "../../../types/project";
import { DetectedProjectMeta } from "../../../types/global";
import vscodeIcon from "../../app-icons/vscode.svg";
import "./projects.css";

const ProjectsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const filterParam = searchParams.get("filter") || "all";
  const groupParam = searchParams.get("group") || "";
  const actionParam = searchParams.get("action") || "";

  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // Drawer State
  const [selectedDrawerProject, setSelectedDrawerProject] = useState<Project | null>(null);
  const [drawerMeta, setDrawerMeta] = useState<DetectedProjectMeta | null>(null);

  // Form State
  const [formName, setFormName] = useState("");
  const [formPath, setFormPath] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formTags, setFormTags] = useState<string[]>(["React", "Node.js"]);
  const [formGroupId, setFormGroupId] = useState("");
  const [formIsFavorite, setFormIsFavorite] = useState(false);
  const [formError, setFormError] = useState("");
  const [detectedMeta, setDetectedMeta] = useState<DetectedProjectMeta | null>(null);

  const projectContext = useProjectContext();
  const allProjects = projectContext?.allProjects;
  const loadAllProjects = projectContext?.loadAllProjects;
  const createProject = projectContext?.createProject;
  const deleteProjectItem = projectContext?.deleteProjectItem;
  const editProject = projectContext?.editProject;
  const openProject = projectContext?.openProject;

  const groupCtx = useGroupContext();
  const groups = groupCtx?.groups;
  const loadGroups = groupCtx?.loadGroups;

  const projectApi = useProjectAPI();

  useEffect(() => {
    loadAllProjects?.();
    loadGroups?.();
  }, []);

  useEffect(() => {
    if (actionParam === "create") {
      openCreateDialog();
      searchParams.delete("action");
      setSearchParams(searchParams, { replace: true });
    }
  }, [actionParam]);

  // Filter & sort projects according to Phase 2 specs
  let sourceProjects = (allProjects || []).slice();

  if (filterParam === "favorites") {
    sourceProjects = sourceProjects.filter((p) => p.isFavorite);
  } else if (filterParam === "recent") {
    sourceProjects = sourceProjects.sort(
      (a, b) => (b.lastOpenedAt || b.updatedAt) - (a.lastOpenedAt || a.updatedAt)
    );
  } else if (groupParam) {
    sourceProjects = sourceProjects.filter((p) => p.groupId === groupParam);
  } else {
    sourceProjects = sourceProjects.sort((a, b) => {
      if (a.isFavorite && !b.isFavorite) return -1;
      if (!a.isFavorite && b.isFavorite) return 1;
      return (b.lastOpenedAt || b.updatedAt) - (a.lastOpenedAt || a.updatedAt);
    });
  }

  const projects: ProjectCardData[] = sourceProjects.map((p) => ({
    id: p.id,
    name: p.name,
    tech: p.tags && p.tags.length > 0 ? p.tags.join(" · ") : p.description || "No tech stack",
    path: p.path,
    isFavorite: p.isFavorite ?? false,
  }));

  const openCreateDialog = () => {
    setFormName("");
    setFormPath("");
    setFormDescription("");
    setFormTags(["React", "Express", "Node.js"]);
    setFormGroupId(groupParam || "");
    setFormIsFavorite(false);
    setFormError("");
    setDetectedMeta(null);
    setIsCreateOpen(true);
  };

  const handleOpenDrawer = async (cardData: ProjectCardData) => {
    const fullProj = (allProjects || []).find((p) => p.id === cardData.id);
    if (!fullProj) return;

    setSelectedDrawerProject(fullProj);
    setDrawerMeta(null);

    try {
      const meta = await projectApi.detectProject(fullProj.path);
      setDrawerMeta(meta);
    } catch (e) {
      console.error("Error auto-detecting meta for drawer:", e);
    }
  };

  const handleFolderChange = async (selectedPath: string, extractedName?: string) => {
    setFormPath(selectedPath);
    if (selectedPath) {
      setFormError("");
      try {
        const meta = await projectApi.detectProject(selectedPath);
        if (meta) {
          setDetectedMeta(meta);
          if (meta.name) setFormName(meta.name);
          if (meta.tags && meta.tags.length > 0) setFormTags(meta.tags);
          if (meta.description) setFormDescription(meta.description);
        }
      } catch (err) {
        if (extractedName) setFormName(extractedName);
      }
    } else {
      setDetectedMeta(null);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formPath.trim()) {
      setFormError("Project location is required.");
      return;
    }
    if (!formName.trim()) {
      setFormError("Project name is required.");
      return;
    }

    const newProjectData: Partial<Project> = {
      name: formName.trim(),
      path: formPath.trim(),
      description: formDescription.trim(),
      tags: formTags,
      groupId: formGroupId || undefined,
      isFavorite: formIsFavorite,
    };

    if (createProject) {
      await createProject(newProjectData);
    }
    setIsCreateOpen(false);
  };

  const toggleFavorite = async (id: string) => {
    const p = projects.find((item) => item.id === id);
    if (p && editProject) {
      await editProject(id, { isFavorite: !p.isFavorite });
    }
  };

  const handleDelete = async (id: string) => {
    if (deleteProjectItem) {
      await deleteProjectItem(id);
    }
  };

  const filteredProjects = projects.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.tech.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.path.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getDynamicMenuItems = (project: ProjectCardData): ContextMenuItem[] => [
    {
      id: "details",
      label: "View Phase 4 Details",
      icon: <Info size={14} />,
      onClick: () => handleOpenDrawer(project),
    },
    { id: "div0", isDivider: true },
    {
      id: "vscode",
      label: "Open in VS Code",
      icon: <Code2 size={14} />,
      onClick: () => openProject?.(project.id, "vscode"),
    },
    {
      id: "terminal",
      label: "Open Terminal",
      icon: <Terminal size={14} />,
      onClick: () => openProject?.(project.id, "terminal"),
    },
    {
      id: "folder",
      label: "Open Folder",
      icon: <Folder size={14} />,
      onClick: () => openProject?.(project.id, "folder"),
    },
    {
      id: "run",
      label: "Run Command",
      icon: <Play size={14} />,
      onClick: () => openProject?.(project.id, "terminal"),
    },
    {
      id: "git",
      label: "Git",
      icon: <GitBranch size={14} />,
      onClick: () => openProject?.(project.id, "terminal"),
    },
    { id: "div1", isDivider: true },
    {
      id: "copy",
      label: "Copy Path",
      icon: <Copy size={14} />,
      onClick: () => navigator.clipboard.writeText(project.path),
    },
    {
      id: "edit",
      label: "Edit",
      icon: <Edit size={14} />,
      onClick: () => console.log("Editing project:", project.name),
    },
    {
      id: "delete",
      label: "Delete",
      icon: <Trash2 size={14} />,
      isDanger: true,
      onClick: () => handleDelete(project.id),
    },
  ];

  const activeGroup = (groups || []).find((g) => g.id === groupParam);

  const getPageTitle = () => {
    if (filterParam === "favorites") return "Projects / Favorites";
    if (filterParam === "recent") return "Projects / Recent";
    if (activeGroup) return `Projects / ${activeGroup.name}`;
    if (groupParam) return `Projects / ${groupParam.replace("group_", "").toUpperCase()}`;
    return "Projects / All Projects";
  };

  const assignedGroup = (groups || []).find((g) => g.id === selectedDrawerProject?.groupId);

  return (
    <section className="projects-page">
      <PageNavbar title={getPageTitle()}>
        <button
          className="action-btn text-button"
          style={{ padding: "var(--space-2) var(--space-4)", textAlign: "center" }}
          onClick={openCreateDialog}
        >
          + New Project
        </button>
      </PageNavbar>

      <div className="projects-content">
        {/* Search Bar */}
        <div className="search-container">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            className="search-input"
            placeholder="Search projects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Real Projects Grid OR Centered Empty State */}
        {filteredProjects.length === 0 ? (
          <EmptyState
            icon={<FolderOpen size={32} strokeWidth={1.5} />}
            title={
              activeGroup
                ? `No projects in ${activeGroup.name}`
                : filterParam === "favorites"
                ? "No favorite projects"
                : "No projects yet"
            }
            description={
              filterParam === "favorites"
                ? "Star projects to add them to your favorites list."
                : "Add your first project to start managing your workspace."
            }
            actionLabel={activeGroup ? `Add Project to ${activeGroup.name}` : "Add Project"}
            onAction={openCreateDialog}
          />
        ) : (
          <div className="projects-grid">
            {filteredProjects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onClickCard={handleOpenDrawer}
                onToggleFavorite={toggleFavorite}
                onOpenFolder={(p) => openProject?.(p.id, "folder")}
                onOpenVSCode={(p) => openProject?.(p.id, "vscode")}
                onOpenTerminal={(p) => openProject?.(p.id, "terminal")}
                menuItems={getDynamicMenuItems(project)}
              />
            ))}
          </div>
        )}
      </div>

      {/* SHARED DRAWER — PHASE 4 PROJECT DETAILS */}
      <Drawer
        isOpen={Boolean(selectedDrawerProject)}
        onClose={() => setSelectedDrawerProject(null)}
        title={selectedDrawerProject?.name}
        subtitle={selectedDrawerProject?.path}
        width="480px"
      >
        {selectedDrawerProject && (
          <>
            {/* Quick Actions Bar */}
            <div style={{ display: "flex", gap: "var(--space-2)" }}>
              <button
                className="action-btn text-button"
                style={{ flex: 1, padding: "8px", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6 }}
                onClick={() => openProject?.(selectedDrawerProject.id, "vscode")}
              >
                <img src={vscodeIcon} alt="VS Code" style={{ width: 14, height: 14 }} />
                <span>VS Code</span>
              </button>
              <button
                className="action-btn text-button"
                style={{ flex: 1, padding: "8px", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6 }}
                onClick={() => openProject?.(selectedDrawerProject.id, "terminal")}
              >
                <Terminal size={14} />
                <span>Terminal</span>
              </button>
              <button
                className="action-btn text-button"
                style={{ flex: 1, padding: "8px", display: "inline-flex", alignItems: "center", gap: 6, justifyContent: "center" }}
                onClick={() => openProject?.(selectedDrawerProject.id, "folder")}
              >
                <Folder size={14} />
                <span>Folder</span>
              </button>
            </div>

            {/* Section 1: Auto-Detected Tech Stack & Tags */}
            <div className="drawer-section">
              <span className="drawer-section-title">
                <Zap size={14} style={{ color: "#f59e0b" }} />
                <span>Phase 4 Auto-Detected Tech Stack</span>
              </span>
              <div className="drawer-tags-list">
                {(drawerMeta?.tags || selectedDrawerProject.tags || ["JavaScript"]).map((tag) => (
                  <span key={tag} className="drawer-tag-pill">
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            {/* Section 2: Detailed System Breakdown */}
            <div className="drawer-section">
              <span className="drawer-section-title">
                <Cpu size={14} />
                <span>Detected Toolchain & Environment</span>
              </span>
              <div className="drawer-meta-grid">
                <div className="drawer-meta-item">
                  <span className="drawer-meta-label">Languages</span>
                  <span className="drawer-meta-val">
                    {drawerMeta?.details.languages.join(", ") || "JavaScript"}
                  </span>
                </div>

                <div className="drawer-meta-item">
                  <span className="drawer-meta-label">Frameworks</span>
                  <span className="drawer-meta-val">
                    {drawerMeta?.details.frameworks.join(", ") || "None"}
                  </span>
                </div>

                <div className="drawer-meta-item">
                  <span className="drawer-meta-label">Package Manager</span>
                  <span className="drawer-meta-val">
                    {drawerMeta?.details.packageManager || "npm"}
                  </span>
                </div>

                <div className="drawer-meta-item">
                  <span className="drawer-meta-label">Git Control</span>
                  <span className="drawer-meta-val" style={{ color: drawerMeta?.details.hasGit ? "#10b981" : "var(--text-tertiary)" }}>
                    {drawerMeta?.details.hasGit ? "● Active (.git)" : "Not initialized"}
                  </span>
                </div>

                <div className="drawer-meta-item">
                  <span className="drawer-meta-label">Docker Infra</span>
                  <span className="drawer-meta-val" style={{ color: drawerMeta?.details.hasDocker ? "#10b981" : "var(--text-tertiary)" }}>
                    {drawerMeta?.details.hasDocker ? "● Detected" : "Not detected"}
                  </span>
                </div>

                <div className="drawer-meta-item">
                  <span className="drawer-meta-label">Collection Group</span>
                  <span className="drawer-meta-val">
                    {assignedGroup ? assignedGroup.name : "Unassigned"}
                  </span>
                </div>
              </div>
            </div>

            {/* Section 3: File Location & Path */}
            <div className="drawer-section">
              <span className="drawer-section-title">
                <FolderOpen size={14} />
                <span>Filesystem Location</span>
              </span>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                <span className="drawer-subtitle" style={{ fontSize: "var(--text-xs)" }}>
                  {selectedDrawerProject.path}
                </span>
                <button
                  className="action-btn text-button"
                  style={{ padding: "4px 8px", fontSize: "var(--text-xs)" }}
                  onClick={() => navigator.clipboard.writeText(selectedDrawerProject.path)}
                >
                  <Copy size={13} />
                </button>
              </div>
            </div>

            {/* Section 4: Metadata & Timestamps */}
            {selectedDrawerProject.description && (
              <div className="drawer-section">
                <span className="drawer-section-title">
                  <Info size={14} />
                  <span>Description</span>
                </span>
                <p className="text-meta" style={{ fontSize: "var(--text-sm)", lineHeight: "var(--lh-ui)" }}>
                  {selectedDrawerProject.description}
                </p>
              </div>
            )}
          </>
        )}
      </Drawer>

      {/* REUSABLE DIALOG & NEW PROJECT FORM WITH AUTO DETECTION */}
      <Dialog
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Create New Project"
        footer={
          <>
            <button
              className="action-btn text-button"
              style={{ padding: "8px 16px" }}
              onClick={() => setIsCreateOpen(false)}
            >
              Cancel
            </button>
            <button
              className="primary-action-btn text-button"
              onClick={handleFormSubmit}
            >
              Create Project
            </button>
          </>
        }
      >
        <form onSubmit={handleFormSubmit}>
          <FolderPicker
            label="Project Location"
            value={formPath}
            onChange={handleFolderChange}
            error={formError && !formPath ? formError : undefined}
          />

          {detectedMeta && (
            <div
              style={{
                backgroundColor: "var(--button-inside)",
                border: "1px solid var(--bg-tirtiary)",
                borderRadius: "8px",
                padding: "8px 12px",
                marginBottom: "var(--space-4)",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                fontSize: "var(--text-xs)",
                color: "var(--text-primary)",
              }}
            >
              <Zap size={14} style={{ color: "#f59e0b", flexShrink: 0 }} />
              <span>
                Auto-detected: <strong>{detectedMeta.tags.join(" · ")}</strong>
              </span>
            </div>
          )}

          <Input
            label="Project Name"
            placeholder="Select a location or type name..."
            value={formName}
            onChange={(e) => {
              setFormName(e.target.value);
              if (e.target.value) setFormError("");
            }}
            error={formError && !formName ? formError : undefined}
            required
          />

          {/* Group / Collection Dropdown */}
          <div className="form-field">
            <label className="form-label">Collection / Group (Optional)</label>
            <select
              className="form-input"
              value={formGroupId}
              onChange={(e) => setFormGroupId(e.target.value)}
            >
              <option value="">No Group (Unassigned)</option>
              {(groups || []).map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>

          <TagInput
            label="Tech Stack / Tags"
            tags={formTags}
            onChange={setFormTags}
            placeholder="Type tag (e.g. React, MongoDB) and press Enter..."
          />

          <Input
            label="Description (Optional)"
            placeholder="e.g. Web application dashboard launcher"
            value={formDescription}
            onChange={(e) => setFormDescription(e.target.value)}
          />

          <Checkbox
            label="Add to Favorites"
            checked={formIsFavorite}
            onChange={setFormIsFavorite}
          />
        </form>
      </Dialog>
    </section>
  );
};

export default ProjectsPage;
