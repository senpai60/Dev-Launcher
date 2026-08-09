import React, { useEffect, useMemo, useState } from "react";
import { FileCode2, Loader2, Play, RefreshCw, Search } from "lucide-react";
import EmptyState from "../../components/ui/EmptyState/EmptyState";
import { describeError, useToast } from "../../components/ui/Toast/ToastContext";
import { useToolsAPI } from "../../api/api";
import { fuzzyFilter } from "../../utils/fuzzy";
import type { ScriptEntry, ScriptIndexResult } from "../../../types/tools";

/**
 * Cross-project script search.
 *
 * Indexes every package.json script across every registered project so
 * "which repo has a seed script?" is one search instead of forty folders.
 */
const ScriptsTab: React.FC = () => {
  const tools = useToolsAPI();
  const toast = useToast();

  const [result, setResult] = useState<ScriptIndexResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [runningKey, setRunningKey] = useState<string | null>(null);

  const refresh = async (quiet = false) => {
    setIsLoading(true);
    try {
      setResult(await tools.indexScripts());
    } catch (e) {
      if (!quiet) toast.error("Could not index scripts", describeError(e));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void refresh(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const scripts = useMemo(() => result?.scripts ?? [], [result]);

  const visible = useMemo(
    () =>
      fuzzyFilter(scripts, query, (s) => [
        s.scriptName,
        s.projectName,
        s.scriptBody,
        s.packageManager,
      ]),
    [scripts, query],
  );

  // Group results by project so the list reads as an index, not a flat dump.
  const grouped = useMemo(() => {
    const byProject = new Map<string, { name: string; items: ScriptEntry[] }>();
    for (const script of visible) {
      const bucket = byProject.get(script.projectId);
      if (bucket) bucket.items.push(script);
      else byProject.set(script.projectId, { name: script.projectName, items: [script] });
    }
    return [...byProject.entries()];
  }, [visible]);

  const handleRun = async (script: ScriptEntry) => {
    const key = `${script.projectId}:${script.scriptName}`;
    setRunningKey(key);
    try {
      await tools.runScript(script.projectId, script.scriptName);
      toast.success(
        `Running ${script.runCommand}`,
        `Opened a terminal in ${script.projectName}.`,
      );
    } catch (e) {
      toast.error(`Couldn't run ${script.scriptName}`, describeError(e));
    } finally {
      setRunningKey(null);
    }
  };

  if (!result && isLoading) {
    return (
      <div className="tool-panel tool-scanning">
        <Loader2 size={28} className="tool-spinner" />
        <p className="tool-scanning-title">Indexing package.json scripts...</p>
      </div>
    );
  }

  if (scripts.length === 0) {
    return (
      <div className="tool-panel">
        <EmptyState
          icon={<FileCode2 size={32} strokeWidth={1.5} />}
          title="No scripts found"
          description="None of your projects have package.json scripts, or their folders are missing."
          actionLabel="Re-index"
          onAction={() => refresh()}
        />
      </div>
    );
  }

  return (
    <div className="tool-panel">
      <div className="tool-stat-row">
        <div className="tool-stat">
          <span className="tool-stat-value">{scripts.length}</span>
          <span className="tool-stat-label">Scripts indexed</span>
        </div>
        <div className="tool-stat">
          <span className="tool-stat-value">{result?.projectsIndexed ?? 0}</span>
          <span className="tool-stat-label">Projects</span>
        </div>
        <div className="tool-stat">
          <span className="tool-stat-value tool-stat-accent">
            {result?.sharedNames.length ?? 0}
          </span>
          <span className="tool-stat-label">Shared script names</span>
        </div>
      </div>

      <div className="tool-actions-bar">
        <div className="tool-search">
          <Search size={14} className="tool-search-icon" />
          <input
            className="tool-search-input"
            placeholder="Search scripts across all projects... (try: seed, migrate, test)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="tool-actions-spacer" />
        <button className="tool-btn" onClick={() => refresh()} disabled={isLoading}>
          <RefreshCw size={13} className={isLoading ? "tool-spinner" : ""} />
          <span>Re-index</span>
        </button>
      </div>

      {result && result.sharedNames.length > 0 && !query && (
        <div className="script-chip-row">
          <span className="script-chip-label">Common across projects:</span>
          {result.sharedNames.slice(0, 10).map((name) => (
            <button key={name} className="script-chip" onClick={() => setQuery(name)}>
              {name}
            </button>
          ))}
        </div>
      )}

      {visible.length === 0 ? (
        <p className="tool-note">No scripts match "{query}".</p>
      ) : (
        <div className="tool-list">
          {grouped.map(([projectId, group]) => (
            <div key={projectId} className="script-group">
              <div className="script-group-header">
                <span className="script-group-name">{group.name}</span>
                <span className="script-group-count">
                  {group.items.length} script{group.items.length === 1 ? "" : "s"}
                </span>
              </div>

              {group.items.map((script) => {
                const key = `${script.projectId}:${script.scriptName}`;
                return (
                  <div key={key} className="script-row">
                    <div className="script-body">
                      <div className="script-heading">
                        <span className="script-name">{script.scriptName}</span>
                        <span className="script-runner">{script.runCommand}</span>
                      </div>
                      <code className="script-source" title={script.scriptBody}>
                        {script.scriptBody}
                      </code>
                    </div>

                    <button
                      className="tool-btn script-run-btn"
                      onClick={() => handleRun(script)}
                      disabled={!script.pathExists || runningKey === key}
                      title={
                        script.pathExists
                          ? `Run ${script.runCommand} in ${script.projectName}`
                          : "The project folder is missing"
                      }
                    >
                      <Play size={12} />
                      <span>{runningKey === key ? "Starting..." : "Run"}</span>
                    </button>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ScriptsTab;
