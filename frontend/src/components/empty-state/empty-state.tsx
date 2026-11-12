import type { ReactNode } from "react";

interface EmptyStateProps {
  message: string;
  hint?: ReactNode;
  action?: ReactNode;
}

export const EmptyState = ({ message, hint, action }: EmptyStateProps) => (
  <div className="flex flex-col items-center gap-2 py-10 px-4 text-center">
    <span className="text-base font-medium opacity-70">{message}</span>
    {hint && <span className="text-sm opacity-50 max-w-md">{hint}</span>}
    {action}
  </div>
);
