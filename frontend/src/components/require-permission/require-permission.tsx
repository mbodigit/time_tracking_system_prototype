import type { ReactNode } from "react";
import { currentPermissions, hasAnyPermission } from "../../utils/access";

interface Props {
  permission: string;
  children: ReactNode;
}

export const RequirePermission = ({ permission, children }: Props) => {
  if (!hasAnyPermission(currentPermissions(), permission)) {
    return (
      <div className="alert alert-error">
        <span>Ehhez az oldalhoz nincs jogosultsága.</span>
      </div>
    );
  }

  return <>{children}</>;
};
