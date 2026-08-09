import React, { useState } from "react";
import { Folder, FolderOpen } from "lucide-react";
import { useSystemAPI } from "../../../api/api";
import { describeError, useToast } from "../Toast/ToastContext";
import "./form.css";

export interface FolderPickerProps {
  label?: string;
  value: string;
  onChange: (path: string, folderName?: string) => void;
  placeholder?: string;
  error?: string;
  className?: string;
}

/**
 * Native directory picker.
 *
 * Uses Electron's `showOpenDialog` rather than `<input webkitdirectory>`. The
 * old approach enumerated every file in the tree and derived the folder by
 * stripping the filename off the first result, which silently returned a
 * nested subdirectory whenever that file was not at the root.
 */
export const FolderPicker: React.FC<FolderPickerProps> = ({
  label = "Project Location",
  value,
  onChange,
  placeholder = "Select Project Folder...",
  error,
  className = "",
}) => {
  const system = useSystemAPI();
  const toast = useToast();
  const [isPicking, setIsPicking] = useState(false);

  const handleBrowseClick = async () => {
    if (isPicking) return;
    setIsPicking(true);
    try {
      const selected = await system.selectFolder(value || undefined);
      if (selected) {
        onChange(selected.path, selected.name);
      }
    } catch (e) {
      toast.error("Could not open the folder picker", describeError(e));
    } finally {
      setIsPicking(false);
    }
  };

  return (
    <div className={`form-field ${className}`}>
      {label && <label className="form-label">{label}</label>}
      <div className="folder-picker-box">
        {value ? (
          <div className="folder-selected-display">
            <Folder size={18} className="folder-icon" />
            <span className="folder-path-text" title={value}>
              {value}
            </span>
            <button
              type="button"
              className="folder-change-btn"
              onClick={handleBrowseClick}
              disabled={isPicking}
            >
              Change...
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="folder-select-btn"
            onClick={handleBrowseClick}
            disabled={isPicking}
          >
            <FolderOpen size={18} />
            <span>{isPicking ? "Opening picker..." : placeholder}</span>
          </button>
        )}
      </div>
      {error && <span className="form-error">{error}</span>}
    </div>
  );
};

export default FolderPicker;
