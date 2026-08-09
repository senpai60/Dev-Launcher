import { useEffect } from "react";
import {
  HashRouter as Router,
  Routes,
  Route,
  useLocation,
  useNavigate,
} from "react-router-dom";
import HomePage from "./pages/homepage/HomePage";
import SettingsPage from "./pages/settings/SettingsPage";
import ProjectsPage from "./pages/projects/ProjectsPage";
import WorkspacesPage from "./pages/workspaces/WorkspacesPage";
import CommandsPage from "./pages/commands/CommandsPage";
import GitPage from "./pages/git/GitPage";
import DockerPage from "./pages/docker/DockerPage";
import AppsPage from "./pages/apps/AppsPage";
import ToolsPage from "./pages/tools/ToolsPage";
import OverlayPage from "./pages/overlay/OverlayPage";
import Aside from "./components/layout/Aside/Aside";
import CommandPalette from "./components/ui/CommandPalette/CommandPalette";

/**
 * The overlay window loads this same bundle at `#/overlay`, so the app chrome
 * is split out here: only the main window gets the sidebar and palette.
 */
const AppShell = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const isOverlay = location.pathname === "/overlay";

  // The overlay can ask the main window to jump somewhere as it hands over.
  useEffect(() => {
    if (isOverlay) return;
    return window?.api?.overlayAPI?.onNavigate((route) => navigate(route));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOverlay]);

  if (isOverlay) {
    return (
      <Routes>
        <Route path="/overlay" element={<OverlayPage />} />
      </Routes>
    );
  }

  return (
    <main>
      <Aside />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/projects" element={<ProjectsPage />} />
        <Route path="/apps" element={<AppsPage />} />
        <Route path="/workspaces" element={<WorkspacesPage />} />
        <Route path="/commands" element={<CommandsPage />} />
        <Route path="/tools" element={<ToolsPage />} />
        <Route path="/git" element={<GitPage />} />
        <Route path="/docker" element={<DockerPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Routes>
      <CommandPalette />
    </main>
  );
};

const App = () => (
  <Router>
    <AppShell />
  </Router>
);

export default App;
