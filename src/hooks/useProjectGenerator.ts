import { useCallback, useRef, useState } from "react";
import type { GeneratorProgress, GeneratorRequest, GeneratorResult } from "../../types/generator";

export type GeneratorState =
  | { phase: "idle" }
  | { phase: "running"; logs: GeneratorProgress[] }
  | { phase: "done"; result: GeneratorResult; logs: GeneratorProgress[] }
  | { phase: "error"; message: string; logs: GeneratorProgress[] };

/**
 * React hook that drives the project generator modal.
 *
 * It subscribes to real-time `generator:progress` events from the main process
 * and exposes a `generate` action that the modal triggers on submit.
 */
export function useProjectGenerator() {
  const [state, setState] = useState<GeneratorState>({ phase: "idle" });
  const unsubRef = useRef<(() => void) | null>(null);

  const generate = useCallback(async (request: GeneratorRequest): Promise<void> => {
    const api = window.api?.generatorAPI;
    if (!api) {
      setState({ phase: "error", message: "Generator API not available.", logs: [] });
      return;
    }

    // Collect logs so they survive the transition to `done`.
    const logs: GeneratorProgress[] = [];

    setState({ phase: "running", logs });

    // Subscribe to live progress before calling create so we never miss the
    // first event.
    unsubRef.current?.();
    unsubRef.current = api.onProgress((progress) => {
      logs.push(progress);
      setState({ phase: "running", logs: [...logs] });
    });

    try {
      const result = await api.create(request);
      setState({ phase: "done", result, logs: [...logs] });
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      setState({ phase: "error", message, logs: [...logs] });
    } finally {
      unsubRef.current?.();
      unsubRef.current = null;
    }
  }, []);

  const reset = useCallback(() => {
    unsubRef.current?.();
    unsubRef.current = null;
    setState({ phase: "idle" });
  }, []);

  return { state, generate, reset };
}
