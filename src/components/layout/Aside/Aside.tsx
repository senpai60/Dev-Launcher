import * as LucideIcons from "lucide-react";
import { Plus, FolderPlus, Edit, Trash2, Copy, AppWindow, Star, Code2, Terminal, Layout, Database } from "lucide-react";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { useGroupContext } from "../../../context/GroupContext";
import { useProjectContext } from "../../../context/ProjectContext";
import Dialog from "../../ui/Dialog/Dialog";
import Input from "../../ui/Form/Input";
import Checkbox from "../../ui/Form/Checkbox";
import ContextMenu, { ContextMenuItem } from "../../ui/ContextMenu/ContextMenu";
import { ProjectGroup } from "../../../../types/group";
import "./aside.css";

type LucideIconKey = {
  [K in keyof typeof LucideIcons]: (typeof LucideIcons)[K] extends LucideIcons.LucideIcon
    ? K
    : never;
}[keyof typeof LucideIcons];

type NavLink = {
  to: string;
  label: string;
  icon: LucideIconKey;
};

const primaryLinks: NavLink[] = [
  { to: "/", label: "Home", icon: "Home" },
  { to: "/projects", label: "Projects", icon: "FolderClosed" },
  { to: "/workspaces", label: "Workspaces", icon: "LayoutGrid" },
  { to: "/commands", label: "Commands", icon: "Terminal" },
  { to: "/tools", label: "Tools", icon: "Wrench" },
  { to: "/git", label: "Git", icon: "GitBranch" },
  { to: "/docker", label: "Docker", icon: "Container" },
  { to: "/apps", label: "Apps", icon: "AppWindow" },
];

const secondaryProjectLinks = [
  { id: "favorites", label: "Favorites", icon: "Star" as LucideIconKey, filter: "favorites" },
  { id: "recent", label: "Recent", icon: "Clock" as LucideIconKey, filter: "recent" },
  { id: "all", label: "All Projects", icon: "Folder" as LucideIconKey, filter: "all" },
];

const secondaryAppLinks = [
  { id: "favorites", label: "Favorites", filter: "favorites" },
  { id: "all", label: "All Apps", filter: "all" },
];

const appCategoryLinks = [
  { id: "editors", label: "IDEs & Editors", icon: Code2 },
  { id: "terminal", label: "Terminal & CLI", icon: Terminal },
  { id: "design", label: "Design & Proto", icon: Layout },
  { id: "database", label: "Database & Cloud", icon: Database },
];

