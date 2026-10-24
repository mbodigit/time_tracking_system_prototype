import { NavLink } from "react-router-dom";
import { getCurrentUser } from "../../utils/auth";

interface MenuItem {
  path: string;
  label: string;
  roles?: string[];
}

const MENU: MenuItem[] = [
  { path: "/dashboard", label: "Kezdőlap" },
  { path: "/time-log", label: "Rögzítés" },
  { path: "/requests", label: "Kérelmek és elrendelések" },
  { path: "/reports", label: "Riport és export", roles: ["Vezető", "HR-Bér"] },
  { path: "/admin-groups", label: "Csoportok", roles: ["Admin"] },
  { path: "/admin-calendar", label: "Központi naptár", roles: ["HR-Bér"] },
  { path: "/admin-org-structure", label: "Szervezet", roles: ["Admin"] },
];

export const AppMenu = () => {
  const user = getCurrentUser();
  const role = user?.role ?? "";

  const visible = MENU.filter(
    (item) => !item.roles || role === "Admin" || item.roles.includes(role),
  );

  return (
    <ul className="menu bg-base-200 w-60 p-4 gap-1">
      {visible.map((item) => (
        <li key={item.path}>
          <NavLink
            to={item.path}
            className={({ isActive }) => (isActive ? "active" : "")}
          >
            {item.label}
          </NavLink>
        </li>
      ))}
    </ul>
  );
};
