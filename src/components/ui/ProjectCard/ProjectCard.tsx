import React, { useState } from "react";
import {
  AlertTriangle,
  Loader2,
  MoreHorizontal,
  Play,
  RotateCcw,
  Star,
  Terminal,
} from "lucide-react";
import vscodeIcon from "../../../app-icons/vscode.svg";
import ContextMenu, { ContextMenuItem } from "../ContextMenu/ContextMenu";
import "../Session/session.css";
import "./projectCard.css";

/** How many tag chips fit before the rest collapse into a "+N". */
const MAX_VISIBLE_TAGS = 3;

export interface ProjectCardData {
  id: string;
  name: string;
  tags: string[];
  /** Shown when the project has no tags. */
  fallbackTech?: string;
  path: string;
  isFavorite?: boolean;
  pathExists?: boolean;
  commandCount?: number;
  /** Enabled steps in this project's resumable session. */
  sessionStepCount?: number;
}

export interface ProjectCardProps {
  project: ProjectCardData;
  onToggleFavorite?: (id: string) => void;
  onOpenFolder?: (project: ProjectCardData) => void;
  onOpenVSCode?: (project: ProjectCardData) => void;
  onOpenTerminal?: (project: ProjectCardData) => void;
  onClickCard?: (project: ProjectCardData) => void;
  onLocate?: (project: ProjectCardData) => void;
  onResume?: (project: ProjectCardData) => void;
  isResuming?: boolean;
  menuItems?: ContextMenuItem[];
}

export const ProjectCard: React.FC<ProjectCardProps> = ({
  project,
  onToggleFavorite,
  onOpenFolder,
  onOpenVSCode,
  onOpenTerminal,
  onClickCard,
  onLocate,
  onResume,
  isResuming = false,
  menuItems = [],
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const canResume = Boolean(onResume) && (project.sessionStepCount ?? 0) > 0;

  const isMissing = project.pathExists === false;
  const visibleTags = project.tags.slice(0, MAX_VISIBLE_TAGS);
  const hiddenCount = Math.max(0, project.tags.length - MAX_VISIBLE_TAGS);

  return (
    <div className={`project-card ${isMissing ? "is-missing" : ""}`}>
      <div className="card-header-row">
        <button
          className={`favorite-star-btn ${project.isFavorite ? "is-favorite" : ""}`}
          onClick={() => onToggleFavorite?.(project.id)}
          title={project.isFavorite ? "Remove from Favorites" : "Add to Favorites"}
          aria-pressed={project.isFavorite}
        >
          <Star size={16} fill={project.isFavorite ? "#eab308" : "none"} />
        </button>

        <h3
          className="card-project-title"
          style={{ cursor: onClickCard ? "pointer" : "default" }}
          onClick={() => onClickCard?.(project)}
        >
          {project.name}
        </h3>

        {project.commandCount ? (
          <span className="card-command-count" title={`${project.commandCount} saved commands`}>
            <Play size={10} />
            {project.commandCount}
          </span>
        ) : null}
      </div>

      {visibleTags.length > 0 ? (
        <div className="card-tag-list">
          {visibleTags.map((tag) => (
            <span key={tag} className="card-tag-chip">
              {tag}
            </span>
          ))}
          {hiddenCount > 0 && (
            <span
              className="card-tag-chip card-tag-more"
              title={project.tags.slice(MAX_VISIBLE_TAGS).join(", ")}
            >
              +{hiddenCount}
            </span>
          )}
        </div>
      ) : (
        <p
          className="card-tech-stack"
          style={{ cursor: onClickCard ? "pointer" : "default" }}
          onClick={() => onClickCard?.(project)}
        >
          {project.fallbackTech}
        </p>
      )}

      <p className="card-path" title={project.path}>
        {project.path}
      </p>

      {isMissing && (
        <div className="card-missing-banner">
          <AlertTriangle size={13} />
          <span>Folder not found</span>
          {onLocate && (
            <button className="card-missing-action" onClick={() => onLocate(project)}>
              Locate
            </button>
          )}
        </div>
      )}

      <div className="project-card-actions">
        {canResume ? (
          <button
            className="card-resume-btn"
            title={`Replay ${project.sessionStepCount} saved step${project.sessionStepCount === 1 ? "" : "s"}`}
            onClick={() => onResume?.(project)}
            disabled={isMissing || isResuming}
          >
            {isResuming ? (
              <Loader2 size={13} className="tool-spinner" />
            ) : (
              <RotateCcw size={13} />
            )}
            <span>{isResuming ? "Resuming" : "Resume"}</span>
          </button>
        ) : (
          <button
            className="card-btn"
            title={isMissing ? "The project folder is missing" : "Open Project Folder"}
            onClick={() => onOpenFolder?.(project)}
            disabled={isMissing}
          >
            Open
          </button>
        )}
        <button
          className="card-btn icon-only"
          title="Open in VS Code"
          onClick={() => onOpenVSCode?.(project)}
          disabled={isMissing}
        >
          <img src={vscodeIcon} alt="VS Code" style={{ width: 14, height: 14, display: "block" }} />
        </button>
        <button
          className="card-btn icon-only"
          title="Open Terminal"
          onClick={() => onOpenTerminal?.(project)}
          disabled={isMissing}
        >
          <Terminal size={14} />
        </button>

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
                aria-label={`More options for ${project.name}`}
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
