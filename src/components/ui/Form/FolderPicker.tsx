import React, { useRef } from "react";
import { FolderOpen, Folder } from "lucide-react";
import "./form.css";

export interface FolderPickerProps {
  label?: string;
  value: string;
  onChange: (path: string, folderName?: string) => void;
  placeholder?: string;
  error?: string;
  className?: string;
}

export const FolderPicker: React.FC<FolderPickerProps> = ({
  label = "Project Location",
  value,
  onChange,
  placeholder = "Select Project Folder...",
  error,
  className = "",
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleBrowseClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const firstFile = files[0];
      const rawPath = (firstFile as any).path || firstFile.webkitRelativePath || firstFile.name;

      let folderPath = "";
      let folderName = "";

      if ((firstFile as any).path) {
        // Absolute path in Electron
        const pathParts = rawPath.split(/[/\\]/);
        pathParts.pop(); // Remove file name to get directory
        folderPath = pathParts.join("\\");
        folderName = pathParts[pathParts.length - 1] || "";
      } else {
        const parts = firstFile.webkitRelativePath.split('/');
        folderName = parts[0] || firstFile.name;
        folderPath = `C:\\Projects\\${folderName}`;
      }

      onChange(folderPath, folderName);
    }
  };

  return (
    <div className={`form-field ${className}`}>
      {label && <label className="form-label">{label}</label>}
      <div className="folder-picker-box">
        {value ? (
          <div className="folder-selected-display">
            <Folder size={18} className="folder-icon" />
            <span className="folder-path-text">{value}</span>
            <button
              type="button"
              className="folder-change-btn"
              onClick={handleBrowseClick}
            >
              Change...
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="folder-select-btn"
            onClick={handleBrowseClick}
          >
            <FolderOpen size={18} />
            <span>{placeholder}</span>
          </button>
        )}

        <input
          type="file"
          ref={fileInputRef}
          style={{ display: "none" }}
          /* @ts-ignore */
          webkitdirectory=""
          directory=""
          onChange={handleFileChange}
        />
      </div>
      {error && <span className="form-error">{error}</span>}
    </div>
  );
};

export default FolderPicker;
