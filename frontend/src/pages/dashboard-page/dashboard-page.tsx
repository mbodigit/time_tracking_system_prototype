import { useEffect, useState } from "react";
import { getMe } from "../../api/auth";
import { ApiError } from "../../api/client";
import type { CurrentUser } from "../../utils/auth";

export const DashboardPage = () => {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getMe();
        setUser(data.user);
      } catch (error) {
        setErrorMessage(
          error instanceof ApiError
            ? error.message
            : "Ismeretlen hiba történt.",
        );
      }
    };

    load();
  }, []);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Áttekintő</h1>

      {errorMessage && (
        <div className="alert alert-error text-sm py-2">
          <span>{errorMessage}</span>
        </div>
      )}

      {user && (
        <div className="card bg-base-200 max-w-md">
          <div className="card-body space-y-1">
            <p>
              <span className="font-semibold">Név:</span> {user.fullName}
            </p>
            <p>
              <span className="font-semibold">Felhasználónév:</span>{" "}
              {user.username}
            </p>
            <p>
              <span className="font-semibold">Szerepkör:</span> {user.role}
            </p>
            <p>
              <span className="font-semibold">Dolgozói azonosító:</span>{" "}
              {user.employeeId}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
