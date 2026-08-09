import { useState } from "react";
import ConfirmDialog from "../components/ui/ConfirmDialog/ConfirmDialog";
import { useProjectContext } from "../context/ProjectContext";
import type { ProjectCommand, ProjectWithStatus } from "../../types/project";

type PendingRun = {
  project: ProjectWithStatus;
  command: ProjectCommand;
  reason?: string;
};

/**
 * Centralises the Phase 5 run flow so every entry point behaves the same:
 *
 *   1. ask main whether the command is destructive
 *   2. if it is, require an explicit confirmation
 *   3. run it by id -- never by sending the command text back to main
 */
export function useCommandRunner() {
  const ctx = useProjectContext();
  const [runningCommandId, setRunningCommandId] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingRun | null>(null);

  const execute = async (
    project: ProjectWithStatus,
    command: ProjectCommand,
    confirmed: boolean,
  ) => {
    setRunningCommandId(command.id);
    try {
      await ctx?.runCommand(project.id, command.id, confirmed);
    } finally {
      setRunningCommandId(null);
    }
  };

  const requestRun = async (project: ProjectWithStatus, command: ProjectCommand) => {
    const inspection = await ctx?.inspectCommand(project.id, command.id);

    if (inspection?.requiresConfirmation) {
      setPending({ project, command, reason: inspection.destructiveReason });
      return;
    }

    await execute(project, command, false);
  };

  const confirmElement = pending ? (
    <ConfirmDialog
      isOpen
      isDanger
      title="Run destructive command?"
      message={
        <>
          <strong>{pending.command.name}</strong>
          {pending.reason ? ` ${pending.reason}.` : " may destroy work."} It will run in{" "}
          <strong>{pending.project.name}</strong>.
        </>
      }
      detail={pending.command.command}
      confirmLabel="Run anyway"
      cancelLabel="Cancel"
      onCancel={() => setPending(null)}
      onConfirm={() => {
        const target = pending;
        setPending(null);
        void execute(target.project, target.command, true);
      }}
    />
  ) : null;

  return { requestRun, runningCommandId, confirmElement };
}
