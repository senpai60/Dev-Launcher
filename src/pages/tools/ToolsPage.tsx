import React from "react";
import { useSearchParams } from "react-router-dom";
import { DownloadCloud, FileCode2, FileWarning, HardDrive, Plug, Radar } from "lucide-react";
import PageNavbar from "../../components/layout/navbar/PageNavbar";
import DiskTab from "./DiskTab";
import PortsTab from "./PortsTab";
import EnvTab from "./EnvTab";
import ScriptsTab from "./ScriptsTab";
import RadarTab from "./RadarTab";
import CloneTab from "./CloneTab";
import "./tools.css";

type TabId = "radar" | "disk" | "ports" | "env" | "scripts" | "clone";

const TABS: Array<{
  id: TabId;
  label: string;
  hint: string;
  icon: React.ReactNode;
}> = [
  {
    id: "radar",
    label: "Radar",
    hint: "Projects with work at risk",
    icon: <Radar size={15} />,
  },
  {
    id: "disk",
    label: "Disk",
    hint: "Reclaim node_modules space",
    icon: <HardDrive size={15} />,
  },
  { id: "ports", label: "Ports", hint: "Find and free busy ports", icon: <Plug size={15} /> },
  {
    id: "env",
    label: "Env Doctor",
    hint: "Find missing .env keys",
    icon: <FileWarning size={15} />,
  },
  {
    id: "scripts",
    label: "Scripts",
    hint: "Search scripts across projects",
    icon: <FileCode2 size={15} />,
  },
  {
    id: "clone",
    label: "Clone",
    hint: "Clone a repo and set it up",
    icon: <DownloadCloud size={15} />,
  },
];

const isTabId = (value: string): value is TabId =>
  TABS.some((tab) => tab.id === value);

/**
 * Developer utilities.
 *
 * Four tools that each solve a specific, recurring annoyance. The active tab
 * lives in the URL so the command palette can deep-link straight to one.
 */
const ToolsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const requested = searchParams.get("tab") ?? "";
  const activeTab: TabId = isTabId(requested) ? requested : "radar";

  const selectTab = (id: TabId) => {
    searchParams.set("tab", id);
    setSearchParams(searchParams, { replace: true });
  };

  const active = TABS.find((tab) => tab.id === activeTab);

  return (
    <section className="tools-page">
      <PageNavbar title={`Tools / ${active?.label ?? "Radar"}`}>
        <span className="tools-hint">{active?.hint}</span>
      </PageNavbar>

      <div className="tools-content">
        <div className="tools-tabbar" role="tablist">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              role="tab"
              aria-selected={tab.id === activeTab}
              className={`tools-tab ${tab.id === activeTab ? "is-active" : ""}`}
              onClick={() => selectTab(tab.id)}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Remounting on tab change keeps each tool's state self-contained
            and avoids stale scan results bleeding between tabs. */}
        {activeTab === "radar" && <RadarTab key="radar" />}
        {activeTab === "disk" && <DiskTab key="disk" />}
        {activeTab === "ports" && <PortsTab key="ports" />}
        {activeTab === "env" && <EnvTab key="env" />}
        {activeTab === "scripts" && <ScriptsTab key="scripts" />}
        {activeTab === "clone" && <CloneTab key="clone" />}
      </div>
    </section>
  );
};

export default ToolsPage;
