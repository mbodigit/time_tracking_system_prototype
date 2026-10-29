import type { ReactNode } from "react";

const SPAN_CLASS: Record<number, string> = {
  1: "",
  2: "md:col-span-2",
  3: "md:col-span-3",
};

interface FieldProps {
  label: string;
  hint?: ReactNode;
  span?: 1 | 2 | 3;
  children: ReactNode;
}

export const Field = ({ label, hint, span = 1, children }: FieldProps) => (
  <div className={`flex flex-col gap-1.5 ${SPAN_CLASS[span]}`}>
    <span className="text-sm font-medium opacity-80">{label}</span>
    <div className="[&>input]:w-full [&>select]:w-full [&>textarea]:w-full">
      {children}
    </div>
    {hint && <span className="text-xs leading-snug opacity-60">{hint}</span>}
  </div>
);

interface FormGridProps {
  columns?: 2 | 3;
  children: ReactNode;
}

export const FormGrid = ({ columns = 3, children }: FormGridProps) => (
  <div
    className={`grid gap-x-5 gap-y-4 ${
      columns === 2 ? "md:grid-cols-2" : "md:grid-cols-3"
    }`}
  >
    {children}
  </div>
);
