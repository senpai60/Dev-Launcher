import React, { useEffect } from "react";
import { X } from "lucide-react";
import "./dialog.css";

export interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: string;
  className?: string;
  closeOnOutsideClick?: boolean;
}

export const Dialog: React.FC<DialogProps> = ({
  isOpen,
  onClose,
  title,
  children,
  footer,
  maxWidth = "520px",
  className = "",
  closeOnOutsideClick = false,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && closeOnOutsideClick) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, closeOnOutsideClick]);

  if (!isOpen) return null;

  return (
    <div
      className="dialog-backdrop"
      onClick={(e) => {
        if (closeOnOutsideClick && e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className={`dialog-container ${className}`}
        style={{ maxWidth }}
        role="dialog"
        aria-modal="true"
      >
        <div className="dialog-header">
          <div className="dialog-title">{title}</div>
          <button
            className="dialog-close-btn"
            onClick={onClose}
            aria-label="Close dialog"
          >
            <X size={18} />
          </button>
        </div>

        <div className="dialog-body custom-scroller">{children}</div>

        {footer && <div className="dialog-footer">{footer}</div>}
      </div>
    </div>
  );
};

export default Dialog;
