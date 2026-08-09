import React from "react";
import { AlertTriangle } from "lucide-react";
import Dialog from "../Dialog/Dialog";
import "./confirmDialog.css";

export interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: React.ReactNode;
  /** Shown in a monospace block, e.g. the command about to run. */
  detail?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDanger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  detail,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  isDanger = false,
  onConfirm,
  onCancel,
}) => (
  <Dialog
    isOpen={isOpen}
    onClose={onCancel}
    title={
      <span className="confirm-title">
        {isDanger && <AlertTriangle size={16} className="confirm-title-icon" />}
        <span>{title}</span>
      </span>
    }
    maxWidth="440px"
    closeOnOutsideClick
    footer={
      <>
        <button className="action-btn text-button confirm-cancel-btn" onClick={onCancel}>
          {cancelLabel}
        </button>
        <button
          className={isDanger ? "confirm-danger-btn text-button" : "primary-action-btn text-button"}
          onClick={onConfirm}
          autoFocus
        >
          {confirmLabel}
        </button>
      </>
    }
  >
    <div className="confirm-body">
      <p className="confirm-message">{message}</p>
      {detail && <code className="confirm-detail">{detail}</code>}
    </div>
  </Dialog>
);

export default ConfirmDialog;
