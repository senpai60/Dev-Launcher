import React, { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Code2,
  FolderOpen,
  GitBranch,
  Loader2,
  Radar,
  RefreshCw,
  Terminal,
} from "lucide-react";
import EmptyState from "../../components/ui/EmptyState/EmptyState";
import { describeError, useToast } from "../../components/ui/Toast/ToastContext";
import { useToolsAPI } from "../../api/api";
import { useProjectContext } from "../../context/ProjectContext";
import type { RadarEntry, RadarProgress, RadarResult } from "../../../types/tools";

/**
 * Stale project radar.
 *
 * Surfaces the projects with work you're about to lose: uncommitted changes,
 * unpushed commits, uninstalled dependencies, folders that vanished.
 * Read-only -- it reports, it never touches a repository.
 */
const RadarTab: React.FC = () => {
  const tools = useToolsAPI();
  const toast = useToast();
  const projectContext = useProjectContext();

  const [result, setResult] = useState<RadarResult | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [progress, setProgress] = useState<RadarProgress | null>(null);
  const [issuesOnly, setIssuesOnly] = useState(true);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => tools.onRadarProgress(setProgress), []);

  const runScan = async (quiet = false) => {
    if (isScanning) return;
    setIsScanning(true);
    setProgress(null);

    try {
      const scan = await tools.scanRadar();
      setResult(scan);
      for (const warning of scan.warnings) toast.info("Radar", warning);
    } catch (e) {
      if (!quiet) toast.error("Radar scan failed", describeError(e));
    } finally {
      setIsScanning(false);
      setProgress(null);
    }
  };

  useEffect(() => {
    void runScan(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const entries = useMemo(() => result?.entries ?? [], [result]);
  const visible = useMemo(
    () => (issuesOnly ? entries.filter((e) => e.issues.length > 0) : entries),
    [entries, issuesOnly],
  );

  const atRisk = entries.filter((e) =>
    e.issues.some((i) => i.kind === "uncommitted-changes" || i.kind === "unpushed-commits"),
  ).length;

  if (!result && isScanning) {
    const pct = progress && progress.total > 0 ? (progress.current / progress.total) * 100 : 0;
    return (
      <div className="tool-panel tool-scanning">
        <Loader2 size={28} className="tool-spinner" />
        <p className="tool-scanning-title">
          {progress?.projectName ? `Checking ${progress.projectName}...` : "Starting scan..."}
        </p>
        <div className="tool-progress-track">
          <div className="tool-progress-fill" style={{ width: `${pct}%` }} />
        </div>
        <p className="tool-scanning-meta">
          {progress ? `${progress.current} of ${progress.total} projects` : ""}
        </p>
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="tool-panel">
        <EmptyState
          icon={<Radar size={32} strokeWidth={1.5} />}
          title="No projects to check"
          description="Add some projects and the radar will watch them for uncommitted work, unpushed commits, and missing dependencies."
        />
      </div>
    );
  }

  return (
    <div className="tool-panel">
      <div className="tool-stat-row">
        <div className="tool-stat">
          <span className={`tool-stat-value ${atRisk > 0 ? "tool-stat-warn" : "tool-stat-good"}`}>
            {atRisk}
          </span>
          <span className="tool-stat-label">With unsaved work</span>
        </div>
        <div className="tool-stat">
          <span className="tool-stat-value">{result?.needsAttentionCount ?? 0}</span>
          <span className="tool-stat-label">Need attention</span>
        </div>
        <div className="tool-stat">
          <span className="tool-stat-value tool-stat-good">{result?.healthyCount ?? 0}</span>
          <span className="tool-stat-label">Healthy</span>
        </div>
        <div className="tool-stat">
          <span className="tool-stat-value">{entries.length}</span>
          <span className="tool-stat-label">Projects scanned</span>
        </div>
      </div>

      <div className="tool-actions-bar">
        <button
          className={`tool-btn ${issuesOnly ? "is-active" : ""}`}
          onClick={() => setIssuesOnly((v) => !v)}
          aria-pressed={issuesOnly}
        >
          <AlertTriangle size={13} />
          <span>Issues only</span>
        </button>
        <div className="tool-actions-spacer" />
        <button className="tool-btn" onClick={() => runScan()} disabled={isScanning}>
          <RefreshCw size={13} className={isScanning ? "tool-spinner" : ""} />
          <span>{isScanning ? "Scanning..." : "Rescan"}</span>
        </button>
      </div>

      {visible.length === 0 ? (
        <div className="tool-clean-state">
          <CheckCircle2 size={20} />
          <span>Every project is clean, committed, and installed. Nothing needs attention.</span>
        </div>
      ) : (
        <div className="tool-list">
          {visible.map((entry) => (
            <RadarRow
              key={entry.projectId}
              entry={entry}
              onOpenEditor={() => projectContext?.openProject(entry.projectId, "vscode")}
              onOpenTerminal={() => projectContext?.openProject(entry.projectId, "terminal")}
              onOpenFolder={() => projectContext?.openProject(entry.projectId, "folder")}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const RadarRow: React.FC<{
  entry: RadarEntry;
  onOpenEditor: () => void;
  onOpenTerminal: () => void;
  onOpenFolder: () => void;
}> = ({ entry, onOpenEditor, onOpenTerminal, onOpenFolder }) => {
  const worst = entry.issues.some((i) => i.severity === "high")
    ? "high"
    : entry.issues.some((i) => i.severity === "medium")
      ? "medium"
      : entry.issues.length > 0
        ? "low"
        : "none";

  return (
    <div className={`radar-row severity-${worst}`}>
      <div className="radar-body">
        <div className="radar-heading">
          <span className="radar-project">{entry.projectName}</span>

          {entry.isRepository && entry.branch && (
            <span className="radar-branch">
              <GitBranch size={11} />
              <span>{entry.branch}</span>
            </span>
          )}

          {entry.issues.length === 0 && (
            <span className="radar-badge radar-badge-ok">
              <CheckCircle2 size={10} />
              <span>Healthy</span>
            </span>
          )}

          {entry.issues.map((issue) => (
            <span key={issue.kind} className={`radar-badge radar-badge-${issue.severity}`}>
              {issue.label}
            </span>
          ))}
        </div>

        {entry.issues.length > 0 && (
          <ul className="radar-detail-list">
            {entry.issues.map((issue) => (
              <li key={issue.kind}>{issue.detail}</li>
            ))}
          </ul>
        )}

        <div className="radar-meta">
          {entry.lastCommitMessage && (
            <span className="radar-commit" title={entry.lastCommitMessage}>
              Last commit: {entry.lastCommitMessage}
            </span>
          )}
          {entry.daysSinceCommit !== null && (
            <span>
              {entry.daysSinceCommit === 0 ? "today" : `${entry.daysSinceCommit}d ago`}
            </span>
          )}
        </div>
      </div>

      <div className="radar-actions">
        <button
          className="tool-btn"
          onClick={onOpenEditor}
          disabled={!entry.pathExists}
          title="Open in VS Code"
        >
          <Code2 size={13} />
        </button>
        <button
          className="tool-btn"
          onClick={onOpenTerminal}
          disabled={!entry.pathExists}
          title="Open terminal"
        >
          <Terminal size={13} />
        </button>
        <button
          className="tool-btn"
          onClick={onOpenFolder}
          disabled={!entry.pathExists}
          title="Open folder"
        >
          <FolderOpen size={13} />
        </button>
      </div>
    </div>
  );
};

export default RadarTab;
