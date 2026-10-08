import { Outlet, useNavigate } from "react-router-dom";
import { getCurrentUser, clearSession } from "../../utils/auth";
import { AppMenu } from "../app-menu/app-menu";

export const AppLayout = () => {
  const user = getCurrentUser();
  const navigate = useNavigate();

  const handleLogout = () => {
    clearSession();
    navigate("/");
  };

  return (
    <div className="min-h-screen flex flex-col bg-base-100">
      <header className="navbar bg-base-300 px-4">
        <div className="flex-1 font-bold">Munkaidő-nyilvántartás</div>
        <div className="flex items-center gap-4">
          <span className="text-sm">
            {user?.fullName} <span className="opacity-60">({user?.role})</span>
          </span>
          <button className="btn btn-sm" onClick={handleLogout}>
            Kijelentkezés
          </button>
        </div>
      </header>

      <div className="flex flex-1">
        <aside className="hidden md:block">
          <AppMenu />
        </aside>
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
