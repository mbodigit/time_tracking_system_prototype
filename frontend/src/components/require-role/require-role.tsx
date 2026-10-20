import type { ReactNode } from "react";
import { getCurrentUser } from "../../utils/auth";

interface Props {
  roles: string[];
  children: ReactNode;
}

export const RequireRole = ({ roles, children }: Props) => {
  const user = getCurrentUser();
  const role = user?.role ?? "";

  if (role !== "Admin" && !roles.includes(role)) {
    return (
      <div className="alert alert-error">
        <span>Ehhez az oldalhoz nincs jogosultsága.</span>
      </div>
    );
  }

  return <>{children}</>;
};
