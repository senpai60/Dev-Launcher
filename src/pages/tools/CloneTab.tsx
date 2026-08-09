import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Code2,
  DownloadCloud,
  FolderOpen,
  Loader2,
} from "lucide-react";
import Input from "../../components/ui/Form/Input";
import Checkbox from "../../components/ui/Form/Checkbox";
import { describeError, useToast } from "../../components/ui/Toast/ToastContext";
import { useProjectContext } from "../../context/ProjectContext";
import { useSystemAPI, useToolsAPI } from "../../api/api";
import { parseRepoNameFromUrl } from "./formatters";
import type { CloneProgress, CloneResult } from "../../../types/tools";

const EDITOR_CHOICES = [
  { key: "", label: "Don't open an editor" },
  { key: "vscode", label: "VS Code" },
  { key: "cursor", label: "Cursor" },
  { key: "antigravity", label: "Antigravity" },
];

const PHASE_LABELS: Record<CloneProgress["phase"], string> = {
  validating: "Validating",
  cloning: "Cloning",
  detecting: "Detecting stack",
  registering: "Adding project",
  installing: "Installing dependencies",
  opening: "Opening editor",
  done: "Done",
  failed: "Failed",
};

/**
 * Clone to running.
 *
 * Paste a repository URL and get a cloned, detected, registered project with
 * dependencies installing and an editor open -- the whole "new repo" ritual
 * in one action.
 */
