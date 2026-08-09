import { useCallback, useEffect, useState } from "react";
import { describeError, useToast } from "../components/ui/Toast/ToastContext";
import { useSessionAPI } from "../api/api";
import type { ResumeProgress, ResumeResult } from "../../types/session";

/**
 * Shared "resume this project's session" behaviour.
 *
 * Reports partial failures honestly: if two of four steps worked, the toast
 * says so rather than claiming success.
 */
export function useSessionResume(onFinished?: () => void) {
  const sessions = useSessionAPI();
  const toast = useToast();

  const [resumingProjectId, setResumingProjectId] = useState<string | null>(null);
  const [progress, setProgress] = useState<ResumeProgress | null>(null);

  useEffect(
    () => sessions.onResumeProgress((next) => setProgress(next.done ? null : next)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const resume = useCallback(
    async (projectId: string, projectName?: string): Promise<ResumeResult | null> => {
      setResumingProjectId(projectId);
      try {
        const result = await sessions.resumeSession(projectId);

        if (result.failed === 0) {
          toast.success(
            `Resumed ${result.projectName}`,
            `${result.succeeded} step${result.succeeded === 1 ? "" : "s"} ran` +
              (result.skipped > 0 ? `, ${result.skipped} skipped.` : "."),
          );
        } else {
          const firstFailure = result.steps.find((s) => s.status === "failed");
          toast.error(
            `${result.projectName} resumed with ${result.failed} problem${result.failed === 1 ? "" : "s"}`,
            firstFailure ? `${firstFailure.label}: ${firstFailure.error}` : undefined,
          );
        }

        onFinished?.();
        return result;
      } catch (e) {
        toast.error(
          projectName ? `Couldn't resume ${projectName}` : "Couldn't resume session",
          describeError(e),
        );
        return null;
      } finally {
        setResumingProjectId(null);
        setProgress(null);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [onFinished],
  );

  return { resume, resumingProjectId, progress };
}
