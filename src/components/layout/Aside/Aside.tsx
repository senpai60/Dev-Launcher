import * as LucideIcons from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useState } from "react";
import "./aside.css";

type LucideIconKey = {
  [K in keyof typeof LucideIcons]: (typeof LucideIcons)[K] extends LucideIcons.LucideIcon
    ? K
    : never;
}[keyof typeof LucideIcons];

type NavLink = {
  to: string;
  label: string;
  icon: LucideIconKey;
};

const primaryLinks: NavLink[] = [
  { to: "/", label: "Home", icon: "Home" },
  { to: "/projects", label: "Projects", icon: "FolderClosed" },
  { to: "/workspaces", label: "Workspaces", icon: "LayoutGrid" },
  { to: "/commands", label: "Commands", icon: "Terminal" },
  { to: "/git", label: "Git", icon: "GitBranch" },
  { to: "/docker", label: "Docker", icon: "Container" },
];

const secondaryProjectLinks = [
  { id: "favorites", label: "Favorites", icon: "Star" as LucideIconKey },
  { id: "recent", label: "Recent", icon: "Clock" as LucideIconKey },
  { id: "all", label: "All Projects", icon: "Folder" as LucideIconKey },
];

const groupLinks = [
  { id: "freelance", label: "Freelance" },
  { id: "personal", label: "Personal" },
  { id: "experiments", label: "Experiments" },
  { id: "learning", label: "Learning" },
];

const Aside = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeSecondary, setActiveSecondary] = useState("all");

  return (
    <aside className="aside-container">
      {/* PRIMARY SIDEBAR */}
      <div className="sidebar-primary">
        <div className="primary-nav-top">
          {primaryLinks.map((navLink) => {
            const Icon = LucideIcons[navLink.icon] as LucideIcons.LucideIcon;
            const isActive = location.pathname === navLink.to;
            return (
              <div
                onClick={() => navigate(navLink.to)}
                key={navLink.to}
                title={navLink.label}
                className={`primary-nav-item ${isActive ? "active" : ""}`}
              >
                <Icon size={20} strokeWidth={1.5} />
                <span>{navLink.label}</span>
              </div>
            );
          })}
        </div>
        <div className="primary-nav-bottom">
          <div
            className={`primary-nav-item ${location.pathname === "/settings" ? "active" : ""}`}
            onClick={() => navigate("/settings")}
            title="Settings"
          >
            <LucideIcons.Settings size={20} strokeWidth={1.5} />
            <span>Settings</span>
          </div>
        </div>
      </div>

      {/* SECONDARY SIDEBAR */}
      <div className="sidebar-secondary">
        <h2>Projects</h2>
        <ul className="secondary-nav">
          {secondaryProjectLinks.map((link) => {
            const Icon = LucideIcons[link.icon] as LucideIcons.LucideIcon;
            const isSel = activeSecondary === link.id;
            return (
              <li
                key={link.id}
                onClick={() => setActiveSecondary(link.id)}
                className={`secondary-nav-item ${isSel ? "active" : ""}`}
              >
                <Icon size={14} style={{ marginRight: 8, opacity: 0.8 }} />
                {link.label}
              </li>
            );
          })}
        </ul>

        <div className="secondary-divider-title">Groups</div>
        <ul className="secondary-nav">
          {groupLinks.map((link) => {
            const isSel = activeSecondary === link.id;
            return (
              <li
                key={link.id}
                onClick={() => setActiveSecondary(link.id)}
                className={`secondary-nav-item group-item ${isSel ? "active" : ""}`}
              >
                {link.label}
              </li>
            );
          })}
        </ul>
      </div>
    </aside>
  );
};

export default Aside;
