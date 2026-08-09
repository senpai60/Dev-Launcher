import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Info, X } from "lucide-react";
import "./toast.css";

export type ToastVariant = "success" | "error" | "info";

export type Toast = {
  id: number;
  variant: ToastVariant;
  title: string;
  detail?: string;
  /** Optional inline action, e.g. "Configure editor". */
  actionLabel?: string;
  onAction?: () => void;
};

type ToastContextValue = {
  notify: (toast: Omit<Toast, "id">) => void;
  success: (title: string, detail?: string) => void;
  error: (title: string, detail?: string) => void;
  info: (title: string, detail?: string) => void;
  dismiss: (id: number) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const AUTO_DISMISS_MS: Record<ToastVariant, number> = {
  success: 3000,
  info: 4000,
  // Errors stay until dismissed -- they usually need reading.
  error: 8000,
};

let nextId = 1;

export const ToastProvider = ({ children }: { children: React.ReactNode }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const notify = useCallback(
    (toast: Omit<Toast, "id">) => {
      const id = nextId++;
      setToasts((prev) => [...prev.slice(-3), { ...toast, id }]);
      window.setTimeout(() => dismiss(id), AUTO_DISMISS_MS[toast.variant]);
    },
    [dismiss],
  );

  const value = useMemo<ToastContextValue>(
    () => ({
      notify,
      dismiss,
      success: (title, detail) => notify({ variant: "success", title, detail }),
      error: (title, detail) => notify({ variant: "error", title, detail }),
      info: (title, detail) => notify({ variant: "info", title, detail }),
    }),
    [notify, dismiss],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-stack" role="status" aria-live="polite">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast toast-${toast.variant}`}>
            <span className="toast-icon">
              {toast.variant === "success" && <CheckCircle2 size={16} />}
              {toast.variant === "error" && <AlertTriangle size={16} />}
              {toast.variant === "info" && <Info size={16} />}
            </span>

            <div className="toast-text">
              <span className="toast-title">{toast.title}</span>
              {toast.detail && <span className="toast-detail">{toast.detail}</span>}
              {toast.actionLabel && toast.onAction && (
                <button
                  className="toast-action"
                  onClick={() => {
                    toast.onAction?.();
                    dismiss(toast.id);
                  }}
                >
                  {toast.actionLabel}
                </button>
              )}
            </div>

            <button
              className="toast-close"
              onClick={() => dismiss(toast.id)}
              aria-label="Dismiss notification"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

/**
 * Always returns a usable object so callers never have to null-check.
 * Falls back to console logging if used outside the provider.
 */
export const useToast = (): ToastContextValue => {
  const ctx = useContext(ToastContext);
  if (ctx) return ctx;

  const fallback = (title: string, detail?: string) => console.warn(title, detail ?? "");
  return {
    notify: ({ title, detail }) => fallback(title, detail),
    success: fallback,
    error: fallback,
    info: fallback,
    dismiss: () => {},
  };
};

/** Normalises an IPC rejection into something worth showing a user. */
export function describeError(e: unknown): string {
  if (e instanceof Error) {
    // Electron prefixes IPC rejections with the handler frame; strip it.
    return e.message.replace(/^Error invoking remote method '[^']+':\s*(Error:\s*)?/, "");
  }
  return String(e);
}
