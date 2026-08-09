import { useEffect } from "react";
import { Terminal } from "lucide-react";
import vscodeIcon from "../../app-icons/vscode.svg";
import antigravityIcon from "../../app-icons/antigravity-color.svg";
import cursorIcon from "../../app-icons/cursor.svg";
import PageNavbar from "../../components/layout/navbar/PageNavbar";
import { useProjectContext } from "../../context/ProjectContext";
import "./homepage.css";

const HomePage = () => {
  const projectContext = useProjectContext();
  const allProjects = projectContext?.allProjects;
  const loadAllProjects = projectContext?.loadAllProjects;
  const openProject = projectContext?.openProject;

  useEffect(() => {
    loadAllProjects?.();
  }, []);

  const heroProject = allProjects && allProjects.length > 0 ? allProjects[0] : null;

  const handleLaunch = (action: string, id?: string) => {
    const targetId = id || heroProject?.id;
    if (targetId && openProject) {
      openProject(targetId, action);
    } else {
      console.log(`Launching action: ${action} for project: ${targetId || 'demo'}`);
    }
  };

  return (
    <section className="home-dashboard">
      <PageNavbar title="Dashboard / Overview">
        <button className="action-btn text-button" style={{ padding: 'var(--space-2) var(--space-4)', textAlign: 'center' }}>+ New Project</button>
        <button className="action-btn text-button" style={{ padding: 'var(--space-2) var(--space-4)', textAlign: 'center' }}>Open Folder</button>
        <button className="action-btn text-button" style={{ padding: 'var(--space-2) var(--space-4)', textAlign: 'center' }}>Open Project</button>
        <button className="action-btn text-button" style={{ padding: 'var(--space-2) var(--space-4)', textAlign: 'center' }}>Run Command</button>
      </PageNavbar>
      
      <div className="dashboard-content">
        {/* Continue Working Section */}
        <div className="dashboard-section continue-working">
          <h2 className="text-section-title">Continue Working</h2>
          <div className="continue-card">
            <div className="card-info">
              <h3 className="text-project-name">{heroProject ? heroProject.name : "BrutDesk"}</h3>
              <p className="text-project-desc">{heroProject ? (heroProject.tags?.join(" · ") || heroProject.path) : "React + Express"}</p>
              <p className="text-meta" style={{ marginTop: 'var(--space-2)' }}>Opened 4 min ago</p>
            </div>
            <div className="card-actions">
              <button
                className="primary-action-btn text-button"
                title="Open Folder"
                onClick={() => handleLaunch("folder")}
              >
                Open
              </button>
              <div className="app-launch-icons">
                <button
                  className="icon-btn"
                  title="Open with VS Code"
                  onClick={() => handleLaunch("vscode")}
                >
                  <img src={vscodeIcon} alt="VS Code" className="app-icon-img" />
                </button>
                <button
                  className="icon-btn"
                  title="Open with Antigravity"
                  onClick={() => handleLaunch("antigravity")}
                >
                  <img src={antigravityIcon} alt="Antigravity" className="app-icon-img" />
                </button>
                <button
                  className="icon-btn"
                  title="Open with Cursor"
                  onClick={() => handleLaunch("cursor")}
                >
                  <img src={cursorIcon} alt="Cursor" className="app-icon-img" />
                </button>
                <button
                  className="icon-btn"
                  title="Open with Terminal"
                  onClick={() => handleLaunch("terminal")}
                >
                  <Terminal size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* First Row: Recent Projects & Running Processes */}
        <div className="dashboard-row">
          {/* Recent Projects */}
          <div className="dashboard-section recent-projects">
            <h2 className="text-section-title">Recent Projects</h2>
            <ul className="project-list">
              {(allProjects && allProjects.length > 0
                ? allProjects.slice(0, 4)
                : [
                    { id: "1", name: "BrutDesk" },
                    { id: "2", name: "Gym Website" },
                    { id: "3", name: "Tattoo Portfolio" },
                    { id: "4", name: "Electron Launcher" },
                  ]
              ).map((p) => (
                <li
                  key={p.id}
                  className="project-item"
                  onClick={() => handleLaunch("vscode", p.id)}
                >
                  <span className="text-recent-project">{p.name}</span>
                </li>
              ))}
            </ul>
          </div>

           {/* Running Processes */}
           <div className="dashboard-section running-processes">
            <h2 className="text-section-title">Running Processes</h2>
            <ul className="process-list">
              <li className="process-item">
                <span className="status-dot"></span>
                <span className="text-process-name">BrutDesk Frontend</span>
                <span className="text-port">:5173</span>
              </li>
              <li className="process-item">
                <span className="status-dot"></span>
                <span className="text-process-name">BrutDesk Backend</span>
                <span className="text-port">:5000</span>
              </li>
              <li className="process-item">
                <span className="status-dot"></span>
                <span className="text-process-name">MongoDB</span>
                <span className="text-port">:27017</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Second Row: Quick Stats */}
        <div className="dashboard-row" style={{ gridTemplateColumns: '1fr' }}>
          {/* Quick Stats */}
          <div className="dashboard-section quick-stats">
            <h2 className="text-section-title">Quick Stats</h2>
            <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
              <div className="stat-card">
                <h3 className="text-stat-number">{allProjects ? allProjects.length : 12}</h3>
                <p className="text-stat-label">Projects</p>
              </div>
              <div className="stat-card">
                <h3 className="text-stat-number">{allProjects ? allProjects.filter(p => p.isFavorite).length : 4}</h3>
                <p className="text-stat-label">Favorites</p>
              </div>
              <div className="stat-card">
                <h3 className="text-stat-number">3</h3>
                <p className="text-stat-label">Running</p>
              </div>
              <div className="stat-card">
                <h3 className="text-stat-number">7</h3>
                <p className="text-stat-label">Commands</p>
              </div>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
};

export default HomePage;
