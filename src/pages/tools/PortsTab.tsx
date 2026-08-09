import React, { useEffect, useMemo, useState } from "react";
import { Loader2, Plug, RefreshCw, Search, ShieldAlert, Zap } from "lucide-react";
import EmptyState from "../../components/ui/EmptyState/EmptyState";
import ConfirmDialog from "../../components/ui/ConfirmDialog/ConfirmDialog";
import { describeError, useToast } from "../../components/ui/Toast/ToastContext";
import { useToolsAPI } from "../../api/api";
import type { PortEntry, PortScanResult } from "../../../types/tools";

/**
 * Port manager.
 *
 * Answers "what is holding port 3000?" and lets the user stop it. Killing
 * requires confirmation, and main re-verifies the PID still owns that port
 * before terminating anything.
 */
const PortsTab: React.FC = () => {
  const tools = useToolsAPI();
  const toast = useToast();

  const [result, setResult] = useState<PortScanResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [devOnly, setDevOnly] = useState(true);
  const [pendingKill, setPendingKill] = useState<PortEntry | null>(null);
  const [killingPid, setKillingPid] = useState<number | null>(null);

  const refresh = async (quiet = false) => {
    setIsLoading(true);
    try {
      const scan = await tools.listPorts();
      setResult(scan);
      for (const warning of scan.warnings) toast.info("Port scan", warning);
    } catch (e) {
      if (!quiet) toast.error("Could not list ports", describeError(e));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void refresh(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const entries = useMemo(() => result?.entries ?? [], [result]);

  const visible = useMemo(() => {
    const trimmed = query.trim();
    let source = entries;

    if (devOnly) source = source.filter((e) => e.isDevPort);

    if (trimmed) {
      const asNumber = Number(trimmed);
      const lower = trimmed.toLowerCase();
      source = source.filter(
        (e) =>
          (Number.isFinite(asNumber) && String(e.port).includes(trimmed)) ||
          e.processName?.toLowerCase().includes(lower) ||
          e.knownService?.toLowerCase().includes(lower) ||
          String(e.pid).includes(trimmed),
      );
    }

    return source;
  }, [entries, devOnly, query]);

  const handleKill = async () => {
    const target = pendingKill;
    setPendingKill(null);
    if (!target) return;

    setKillingPid(target.pid);
    try {
      const outcome = await tools.killPort(target.pid, target.port);
      toast.success(`Port ${target.port} is free`, outcome.message);
      await refresh(true);
    } catch (e) {
      toast.error(`Could not free port ${target.port}`, describeError(e));
    } finally {
      setKillingPid(null);
    }
  };

  if (!result && isLoading) {
    return (
      <div className="tool-panel tool-scanning">
        <Loader2 size={28} className="tool-spinner" />
        <p className="tool-scanning-title">Reading listening ports...</p>
      </div>
    );
  }

  const devCount = entries.filter((e) => e.isDevPort).length;

  return (
    <div className="tool-panel">
      <div className="tool-stat-row">
        <div className="tool-stat">
          <span className="tool-stat-value">{entries.length}</span>
          <span className="tool-stat-label">Listening ports</span>
        </div>
        <div className="tool-stat">
          <span className="tool-stat-value tool-stat-accent">{devCount}</span>
          <span className="tool-stat-label">Dev ports</span>
        </div>
        {result?.scannedAt && (
          <div className="tool-stat">
            <span className="tool-stat-value tool-stat-small">
              {new Date(result.scannedAt).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              })}
            </span>
            <span className="tool-stat-label">Last refreshed</span>
          </div>
        )}
      </div>

      <div className="tool-actions-bar">
        <div className="tool-search">
          <Search size={14} className="tool-search-icon" />
          <input
            className="tool-search-input"
            placeholder="Port, process, or PID..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        <button
          className={`tool-btn ${devOnly ? "is-active" : ""}`}
          onClick={() => setDevOnly((v) => !v)}
          aria-pressed={devOnly}
        >
          <Zap size={13} />
          <span>Dev ports only</span>
        </button>

        <div className="tool-actions-spacer" />

        <button className="tool-btn" onClick={() => refresh()} disabled={isLoading}>
          <RefreshCw size={13} className={isLoading ? "tool-spinner" : ""} />
          <span>Refresh</span>
        </button>
      </div>

      {visible.length === 0 ? (
        <EmptyState
          icon={<Plug size={32} strokeWidth={1.5} />}
          title={query ? `Nothing matches "${query}"` : "No listening ports"}
          description={
            devOnly && entries.length > 0
              ? "No development ports are in use. Turn off the filter to see everything."
              : "Nothing is listening right now. Start a dev server and refresh."
          }
        />
      ) : (
        <div className="tool-list">
          {visible.map((entry) => (
            <div
              key={`${entry.port}-${entry.pid}`}
              className={`port-row ${entry.isDevPort ? "is-dev" : ""}`}
            >
              <div className="port-number-box">
                <span className="port-number">{entry.port}</span>
                <span className="port-protocol">{entry.protocol}</span>
              </div>

              <div className="port-body">
                <div className="port-heading">
                  <span className="port-process">{entry.processName ?? "Unknown process"}</span>
                  {entry.knownService && (
                    <span className="port-badge">{entry.knownService}</span>
                  )}
                  {entry.isProtected && (
                    <span className="port-badge port-badge-protected">
                      <ShieldAlert size={10} />
                      <span>Protected</span>
                    </span>
                  )}
                </div>
                <div className="port-meta">
                  <span>PID {entry.pid}</span>
                  <span>·</span>
                  <span>{entry.address}</span>
                  <span>·</span>
                  <span>{entry.state}</span>
                </div>
              </div>

              <button
                className="tool-btn tool-btn-danger port-kill-btn"
                onClick={() => setPendingKill(entry)}
                disabled={entry.isProtected || killingPid === entry.pid}
                title={
                  entry.isProtected
                    ? "System processes cannot be stopped from here"
                    : `Stop the process on port ${entry.port}`
                }
              >
                {killingPid === entry.pid ? "Stopping..." : "Kill"}
              </button>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        isOpen={Boolean(pendingKill)}
        isDanger
        title={`Stop the process on port ${pendingKill?.port}?`}
        message={
          <>
            This force-terminates{" "}
            <strong>{pendingKill?.processName ?? `PID ${pendingKill?.pid}`}</strong> and any child
            processes. Unsaved work in that process will be lost.
          </>
        }
        detail={
          pendingKill
            ? `${pendingKill.processName ?? "unknown"}  ·  PID ${pendingKill.pid}  ·  ${pendingKill.address}:${pendingKill.port}`
            : undefined
        }
        confirmLabel="Stop process"
        onCancel={() => setPendingKill(null)}
        onConfirm={handleKill}
      />
    </div>
  );
};

export default PortsTab;
