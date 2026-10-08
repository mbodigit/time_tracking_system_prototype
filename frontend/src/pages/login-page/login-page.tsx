import { useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { login } from "../../api/auth";
import { ApiError } from "../../api/client";

export const LoginPage = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setErrorMessage("");

    try {
      const data = await login(username, password);

      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));

      navigate(
        data.user.mustChangePassword ? "/change-password" : "/dashboard",
      );
    } catch (error) {
      setErrorMessage(
        error instanceof ApiError ? error.message : "Ismeretlen hiba történt.",
      );
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-base-200">
      <div className="card w-full max-w-sm bg-base-100 shadow-xl">
        <form className="card-body gap-4" onSubmit={handleSubmit}>
          <h1 className="text-2xl font-bold text-center">
            Munkaidő-nyilvántartás
          </h1>

          {errorMessage && (
            <div className="alert alert-error text-sm py-2">
              <span>{errorMessage}</span>
            </div>
          )}

          <input
            className="input input-bordered w-full"
            placeholder="Felhasználónév"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />

          <input
            className="input input-bordered w-full"
            type="password"
            placeholder="Jelszó"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <button className="btn btn-primary w-full" type="submit">
            Bejelentkezés
          </button>
        </form>
      </div>
    </div>
  );
};
