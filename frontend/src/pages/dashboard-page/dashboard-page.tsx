import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getToken, clearSession } from "../../utils/auth";
import type { CurrentUser } from "../../utils/auth";

export const DashboardPage = () => {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const fetchMe = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/me`, {
          headers: { Authorization: `Bearer ${getToken()}` },
        });

        const data = await response.json();

        if (!response.ok) {
          setErrorMessage(data.message);
          return;
        }

        setUser(data.user);
      } catch {
        setErrorMessage("Nem érhető el a szerver.");
      }
    };

    fetchMe();
  }, []);

  const handleLogout = () => {
    clearSession();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-base-200 p-8">
      <div className="card max-w-md bg-base-100 shadow-xl">
        <div className="card-body">
          <h1 className="card-title">Áttekintő</h1>

          {errorMessage && (
            <div className="alert alert-error text-sm py-2">
              <span>{errorMessage}</span>
            </div>
          )}

          {user && (
            <div className="space-y-1">
              <p><span className="font-semibold">Név:</span> {user.fullName}</p>
              <p><span className="font-semibold">Felhasználónév:</span> {user.username}</p>
              <p><span className="font-semibold">Szerepkör:</span> {user.role}</p>
              <p><span className="font-semibold">Dolgozói azonosító:</span> {user.employeeId}</p>
            </div>
          )}

          <div className="card-actions justify-end mt-4">
            <button className="btn btn-outline" onClick={handleLogout}>
              Kijelentkezés
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};