import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { ToastProvider } from "./components/ui/Toast/ToastContext.tsx";
import { ProjectContextProvider } from "./context/ProjectContext.tsx";
import { GroupContextProvider } from "./context/GroupContext.tsx";

// ToastProvider wraps the contexts because they surface errors through it.
ReactDOM.createRoot(document.getElementById("root")!).render(
  <ToastProvider>
    <ProjectContextProvider>
      <GroupContextProvider>
        <App />
      </GroupContextProvider>
    </ProjectContextProvider>
  </ToastProvider>,
);
