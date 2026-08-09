import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Star, TerminalSquare } from "lucide-react";
import PageNavbar from "../../components/layout/navbar/PageNavbar";
import EmptyState from "../../components/ui/EmptyState/EmptyState";
import CommandRow from "../../components/ui/Command/CommandRow";
import CommandFormDialog from "../../components/ui/Command/CommandFormDialog";
import ConfirmDialog from "../../components/ui/ConfirmDialog/ConfirmDialog";
import { useProjectContext } from "../../context/ProjectContext";
import { useCommandRunner } from "../../hooks/useCommandRunner";
import { fuzzyFilter } from "../../utils/fuzzy";
import type { ProjectCommand, ProjectWithStatus } from "../../../types/project";
import "./commands.css";

type CommandEntry = {
  command: ProjectCommand;
  project: ProjectWithStatus;
};

/**
 * Every saved command across every project, in one searchable list.
 *
 * This is the Phase 5 counterpart to the per-project drawer: the drawer is for
 * curating one project's commands, this is for finding and running any of them.
 */
const CommandsPage: React.FC = () => {
  const navigate = useNavigate();
  const projectContext = useProjectContext();
  const { requestRun, runningCommandId, confirmElement } = useCommandRunner();

  const [searchQuery, setSearchQuery] = useState("");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [projectFilter, setProjectFilter] = useState("all");
  const [editing, setEditing] = useState<CommandEntry | null>(null);
  const [pendingDelete, setPendingDelete] = useState<CommandEntry | null>(null);

  const allProjects = projectContext?.allProjects;

  useEffect(() => {
    projectContext?.loadAllProjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const entries = useMemo<CommandEntry[]>(() => {
    const list: CommandEntry[] = [];
    for (const project of allProjects ?? []) {
      for (const command of project.commands ?? []) {
        list.push({ command, project });
      }
    }
    return list;
  }, [allProjects]);

  const visible = useMemo(() => {
    let source = entries;

    if (favoritesOnly) source = source.filter((e) => e.command.isFavorite);
    if (projectFilter !== "all") source = source.filter((e) => e.project.id === projectFilter);

    const ranked = fuzzyFilter(source, searchQuery, (e) => [
      e.command.name,
      e.command.command,
      e.project.name,
      e.command.description,
    ]);

    // Without a query, favourites first then most recently run.
    if (!searchQuery.trim()) {
      return [...ranked].sort((a, b) => {
        if (a.command.isFavorite !== b.command.isFavorite) return a.command.isFavorite ? -1 : 1;
        const aRun = a.command.lastRunAt ?? 0;
        const bRun = b.command.lastRunAt ?? 0;
        if (aRun !== bRun) return bRun - aRun;
        return a.project.name.localeCompare(b.project.name);
      });
    }

    return ranked;
  }, [entries, favoritesOnly, projectFilter, searchQuery]);

  const projectsWithCommands = useMemo(
    () => (allProjects ?? []).filter((p) => (p.commands?.length ?? 0) > 0),
    [allProjects],
  );

  const favoriteCount = entries.filter((e) => e.command.isFavorite).length;

  const handleEditSubmit = async (values: Partial<ProjectCommand>) => {
    if (!editing) return false;
    return (
      (await projectContext?.updateCommand(editing.project.id, editing.command.id, values)) ?? false
    );
  };

  if (entries.length === 0) {
    return (
      <section className="commands-page">
        <PageNavbar title="Commands" />
        <div className="commands-content">
          <EmptyState
            icon={<TerminalSquare size={32} strokeWidth={1.5} />}
            title="No commands yet"
            description="Open a project and add the commands you run most. They'll all show up here."
            actionLabel="Go to Projects"
            onAction={() => navigate("/projects")}
          />
        </div>
      </section>
    );
  }

  return (
    <section className="commands-page">
      <PageNavbar title="Commands">
        <span className="commands-count">
          {entries.length} command{entries.length === 1 ? "" : "s"} across{" "}
          {projectsWithCommands.length} project{projectsWithCommands.length === 1 ? "" : "s"}
        </span>
      </PageNavbar>

      <div className="commands-content">
        <div className="commands-toolbar">
          <div className="search-container">
            <Search size={16} className="search-icon" />
            <input
              type="text"
              className="search-input"
              placeholder="Search commands..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <select
            className="commands-filter-select"
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
            aria-label="Filter by project"
          >
            <option value="all">All projects</option>
            {projectsWithCommands.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          <button
            className={`commands-fav-filter ${favoritesOnly ? "is-active" : ""}`}
            onClick={() => setFavoritesOnly((v) => !v)}
            aria-pressed={favoritesOnly}
            disabled={favoriteCount === 0}
            title={favoriteCount === 0 ? "No favorite commands yet" : "Show favorites only"}
          >
            <Star size={13} fill={favoritesOnly ? "#eab308" : "none"} />
            <span>Favorites</span>
          </button>
        </div>

        {visible.length === 0 ? (
          <p className="command-list-empty">
            No commands match {searchQuery ? `"${searchQuery}"` : "these filters"}.
          </p>
        ) : (
          <div className="command-list">
            {visible.map(({ command, project }) => (
              <CommandRow
                key={`${project.id}:${command.id}`}
                command={command}
                projectName={project.name}
                isRunning={runningCommandId === command.id}
                disabled={!project.pathExists}
                disabledReason={`${project.name}'s folder is missing.`}
                onRun={(c) => requestRun(project, c)}
                onEdit={(c) => setEditing({ command: c, project })}
                onDelete={(c) => setPendingDelete({ command: c, project })}
                onToggleFavorite={(c) =>
                  projectContext?.updateCommand(project.id, c.id, {
                    isFavorite: !c.isFavorite,
                  })
                }
              />
            ))}
          </div>
        )}
      </div>

      <CommandFormDialog
        isOpen={Boolean(editing)}
        command={editing?.command}
        projectPath={editing?.project.path}
        onClose={() => setEditing(null)}
        onSubmit={handleEditSubmit}
      />

      {confirmElement}

      <ConfirmDialog
        isOpen={Boolean(pendingDelete)}
        isDanger
        title="Delete command?"
        message={
          <>
            <strong>{pendingDelete?.command.name}</strong> will be removed from{" "}
            <strong>{pendingDelete?.project.name}</strong>.
          </>
        }
        detail={pendingDelete?.command.command}
        confirmLabel="Delete"
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          if (pendingDelete) {
            void projectContext?.deleteCommand(
              pendingDelete.project.id,
              pendingDelete.command.id,
            );
          }
          setPendingDelete(null);
        }}
      />
    </section>
  );
};

export default CommandsPage;
