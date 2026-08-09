import { useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, Terminal } from "lucide-react";
import vscodeIcon from "../../app-icons/vscode.svg";
import antigravityIcon from "../../app-icons/antigravity-color.svg";
import cursorIcon from "../../app-icons/cursor.svg";
import PageNavbar from "../../components/layout/navbar/PageNavbar";
import { useProjectContext } from "../../context/ProjectContext";
import { useCommandRunner } from "../../hooks/useCommandRunner";
import "./homepage.css";

function formatOpenedAt(timestamp?: number): string {
  if (!timestamp) return "Not opened yet";

  const elapsed = Date.now() - timestamp;
  const minutes = Math.floor(elapsed / 60000);

  if (minutes < 1) return "Opened just now";
  if (minutes < 60) return `Opened ${minutes} min ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Opened ${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days === 1) return "Opened yesterday";
  if (days < 30) return `Opened ${days} days ago`;

  return `Opened ${new Date(timestamp).toLocaleDateString()}`;
}

const HomePage = () => {
  const navigate = useNavigate();
  const projectContext = useProjectContext();
  const { requestRun, runningCommandId, confirmElement } = useCommandRunner();

  const allProjects = projectContext?.allProjects;
  const isLoading = projectContext?.isLoading;

  useEffect(() => {
    projectContext?.loadAllProjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const recentProjects = useMemo(
    () =>
      (allProjects ?? [])
        .slice()
        .sort((a, b) => (b.lastOpenedAt || b.updatedAt || 0) - (a.lastOpenedAt || a.updatedAt || 0)),
    [allProjects],
  );

  const heroProject = recentProjects[0] ?? null;

  // Favourite commands are the closest thing to "what I run every morning".
  const favoriteCommands = useMemo(() => {
    const list = [];
    for (const project of allProjects ?? []) {
      for (const command of project.commands ?? []) {
        if (command.isFavorite) list.push({ command, project });
      }
    }
    return list
      .sort((a, b) => (b.command.lastRunAt ?? 0) - (a.command.lastRunAt ?? 0))
      .slice(0, 4);
  }, [allProjects]);

  const totalCommands = (allProjects ?? []).reduce(
    (sum, p) => sum + (p.commands?.length ?? 0),
    0,
  );
  const favoritesCount = (allProjects ?? []).filter((p) => p.isFavorite).length;
  const missingCount = (allProjects ?? []).filter((p) => !p.pathExists).length;

  const handleLaunch = (action: string, id?: string) => {
    const targetId = id ?? heroProject?.id;
    if (targetId) void projectContext?.openProject(targetId, action);
  };

  const hasProjects = (allProjects?.length ?? 0) > 0;

  return (
    <section className="home-dashboard">
      <PageNavbar title="Dashboard / Overview">
        <button
          className="action-btn text-button"
          style={{ padding: "var(--space-2) var(--space-4)", textAlign: "center" }}
          onClick={() => navigate("/projects?action=create")}
        >
          + New Project
        </button>
        <button
          className="action-btn text-button"
          style={{ padding: "var(--space-2) var(--space-4)", textAlign: "center" }}
          onClick={() => navigate("/projects")}
        >
          All Projects
        </button>
        <button
          className="action-btn text-button"
          style={{ padding: "var(--space-2) var(--space-4)", textAlign: "center" }}
          onClick={() => navigate("/commands")}
        >
          Commands
        </button>
      </PageNavbar>

      <div className="dashboard-content">
        {/* Continue Working */}
        <div className="dashboard-section continue-working">
          <h2 className="text-section-title">Continue Working</h2>

          {heroProject ? (
            <div className="continue-card">
              <div className="card-info">
                <h3 className="text-project-name">{heroProject.name}</h3>
                <p className="text-project-desc">
                  {heroProject.tags?.length
                    ? heroProject.tags.slice(0, 4).join(" · ")
                    : heroProject.description || heroProject.path}
                </p>
                <p className="text-meta" style={{ marginTop: "var(--space-2)" }}>
                  {formatOpenedAt(heroProject.lastOpenedAt)}
                </p>
                {!heroProject.pathExists && (
                  <p className="dashboard-warning">
                    <AlertTriangle size={12} />
                    <span>This folder is missing.</span>
                  </p>
                )}
              </div>

              <div className="card-actions">
                <button
                  className="primary-action-btn text-button"
                  title="Open Folder"
                  onClick={() => handleLaunch("folder")}
                  disabled={!heroProject.pathExists}
                >
                  Open
                </button>
                <div className="app-launch-icons">
                  <button
                    className="icon-btn"
                    title="Open with VS Code"
                    onClick={() => handleLaunch("vscode")}
                    disabled={!heroProject.pathExists}
                  >
                    <img src={vscodeIcon} alt="VS Code" className="app-icon-img" />
                  </button>
                  <button
                    className="icon-btn"
                    title="Open with Antigravity"
                    onClick={() => handleLaunch("antigravity")}
                    disabled={!heroProject.pathExists}
                  >
                    <img src={antigravityIcon} alt="Antigravity" className="app-icon-img" />
                  </button>
                  <button
                    className="icon-btn"
                    title="Open with Cursor"
                    onClick={() => handleLaunch("cursor")}
                    disabled={!heroProject.pathExists}
                  >
                    <img src={cursorIcon} alt="Cursor" className="app-icon-img" />
                  </button>
                  <button
                    className="icon-btn"
                    title="Open Terminal"
                    onClick={() => handleLaunch("terminal")}
                    disabled={!heroProject.pathExists}
                  >
                    <Terminal size={16} />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="continue-card dashboard-empty-card">
              <div className="card-info">
                <h3 className="text-project-name">
                  {isLoading ? "Loading your projects..." : "No projects yet"}
                </h3>
                <p className="text-project-desc">
                  {isLoading
                    ? "One moment."
                    : "Add a project folder and it'll show up here for one-click launching."}
                </p>
              </div>
              {!isLoading && (
                <div className="card-actions">
                  <button
                    className="primary-action-btn text-button"
                    onClick={() => navigate("/projects?action=create")}
                  >
                    Add Project
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="dashboard-row">
          {/* Recent Projects */}
          <div className="dashboard-section recent-projects">
            <h2 className="text-section-title">Recent Projects</h2>
            {recentProjects.length > 0 ? (
              <ul className="project-list">
                {recentProjects.slice(0, 5).map((p) => (
                  <li
                    key={p.id}
                    className="project-item"
                    onClick={() => handleLaunch("vscode", p.id)}
                    style={{ cursor: p.pathExists ? "pointer" : "not-allowed" }}
                    title={p.pathExists ? `Open ${p.name} in VS Code` : "Folder is missing"}
                  >
                    <span className="text-recent-project">{p.name}</span>
                    {!p.pathExists && (
                      <AlertTriangle size={12} style={{ color: "#f87171", marginLeft: "auto" }} />
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="dashboard-empty-text">Projects you open will appear here.</p>
            )}
          </div>

          {/* Favourite commands. Live process monitoring arrives in Phase 6 --
              until then we show what the app actually knows about. */}
          <div className="dashboard-section running-processes">
            <h2 className="text-section-title">Favorite Commands</h2>
            {favoriteCommands.length > 0 ? (
              <ul className="process-list">
                {favoriteCommands.map(({ command, project }) => (
                  <li
                    key={`${project.id}:${command.id}`}
                    className="process-item"
                    onClick={() => project.pathExists && requestRun(project, command)}
                    style={{ cursor: project.pathExists ? "pointer" : "not-allowed" }}
                    title={
                      project.pathExists
                        ? `Run ${command.name} in ${project.name}`
                        : "Folder is missing"
                    }
                  >
                    <span className="text-process-name">
                      {runningCommandId === command.id ? "Starting..." : command.name}
                    </span>
                    <span className="text-port">{project.name}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="dashboard-empty-text">
                Star a command in a project to pin it here.
              </p>
            )}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="dashboard-row" style={{ gridTemplateColumns: "1fr" }}>
          <div className="dashboard-section quick-stats">
            <h2 className="text-section-title">Quick Stats</h2>
            <div className="stats-grid" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
              <div className="stat-card">
                <h3 className="text-stat-number">{allProjects?.length ?? 0}</h3>
                <p className="text-stat-label">Projects</p>
              </div>
              <div className="stat-card">
                <h3 className="text-stat-number">{favoritesCount}</h3>
                <p className="text-stat-label">Favorites</p>
              </div>
              <div className="stat-card">
                <h3 className="text-stat-number">{totalCommands}</h3>
                <p className="text-stat-label">Commands</p>
              </div>
              <div className="stat-card">
                <h3 className="text-stat-number" style={missingCount ? { color: "#f87171" } : undefined}>
                  {missingCount}
                </h3>
                <p className="text-stat-label">Missing Paths</p>
              </div>
            </div>
          </div>
        </div>

        {!hasProjects && !isLoading && (
          <p className="dashboard-empty-text" style={{ textAlign: "center" }}>
            Tip: press <kbd>Ctrl</kbd> + <kbd>K</kbd> anywhere to search projects and commands.
          </p>
        )}
      </div>

      {confirmElement}
    </section>
  );
};

export default HomePage;