const CloneTab: React.FC = () => {
  const tools = useToolsAPI();
  const system = useSystemAPI();
  const toast = useToast();
  const projectContext = useProjectContext();

  const [url, setUrl] = useState("");
  const [destination, setDestination] = useState("");
  const [folderName, setFolderName] = useState("");
  const [installDeps, setInstallDeps] = useState(true);
  const [editor, setEditor] = useState("vscode");

  const [urlError, setUrlError] = useState<string | null>(null);
  const [isCloning, setIsCloning] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const [phase, setPhase] = useState<CloneProgress["phase"] | null>(null);
  const [result, setResult] = useState<CloneResult | null>(null);

  const logRef = useRef<HTMLDivElement>(null);

  useEffect(
    () =>
      tools.onCloneProgress((progress) => {
        setPhase(progress.phase);
        setLog((prev) => {
          const line = progress.detail ?? progress.message;
          // git repeats the same counter line; collapse consecutive duplicates.
          if (prev[prev.length - 1] === line) return prev;
          return [...prev.slice(-200), line];
        });
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
  }, [log]);

  // Derive the folder name from the URL until the user overrides it.
  const derivedName = useMemo(() => parseRepoNameFromUrl(url), [url]);
  const effectiveName = folderName.trim() || derivedName || "";

  const validateUrl = async (value: string) => {
    if (!value.trim()) {
      setUrlError(null);
      return;
    }
    try {
      const check = await tools.validateCloneUrl(value);
      setUrlError(check.valid ? null : (check.reason ?? "That URL is not valid."));
    } catch {
      // Advisory only; the clone itself performs the real check.
    }
  };

  const pickDestination = async () => {
    try {
      const selected = await system.selectFolder(destination || undefined);
      if (selected) setDestination(selected.path);
    } catch (e) {
      toast.error("Could not open the folder picker", describeError(e));
    }
  };

  const canClone =
    Boolean(url.trim()) && Boolean(destination.trim()) && !urlError && !isCloning;

  const handleClone = async () => {
    if (!canClone) return;

    setIsCloning(true);
    setResult(null);
    setLog([]);
    setPhase("validating");

    try {
      const outcome = await tools.clone({
        url: url.trim(),
        destinationParent: destination.trim(),
        folderName: folderName.trim() || undefined,
        installDependencies: installDeps,
        openInEditor: editor || undefined,
      });

      setResult(outcome);
      setPhase("done");
      toast.success(
        `${outcome.projectName} is ready`,
        outcome.installStarted
          ? "Dependencies are installing in a terminal window."
          : "Added to your projects.",
      );
      for (const warning of outcome.warnings) toast.info("Clone", warning);

      // Refresh the project list so the new entry appears everywhere.
      await projectContext?.loadAllProjects();

      setUrl("");
      setFolderName("");
    } catch (e) {
      setPhase("failed");
      toast.error("Clone failed", describeError(e));
    } finally {
      setIsCloning(false);
    }
  };

  return (
    <div className="tool-panel">
      <div className="clone-form">
        <Input
          label="Repository URL"
          placeholder="https://github.com/owner/repo.git"
          value={url}
          onChange={(e) => {
            setUrl(e.target.value);
            setUrlError(null);
          }}
          onBlur={(e) => validateUrl(e.target.value)}
          error={urlError ?? undefined}
        />

        <div className="form-field">
          <label className="form-label">Destination Folder</label>
          <div className="clone-destination-row">
            <span className={`clone-destination ${destination ? "" : "is-empty"}`}>
              {destination || "Choose where to clone it..."}
            </span>
            <button type="button" className="tool-btn" onClick={pickDestination}>
              <FolderOpen size={13} />
              <span>{destination ? "Change" : "Browse"}</span>
            </button>
          </div>
        </div>

        <Input
          label="Folder Name (Optional)"
          placeholder={derivedName || "Taken from the URL"}
          value={folderName}
          onChange={(e) => setFolderName(e.target.value)}
        />

        {destination && effectiveName && (
          <p className="clone-preview">
            Will clone into <code>{`${destination}\\${effectiveName}`}</code>
          </p>
        )}

        <div className="form-field">
          <label className="form-label">Open in Editor</label>
          <select
            className="form-input"
            value={editor}
            onChange={(e) => setEditor(e.target.value)}
          >
            {EDITOR_CHOICES.map((choice) => (
              <option key={choice.key} value={choice.key}>
                {choice.label}
              </option>
            ))}
          </select>
        </div>

        <Checkbox
          label="Install dependencies after cloning"
          checked={installDeps}
          onChange={setInstallDeps}
        />

        <button
          className="clone-submit-btn"
          onClick={handleClone}
          disabled={!canClone}
        >
          {isCloning ? (
            <>
              <Loader2 size={14} className="tool-spinner" />
              <span>{phase ? PHASE_LABELS[phase] : "Working"}...</span>
            </>
          ) : (
            <>
              <DownloadCloud size={14} />
              <span>Clone and set up</span>
            </>
          )}
        </button>
      </div>

      {log.length > 0 && (
        <div className="clone-log-block">
          <div className="clone-log-header">
            <span>{phase ? PHASE_LABELS[phase] : "Progress"}</span>
            {isCloning && <Loader2 size={12} className="tool-spinner" />}
          </div>
          <div className="clone-log" ref={logRef}>
            {log.map((line, i) => (
              <div key={`${i}-${line}`} className="clone-log-line">
                {line}
              </div>
            ))}
          </div>
        </div>
      )}

      {result && (
        <div className="clone-result">
          <div className="clone-result-header">
            <CheckCircle2 size={16} />
            <span>
              <strong>{result.projectName}</strong> is ready to work on.
            </span>
          </div>

          <div className="clone-result-grid">
            <div>
              <span className="clone-result-label">Location</span>
              <code className="clone-result-value">{result.projectPath}</code>
            </div>
            <div>
              <span className="clone-result-label">Detected</span>
              <span className="clone-result-value">
                {result.detectedTags.length > 0 ? result.detectedTags.join(" · ") : "Nothing"}
              </span>
            </div>
            <div>
              <span className="clone-result-label">Commands found</span>
              <span className="clone-result-value">{result.commandCount}</span>
            </div>
            <div>
              <span className="clone-result-label">Dependencies</span>
              <span className="clone-result-value">
                {result.installStarted ? "Installing in a terminal" : "Not installed"}
              </span>
            </div>
          </div>

          {result.warnings.length > 0 && (
            <div className="clone-result-warnings">
              {result.warnings.map((warning) => (
                <span key={warning}>
                  <AlertTriangle size={12} />
                  {warning}
                </span>
              ))}
            </div>
          )}

          <div className="tool-actions-bar">
            <button
              className="tool-btn"
              onClick={() => projectContext?.openProject(result.projectId, "vscode")}
            >
              <Code2 size={13} />
              <span>Open in VS Code</span>
            </button>
            <button
              className="tool-btn"
              onClick={() => projectContext?.openProject(result.projectId, "folder")}
            >
              <FolderOpen size={13} />
              <span>Open folder</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CloneTab;
