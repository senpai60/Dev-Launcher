import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { ProjectContextProvider } from "./context/ProjectContext.tsx";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <ProjectContextProvider>
    <App />
  </ProjectContextProvider>,
);

// Use contextBridge
window.ipcRenderer.on("main-process-message", (_event, message) => {
  console.log(message);
});
