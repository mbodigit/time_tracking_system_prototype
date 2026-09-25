import { useState } from "react";

export const LoginPage = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  return (
    <div className="min-h-screen flex items-center justify-center bg-base-200">
      <div className="card w-full max-w-sm bg-base-100 shadow-xl">
        <form className="card-body gap-4">
          <h1 className="text-2xl font-bold text-center">
            Munkaidő-nyilvántartás
          </h1>

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