const Aside = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  // Create Group Modal State
  const [isAddGroupOpen, setIsAddGroupOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);
  const [groupError, setGroupError] = useState("");

  // Edit Group Modal State
  const [editingGroup, setEditingGroup] = useState<ProjectGroup | null>(null);
  const [editGroupName, setEditGroupName] = useState("");
  const [editProjectIds, setEditProjectIds] = useState<string[]>([]);

  // Context Menu State
  const [contextMenuGroupId, setContextMenuGroupId] = useState<string | null>(null);

  const groupCtx = useGroupContext();
  const groups = groupCtx?.groups;
  const loadGroups = groupCtx?.loadGroups;
  const createGroup = groupCtx?.createGroup;
  const editGroup = groupCtx?.editGroup;
  const deleteGroupItem = groupCtx?.deleteGroupItem;

  const projectCtx = useProjectContext();
  const allProjects = projectCtx?.allProjects;
  const editProject = projectCtx?.editProject;

  useEffect(() => {
    loadGroups?.();
  }, []);

  const currentFilter = searchParams.get("filter") || "all";
  const currentGroup = searchParams.get("group") || "";
  const currentAppCategory = searchParams.get("category") || "";

  const isAppsRoute = location.pathname === "/apps";

  const handleSecondaryClick = (filter: string, group?: string) => {
    if (group) {
      navigate(`/projects?group=${group}`);
    } else if (filter !== "all") {
      navigate(`/projects?filter=${filter}`);
    } else {
      navigate("/projects");
    }
  };

  const handleAppSecondaryClick = (filter: string, category?: string) => {
    if (category) {
      navigate(`/apps?category=${category}`);
    } else if (filter !== "all") {
      navigate(`/apps?filter=${filter}`);
    } else {
      navigate("/apps");
    }
  };

  const toggleProjectSelection = (id: string) => {
    setSelectedProjectIds((prev) =>
      prev.includes(id) ? prev.filter((pId) => pId !== id) : [...prev, id]
    );
  };

  const toggleEditProjectSelection = (id: string) => {
    setEditProjectIds((prev) =>
      prev.includes(id) ? prev.filter((pId) => pId !== id) : [...prev, id]
    );
  };

  const handleCreateGroupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) {
      setGroupError("Collection name is required.");
      return;
    }

    if (createGroup) {
      const createdGroup = await createGroup(newGroupName.trim());
      
      if (selectedProjectIds.length > 0 && editProject) {
        for (const projId of selectedProjectIds) {
          await editProject(projId, { groupId: createdGroup.id });
        }
      }
    }

    setNewGroupName("");
    setSelectedProjectIds([]);
    setGroupError("");
    setIsAddGroupOpen(false);
  };

  const handleEditGroupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGroup || !editGroupName.trim()) return;

    if (editGroup) {
      await editGroup(editingGroup.id, { name: editGroupName.trim() });
    }

    if (allProjects && editProject) {
      for (const p of allProjects) {
        const wasInGroup = p.groupId === editingGroup.id;
        const shouldBeInGroup = editProjectIds.includes(p.id);

        if (shouldBeInGroup && !wasInGroup) {
          await editProject(p.id, { groupId: editingGroup.id });
        } else if (!shouldBeInGroup && wasInGroup) {
          await editProject(p.id, { groupId: undefined });
        }
      }
    }

    setEditingGroup(null);
  };

  const openEditGroupModal = (group: ProjectGroup) => {
    setEditingGroup(group);
    setEditGroupName(group.name);
    const existingInGroup = (allProjects || [])
      .filter((p) => p.groupId === group.id)
      .map((p) => p.id);
    setEditProjectIds(existingInGroup);
  };

  const handleOpenNewProjectForm = () => {
    setIsAddGroupOpen(false);
    navigate("/projects?action=create");
  };

  const getGroupContextMenuItems = (group: ProjectGroup): ContextMenuItem[] => [
    {
      id: "add-proj",
      label: "Add Projects to Group",
      icon: <FolderPlus size={14} />,
      onClick: () => openEditGroupModal(group),
    },
    {
      id: "edit",
      label: "Edit Collection",
      icon: <Edit size={14} />,
      onClick: () => openEditGroupModal(group),
    },
    {
      id: "copy-name",
      label: "Copy Group Name",
      icon: <Copy size={14} />,
      onClick: () => navigator.clipboard.writeText(group.name),
    },
    { id: "div1", isDivider: true },
    {
      id: "delete",
      label: "Delete Collection",
      icon: <Trash2 size={14} />,
      isDanger: true,
      onClick: () => deleteGroupItem?.(group.id),
    },
  ];

  return (
    <>
      <aside className="aside-container">
        {/* PRIMARY SIDEBAR */}
        <div className="sidebar-primary">
          <div className="primary-nav-top">
            {primaryLinks.map((navLink) => {
              const Icon = LucideIcons[navLink.icon] as LucideIcons.LucideIcon;
              const isActive = location.pathname === navLink.to;
              return (
                <div
                  onClick={() => navigate(navLink.to)}
                  key={navLink.to}
                  title={navLink.label}
                  className={`primary-nav-item ${isActive ? "active" : ""}`}
                >
                  <Icon size={20} strokeWidth={1.5} />
                  <span>{navLink.label}</span>
                </div>
              );
            })}
          </div>
          <div className="primary-nav-bottom">
            <div
              className={`primary-nav-item ${location.pathname === "/settings" ? "active" : ""}`}
              onClick={() => navigate("/settings")}
              title="Settings"
            >
              <LucideIcons.Settings size={20} strokeWidth={1.5} />
              <span>Settings</span>
            </div>
          </div>
        </div>

        {/* SECONDARY SIDEBAR */}
        <div className="sidebar-secondary">
          {isAppsRoute ? (
            /* APPS SECONDARY SIDEBAR */
            <>
              <h2>Apps & Tools</h2>
              <ul className="secondary-nav">
                {secondaryAppLinks.map((link) => {
                  const isSel = !currentAppCategory && currentFilter === link.filter;
                  const IconComponent = link.id === "favorites" ? Star : AppWindow;
                  return (
                    <li
                      key={link.id}
                      onClick={() => handleAppSecondaryClick(link.filter)}
                      className={`secondary-nav-item ${isSel ? "active" : ""}`}
                    >
                      <IconComponent size={14} style={{ marginRight: 8, opacity: 0.8 }} />
                      {link.label}
                    </li>
                  );
                })}
              </ul>

              <div className="groups-header-container">
                <span className="groups-header-title">Categories</span>
              </div>
              <ul className="secondary-nav">
                {appCategoryLinks.map((cat) => {
                  const isSel = currentAppCategory === cat.id;
                  const CatIcon = cat.icon;
                  return (
                    <li
                      key={cat.id}
                      onClick={() => handleAppSecondaryClick("all", cat.id)}
                      className={`secondary-nav-item ${isSel ? "active" : ""}`}
                    >
                      <CatIcon size={14} style={{ marginRight: 8, opacity: 0.8 }} />
                      {cat.label}
                    </li>
                  );
                })}
              </ul>
            </>
          ) : (
            /* PROJECTS SECONDARY SIDEBAR */
            <>
              <h2>Projects</h2>
              <ul className="secondary-nav">
                {secondaryProjectLinks.map((link) => {
                  const Icon = LucideIcons[link.icon] as LucideIcons.LucideIcon;
                  const isSel = !currentGroup && currentFilter === link.filter;
                  return (
                    <li
                      key={link.id}
                      onClick={() => handleSecondaryClick(link.filter)}
                      className={`secondary-nav-item ${isSel ? "active" : ""}`}
                    >
                      <Icon size={14} style={{ marginRight: 8, opacity: 0.8 }} />
                      {link.label}
                    </li>
                  );
                })}
              </ul>

              <div className="groups-header-container">
                <span className="groups-header-title">Groups</span>
                <button
                  className="add-group-btn"
                  title="Create Collection / Group"
                  onClick={() => {
                    setNewGroupName("");
                    setSelectedProjectIds([]);
                    setGroupError("");
                    setIsAddGroupOpen(true);
                  }}
                >
                  <Plus size={14} />
                </button>
              </div>
              <ul className="secondary-nav">
                {(groups || []).map((group) => {
                  const isSel = currentGroup === group.id;
                  const isMenuOpen = contextMenuGroupId === group.id;

                  return (
                    <ContextMenu
                      key={group.id}
                      isOpen={isMenuOpen}
                      onClose={() => setContextMenuGroupId(null)}
                      items={getGroupContextMenuItems(group)}
                      position="bottom-right"
                      trigger={
                        <li
                          onClick={() => handleSecondaryClick("all", group.id)}
                          onContextMenu={(e) => {
                            e.preventDefault();
                            setContextMenuGroupId(group.id);
                          }}
                          className={`secondary-nav-item group-item ${isSel ? "active" : ""}`}
                        >
                          {group.name}
                        </li>
                      }
                    />
                  );
                })}
              </ul>
            </>
          )}
        </div>
      </aside>

      {/* CREATE COLLECTION / GROUP DIALOG */}
      <Dialog
        isOpen={isAddGroupOpen}
        onClose={() => setIsAddGroupOpen(false)}
        title="Create Collection / Group"
        footer={
          <>
            <button
              className="action-btn text-button"
              style={{ padding: "8px 16px" }}
              onClick={() => setIsAddGroupOpen(false)}
            >
              Cancel
            </button>
            <button
              className="primary-action-btn text-button"
              onClick={handleCreateGroupSubmit}
            >
              Create Group
            </button>
          </>
        }
      >
        <form onSubmit={handleCreateGroupSubmit}>
          <Input
            label="Group / Collection Name"
            placeholder="e.g. Freelance, Personal, Experiments"
            value={newGroupName}
            onChange={(e) => {
              setNewGroupName(e.target.value);
              if (e.target.value) setGroupError("");
            }}
            error={groupError}
            required
          />

          {/* Select Existing Projects or Add New Project */}
          <div className="form-field" style={{ marginTop: "var(--space-4)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
              <label className="form-label" style={{ marginBottom: 0 }}>Add Projects to this Collection</label>
              <button
                type="button"
                className="action-btn text-button"
                style={{ padding: "4px 8px", fontSize: "var(--text-xs)", display: "inline-flex", alignItems: "center", gap: 4 }}
                onClick={handleOpenNewProjectForm}
              >
                <FolderPlus size={13} />
                <span>+ New Project</span>
              </button>
            </div>

            {allProjects && allProjects.length > 0 ? (
              <div className="existing-projects-checklist">
                {allProjects.map((p) => {
                  const isChecked = selectedProjectIds.includes(p.id);
                  return (
                    <div
                      key={p.id}
                      className={`project-check-item ${isChecked ? "selected" : ""}`}
                      onClick={() => toggleProjectSelection(p.id)}
                    >
                      <Checkbox
                        label={p.name}
                        checked={isChecked}
                        onChange={() => toggleProjectSelection(p.id)}
                      />
                      <span className="text-meta" style={{ fontSize: "var(--text-xs)" }}>
                        {p.tags?.join(" · ") || p.path}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-meta" style={{ fontSize: "var(--text-xs)", fontStyle: "italic", marginTop: 4 }}>
                No existing projects found. Click + New Project to add one.
              </p>
            )}
          </div>
        </form>
      </Dialog>

      {/* EDIT / ADD PROJECTS TO COLLECTION DIALOG */}
      <Dialog
        isOpen={Boolean(editingGroup)}
        onClose={() => setEditingGroup(null)}
        title={`Add / Manage Projects in ${editingGroup?.name || "Group"}`}
        footer={
          <>
            <button
              className="action-btn text-button"
              style={{ padding: "8px 16px" }}
              onClick={() => setEditingGroup(null)}
            >
              Cancel
            </button>
            <button
              className="primary-action-btn text-button"
              onClick={handleEditGroupSubmit}
            >
              Save Changes
            </button>
          </>
        }
      >
        <form onSubmit={handleEditGroupSubmit}>
          <Input
            label="Group / Collection Name"
            placeholder="e.g. Freelance, Personal"
            value={editGroupName}
            onChange={(e) => setEditGroupName(e.target.value)}
            required
          />

          <div className="form-field" style={{ marginTop: "var(--space-4)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
              <label className="form-label" style={{ marginBottom: 0 }}>Add Existing Projects</label>
              <button
                type="button"
                className="action-btn text-button"
                style={{ padding: "4px 8px", fontSize: "var(--text-xs)", display: "inline-flex", alignItems: "center", gap: 4 }}
                onClick={() => {
                  const targetGroupId = editingGroup?.id;
                  setEditingGroup(null);
                  navigate(`/projects?group=${targetGroupId}&action=create`);
                }}
              >
                <FolderPlus size={13} />
                <span>+ New Project</span>
              </button>
            </div>

            {allProjects && allProjects.length > 0 ? (
              <div className="existing-projects-checklist">
                {allProjects.map((p) => {
                  const isChecked = editProjectIds.includes(p.id);
                  return (
                    <div
                      key={p.id}
                      className={`project-check-item ${isChecked ? "selected" : ""}`}
                      onClick={() => toggleEditProjectSelection(p.id)}
                    >
                      <Checkbox
                        label={p.name}
                        checked={isChecked}
                        onChange={() => toggleEditProjectSelection(p.id)}
                      />
                      <span className="text-meta" style={{ fontSize: "var(--text-xs)" }}>
                        {p.tags?.join(" · ") || p.path}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-meta" style={{ fontSize: "var(--text-xs)", fontStyle: "italic", marginTop: 4 }}>
                No projects found. Click + New Project to add one.
              </p>
            )}
          </div>
        </form>
      </Dialog>
    </>
  );
};

export default Aside;
