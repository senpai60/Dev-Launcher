import React, { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Copy,
  Eye,
  FileWarning,
  FolderTree,
  Loader2,
  RefreshCw,
} from "lucide-react";
import EmptyState from "../../components/ui/EmptyState/EmptyState";
import { describeError, useToast } from "../../components/ui/Toast/ToastContext";
import { useToolsAPI } from "../../api/api";
import type { EnvAuditResult, EnvLocation } from "../../../types/tools";

/**
 * Environment doctor.
 *
 * Compares each project's `.env.example` against its real `.env` and reports
 * which keys are missing or blank. Only key *names* ever reach this component --
 * values never leave the main process.
 */
const EnvTab: React.FC = () => {
  const tools = useToolsAPI();
  const toast = useToast();

  const [result, setResult] = useState<EnvAuditResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [issuesOnly, setIssuesOnly] = useState(true);

  const refresh = async (quiet = false) => {
    setIsLoading(true);
    try {
      const audit = await tools.auditEnv();
      setResult(audit);

      // Open the first project that has problems so the value is immediate.
      const firstProblem = audit.reports.find((r) => r.missingCount > 0 || r.emptyCount > 0);
      if (firstProblem) setExpanded(new Set([firstProblem.projectId]));
    } catch (e) {
      if (!quiet) toast.error("Could not audit environments", describeError(e));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void refresh(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const reports = useMemo(() => result?.reports ?? [], [result]);

  const visible = useMemo(() => {
    const withEnv = reports.filter((r) => r.hasEnvFiles);
    return issuesOnly
      ? withEnv.filter((r) => r.missingCount > 0 || r.emptyCount > 0 || r.envNotIgnored)
      : withEnv;
  }, [reports, issuesOnly]);

  const toggle = (projectId: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(projectId)) next.delete(projectId);
      else next.add(projectId);
      return next;
    });
  };

  const copyMissing = async (location: EnvLocation) => {
    const missing = location.keys.filter((k) => k.status === "missing").map((k) => `${k.key}=`);
    if (missing.length === 0) return;

    try {
      await navigator.clipboard.writeText(missing.join("\n"));
      toast.success(
        `Copied ${missing.length} key${missing.length === 1 ? "" : "s"}`,
        `Paste into ${location.label === "project root" ? ".env" : `${location.label}/.env`} and fill in the values.`,
      );
    } catch {
      toast.error("Could not copy to clipboard");
    }
  };

  if (!result && isLoading) {
    return (
      <div className="tool-panel tool-scanning">
        <Loader2 size={28} className="tool-spinner" />
        <p className="tool-scanning-title">Checking environment files...</p>
      </div>
    );
  }

  const projectsWithEnv = reports.filter((r) => r.hasEnvFiles).length;

  if (projectsWithEnv === 0) {
    return (
      <div className="tool-panel">
        <EmptyState
          icon={<FileWarning size={32} strokeWidth={1.5} />}
          title="No environment files found"
          description="None of your projects have a .env or .env.example file. Add one and re-run the check."
          actionLabel="Check again"
          onAction={() => refresh()}
        />
      </div>
    );
  }

  return (
    <div className="tool-panel">
      <div className="tool-stat-row">
        <div className="tool-stat">
          <span className="tool-stat-value tool-stat-warn">{result?.totalMissing ?? 0}</span>
          <span className="tool-stat-label">Missing keys</span>
        </div>
        <div className="tool-stat">
          <span className="tool-stat-value">{result?.projectsWithIssues ?? 0}</span>
          <span className="tool-stat-label">Projects with issues</span>
        </div>
        <div className="tool-stat">
          <span className="tool-stat-value">{projectsWithEnv}</span>
          <span className="tool-stat-label">Projects with env files</span>
        </div>
      </div>

      <div className="tool-privacy-note">
        <Eye size={13} />
        <span>Key names only. Values are never read into the interface or logged.</span>
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
        <button className="tool-btn" onClick={() => refresh()} disabled={isLoading}>
          <RefreshCw size={13} className={isLoading ? "tool-spinner" : ""} />
          <span>Re-check</span>
        </button>
      </div>

      {visible.length === 0 ? (
        <div className="tool-clean-state">
          <CheckCircle2 size={20} />
          <span>Every project's environment file matches its example. Nothing to fix.</span>
        </div>
      ) : (
        <div className="tool-list">
          {visible.map((report) => {
            const isOpen = expanded.has(report.projectId);
            // "Clean" has to account for an unignored .env, otherwise a project
            // listed only for that reason would show a green OK badge.
            const isClean =
              report.missingCount === 0 && report.emptyCount === 0 && !report.envNotIgnored;

            return (
              <div key={report.projectId} className="env-card">
                <button className="env-card-header" onClick={() => toggle(report.projectId)}>
                  {isOpen ? <ChevronDown size={15} /> : <ChevronRight size={15} />}

                  <span className="env-project">{report.projectName}</span>

                  <div className="env-pill-row">
                    {report.missingCount > 0 && (
                      <span className="env-pill env-pill-missing">
                        {report.missingCount} missing
                      </span>
                    )}
                    {report.emptyCount > 0 && (
                      <span className="env-pill env-pill-empty">{report.emptyCount} blank</span>
                    )}
                    {report.extraCount > 0 && (
                      <span className="env-pill env-pill-extra">{report.extraCount} extra</span>
                    )}
                    {report.envNotIgnored && (
                      <span className="env-pill env-pill-missing">
                        <AlertTriangle size={10} />
                        <span>.env not ignored</span>
                      </span>
                    )}
                    {isClean && (
                      <span className="env-pill env-pill-ok">
                        <CheckCircle2 size={10} />
                        <span>OK</span>
                      </span>
                    )}
                  </div>

                  <span className="env-file-hint">
                    {report.locations.length === 1
                      ? report.locations[0].label
                      : `${report.locations.length} locations`}
                  </span>
                </button>

                {isOpen && (
                  <div className="env-card-body">
                    {report.warnings.map((warning) => (
                      <div key={warning} className="env-warning env-warning-soft">
                        <AlertTriangle size={13} />
                        <span>{warning}</span>
                      </div>
                    ))}

                    {report.locations.map((location) => (
                      <div key={location.relativeDir || "__root__"} className="env-location">
                        <div className="env-location-header">
                          <FolderTree size={12} />
                          <code className="env-location-label">{location.label}</code>

                          <span className="env-location-files">
                            {location.exampleFile && location.activeFile
                              ? `${location.exampleFile} → ${location.activeFile}`
                              : location.activeFile || location.exampleFile || "no env file"}
                          </span>

                          <div className="env-pill-row">
                            {location.missingCount > 0 && (
                              <span className="env-pill env-pill-missing">
                                {location.missingCount} missing
                              </span>
                            )}
                            {location.emptyCount > 0 && (
                              <span className="env-pill env-pill-empty">
                                {location.emptyCount} blank
                              </span>
                            )}
                            {location.extraCount > 0 && (
                              <span className="env-pill env-pill-extra">
                                {location.extraCount} extra
                              </span>
                            )}
                            {location.missingCount === 0 && location.emptyCount === 0 && (
                              <span className="env-pill env-pill-ok">
                                <CheckCircle2 size={10} />
                                <span>OK</span>
                              </span>
                            )}
                          </div>
                        </div>

                        {location.envNotIgnored && (
                          <div className="env-warning">
                            <AlertTriangle size={13} />
                            <span>
                              <strong>.env here is not in .gitignore.</strong> You may be about to
                              commit secrets.
                            </span>
                          </div>
                        )}

                        {location.warnings.map((warning) => (
                          <div key={warning} className="env-warning env-warning-soft">
                            <AlertTriangle size={13} />
                            <span>{warning}</span>
                          </div>
                        ))}

                        {location.files.length > 0 && (
                          <div className="env-files-row">
                            {location.files.map((file) => (
                              <span key={file.fileName} className="env-file-chip">
                                <code>{file.fileName}</code>
                                <span>{file.keyCount} keys</span>
                              </span>
                            ))}
                          </div>
                        )}

                        {location.keys.length > 0 ? (
                          <>
                            <div className="env-key-grid">
                              {location.keys.map((row) => (
                                <span
                                  key={`${row.key}-${row.status}`}
                                  className={`env-key env-key-${row.status}`}
                                  title={
                                    row.status === "missing"
                                      ? "Declared in the example but absent from your .env"
                                      : row.status === "empty"
                                        ? "Present but has no value"
                                        : row.status === "extra"
                                          ? "In your .env but not documented in the example"
                                          : "Present with a value"
                                  }
                                >
                                  {row.key}
                                </span>
                              ))}
                            </div>

                            {location.missingCount > 0 && (
                              <button className="tool-btn" onClick={() => copyMissing(location)}>
                                <Copy size={13} />
                                <span>Copy {location.missingCount} missing keys</span>
                              </button>
                            )}
                          </>
                        ) : (
                          <p className="tool-note">No keys found here.</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default EnvTab;
