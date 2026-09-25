import { useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { getToken, clearSession } from "../../utils/auth";

export const ChangePasswordPage = () => {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordAgain, setNewPasswordAgain] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setErrorMessage("");

    if (newPassword !== newPasswordAgain) {
      setErrorMessage("A két új jelszó nem egyezik.");
      return;
    }

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/me/password`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${getToken()}`,
          },
          body: JSON.stringify({ currentPassword, newPassword }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        setErrorMessage(data.message);
        return;
      }

      setSuccessMessage(data.message);
      clearSession();
      setTimeout(() => navigate("/"), 2000);
    } catch {
      setErrorMessage("Nem érhető el a szerver.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-base-200">
      <div className="card w-full max-w-sm bg-base-100 shadow-xl">
        <form className="card-body gap-4" onSubmit={handleSubmit}>
          <h1 className="text-2xl font-bold text-center">Jelszócsere</h1>

          <p className="text-sm text-center opacity-70">
            Az alapértelmezett jelszót meg kell változtatnod a folytatáshoz.
          </p>

          {errorMessage && (
            <div className="alert alert-error text-sm py-2">
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="alert alert-success text-sm py-2">
              <span>{successMessage}</span>
            </div>
          )}

          <input
            className="input input-bordered w-full"
            type="password"
            placeholder="Jelenlegi jelszó"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
          />

          <input
            className="input input-bordered w-full"
            type="password"
            placeholder="Új jelszó (legalább 8 karakter)"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />

          <input
            className="input input-bordered w-full"
            type="password"
            placeholder="Új jelszó megerősítése"
            value={newPasswordAgain}
            onChange={(e) => setNewPasswordAgain(e.target.value)}
          />

          <button className="btn btn-primary w-full" type="submit">
            Jelszó módosítása
          </button>
        </form>
      </div>
    </div>
  );
};
