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
} from "lucide-react";
import PageNavbar from "../../components/layout/navbar/PageNavbar";
import {
  ProjectCard,
  ProjectCardData,
} from "../../components/ui/ProjectCard/ProjectCard";
import { ContextMenuItem } from "../../components/ui/ContextMenu/ContextMenu";
import EmptyState from "../../components/ui/EmptyState/EmptyState";
import Dialog from "../../components/ui/Dialog/Dialog";
import Input from "../../components/ui/Form/Input";
import Checkbox from "../../components/ui/Form/Checkbox";
import TagInput from "../../components/ui/Form/TagInput";
import FolderPicker from "../../components/ui/Form/FolderPicker";
import { useProjectContext } from "../../context/ProjectContext";
import { useGroupContext } from "../../context/GroupContext";
import { Project } from "../../../types/project";
import "./projects.css";

const ProjectsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const filterParam = searchParams.get("filter") || "all";
  const groupParam = searchParams.get("group") || "";
  const actionParam = searchParams.get("action") || "";

  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // Form State
  const [formName, setFormName] = useState("");
  const [formPath, setFormPath] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formTags, setFormTags] = useState<string[]>(["React", "Node.js"]);
  const [formGroupId, setFormGroupId] = useState("");
  const [formIsFavorite, setFormIsFavorite] = useState(false);
  const [formError, setFormError] = useState("");

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

  useEffect(() => {
    loadAllProjects?.();
    loadGroups?.();
  }, []);

  useEffect(() => {
    if (actionParam === "create") {
      openCreateDialog();
      // Clear action param after opening
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
    // All projects mode: favorites sorted first, then by last opened / updated date
    sourceProjects = sourceProjects.sort((a, b) => {
      if (a.isFavorite && !b.isFavorite) return -1;
      if (!a.isFavorite && b.isFavorite) return 1;
      return (b.lastOpenedAt || b.updatedAt) - (a.lastOpenedAt || a.updatedAt);
    });
  }

  // Map real projects from context
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
    setIsCreateOpen(true);
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

        {/* Real Projects Grid OR Centered Empty State when 0 projects exist */}
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

      {/* REUSABLE DIALOG & NEW PROJECT FORM */}
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
            onChange={(selectedPath, extractedName) => {
              setFormPath(selectedPath);
              if (extractedName) {
                setFormName(extractedName);
              }
              if (selectedPath) setFormError("");
            }}
            error={formError && !formPath ? formError : undefined}
          />

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
