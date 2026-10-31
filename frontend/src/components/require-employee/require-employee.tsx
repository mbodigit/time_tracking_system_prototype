import type { ReactNode } from "react";
import { getCurrentUser } from "../../utils/auth";

interface Props {
  children: ReactNode;
}

export const RequireEmployee = ({ children }: Props) => {
  const user = getCurrentUser();

  if (!user?.employeeId) {
    return (
      <div className="alert alert-warning">
        <div>
          <p className="font-semibold">
            Ehhez az oldalhoz dolgozói nyilvántartás kell.
          </p>
          <p>
            A rendszergazda fiókhoz szándékosan nem tartozik dolgozó, ezért nem
            rögzíthet munkaidőt és nem adhat le kérelmet. A fiókok és a
            törzsadatok kezelése változatlanul elérhető.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
