import React, { useState } from "react";
import { AlertTriangle, Edit, FolderInput, Play, Star, Trash2 } from "lucide-react";
import ContextMenu, { ContextMenuItem } from "../ContextMenu/ContextMenu";
import type { ProjectCommand } from "../../../../types/project";
import "./command.css";

export interface CommandRowProps {
  command: ProjectCommand;
  /** Shown when the row appears outside a single project's view. */
  projectName?: string;
  isDestructive?: boolean;
  isRunning?: boolean;
  disabled?: boolean;
  disabledReason?: string;
  onRun: (command: ProjectCommand) => void;
  onEdit?: (command: ProjectCommand) => void;
  onDelete?: (command: ProjectCommand) => void;
  onToggleFavorite?: (command: ProjectCommand) => void;
}

function formatLastRun(timestamp?: number): string | null {
  if (!timestamp) return null;

  const elapsed = Date.now() - timestamp;
  const minutes = Math.floor(elapsed / 60000);

  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;

  return new Date(timestamp).toLocaleDateString();
}

export const CommandRow: React.FC<CommandRowProps> = ({
  command,
  projectName,
  isDestructive = false,
  isRunning = false,
  disabled = false,
  disabledReason,
  onRun,
  onEdit,
  onDelete,
  onToggleFavorite,
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const lastRun = formatLastRun(command.lastRunAt);

  const menuItems: ContextMenuItem[] = [];
  if (onEdit) {
    menuItems.push({
      id: "edit",
      label: "Edit command",
      icon: <Edit size={14} />,
      onClick: () => onEdit(command),
    });
  }
  if (onToggleFavorite) {
    menuItems.push({
      id: "favorite",
      label: command.isFavorite ? "Remove from favorites" : "Add to favorites",
      icon: <Star size={14} />,
      onClick: () => onToggleFavorite(command),
    });
  }
  if (onDelete) {
    menuItems.push({ id: "div", isDivider: true });
    menuItems.push({
      id: "delete",
      label: "Delete command",
      icon: <Trash2 size={14} />,
      isDanger: true,
      onClick: () => onDelete(command),
    });
  }

  return (
    <div className={`command-row ${disabled ? "is-disabled" : ""}`}>
      <div className="command-row-main">
        <div className="command-row-heading">
          {onToggleFavorite && (
            <button
              className={`command-fav-btn ${command.isFavorite ? "is-favorite" : ""}`}
              onClick={() => onToggleFavorite(command)}
              title={command.isFavorite ? "Remove from favorites" : "Add to favorites"}
              aria-pressed={command.isFavorite}
            >
              <Star size={13} fill={command.isFavorite ? "#eab308" : "none"} />
            </button>
          )}

          <span className="command-name">{command.name}</span>

          {isDestructive && (
            <span className="command-badge command-badge-danger" title="Asks for confirmation before running">
              <AlertTriangle size={11} />
              <span>Destructive</span>
            </span>
          )}

          {projectName && <span className="command-badge">{projectName}</span>}
        </div>

        <code className="command-string" title={command.command}>
          {command.command}
        </code>

        {command.description && <span className="command-description">{command.description}</span>}

        <div className="command-meta-row">
          {command.workingDirectory && (
            <span className="command-meta" title="Working directory">
              <FolderInput size={11} />
              <span>{command.workingDirectory}</span>
            </span>
          )}
          {lastRun && <span className="command-meta">Last run {lastRun}</span>}
        </div>
      </div>

      <div className="command-row-actions">
        <button
          className="command-run-btn text-button"
          onClick={() => onRun(command)}
          disabled={disabled || isRunning}
          title={disabled ? disabledReason : `Run ${command.name}`}
        >
          <Play size={12} />
          <span>{isRunning ? "Starting..." : "Run"}</span>
        </button>

        {menuItems.length > 0 && (
          <ContextMenu
            isOpen={isMenuOpen}
            onClose={() => setIsMenuOpen(false)}
            items={menuItems}
            position="top-right"
            trigger={
              <button
                className="command-menu-btn"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                title="Command options"
                aria-label={`Options for ${command.name}`}
              >
                <span aria-hidden>···</span>
              </button>
            }
          />
        )}
      </div>
    </div>
  );
};

export default CommandRow;
