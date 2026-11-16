import { useEffect, useState } from "react";
import {
  isClosedByUser,
  subscribeToasts,
  TOAST_VISIBLE_MS,
  type Toast,
  type ToastKind,
} from "../../utils/toast";
import { GhostButton } from "../../components/button/button";

const KIND_CLASS: Record<ToastKind, string> = {
  success: "alert-success",
  info: "alert-info",
  error: "alert-error",
};

export const ToastHost = () => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const close = (id: number) =>
    setToasts((current) => current.filter((item) => item.id !== id));

  useEffect(
    () =>
      subscribeToasts((toast) => {
        setToasts((current) => [...current, toast]);

        if (isClosedByUser(toast.kind)) {
          return;
        }

        window.setTimeout(() => close(toast.id), TOAST_VISIBLE_MS);
      }),
    [],
  );

  if (toasts.length === 0) {
    return null;
  }

  return (
    <div className="toast toast-end toast-bottom z-[100] max-w-md print:hidden">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role="status"
          className={`alert py-2 text-sm shadow-lg ${KIND_CLASS[toast.kind]}`}
        >
          <span>{toast.message}</span>
          <GhostButton
            type="button" size="xs"
            onClick={() => close(toast.id)}
          >
            ✕
          </GhostButton>
        </div>
      ))}
    </div>
  );
};
