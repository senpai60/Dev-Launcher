import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { ProjectContextProvider } from "./context/ProjectContext.tsx";
import { GroupContextProvider } from "./context/GroupContext.tsx";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <ProjectContextProvider>
    <GroupContextProvider>
      <App />
    </GroupContextProvider>
  </ProjectContextProvider>,
);

// Use contextBridge
window.ipcRenderer.on("main-process-message", (_event, message) => {
  console.log(message);
});
