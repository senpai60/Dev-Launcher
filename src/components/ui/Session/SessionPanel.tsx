import React, { useEffect, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Code2,
  FolderOpen,
  Globe,
  Loader2,
  Play,
  RotateCcw,
  Terminal,
  Trash2,
  X,
} from "lucide-react";
import ConfirmDialog from "../ConfirmDialog/ConfirmDialog";
import Checkbox from "../Form/Checkbox";
import { describeError, useToast } from "../Toast/ToastContext";
import { useSessionAPI } from "../../../api/api";
import type { ProjectSession, SessionStep, SessionStepKind } from "../../../../types/session";
import "./session.css";

export interface SessionPanelProps {
  projectId: string;
  projectName: string;
  /** Disabled when the project folder is missing. */
  canResume: boolean;
  isResuming: boolean;
  /** Step currently executing, for inline progress. */
  activeLabel?: string;
  onResume: () => void;
}

const STEP_ICONS: Record<SessionStepKind, React.ReactNode> = {
  editor: <Code2 size={13} />,
  command: <Play size={13} />,
  terminal: <Terminal size={13} />,
  folder: <FolderOpen size={13} />,
  url: <Globe size={13} />,
};

const DELAY_CHOICES = [0, 500, 1000, 3000, 5000, 10000];

/**
 * Resume Session panel.
 *
 * The step list builds itself from what you actually do -- opening an editor
 * or running a command records a step. This panel lets you prune, reorder, and
 * time that routine, then replay it.
 */
export const SessionPanel: React.FC<SessionPanelProps> = ({
  projectId,
  projectName,
  canResume,
  isResuming,
  activeLabel,
  onResume,
}) => {
  const api = useSessionAPI();
  const toast = useToast();

  const [session, setSession] = useState<ProjectSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [confirmClear, setConfirmClear] = useState(false);

  const load = async () => {
    setIsLoading(true);
    try {
      setSession(await api.getSession(projectId));
    } catch (e) {
      console.warn("Could not load session:", describeError(e));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  // Steps are captured in the main process as you work, so refresh when a
  // resume finishes or the project changes.
  useEffect(() => {
    if (!isResuming) void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isResuming]);

  const persist = async (steps: SessionStep[]) => {
    // Optimistic: the list is small and the write is local.
    setSession((prev) => (prev ? { ...prev, steps } : prev));
    try {
      setSession(await api.updateSession(projectId, { steps }));
    } catch (e) {
      toast.error("Could not save the session", describeError(e));
      void load();
    }
  };

  const steps = session?.steps ?? [];

  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= steps.length) return;

    const next = [...steps];
    [next[index], next[target]] = [next[target], next[index]];
    void persist(next.map((step, i) => ({ ...step, sortOrder: i })));
  };

  const toggleEnabled = (stepId: string) => {
    void persist(
      steps.map((step) => (step.id === stepId ? { ...step, enabled: !step.enabled } : step)),
    );
  };

  const setDelay = (stepId: string, delayMs: number) => {
    void persist(steps.map((step) => (step.id === stepId ? { ...step, delayMs } : step)));
  };

  const remove = (stepId: string) => {
    void persist(steps.filter((step) => step.id !== stepId));
  };

  const setAutoCapture = async (autoCapture: boolean) => {
    try {
      setSession(await api.updateSession(projectId, { autoCapture }));
    } catch (e) {
      toast.error("Could not update the session", describeError(e));
    }
  };

  const enabledCount = steps.filter((s) => s.enabled).length;

  return (
    <div className="drawer-section">
      <div className="drawer-section-header">
        <span className="drawer-section-title">
          <RotateCcw size={14} style={{ color: "var(--accent-primary)" }} />
          <span>Resume Session</span>
        </span>

        <button
          type="button"
          className="session-resume-btn"
          onClick={onResume}
          disabled={!canResume || isResuming || enabledCount === 0}
          title={
            !canResume
              ? "The project folder is missing"
              : enabledCount === 0
                ? "No steps to run yet"
                : `Replay ${enabledCount} step${enabledCount === 1 ? "" : "s"}`
          }
        >
          {isResuming ? (
            <>
              <Loader2 size={12} className="tool-spinner" />
              <span>Resuming...</span>
            </>
          ) : (
            <>
              <Play size={12} />
              <span>Resume {enabledCount > 0 ? `(${enabledCount})` : ""}</span>
            </>
          )}
        </button>
      </div>

      {isResuming && activeLabel && (
        <p className="session-active-step">Running: {activeLabel}</p>
      )}

      {isLoading ? (
        <p className="command-list-empty">Loading session...</p>
      ) : steps.length === 0 ? (
        <p className="command-list-empty">
          Nothing recorded yet. Open {projectName} in an editor and run a command — those
          actions become your resumable startup routine.
        </p>
      ) : (
        <div className="session-step-list">
          {steps.map((step, index) => (
            <div
              key={step.id}
              className={`session-step ${step.enabled ? "" : "is-disabled"}`}
            >
              <div className="session-step-order">
                <button
                  className="session-move-btn"
                  onClick={() => move(index, -1)}
                  disabled={index === 0}
                  aria-label="Move step up"
                >
                  <ChevronUp size={11} />
                </button>
                <span className="session-step-index">{index + 1}</span>
                <button
                  className="session-move-btn"
                  onClick={() => move(index, 1)}
                  disabled={index === steps.length - 1}
                  aria-label="Move step down"
                >
                  <ChevronDown size={11} />
                </button>
              </div>

              <span className="session-step-icon">{STEP_ICONS[step.kind]}</span>

              <div className="session-step-body">
                <span className="session-step-label">{step.label}</span>
                <span className="session-step-kind">{step.kind}</span>
              </div>

              <select
                className="session-delay-select"
                value={step.delayMs}
                onChange={(e) => setDelay(step.id, Number(e.target.value))}
                title="Wait before the next step"
                aria-label={`Delay after ${step.label}`}
              >
                {DELAY_CHOICES.map((ms) => (
                  <option key={ms} value={ms}>
                    {ms === 0 ? "no wait" : `${ms / 1000}s`}
                  </option>
                ))}
              </select>

              <button
                className={`session-toggle-btn ${step.enabled ? "is-on" : ""}`}
                onClick={() => toggleEnabled(step.id)}
                title={step.enabled ? "Skip this step" : "Include this step"}
                aria-pressed={step.enabled}
              >
                {step.enabled ? "On" : "Off"}
              </button>

              <button
                className="session-remove-btn"
                onClick={() => remove(step.id)}
                title="Remove step"
                aria-label={`Remove ${step.label}`}
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="session-footer">
        <Checkbox
          label="Record actions automatically"
          checked={session?.autoCapture !== false}
          onChange={setAutoCapture}
        />

        {steps.length > 0 && (
          <button className="session-clear-btn" onClick={() => setConfirmClear(true)}>
            <Trash2 size={12} />
            <span>Clear</span>
          </button>
        )}
      </div>

      <ConfirmDialog
        isOpen={confirmClear}
        isDanger
        title="Clear this session?"
        message={
          <>
            All {steps.length} recorded step{steps.length === 1 ? "" : "s"} for{" "}
            <strong>{projectName}</strong> will be removed. Your commands and project are not
            affected.
          </>
        }
        confirmLabel="Clear session"
        onCancel={() => setConfirmClear(false)}
        onConfirm={async () => {
          setConfirmClear(false);
          try {
            setSession(await api.clearSession(projectId));
            toast.success("Session cleared");
          } catch (e) {
            toast.error("Could not clear the session", describeError(e));
          }
        }}
      />
    </div>
  );
};

export default SessionPanel;
