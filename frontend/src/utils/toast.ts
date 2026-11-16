const VISIBLE_MS = 5000;

export type ToastKind = "success" | "info" | "error";

export interface Toast {
  id: number;
  message: string;
  kind: ToastKind;
}

type ToastListener = (toast: Toast) => void;

const listeners = new Set<ToastListener>();
let nextId = 1;

export const TOAST_VISIBLE_MS = VISIBLE_MS;

export const isClosedByUser = (kind: ToastKind) => kind === "error";

export const subscribeToasts = (listener: ToastListener) => {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
};

export const showToast = (message: string, kind: ToastKind = "success") => {
  if (!message) {
    return;
  }

  const toast: Toast = { id: nextId++, message, kind };

  listeners.forEach((listener) => listener(toast));
};
