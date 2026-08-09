import React, { useEffect, useRef, useState } from "react";
import {
  CheckCircle2,
  Code2,
  Cpu,
  FolderOpen,
  Globe,
  Server,
  Terminal,
  X,
  Zap,
} from "lucide-react";
import { useProjectGenerator } from "../../../hooks/useProjectGenerator";
import { SCAFFOLD_TEMPLATES } from "../../../../types/generator";
import type { GeneratorProgress, TemplateId, TemplateScaffoldDef } from "../../../../types/generator";
import "./generator.css";

// ---------------------------------------------------------------------------
//  Template icon map
// ---------------------------------------------------------------------------

const TEMPLATE_ICONS: Record<string, React.ReactNode> = {
  Zap:      <Zap      size={20} />,
  Globe:    <Globe    size={20} />,
  Server:   <Server   size={20} />,
  Cpu:      <Cpu      size={20} />,
  Terminal: <Terminal size={20} />,
};

// ---------------------------------------------------------------------------
//  Prop types
// ---------------------------------------------------------------------------

interface ProjectGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Called once the project has been indexed so the list can refresh. */
  onProjectCreated?: (projectId: string) => void;
}

// ---------------------------------------------------------------------------
//  Helper: auto-scroll terminal to bottom
// ---------------------------------------------------------------------------

function useAutoScroll(deps: unknown[]) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return ref;
}

// ---------------------------------------------------------------------------
//  Component
// ---------------------------------------------------------------------------

const WIZARD_STEPS = ["Template", "Configure", "Generating"] as const;
type WizardStep = (typeof WIZARD_STEPS)[number];

