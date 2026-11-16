import React, { useEffect, useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  getCurrentUser,
  getInitials,
  clearSession,
  saveCurrentUser,
} from "../../utils/auth";
import { getMe } from "../../api/auth";
import { canOpenPage } from "../../utils/access";

interface MenuItem {
  to: string;
  label: string;
  needsEmployee?: boolean;
}

const APPLICATION_NAME = "Munkaidő-nyilvántartó rendszer";

const MENU_ITEMS: MenuItem[] = [
  { to: "/dashboard", label: "Áttekintő", needsEmployee: true },
  { to: "/time-log", label: "Munkaidő rögzítése", needsEmployee: true },
  { to: "/requests", label: "Kérelmek és elrendelések", needsEmployee: true },
  { to: "/reports", label: "Riport és bérfeladás", needsEmployee: true },
  { to: "/admin-employees", label: "Dolgozók és fiókok" },
  { to: "/admin-org-structure", label: "Szervezet és csoportok" },
  { to: "/admin-master-data", label: "Törzsadatok" },
  { to: "/admin-calendar", label: "Központi naptár", needsEmployee: true },
  { to: "/admin-company", label: "Vállalati adatok" },
  { to: "/admin-permissions", label: "Jogosultságok" },
];

export const Layout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    clearSession();
    navigate("/");
  };

  const isActive = (path: string) =>
    location.pathname === path
      ? "active bg-primary/10 text-primary font-bold"
      : "";

  const [currentUser, setCurrentUser] = useState(() => getCurrentUser());

  useEffect(() => {
    getMe()
      .then((data) => {
        setCurrentUser((previous) =>
          previous && previous.fullName === data.user.fullName
            ? previous
            : data.user,
        );
        saveCurrentUser(data.user);
      })
      .catch(() => undefined);
  }, [location.pathname]);

  const role = currentUser?.role ?? "";
  const initials = currentUser ? getInitials(currentUser.fullName) : "?";

  const hasEmployee = Boolean(currentUser?.employeeId);

  const permissions = currentUser?.permissions ?? [];

  const canSee = (item: MenuItem) => {
    if (item.needsEmployee && !hasEmployee) return false;
    return canOpenPage(permissions, item.to);
  };

  const menuItems = MENU_ITEMS.filter((item) => canSee(item));

  return (
    <div className="h-screen overflow-hidden bg-base-100 flex flex-col">
      <div className="relative w-full navbar bg-base-100 border-b border-base-300 shadow-sm z-30 flex-none px-4">
        <div className="flex-1 min-w-0 leading-tight">
          <div className="font-bold text-lg text-primary truncate">
            {APPLICATION_NAME}
          </div>
        </div>

        <div className="flex-none dropdown dropdown-end">
          <div
            tabIndex={0}
            role="button"
            className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-base-200 cursor-pointer"
          >
            <span className="hidden sm:flex flex-col items-end leading-tight">
              <span className="text-sm text-base-content/70">
                {currentUser?.fullName ?? "Ismeretlen felhasználó"}
              </span>
              <span className="text-xs text-base-content/50">
                {currentUser?.username ?? ""}
              </span>
            </span>
            <div className="avatar avatar-placeholder">
              <div className="bg-primary text-primary-content w-10 rounded-full">
                <span>{initials}</span>
              </div>
            </div>
          </div>

          <ul
            tabIndex={0}
            className="dropdown-content menu bg-base-100 rounded-box z-50 w-56 p-2 shadow-lg border border-base-300 mt-2"
          >
            <li className="menu-title text-xs uppercase tracking-wider">
              {role || "Nincs bejelentkezve"}
            </li>
            <li>
              <Link
                to="/change-password"
                className={isActive("/change-password")}
              >
                Jelszó módosítása
              </Link>
            </li>
            <li>
              <button
                onClick={handleLogout}
                className="text-error hover:bg-error/10 font-medium"
              >
                Kijelentkezés
              </button>
            </li>
          </ul>
        </div>
      </div>

      <div className="flex-1 min-h-0 flex relative">

        <aside className="flex-none h-full overflow-hidden border-r border-base-300">
          <ul className="menu h-full w-max overflow-y-auto bg-base-100 gap-0.5 flex-nowrap py-4 pl-4 pr-6">
            {menuItems.map((item) => (
              <li key={item.to}>
                <Link
                  to={item.to}
                  className={`whitespace-nowrap ${isActive(item.to)}`}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </aside>

        <main className="flex-1 min-w-0 min-h-0 overflow-y-auto p-6 bg-base-200/40">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
