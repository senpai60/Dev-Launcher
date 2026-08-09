import React, { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";
import Dialog from "../Dialog/Dialog";
import Input from "../Form/Input";
import Checkbox from "../Form/Checkbox";
import { useProjectAPI } from "../../../api/api";
import type { ProjectCommand } from "../../../../types/project";
import type { CommandValidationResult } from "../../../../types/global";
import "./command.css";

export interface CommandFormDialogProps {
  isOpen: boolean;
  /** Set when editing; omit to create a new command. */
  command?: ProjectCommand | null;
  projectPath?: string;
  onClose: () => void;
  onSubmit: (values: Partial<ProjectCommand>) => Promise<boolean>;
}

const EMPTY = { name: "", command: "", description: "", workingDirectory: "", isFavorite: false };

export const CommandFormDialog: React.FC<CommandFormDialogProps> = ({
  isOpen,
  command,
  projectPath,
  onClose,
  onSubmit,
}) => {
  const api = useProjectAPI();
  const [values, setValues] = useState(EMPTY);
  const [validation, setValidation] = useState<CommandValidationResult | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const isEditing = Boolean(command);

  useEffect(() => {
    if (!isOpen) return;
    setValues(
      command
        ? {
            name: command.name,
            command: command.command,
            description: command.description ?? "",
            workingDirectory: command.workingDirectory ?? "",
            isFavorite: command.isFavorite,
          }
        : EMPTY,
    );
    setValidation(null);
  }, [isOpen, command]);

  // Live validation so the destructive warning appears while typing rather
  // than only on save.
  useEffect(() => {
    if (!isOpen || !values.command.trim()) {
      setValidation(null);
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(async () => {
      try {
        const result = await api.validateCommand(
          {
            name: values.name,
            command: values.command,
            workingDirectory: values.workingDirectory || undefined,
          },
          projectPath,
        );
        if (!cancelled) setValidation(result);
      } catch {
        // Validation is advisory here; save still performs the real check.
      }
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, values.name, values.command, values.workingDirectory, projectPath]);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (isSaving) return;

    setIsSaving(true);
    const ok = await onSubmit({
      name: values.name.trim(),
      command: values.command.trim(),
      description: values.description.trim() || undefined,
      workingDirectory: values.workingDirectory.trim() || undefined,
      isFavorite: values.isFavorite,
    });
    setIsSaving(false);

    if (ok) onClose();
  };

  const blockingErrors = validation?.errors ?? [];

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? "Edit Command" : "Add Command"}
      closeOnOutsideClick
      footer={
        <>
          <button
            type="button"
            className="action-btn text-button"
            style={{ padding: "8px 16px" }}
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            className="primary-action-btn text-button"
            onClick={() => handleSubmit()}
            disabled={isSaving}
          >
            {isSaving ? "Saving..." : isEditing ? "Save Changes" : "Save Command"}
          </button>
        </>
      }
    >
      <form onSubmit={handleSubmit}>
        <Input
          label="Command Name"
          placeholder="e.g. Start Dev Server, Build, Test"
          value={values.name}
          onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))}
          required
        />

        <Input
          label="Command"
          placeholder="e.g. npm run dev"
          value={values.command}
          onChange={(e) => setValues((v) => ({ ...v, command: e.target.value }))}
          required
        />

        <Input
          label="Working Directory (Optional)"
          placeholder="Relative to the project root, e.g. server"
          value={values.workingDirectory}
          onChange={(e) => setValues((v) => ({ ...v, workingDirectory: e.target.value }))}
        />

        <Input
          label="Description (Optional)"
          placeholder="e.g. Launch the local Vite dev server"
          value={values.description}
          onChange={(e) => setValues((v) => ({ ...v, description: e.target.value }))}
        />

        <Checkbox
          label="Pin to favorites"
          checked={values.isFavorite}
          onChange={(checked) => setValues((v) => ({ ...v, isFavorite: checked }))}
        />

        {blockingErrors.length > 0 && (
          <div className="command-form-alert command-form-alert-error">
            <AlertTriangle size={14} />
            <div>
              {blockingErrors.map((error: string) => (
                <span key={error}>{error}</span>
              ))}
            </div>
          </div>
        )}

        {validation?.requiresConfirmation && blockingErrors.length === 0 && (
          <div className="command-form-alert command-form-alert-warning">
            <AlertTriangle size={14} />
            <div>
              <strong>This command {validation.destructiveReason}.</strong>
              <span>You'll be asked to confirm each time it runs.</span>
            </div>
          </div>
        )}
      </form>
    </Dialog>
  );
};

export default CommandFormDialog;