const ProjectGeneratorModal: React.FC<ProjectGeneratorModalProps> = ({
  isOpen,
  onClose,
  onProjectCreated,
}) => {
  const { state, generate, reset } = useProjectGenerator();

  // Wizard navigation
  const [wizardStep, setWizardStep] = useState<WizardStep>("Template");

  // Template selection
  const [selectedTemplateId, setSelectedTemplateId] = useState<TemplateId>("react-vite");

  // Config fields
  const [projectName, setProjectName] = useState("");
  const [targetPath, setTargetPath] = useState("");
  const [variant, setVariant] = useState<"ts" | "js">("ts");
  const [gitInit, setGitInit] = useState(true);
  const [installDeps, setInstallDeps] = useState(true);
  const [packageManager, setPackageManager] = useState<"npm" | "pnpm" | "yarn" | "bun">("npm");
  const [configError, setConfigError] = useState("");

  const selectedTemplate: TemplateScaffoldDef =
    SCAFFOLD_TEMPLATES.find((t) => t.id === selectedTemplateId) ?? SCAFFOLD_TEMPLATES[0];

  // Accumulate all log lines for the terminal view
  const [allLogs, setAllLogs] = useState<GeneratorProgress[]>([]);
  const terminalRef = useAutoScroll([allLogs]);

  // Keep allLogs in sync with state.logs when running
  useEffect(() => {
    if (state.phase === "running") {
      setAllLogs(state.logs);
    } else if (state.phase === "done" || state.phase === "error") {
      setAllLogs(state.logs);
    }
  }, [state]);

  // Track the last progress event for the status bar
  const lastProgress: GeneratorProgress | null =
    allLogs.length > 0 ? allLogs[allLogs.length - 1] : null;

  const overallPct = lastProgress?.percentage ?? 0;

  // ---- Handle open/close ------------------------------------------------

  useEffect(() => {
    if (isOpen) {
      setWizardStep("Template");
      setSelectedTemplateId("react-vite");
      setProjectName("");
      setTargetPath("");
      setVariant("ts");
      setGitInit(true);
      setInstallDeps(true);
      setPackageManager("npm");
      setConfigError("");
      setAllLogs([]);
      reset();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // When generation completes, notify parent and advance to success view
  useEffect(() => {
    if (state.phase === "done" && state.result?.projectId) {
      onProjectCreated?.(state.result.projectId);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.phase]);

  // ---- Close handler -------------------------------------------------------

  const handleClose = () => {
    if (state.phase === "running") return; // can't close while running
    reset();
    onClose();
  };

  // ---- Folder picker -------------------------------------------------------

  const handlePickFolder = async () => {
    const result = await window.api?.systemAPI?.selectFolder(targetPath || undefined);
    if (result) setTargetPath(result.path);
  };

  // ---- Wizard navigation --------------------------------------------------

  const handleNext = () => {
    if (wizardStep === "Template") {
      setWizardStep("Configure");
      return;
    }

    if (wizardStep === "Configure") {
      const name = projectName.trim();
      if (!name) {
        setConfigError("Project name is required.");
        return;
      }
      if (!/^[A-Za-z0-9._-]+$/.test(name)) {
        setConfigError("Name can only contain letters, numbers, dots, dashes, underscores.");
        return;
      }
      if (!targetPath.trim()) {
        setConfigError("Choose a destination folder.");
        return;
      }
      setConfigError("");
      setWizardStep("Generating");

      void generate({
        templateId: selectedTemplateId,
        name,
        targetPath: targetPath.trim(),
        variant,
        gitInit,
        installDeps,
        openEditor: false,
        packageManager,
      });
    }
  };

  const handleBack = () => {
    if (wizardStep === "Configure") setWizardStep("Template");
    if (wizardStep === "Generating" && state.phase === "error") {
      reset();
      setWizardStep("Configure");
    }
  };

  // ---- Render helpers ------------------------------------------------------

  const stepIndex = WIZARD_STEPS.indexOf(wizardStep);

  if (!isOpen) return null;

  const isDone  = state.phase === "done";
  const isError = state.phase === "error";
  const isRunning = state.phase === "running";

  // ---- Template selection step --------------------------------------------

  const renderTemplateStep = () => (
    <>
      <div className="gen-section-title">Choose a template</div>
      <div className="gen-template-grid">
        {SCAFFOLD_TEMPLATES.map((tpl) => (
          <button
            key={tpl.id}
            className={`gen-template-card${selectedTemplateId === tpl.id ? " selected" : ""}`}
            onClick={() => setSelectedTemplateId(tpl.id)}
          >
            <span
              className={`gen-category-badge ${tpl.category}`}
            >
              {tpl.category}
            </span>
            <div className="gen-template-icon">
              {TEMPLATE_ICONS[tpl.icon] ?? <Zap size={20} />}
            </div>
            <div className="gen-template-name">{tpl.name}</div>
            <div className="gen-template-desc">{tpl.description}</div>
            {tpl.tags && tpl.tags.length > 0 && (
              <div className="gen-template-tags">
                {tpl.tags.map((tag) => (
                  <span key={tag} className="gen-template-tag">{tag}</span>
                ))}
              </div>
            )}
          </button>
        ))}
      </div>
    </>
  );

  // ---- Config step --------------------------------------------------------

  const renderConfigStep = () => (
    <>
      <div className="gen-section-title">Configure your project</div>
      {configError && (
        <div className="gen-error-banner">
          <X size={14} />
          {configError}
        </div>
      )}
      <div className="gen-config-grid">
        <div className="gen-field full-width">
          <label className="gen-label">Project Name</label>
          <input
            className="gen-input"
            placeholder={`e.g. ${selectedTemplate.name.toLowerCase().replace(/\s+/g, "-")}-app`}
            value={projectName}
            onChange={(e) => {
              setProjectName(e.target.value);
              if (e.target.value) setConfigError("");
            }}
            autoFocus
          />
        </div>

        <div className="gen-field full-width">
          <label className="gen-label">Destination Folder</label>
          <div className="gen-folder-row">
            <input
              className="gen-input"
              placeholder="Select a parent folder…"
              value={targetPath}
              onChange={(e) => {
                setTargetPath(e.target.value);
                if (e.target.value) setConfigError("");
              }}
              readOnly
            />
            <button className="gen-folder-btn" onClick={handlePickFolder} title="Browse">
              <FolderOpen size={16} />
            </button>
          </div>
          {targetPath && projectName && (
            <div style={{ fontSize: "var(--text-xs)", color: "var(--text-tertiary)", fontFamily: "var(--font-mono)", marginTop: 4 }}>
              → {targetPath}/{projectName}
            </div>
          )}
        </div>

        {selectedTemplate.supportedVariants.length > 1 && (
          <div className="gen-field">
            <label className="gen-label">Language</label>
            <select
              className="gen-select"
              value={variant}
              onChange={(e) => setVariant(e.target.value as "ts" | "js")}
            >
              <option value="ts">TypeScript</option>
              <option value="js">JavaScript</option>
            </select>
          </div>
        )}

        <div className="gen-field">
          <label className="gen-label">Package Manager</label>
          <select
            className="gen-select"
            value={packageManager}
            onChange={(e) => setPackageManager(e.target.value as "npm" | "pnpm" | "yarn" | "bun")}
          >
            <option value="npm">npm</option>
            <option value="pnpm">pnpm</option>
            <option value="yarn">yarn</option>
            <option value="bun">bun</option>
          </select>
        </div>

        <div className="gen-field full-width">
          <div className="gen-toggles">
            <label className="gen-toggle-label">
              <input
                type="checkbox"
                checked={gitInit}
                onChange={(e) => setGitInit(e.target.checked)}
              />
              Initialize git repository
            </label>
            <label className="gen-toggle-label">
              <input
                type="checkbox"
                checked={installDeps}
                onChange={(e) => setInstallDeps(e.target.checked)}
              />
              Install dependencies
            </label>
          </div>
        </div>
      </div>
    </>
  );

  // ---- Generating step ----------------------------------------------------

  const renderGeneratingStep = () => {
    if (isDone) {
      const result = (state as { phase: "done"; result: import("../../../../types/generator").GeneratorResult; logs: GeneratorProgress[] }).result;
      return (
        <div className="gen-success">
          <div className="gen-success-icon">✓</div>
          <div className="gen-success-title">{projectName} is ready!</div>
          {result.projectPath && (
            <div className="gen-success-path">{result.projectPath}</div>
          )}
          {result.warnings && result.warnings.length > 0 && (
            <div className="gen-success-warning">
              ⚠ {result.warnings.join(" · ")}
            </div>
          )}
          <div className="gen-success-actions">
            <button
              className="gen-btn gen-btn-success"
              onClick={() => {
                if (result.projectId) {
                  window.api?.projectAPI?.launch(result.projectId, "vscode");
                }
                handleClose();
              }}
            >
              <Code2 size={14} />
              Open in VS Code
            </button>
            <button
              className="gen-btn gen-btn-ghost"
              onClick={handleClose}
            >
              View in Collection
            </button>
          </div>
        </div>
      );
    }

    if (isError) {
      const errMsg = (state as { phase: "error"; message: string; logs: GeneratorProgress[] }).message;
      return (
        <>
          <div className="gen-error-banner">
            <X size={14} />
            {errMsg}
          </div>
          <TerminalView logs={allLogs} terminalRef={terminalRef} />
        </>
      );
    }

    // Running
    return (
      <>
        {lastProgress && (
          <div className="gen-running-status">
            <div className="gen-spinner" />
            <span className="gen-running-msg">{lastProgress.message}</span>
            <span className="gen-running-pct">{overallPct}%</span>
          </div>
        )}
        <TerminalView logs={allLogs} terminalRef={terminalRef} />
      </>
    );
  };

  return (
    <div className="gen-overlay" onMouseDown={(e) => e.target === e.currentTarget && !isRunning && handleClose()}>
      <div className="gen-modal" role="dialog" aria-modal="true" aria-label="Project Generator">
        {/* Header */}
        <div className="gen-header">
          <div className="gen-header-left">
            <div className="gen-header-icon">
              <Zap size={18} />
            </div>
            <div>
              <div className="gen-header-title">Instant Project Generator</div>
              <div className="gen-header-sub">
                {wizardStep === "Template"   && "Pick a scaffold template"}
                {wizardStep === "Configure"  && `Configuring "${selectedTemplate.name}" project`}
                {wizardStep === "Generating" && (isDone ? "Project created!" : isError ? "Generation failed" : "Creating your project…")}
              </div>
            </div>
          </div>
          <button className="gen-close-btn" onClick={handleClose} disabled={isRunning}>
            <X size={16} />
          </button>
        </div>

        {/* Progress bar */}
        <div className="gen-progress-bar-track">
          <div
            className="gen-progress-bar-fill"
            style={{
              width: wizardStep === "Template"
                ? "0%"
                : wizardStep === "Configure"
                  ? "33%"
                  : isDone
                    ? "100%"
                    : `${Math.max(33, overallPct)}%`,
            }}
          />
        </div>

        {/* Body */}
        <div className="gen-body">
          {wizardStep === "Template"   && renderTemplateStep()}
          {wizardStep === "Configure"  && renderConfigStep()}
          {wizardStep === "Generating" && renderGeneratingStep()}
        </div>

        {/* Footer */}
        <div className="gen-footer">
          <div className="gen-steps">
            {WIZARD_STEPS.map((s, i) => (
              <div
                key={s}
                className={`gen-step-dot${i === stepIndex ? " active" : i < stepIndex ? " done" : ""}`}
                title={s}
              />
            ))}
          </div>

          {/* Cancel / Back */}
          {(wizardStep === "Configure" || (wizardStep === "Generating" && isError)) && (
            <button className="gen-btn gen-btn-ghost" onClick={handleBack}>
              ← Back
            </button>
          )}

          {wizardStep === "Generating" && isDone && (
            <button className="gen-btn gen-btn-ghost" onClick={handleClose}>
              Close
            </button>
          )}

          {/* Primary action */}
          {wizardStep !== "Generating" && (
            <button
              className="gen-btn gen-btn-primary"
              onClick={handleNext}
              disabled={isRunning}
            >
              {wizardStep === "Template"  && "Next →"}
              {wizardStep === "Configure" && (
                <>
                  <CheckCircle2 size={14} />
                  Generate Project
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
//  Terminal log sub-component
// ---------------------------------------------------------------------------

interface TerminalViewProps {
  logs: GeneratorProgress[];
  terminalRef: React.RefObject<HTMLDivElement>;
}

const TerminalView: React.FC<TerminalViewProps> = ({ logs, terminalRef }) => (
  <div className="gen-terminal">
    <div className="gen-terminal-bar">
      <div className="gen-terminal-dot red" />
      <div className="gen-terminal-dot yellow" />
      <div className="gen-terminal-dot green" />
      <span className="gen-terminal-title">Generator Output</span>
    </div>
    <div className="gen-terminal-body" ref={terminalRef}>
      {logs.length === 0 && (
        <div className="gen-log-line" style={{ color: "var(--text-tertiary)" }}>
          Starting…
        </div>
      )}
      {logs.map((log, i) => (
        <React.Fragment key={i}>
          {log.message && (
            <div className="gen-log-line step">
              › {log.message}
            </div>
          )}
          {log.logLine && (
            <div className={`gen-log-line${log.step === "failed" || log.step === "error" ? " error" : ""}`}>
              {log.logLine}
            </div>
          )}
        </React.Fragment>
      ))}
    </div>
  </div>
);

export default ProjectGeneratorModal;
