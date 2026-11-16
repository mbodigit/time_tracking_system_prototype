import type { ButtonHTMLAttributes } from "react";

type ButtonSize = "sm" | "xs";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  size?: ButtonSize;
}

const SIZE_CLASS: Record<ButtonSize, string> = {
  sm: "btn-sm",
  xs: "btn-xs",
};

const buttonClass = (variant: string, size: ButtonSize, className: string) =>
  ["btn", SIZE_CLASS[size], variant, "whitespace-nowrap", className]
    .filter(Boolean)
    .join(" ");

export const ActionButton = ({
  size = "sm",
  className = "",
  ...rest
}: ButtonProps) => (
  <button
    type="button"
    className={buttonClass("btn-primary", size, className)}
    {...rest}
  />
);

export const PlainButton = ({
  size = "sm",
  className = "",
  ...rest
}: ButtonProps) => (
  <button
    type="button"
    className={buttonClass("", size, className)}
    {...rest}
  />
);

export const GhostButton = ({
  size = "sm",
  className = "",
  ...rest
}: ButtonProps) => (
  <button
    type="button"
    className={buttonClass("btn-ghost", size, className)}
    {...rest}
  />
);

export const DangerButton = ({
  size = "sm",
  className = "",
  ...rest
}: ButtonProps) => (
  <button
    type="button"
    className={buttonClass("btn-error", size, className)}
    {...rest}
  />
);

export const DeleteButton = ({
  size = "sm",
  className = "",
  ...rest
}: ButtonProps) => (
  <button
    type="button"
    className={buttonClass("btn-outline btn-error", size, className)}
    {...rest}
  />
);

export const CloseButton = ({
  className = "",
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement>) => (
  <button
    type="button"
    className={`btn btn-sm btn-ghost btn-circle ${className}`}
    aria-label="Bezárás"
    {...rest}
  >
    ✕
  </button>
);
