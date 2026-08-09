import { HashRouter as Router, Routes, Route } from "react-router-dom";
import HomePage from "./pages/homepage/HomePage";
import SettingsPage from "./pages/settings/SettingsPage";
import ProjectsPage from "./pages/projects/ProjectsPage";
import WorkspacesPage from "./pages/workspaces/WorkspacesPage";
import CommandsPage from "./pages/commands/CommandsPage";
import GitPage from "./pages/git/GitPage";
import DockerPage from "./pages/docker/DockerPage";
import AppsPage from "./pages/apps/AppsPage";
import ToolsPage from "./pages/tools/ToolsPage";
import Aside from "./components/layout/Aside/Aside";
import CommandPalette from "./components/ui/CommandPalette/CommandPalette";

const App = () => {
  return (
    <Router>
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
    </Router>
  );
};

export default App;
