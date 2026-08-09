import * as LucideIcons from "lucide-react";
import { useNavigate } from "react-router-dom";
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

const secondaryLinks = [
  { label: "Favorites" },
  { label: "Recent" },
  { label: "All Projects" },
  { label: "Groups" },
];

const Aside = () => {
  const navigate = useNavigate();
  return (
    <aside className="aside-container">
      {/* PRIMARY SIDEBAR */}
      <div className="sidebar-primary">
        <div className="primary-nav-top">
          {primaryLinks.map((navLink) => {
            const Icon = LucideIcons[navLink.icon] as LucideIcons.LucideIcon;
            return (
              <div
                onClick={() => navigate(navLink.to)}
                key={navLink.to}
                title={navLink.label}
                className="primary-nav-item"
              >
                <Icon size={20} strokeWidth={1.5} />
                <span>{navLink.label}</span>
              </div>
            );
          })}
        </div>
        <div className="primary-nav-bottom">
          <div
            className="primary-nav-item"
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
          {secondaryLinks.map((link) => (
            <li key={link.label} className="secondary-nav-item">
              {link.label}
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
};

export default Aside;
