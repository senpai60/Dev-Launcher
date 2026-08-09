import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  AlertTriangle,
  Code2,
  Copy,
  Cpu,
  Edit,
  Folder,
  FolderOpen,
  Info,
  Play,
  Plus,
  Search,
  Star,
  Terminal,
  Trash2,
  Zap,
} from "lucide-react";
import PageNavbar from "../../components/layout/navbar/PageNavbar";
import { ProjectCard, ProjectCardData } from "../../components/ui/ProjectCard/ProjectCard";
import { ContextMenuItem } from "../../components/ui/ContextMenu/ContextMenu";
import EmptyState from "../../components/ui/EmptyState/EmptyState";
import Dialog from "../../components/ui/Dialog/Dialog";
import Drawer from "../../components/ui/Drawer/Drawer";
import ConfirmDialog from "../../components/ui/ConfirmDialog/ConfirmDialog";
import CommandRow from "../../components/ui/Command/CommandRow";
import CommandFormDialog from "../../components/ui/Command/CommandFormDialog";
import SessionPanel from "../../components/ui/Session/SessionPanel";
import ProjectGeneratorModal from "../../components/ui/ProjectGenerator/ProjectGeneratorModal";
import Input from "../../components/ui/Form/Input";
import Checkbox from "../../components/ui/Form/Checkbox";
import TagInput from "../../components/ui/Form/TagInput";
import FolderPicker from "../../components/ui/Form/FolderPicker";
import { useToast } from "../../components/ui/Toast/ToastContext";
import { useProjectContext } from "../../context/ProjectContext";
import { useGroupContext } from "../../context/GroupContext";
import { useProjectAPI, useSessionAPI } from "../../api/api";
import { useCommandRunner } from "../../hooks/useCommandRunner";
import { useSessionResume } from "../../hooks/useSessionResume";
import { fuzzyFilter } from "../../utils/fuzzy";
import type {
  DetectedProjectMeta,
  Project,
  ProjectCommand,
  ProjectWithStatus,
} from "../../../types/project";
import vscodeIcon from "../../app-icons/vscode.svg";
import "./projects.css";

const EMPTY_FORM = {
  name: "",
  path: "",
  description: "",
  tags: [] as string[],
  groupId: "",
  isFavorite: false,
  commands: [] as ProjectCommand[],
};

const ProjectsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const filterParam = searchParams.get("filter") || "all";
  const groupParam = searchParams.get("group") || "";
  const actionParam = searchParams.get("action") || "";

  const [searchQuery, setSearchQuery] = useState("");

  // Create / edit project dialog
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isGeneratorOpen, setIsGeneratorOpen] = useState(false);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState("");
  const [detectedMeta, setDetectedMeta] = useState<DetectedProjectMeta | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Drawer
  const [drawerProjectId, setDrawerProjectId] = useState<string | null>(null);
  const [drawerMeta, setDrawerMeta] = useState<DetectedProjectMeta | null>(null);

  // Command dialogs
  const [commandDialog, setCommandDialog] = useState<{
    open: boolean;
    editing: ProjectCommand | null;
  }>({ open: false, editing: null });
  const [commandToDelete, setCommandToDelete] = useState<ProjectCommand | null>(null);
  const [projectToDelete, setProjectToDelete] = useState<ProjectWithStatus | null>(null);

  const toast = useToast();
  const projectContext = useProjectContext();
  const groupCtx = useGroupContext();
  const projectApi = useProjectAPI();
  const sessionApi = useSessionAPI();

  // How many enabled steps each project has, so cards can show a Resume button.
  const [sessionCounts, setSessionCounts] = useState<Record<string, number>>({});

  const loadSessionCounts = async () => {
    if (!sessionApi.isAvailable) return;
    try {
      const sessions = await sessionApi.getAllSessions();
      setSessionCounts(
        Object.fromEntries(
          sessions.map((s) => [s.projectId, s.steps.filter((step) => step.enabled).length]),
        ),
      );
    } catch {
      // Non-critical: cards simply won't show a Resume button.
    }
  };
  const { requestRun, runningCommandId, confirmElement } = useCommandRunner();
  const { resume, resumingProjectId, progress: resumeProgress } = useSessionResume(() =>
    projectContext?.loadAllProjects(),
  );

  const allProjects = projectContext?.allProjects;
  const groups = groupCtx?.groups;

  useEffect(() => {
    projectContext?.loadAllProjects();
    groupCtx?.loadGroups?.();
    void loadSessionCounts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Steps are captured in main as you work, so refresh once a resume settles.
  useEffect(() => {
    if (!resumingProjectId) void loadSessionCounts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resumingProjectId, drawerProjectId]);

  useEffect(() => {
    if (actionParam === "create") {
      openCreateDialog();
      searchParams.delete("action");
      setSearchParams(searchParams, { replace: true });
    }
    if (actionParam === "generate") {
      setIsGeneratorOpen(true);
      searchParams.delete("action");
      setSearchParams(searchParams, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actionParam]);

  // The drawer reads live from context so command edits appear immediately.
  const drawerProject = useMemo(
    () => (allProjects ?? []).find((p) => p.id === drawerProjectId) ?? null,
    [allProjects, drawerProjectId],
  );

  /* -------------------------------------------------------------------- */
  /*  Filtering                                                            */
  /* -------------------------------------------------------------------- */

  const visibleProjects = useMemo(() => {
    let source = (allProjects ?? []).slice();

    if (filterParam === "favorites") {
      source = source.filter((p) => p.isFavorite);
    } else if (groupParam) {
      source = source.filter((p) => p.groupId === groupParam);
    }

    if (filterParam === "recent") {
      source.sort((a, b) => (b.lastOpenedAt || b.updatedAt) - (a.lastOpenedAt || a.updatedAt));
    } else {
      source.sort((a, b) => {
        if (a.isFavorite !== b.isFavorite) return a.isFavorite ? -1 : 1;
        return (b.lastOpenedAt || b.updatedAt) - (a.lastOpenedAt || a.updatedAt);
      });
    }

    return fuzzyFilter(source, searchQuery, (p) => [
      p.name,
      p.tags?.join(" "),
      p.description,
      p.path,
    ]);
  }, [allProjects, filterParam, groupParam, searchQuery]);

  const cards: ProjectCardData[] = visibleProjects.map((p) => ({
    id: p.id,
    name: p.name,
    tags: p.tags ?? [],
    fallbackTech: p.description || "No tech stack",
    path: p.path,
    isFavorite: p.isFavorite ?? false,
    pathExists: p.pathExists,
    commandCount: p.commands?.length ?? 0,
    sessionStepCount: sessionCounts[p.id] ?? 0,
  }));

  /* -------------------------------------------------------------------- */
  /*  Project create / edit                                                */
  /* -------------------------------------------------------------------- */

  const openCreateDialog = () => {
    setEditingProjectId(null);
    setForm({ ...EMPTY_FORM, groupId: groupParam || "" });
    setFormError("");
    setDetectedMeta(null);
    setIsFormOpen(true);
  };

  const openEditDialog = (project: ProjectWithStatus) => {
    setEditingProjectId(project.id);
    setForm({
      name: project.name,
      path: project.path,
      description: project.description ?? "",
      tags: project.tags ?? [],
      groupId: project.groupId ?? "",
      isFavorite: project.isFavorite ?? false,
      commands: project.commands ?? [],
    });
    setFormError("");
    setDetectedMeta(null);
    setIsFormOpen(true);
  };

  const handleFolderChange = async (selectedPath: string, extractedName?: string) => {
    setForm((f) => ({ ...f, path: selectedPath }));
    setFormError("");

    if (!selectedPath) {
      setDetectedMeta(null);
      return;
    }

    try {
      const meta = await projectApi.detectProject(selectedPath);
      setDetectedMeta(meta);
      setForm((f) => ({
        ...f,
        // Don't overwrite fields the user already filled in.
        name: f.name || meta.name || extractedName || "",
        tags: f.tags.length > 0 ? f.tags : meta.tags,
        description: f.description || meta.description || "",
        commands: f.commands.length > 0 ? f.commands : meta.commands,
      }));
    } catch {
      setForm((f) => ({ ...f, name: f.name || extractedName || "" }));
    }
  };

  const handleFormSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (isSaving) return;

    if (!form.path.trim()) {
      setFormError("Project location is required.");
      return;
    }
    if (!form.name.trim()) {
      setFormError("Project name is required.");
      return;
    }

    const payload: Partial<Project> = {
      name: form.name.trim(),
      path: form.path.trim(),
      description: form.description.trim() || undefined,
      tags: form.tags,
      groupId: form.groupId || undefined,
      isFavorite: form.isFavorite,
    };

    setIsSaving(true);
    const result = editingProjectId
      ? await projectContext?.editProject(editingProjectId, payload)
      : await projectContext?.createProject({ ...payload, commands: form.commands });
    setIsSaving(false);

    if (result) {
      if (editingProjectId) toast.success(`Updated ${result.name}`);
      setIsFormOpen(false);
    }
  };

  /* -------------------------------------------------------------------- */
  /*  Drawer                                                               */
  /* -------------------------------------------------------------------- */

  const handleOpenDrawer = async (cardData: ProjectCardData) => {
    const project = (allProjects ?? []).find((p) => p.id === cardData.id);
    if (!project) return;

    setDrawerProjectId(project.id);
    setDrawerMeta(null);

    if (!project.pathExists) return;

    try {
      const meta = await projectApi.detectProject(project.path);
      setDrawerMeta(meta);

      // Promote detected commands into real, editable records the first time
      // this project is opened, so they can be edited and deleted like any
      // other command rather than being regenerated on each detection.
      if ((project.commands?.length ?? 0) === 0 && meta.commands.length > 0) {
        await projectContext?.seedCommands(project.id, meta.commands);
      }
    } catch (e) {
      console.warn("Detection failed for drawer:", e);
    }
  };

  // Favourites first, then alphabetical.
  const sortedCommands = useMemo(
    () =>
      [...(drawerProject?.commands ?? [])].sort((a, b) => {
        if (a.isFavorite !== b.isFavorite) return a.isFavorite ? -1 : 1;
        return a.name.localeCompare(b.name);
      }),
    [drawerProject],
  );

  const handleCommandSubmit = async (values: Partial<ProjectCommand>) => {
    if (!drawerProject) return false;

    if (commandDialog.editing) {
      return (
        (await projectContext?.updateCommand(
          drawerProject.id,
          commandDialog.editing.id,
          values,
        )) ?? false
      );
    }
    return (await projectContext?.addCommand(drawerProject.id, values)) ?? false;
  };

  /* -------------------------------------------------------------------- */
  /*  Card menu                                                            */
  /* -------------------------------------------------------------------- */

  const getMenuItems = (card: ProjectCardData): ContextMenuItem[] => {
    const project = (allProjects ?? []).find((p) => p.id === card.id);

    return [
      {
        id: "details",
        label: "View details & commands",
        icon: <Info size={14} />,
        onClick: () => handleOpenDrawer(card),
      },
      { id: "div0", isDivider: true },
      {
        id: "vscode",
        label: "Open in VS Code",
        icon: <Code2 size={14} />,
        onClick: () => projectContext?.openProject(card.id, "vscode"),
      },
      {
        id: "terminal",
        label: "Open terminal",
        icon: <Terminal size={14} />,
        onClick: () => projectContext?.openProject(card.id, "terminal"),
      },
      {
        id: "folder",
        label: "Open folder",
        icon: <Folder size={14} />,
        onClick: () => projectContext?.openProject(card.id, "folder"),
      },
      { id: "div1", isDivider: true },
      {
        id: "favorite",
        label: card.isFavorite ? "Remove from favorites" : "Add to favorites",
        icon: <Star size={14} />,
        onClick: () => toggleFavorite(card.id),
      },
      {
        id: "copy",
        label: "Copy path",
        icon: <Copy size={14} />,
        onClick: () => copyPath(card.path),
      },
      {
        id: "edit",
        label: "Edit project",
        icon: <Edit size={14} />,
        onClick: () => project && openEditDialog(project),
      },
      { id: "div2", isDivider: true },
      {
        id: "delete",
        label: "Remove from launcher",
        icon: <Trash2 size={14} />,
        isDanger: true,
        onClick: () => project && setProjectToDelete(project),
      },
    ];
  };

  const toggleFavorite = async (id: string) => {
    const project = (allProjects ?? []).find((p) => p.id === id);
    if (project) {
      await projectContext?.editProject(id, { isFavorite: !project.isFavorite });
    }
  };

  const copyPath = async (path: string) => {
    try {
      await navigator.clipboard.writeText(path);
      toast.success("Path copied");
    } catch {
      toast.error("Could not copy path");
    }
  };

  const activeGroup = (groups ?? []).find((g) => g.id === groupParam);

  const getPageTitle = () => {
    if (filterParam === "favorites") return "Projects / Favorites";
    if (filterParam === "recent") return "Projects / Recent";
    if (activeGroup) return `Projects / ${activeGroup.name}`;
    return "Projects / All Projects";
  };

  const assignedGroup = (groups ?? []).find((g) => g.id === drawerProject?.groupId);

  return (
    <section className="projects-page">
      <PageNavbar title={getPageTitle()}>
        <button
          className="action-btn text-button"
          style={{ padding: "var(--space-2) var(--space-4)", textAlign: "center", display: "flex", alignItems: "center", gap: "6px" }}
          onClick={() => setIsGeneratorOpen(true)}
        >
          <Zap size={13} style={{ color: "var(--accent-primary)" }} />
          Instant Generator
        </button>
        <button
          className="action-btn text-button"
          style={{ padding: "var(--space-2) var(--space-4)", textAlign: "center" }}
          onClick={openCreateDialog}
        >
          + New Project
        </button>
      </PageNavbar>

      <div className="projects-content">
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

        {cards.length === 0 ? (
          <EmptyState
            icon={<FolderOpen size={32} strokeWidth={1.5} />}
            title={
              searchQuery
                ? `No projects match "${searchQuery}"`
                : activeGroup
                  ? `No projects in ${activeGroup.name}`
                  : filterParam === "favorites"
                    ? "No favorite projects"
                    : "No projects yet"
            }
            description={
              searchQuery
                ? "Try a different search term."
                : filterParam === "favorites"
                  ? "Star projects to add them to your favorites list."
                  : "Add your first project to start managing your workspace."
            }
            actionLabel={searchQuery ? undefined : "Add Project"}
            onAction={searchQuery ? undefined : openCreateDialog}
          />
        ) : (
          <div className="projects-grid">
            {cards.map((card) => (
              <ProjectCard
                key={card.id}
                project={card}
                onClickCard={handleOpenDrawer}
                onToggleFavorite={toggleFavorite}
                onOpenFolder={(p) => projectContext?.openProject(p.id, "folder")}
                onOpenVSCode={(p) => projectContext?.openProject(p.id, "vscode")}
                onOpenTerminal={(p) => projectContext?.openProject(p.id, "terminal")}
                onLocate={(p) => {
                  const project = (allProjects ?? []).find((item) => item.id === p.id);
                  if (project) openEditDialog(project);
                }}
                onResume={(p) => resume(p.id, p.name)}
                isResuming={resumingProjectId === card.id}
                menuItems={getMenuItems(card)}
              />
            ))}
          </div>
        )}
      </div>

      {/* ---- Project detail drawer ------------------------------------ */}
      <Drawer
        isOpen={Boolean(drawerProject)}
        onClose={() => setDrawerProjectId(null)}
        title={drawerProject?.name}
        subtitle={drawerProject?.path}
        width="480px"
      >
        {drawerProject && (
          <>
            {!drawerProject.pathExists && (
              <div className="drawer-alert">
                <AlertTriangle size={15} />
                <div>
                  <strong>This folder no longer exists.</strong>
                  <span>Update the location to use this project again.</span>
                  <button className="drawer-alert-action" onClick={() => openEditDialog(drawerProject)}>
                    Update location
                  </button>
                </div>
              </div>
            )}

            <div className="drawer-quick-actions">
              <button
                className="action-btn text-button drawer-quick-btn"
                onClick={() => projectContext?.openProject(drawerProject.id, "vscode")}
                disabled={!drawerProject.pathExists}
              >
                <img src={vscodeIcon} alt="" style={{ width: 14, height: 14 }} />
                <span>VS Code</span>
              </button>
              <button
                className="action-btn text-button drawer-quick-btn"
                onClick={() => projectContext?.openProject(drawerProject.id, "terminal")}
                disabled={!drawerProject.pathExists}
              >
                <Terminal size={14} />
                <span>Terminal</span>
              </button>
              <button
                className="action-btn text-button drawer-quick-btn"
                onClick={() => projectContext?.openProject(drawerProject.id, "folder")}
                disabled={!drawerProject.pathExists}
              >
                <Folder size={14} />
                <span>Folder</span>
              </button>
            </div>

            {/* ---- Resume session -------------------------------------- */}
            <SessionPanel
              projectId={drawerProject.id}
              projectName={drawerProject.name}
              canResume={drawerProject.pathExists}
              isResuming={resumingProjectId === drawerProject.id}
              activeLabel={resumeProgress?.label}
              onResume={() => resume(drawerProject.id, drawerProject.name)}
            />

            {/* ---- Commands ------------------------------------------- */}
            <div className="drawer-section">
              <div className="drawer-section-header">
                <span className="drawer-section-title">
                  <Play size={14} style={{ color: "#10b981" }} />
                  <span>Commands</span>
                </span>
                <button
                  type="button"
                  className="drawer-section-action"
                  onClick={() => setCommandDialog({ open: true, editing: null })}
                >
                  <Plus size={12} />
                  <span>Add Command</span>
                </button>
              </div>

              {sortedCommands.length > 0 ? (
                <div className="command-list">
                  {sortedCommands.map((cmd) => (
                    <CommandRow
                      key={cmd.id}
                      command={cmd}
                      isRunning={runningCommandId === cmd.id}
                      disabled={!drawerProject.pathExists}
                      disabledReason="The project folder is missing."
                      onRun={(c) => requestRun(drawerProject, c)}
                      onEdit={(c) => setCommandDialog({ open: true, editing: c })}
                      onDelete={(c) => setCommandToDelete(c)}
                      onToggleFavorite={(c) =>
                        projectContext?.updateCommand(drawerProject.id, c.id, {
                          isFavorite: !c.isFavorite,
                        })
                      }
                    />
                  ))}
                </div>
              ) : (
                <p className="command-list-empty">
                  No commands yet. Add one to stop typing it by hand.
                </p>
              )}
            </div>

            {/* ---- Tech stack ----------------------------------------- */}
            <div className="drawer-section">
              <span className="drawer-section-title">
                <Zap size={14} style={{ color: "#f59e0b" }} />
                <span>Tech Stack</span>
              </span>
              <div className="drawer-tags-list">
                {(drawerMeta?.tags?.length ? drawerMeta.tags : drawerProject.tags ?? []).map(
                  (tag) => (
                    <span key={tag} className="drawer-tag-pill">
                      {tag}
                    </span>
                  ),
                )}
                {!drawerMeta?.tags?.length && !drawerProject.tags?.length && (
                  <span className="command-list-empty">Nothing detected.</span>
                )}
              </div>
            </div>

            {/* ---- Toolchain ------------------------------------------ */}
            <div className="drawer-section">
              <span className="drawer-section-title">
                <Cpu size={14} />
                <span>Detected Toolchain</span>
              </span>
              <div className="drawer-meta-grid">
                <div className="drawer-meta-item">
                  <span className="drawer-meta-label">Languages</span>
                  <span className="drawer-meta-val">
                    {drawerMeta?.details.languages.join(", ") || "—"}
                  </span>
                </div>
                <div className="drawer-meta-item">
                  <span className="drawer-meta-label">Frameworks</span>
                  <span className="drawer-meta-val">
                    {drawerMeta?.details.frameworks.join(", ") || "—"}
                  </span>
                </div>
                <div className="drawer-meta-item">
                  <span className="drawer-meta-label">Package Manager</span>
                  <span className="drawer-meta-val">
                    {drawerMeta?.details.packageManager || "—"}
                  </span>
                </div>
                <div className="drawer-meta-item">
                  <span className="drawer-meta-label">Git</span>
                  <span
                    className="drawer-meta-val"
                    style={{ color: drawerMeta?.details.hasGit ? "#10b981" : "var(--text-tertiary)" }}
                  >
                    {drawerMeta?.details.hasGit ? "● Repository" : "Not initialized"}
                  </span>
                </div>
                <div className="drawer-meta-item">
                  <span className="drawer-meta-label">Docker</span>
                  <span
                    className="drawer-meta-val"
                    style={{ color: drawerMeta?.details.hasDocker ? "#10b981" : "var(--text-tertiary)" }}
                  >
                    {drawerMeta?.details.hasDocker ? "● Detected" : "Not detected"}
                  </span>
                </div>
                <div className="drawer-meta-item">
                  <span className="drawer-meta-label">Group</span>
                  <span className="drawer-meta-val">
                    {assignedGroup ? assignedGroup.name : "Unassigned"}
                  </span>
                </div>
              </div>
            </div>

            {/* ---- Location -------------------------------------------- */}
            <div className="drawer-section">
              <span className="drawer-section-title">
                <FolderOpen size={14} />
                <span>Location</span>
              </span>
              <div className="drawer-path-row">
                <span className="drawer-path-text">{drawerProject.path}</span>
                <button
                  className="action-btn text-button drawer-path-copy"
                  onClick={() => copyPath(drawerProject.path)}
                  title="Copy path"
                >
                  <Copy size={13} />
                </button>
              </div>
            </div>
          </>
        )}
      </Drawer>

      {/* ---- Command add / edit --------------------------------------- */}
      <CommandFormDialog
        isOpen={commandDialog.open}
        command={commandDialog.editing}
        projectPath={drawerProject?.path}
        onClose={() => setCommandDialog({ open: false, editing: null })}
        onSubmit={handleCommandSubmit}
      />

      {/* ---- Destructive-command confirmation -------------------------- */}
      {confirmElement}

      {/* ---- Delete command confirmation ------------------------------- */}
      <ConfirmDialog
        isOpen={Boolean(commandToDelete)}
        isDanger
        title="Delete command?"
        message={
          <>
            <strong>{commandToDelete?.name}</strong> will be removed from this project.
          </>
        }
        detail={commandToDelete?.command}
        confirmLabel="Delete"
        onCancel={() => setCommandToDelete(null)}
        onConfirm={() => {
          if (drawerProject && commandToDelete) {
            void projectContext?.deleteCommand(drawerProject.id, commandToDelete.id);
          }
          setCommandToDelete(null);
        }}
      />

      {/* ---- Delete project confirmation ------------------------------- */}
      <ConfirmDialog
        isOpen={Boolean(projectToDelete)}
        isDanger
        title="Remove project?"
        message={
          <>
            <strong>{projectToDelete?.name}</strong> will be removed from Dev Launcher. The folder
            on disk is not deleted.
          </>
        }
        detail={projectToDelete?.path}
        confirmLabel="Remove"
        onCancel={() => setProjectToDelete(null)}
        onConfirm={() => {
          if (projectToDelete) {
            void projectContext?.deleteProjectItem(projectToDelete.id);
            if (drawerProjectId === projectToDelete.id) setDrawerProjectId(null);
          }
          setProjectToDelete(null);
        }}
      />

      {/* ---- Instant Generator modal ----------------------------------- */}
      <ProjectGeneratorModal
        isOpen={isGeneratorOpen}
        onClose={() => setIsGeneratorOpen(false)}
        onProjectCreated={() => projectContext?.loadAllProjects()}
      />

      {/* ---- Create / edit project ------------------------------------- */}
      <Dialog
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={editingProjectId ? "Edit Project" : "Create New Project"}
        footer={
          <>
            <button
              className="action-btn text-button"
              style={{ padding: "8px 16px" }}
              onClick={() => setIsFormOpen(false)}
            >
              Cancel
            </button>
            <button
              className="primary-action-btn text-button"
              onClick={() => handleFormSubmit()}
              disabled={isSaving}
            >
              {isSaving ? "Saving..." : editingProjectId ? "Save Changes" : "Create Project"}
            </button>
          </>
        }
      >
        <form onSubmit={handleFormSubmit}>
          <FolderPicker
            label="Project Location"
            value={form.path}
            onChange={handleFolderChange}
            error={formError && !form.path ? formError : undefined}
          />

          {detectedMeta && detectedMeta.tags.length > 0 && (
            <div className="detected-banner">
              <Zap size={14} style={{ color: "#f59e0b", flexShrink: 0 }} />
              <span>
                Detected: <strong>{detectedMeta.tags.join(" · ")}</strong>
                {detectedMeta.commands.length > 0 && (
                  <> · {detectedMeta.commands.length} commands</>
                )}
              </span>
            </div>
          )}

          <Input
            label="Project Name"
            placeholder="Select a location or type a name..."
            value={form.name}
            onChange={(e) => {
              setForm((f) => ({ ...f, name: e.target.value }));
              if (e.target.value) setFormError("");
            }}
            error={formError && !form.name ? formError : undefined}
            required
          />

          <div className="form-field">
            <label className="form-label">Collection / Group (Optional)</label>
            <select
              className="form-input"
              value={form.groupId}
              onChange={(e) => setForm((f) => ({ ...f, groupId: e.target.value }))}
            >
              <option value="">No Group (Unassigned)</option>
              {(groups ?? []).map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>

          <TagInput
            label="Tech Stack / Tags"
            tags={form.tags}
            onChange={(tags) => setForm((f) => ({ ...f, tags }))}
            placeholder="Type a tag and press Enter..."
          />

          <Input
            label="Description (Optional)"
            placeholder="e.g. Internal CRM dashboard"
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          />

          <Checkbox
            label="Add to Favorites"
            checked={form.isFavorite}
            onChange={(checked) => setForm((f) => ({ ...f, isFavorite: checked }))}
          />
        </form>
      </Dialog>
    </section>
  );
};

export default ProjectsPage;
