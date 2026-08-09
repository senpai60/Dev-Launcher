import React, { useState } from "react";
import { Star, Terminal, MoreHorizontal } from "lucide-react";
import vscodeIcon from "../../../app-icons/vscode.svg";
import ContextMenu, { ContextMenuItem } from "../ContextMenu/ContextMenu";
import "./projectCard.css";

export interface ProjectCardData {
  id: string;
  name: string;
  tech: string;
  path: string;
  isFavorite?: boolean;
}

export interface ProjectCardProps {
  project: ProjectCardData;
  onToggleFavorite?: (id: string) => void;
  onOpenFolder?: (project: ProjectCardData) => void;
  onOpenVSCode?: (project: ProjectCardData) => void;
  onOpenTerminal?: (project: ProjectCardData) => void;
  menuItems?: ContextMenuItem[];
}

export const ProjectCard: React.FC<ProjectCardProps> = ({
  project,
  onToggleFavorite,
  onOpenFolder,
  onOpenVSCode,
  onOpenTerminal,
  menuItems = [],
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <div className="project-card">
      <div className="card-header-row">
        <button
          className={`favorite-star-btn ${
            project.isFavorite ? "is-favorite" : ""
          }`}
          onClick={() => onToggleFavorite && onToggleFavorite(project.id)}
          title={
            project.isFavorite ? "Remove from Favorites" : "Add to Favorites"
          }
        >
          <Star
            size={16}
            fill={project.isFavorite ? "#eab308" : "none"}
          />
        </button>
        <h3 className="card-project-title">{project.name}</h3>
      </div>

      <p className="card-tech-stack">{project.tech}</p>
      <p className="card-path">{project.path}</p>

      {/* Card Action Buttons & Dynamic Context Menu */}
      <div className="project-card-actions">
        <button
          className="card-btn"
          title="Open Project Folder"
          onClick={() => onOpenFolder && onOpenFolder(project)}
        >
          Open
        </button>
        <button
          className="card-btn icon-only"
          title="Open in VS Code"
          onClick={() => onOpenVSCode && onOpenVSCode(project)}
        >
          <img
            src={vscodeIcon}
            alt="VS Code"
            style={{ width: 14, height: 14, display: "block" }}
          />
        </button>
        <button
          className="card-btn icon-only"
          title="Open Terminal"
          onClick={() => onOpenTerminal && onOpenTerminal(project)}
        >
          <Terminal size={14} />
        </button>

        {/* Dynamic Context Menu */}
        {menuItems.length > 0 && (
          <ContextMenu
            isOpen={isMenuOpen}
            onClose={() => setIsMenuOpen(false)}
            items={menuItems}
            position="top-right"
            trigger={
              <button
                className="card-btn icon-only"
                title="More Options"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
              >
                <MoreHorizontal size={14} />
              </button>
            }
          />
        )}
      </div>
    </div>
  );
};

export default ProjectCard;
