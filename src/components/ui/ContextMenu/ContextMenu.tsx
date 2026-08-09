import React, { useEffect, useRef } from "react";
import "./contextMenu.css";

export interface ContextMenuItem {
  id: string;
  label?: string;
  icon?: React.ReactNode;
  onClick?: () => void;
  isDanger?: boolean;
  isDivider?: boolean;
}

export interface ContextMenuProps {
  isOpen: boolean;
  onClose: () => void;
  items: ContextMenuItem[];
  trigger?: React.ReactNode;
  position?: "bottom-right" | "bottom-left" | "top-right" | "top-left";
  className?: string;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({
  isOpen,
  onClose,
  items,
  trigger,
  position = "top-right",
  className = "",
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, onClose]);

  return (
    <div className={`context-menu-wrapper ${className}`} ref={containerRef}>
      {trigger}

      {isOpen && (
        <div className={`context-menu-popover position-${position}`}>
          {items.map((item, index) => {
            if (item.isDivider) {
              return (
                <div
                  key={`divider-${index}`}
                  className="context-menu-divider"
                />
              );
            }

            return (
              <button
                key={item.id}
                className={`context-menu-item ${item.isDanger ? "danger" : ""}`}
                onClick={() => {
                  if (item.onClick) item.onClick();
                  onClose();
                }}
              >
                {item.icon && <span className="context-menu-icon">{item.icon}</span>}
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ContextMenu;
