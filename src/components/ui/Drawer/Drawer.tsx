import React, { useEffect } from "react";
import { X } from "lucide-react";
import "./drawer.css";

export interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  width?: string;
  position?: "right" | "left";
  className?: string;
}

export const Drawer: React.FC<DrawerProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  footer,
  width = "480px",
  position = "right",
  className = "",
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  return (
    <div
      className={`drawer-backdrop position-${position} ${isOpen ? "is-open" : ""} ${className}`}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className="drawer-panel"
        style={{ maxWidth: width }}
        role="dialog"
        aria-modal="true"
      >
        {(title || subtitle) && (
          <div className="drawer-header">
            <div className="drawer-header-text">
              {title && <div className="drawer-title">{title}</div>}
              {subtitle && <div className="drawer-subtitle">{subtitle}</div>}
            </div>
            <button
              className="drawer-close-btn"
              onClick={onClose}
              aria-label="Close drawer"
            >
              <X size={18} />
            </button>
          </div>
        )}

        <div className="drawer-body custom-scroller">{children}</div>

        {footer && <div className="drawer-footer">{footer}</div>}
      </div>
    </div>
  );
};

export default Drawer;
