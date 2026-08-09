import {
  HashRouter as Router,
  Routes,
  Route,
  Link,
  useNavigate,
} from "react-router-dom";
import HomePage from "./pages/homepage/HomePage";
import SettingsPage from "./pages/settings/SettingsPage";

const App = () => {
  return (
    <Router>
      <main>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </main>
    </Router>
  );
};

export default App;
