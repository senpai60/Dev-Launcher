import React, { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  HardDrive,
  Loader2,
  RefreshCw,
  Trash2,
} from "lucide-react";
import EmptyState from "../../components/ui/EmptyState/EmptyState";
import ConfirmDialog from "../../components/ui/ConfirmDialog/ConfirmDialog";
import { describeError, useToast } from "../../components/ui/Toast/ToastContext";
import { useToolsAPI } from "../../api/api";
import { formatBytes, formatCount, formatDaysAgo } from "./formatters";
import type { DiskScanProgress, DiskScanResult } from "../../../types/tools";

/**
 * node_modules reclaimer.
 *
 * Measures every `node_modules` under every registered project and lets the
 * user bulk-delete the stale ones. Deleting is guarded twice: a typed-intent
 * confirmation here, and a path-safety check in the main process.
 */
const DiskTab: React.FC = () => {
  const tools = useToolsAPI();
  const toast = useToast();

  const [result, setResult] = useState<DiskScanResult | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [progress, setProgress] = useState<DiskScanProgress | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [reclaimedTotal, setReclaimedTotal] = useState(0);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => tools.onDiskScanProgress(setProgress), []);

  const runScan = async () => {
    if (isScanning) return;
    setIsScanning(true);
    setProgress(null);
    setSelected(new Set());

    try {
      const scan = await tools.scanDisk();
      setResult(scan);
      if (scan.entries.length === 0) {
        toast.info("Nothing to reclaim", "No node_modules folders were found.");
      }
    } catch (e) {
      toast.error("Scan failed", describeError(e));
    } finally {
      setIsScanning(false);
      setProgress(null);
    }
  };

  const entries = useMemo(() => result?.entries ?? [], [result]);
  const largest = entries[0]?.sizeBytes ?? 1;

  const selectedEntries = useMemo(
    () => entries.filter((e) => selected.has(e.modulesPath)),
    [entries, selected],
  );
  const selectedBytes = selectedEntries.reduce((sum, e) => sum + e.sizeBytes, 0);

  const toggle = (modulesPath: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(modulesPath)) next.delete(modulesPath);
      else next.add(modulesPath);
      return next;
    });
  };

  const selectStale = () => {
    setSelected(new Set(entries.filter((e) => e.isStale).map((e) => e.modulesPath)));
  };

  const handleDelete = async () => {
    setConfirmOpen(false);
    setIsDeleting(true);

    try {
      const outcome = await tools.deleteModules(selectedEntries.map((e) => e.modulesPath));
      setReclaimedTotal((prev) => prev + outcome.reclaimedBytes);

      if (outcome.deleted.length > 0) {
        toast.success(
          `Reclaimed ${formatBytes(outcome.reclaimedBytes)}`,
          `Deleted ${outcome.deleted.length} node_modules folder${outcome.deleted.length === 1 ? "" : "s"}.`,
        );
      }
      for (const failure of outcome.failed) {
        toast.error(`Could not delete ${failure.path.split(/[/\\]/).slice(-2)[0]}`, failure.reason);
      }

      // Drop the deleted rows without forcing a full rescan.
      const deletedSet = new Set(outcome.deleted);
      setResult((prev) =>
        prev
          ? {
              ...prev,
              entries: prev.entries.filter((e) => !deletedSet.has(e.modulesPath)),
              totalBytes: prev.entries
                .filter((e) => !deletedSet.has(e.modulesPath))
                .reduce((sum, e) => sum + e.sizeBytes, 0),
              staleBytes: prev.entries
                .filter((e) => !deletedSet.has(e.modulesPath) && e.isStale)
                .reduce((sum, e) => sum + e.sizeBytes, 0),
            }
          : prev,
      );
      setSelected(new Set());
    } catch (e) {
      toast.error("Delete failed", describeError(e));
    } finally {
      setIsDeleting(false);
    }
  };

  /* ---- Initial / scanning states ------------------------------------- */

  if (!result && !isScanning) {
    return (
      <div className="tool-panel">
        <EmptyState
          icon={<HardDrive size={32} strokeWidth={1.5} />}
          title="Find reclaimable disk space"
          description="Scans every project for node_modules folders, measures them, and flags the ones you haven't touched in a month."
          actionLabel="Scan projects"
          onAction={runScan}
        />
      </div>
    );
  }

  if (isScanning) {
    const pct = progress && progress.total > 0 ? (progress.current / progress.total) * 100 : 0;

    return (
      <div className="tool-panel tool-scanning">
        <Loader2 size={28} className="tool-spinner" />
        <p className="tool-scanning-title">
          {progress?.projectName ? `Measuring ${progress.projectName}...` : "Starting scan..."}
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

  /* ---- Results -------------------------------------------------------- */

  return (
    <div className="tool-panel">
      <div className="tool-stat-row">
        <div className="tool-stat">
          <span className="tool-stat-value">{formatBytes(result?.totalBytes ?? 0)}</span>
          <span className="tool-stat-label">Total on disk</span>
        </div>
        <div className="tool-stat">
          <span className="tool-stat-value tool-stat-warn">
            {formatBytes(result?.staleBytes ?? 0)}
          </span>
          <span className="tool-stat-label">In stale projects</span>
        </div>
        <div className="tool-stat">
          <span className="tool-stat-value">{entries.length}</span>
          <span className="tool-stat-label">Folders found</span>
        </div>
        {reclaimedTotal > 0 && (
          <div className="tool-stat">
            <span className="tool-stat-value tool-stat-good">{formatBytes(reclaimedTotal)}</span>
            <span className="tool-stat-label">Reclaimed this session</span>
          </div>
        )}
      </div>

      <div className="tool-actions-bar">
        <button className="tool-btn" onClick={runScan} disabled={isScanning}>
          <RefreshCw size={13} />
          <span>Rescan</span>
        </button>
        <button
          className="tool-btn"
          onClick={selectStale}
          disabled={!entries.some((e) => e.isStale)}
        >
          <AlertTriangle size={13} />
          <span>Select stale</span>
        </button>
        <button
          className="tool-btn"
          onClick={() => setSelected(new Set())}
          disabled={selected.size === 0}
        >
          <span>Clear selection</span>
        </button>

        <div className="tool-actions-spacer" />

        <button
          className="tool-btn tool-btn-danger"
          onClick={() => setConfirmOpen(true)}
          disabled={selected.size === 0 || isDeleting}
        >
          <Trash2 size={13} />
          <span>
            {isDeleting
              ? "Deleting..."
              : selected.size > 0
                ? `Delete ${selected.size} · free ${formatBytes(selectedBytes)}`
                : "Delete selected"}
          </span>
        </button>
      </div>

      {result?.skippedProjects ? (
        <p className="tool-note">
          {result.skippedProjects} project{result.skippedProjects === 1 ? "" : "s"} skipped (folder
          missing).
        </p>
      ) : null}

      {entries.length === 0 ? (
        <div className="tool-clean-state">
          <CheckCircle2 size={20} />
          <span>No node_modules folders left. Nothing to reclaim.</span>
        </div>
      ) : (
        <div className="tool-list">
          {entries.map((entry) => {
            const isSelected = selected.has(entry.modulesPath);
            const barWidth = Math.max(2, (entry.sizeBytes / largest) * 100);

            return (
              <label
                key={entry.modulesPath}
                className={`disk-row ${isSelected ? "is-selected" : ""} ${entry.isStale ? "is-stale" : ""}`}
              >
                <input
                  type="checkbox"
                  className="disk-checkbox"
                  checked={isSelected}
                  onChange={() => toggle(entry.modulesPath)}
                />

                <div className="disk-row-body">
                  <div className="disk-row-heading">
                    <span className="disk-project">{entry.projectName}</span>
                    {entry.relativeLabel !== "node_modules" && (
                      <span className="disk-sub-path">{entry.relativeLabel}</span>
                    )}
                    {entry.isStale && <span className="disk-badge disk-badge-stale">Stale</span>}
                  </div>

                  <div className="disk-bar-track">
                    <div
                      className={`disk-bar-fill ${entry.isStale ? "is-stale" : ""}`}
                      style={{ width: `${barWidth}%` }}
                    />
                  </div>

                  <div className="disk-row-meta">
                    <span>{formatCount(entry.fileCount)} files</span>
                    <span>·</span>
                    <span>{formatDaysAgo(entry.daysSinceOpened)}</span>
                  </div>
                </div>

                <span className="disk-size">{formatBytes(entry.sizeBytes)}</span>
              </label>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        isOpen={confirmOpen}
        isDanger
        title="Delete node_modules folders?"
        message={
          <>
            This permanently deletes {selected.size} folder
            {selected.size === 1 ? "" : "s"} and frees{" "}
            <strong>{formatBytes(selectedBytes)}</strong>. Reinstall with your package manager
            whenever you need them again. Close any running dev servers first.
          </>
        }
        detail={selectedEntries
          .slice(0, 8)
          .map((e) => `${e.projectName}/${e.relativeLabel}`)
          .join("\n")
          .concat(selectedEntries.length > 8 ? `\n...and ${selectedEntries.length - 8} more` : "")}
        confirmLabel={`Delete and free ${formatBytes(selectedBytes)}`}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={handleDelete}
      />
    </div>
  );
};

export default DiskTab;
