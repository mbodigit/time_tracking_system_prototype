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
import {
  IconDashboard,
  IconClock,
  IconInbox,
  IconChart,
  IconUserCog,
  IconOrgChart,
  IconCalendar,
  IconKey,
  IconBuilding,
  IconShield,
  IconLogout,
  IconMenu,
} from "../icons/icons";

interface MenuItem {
  to: string;
  label: string;
  shortLabel?: string;
  icon: React.FC<{ className?: string }>;
  needsEmployee?: boolean;
}

interface MenuSection {
  title: string;
  items: MenuItem[];
}

const APPLICATION_NAME = "Munkaidő-nyilvántartó rendszer";
const SIDEBAR_STORAGE_KEY = "sidebarOpen";
const DESKTOP_QUERY = "(min-width: 1024px)";

const MENU_SECTIONS: MenuSection[] = [
  {
    title: "Saját pult",
    items: [
      {
        to: "/dashboard",
        label: "Áttekintő",
        icon: IconDashboard,
        needsEmployee: true,
      },
    ],
  },
  {
    title: "Rögzítés",
    items: [
      {
        to: "/time-log",
        label: "Munkaidő rögzítése",
        shortLabel: "Munkaidő",
        icon: IconClock,
        needsEmployee: true,
      },
      {
        to: "/requests",
        label: "Kérelmek és elrendelések",
        shortLabel: "Kérelmek",
        icon: IconInbox,
        needsEmployee: true,
      },
    ],
  },
  {
    title: "Kimutatások",
    items: [
      {
        to: "/reports",
        label: "Riport és export",
        shortLabel: "Riport",
        icon: IconChart,
        needsEmployee: true,
      },
    ],
  },
  {
    title: "Rendszer",
    items: [
      {
        to: "/admin-employees",
        label: "Dolgozók és fiókok",
        icon: IconUserCog,
      },
      {
        to: "/admin-org-structure",
        label: "Szervezet és csoportok",
        icon: IconOrgChart,
      },
      {
        to: "/admin-master-data",
        label: "Törzsadatok",
        icon: IconKey,
      },
      {
        to: "/admin-calendar",
        label: "Központi naptár",
        icon: IconCalendar,
        needsEmployee: true,
      },
      {
        to: "/admin-company",
        label: "Vállalati adatok",
        icon: IconBuilding,
      },
      {
        to: "/admin-permissions",
        label: "Jogosultságok",
        icon: IconShield,
      },
    ],
  },
];

const HEADER_ROUTES = ["/dashboard", "/time-log", "/requests", "/reports"];

export const Layout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const [isDesktop, setIsDesktop] = useState(
    () =>
      typeof window !== "undefined" && window.matchMedia(DESKTOP_QUERY).matches,
  );

  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    if (typeof window === "undefined") return false;
    const wide = window.matchMedia(DESKTOP_QUERY).matches;

    if (!wide) return false;
    const saved = localStorage.getItem(SIDEBAR_STORAGE_KEY);
    return saved === null ? true : saved === "true";
  });

  useEffect(() => {
    const media = window.matchMedia(DESKTOP_QUERY);
    const handleChange = (event: MediaQueryListEvent) => {
      setIsDesktop(event.matches);
      if (event.matches) {
        const saved = localStorage.getItem(SIDEBAR_STORAGE_KEY);
        setIsSidebarOpen(saved === null ? true : saved === "true");
      } else {
        setIsSidebarOpen(false);
      }
    };
    media.addEventListener("change", handleChange);
    return () => media.removeEventListener("change", handleChange);
  }, []);

  useEffect(() => {
    if (isDesktop || !isSidebarOpen) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsSidebarOpen(false);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isDesktop, isSidebarOpen]);

  const handleNavClick = () => {
    if (!isDesktop) setIsSidebarOpen(false);
  };

  const toggleSidebar = () => {
    setIsSidebarOpen((open) => {
      const next = !open;

      if (isDesktop) localStorage.setItem(SIDEBAR_STORAGE_KEY, String(next));
      return next;
    });
  };

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

  const menuSections = MENU_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter((item) => canSee(item)),
  })).filter((section) => section.items.length > 0);

  const visibleItems = menuSections.flatMap((section) => section.items);

  const headerNav = HEADER_ROUTES.map((route) =>
    visibleItems.find((item) => item.to === route),
  ).filter((item): item is MenuItem => item !== undefined);

  return (
    <div className="h-screen overflow-hidden bg-base-100 flex flex-col">
      <div className="relative w-full navbar bg-base-100 border-b border-base-300 shadow-sm z-30 flex-none">
        <div className="flex-none">
          <button
            type="button"
            onClick={toggleSidebar}
            aria-label={isSidebarOpen ? "Menü elrejtése" : "Menü megjelenítése"}
            aria-expanded={isSidebarOpen}
            title={isSidebarOpen ? "Menü elrejtése" : "Menü megjelenítése"}
            className="btn btn-square btn-ghost"
          >
            <IconMenu className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 min-w-0 px-2 mx-2 leading-tight">
          <div className="font-bold text-lg text-primary truncate">
            {APPLICATION_NAME}
          </div>
        </div>

        <nav className="hidden md:flex flex-none items-center gap-1 px-2">
          {headerNav.map((item) => {
            const Icon = item.icon;
            const active = location.pathname === item.to;
            const headerLabel = item.shortLabel ?? item.label;
            return (
              <Link
                key={item.to}
                to={item.to}
                title={headerLabel}
                aria-label={headerLabel}
                className={`flex items-center justify-center xl:justify-start gap-2 rounded-lg text-sm font-medium transition-colors
                  w-10 h-10 xl:w-auto xl:h-auto xl:px-3 xl:py-2 ${
                    active
                      ? "bg-primary/10 text-primary"
                      : "text-base-content/70 hover:bg-base-200 hover:text-base-content"
                  }`}
              >
                <Icon className="w-5.5 h-5.5 xl:w-4.5 xl:h-4.5" />
                <span className="hidden xl:inline">{headerLabel}</span>
              </Link>
            );
          })}
        </nav>

        <div className="flex-1 min-w-0" />

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
                className={`flex items-center gap-3 ${isActive("/change-password")}`}
              >
                <IconKey className="w-4.5 h-4.5" />
                <span>Jelszó módosítása</span>
              </Link>
            </li>
            <li>
              <button
                onClick={handleLogout}
                className="flex items-center gap-3 text-error hover:bg-error/10 font-medium"
              >
                <IconLogout className="w-4.5 h-4.5" />
                <span>Kijelentkezés</span>
              </button>
            </li>
          </ul>
        </div>
      </div>

      <div className="flex-1 min-h-0 flex relative">
        {!isDesktop && isSidebarOpen && (
          <div
            className="absolute inset-0 bg-black/40 z-40"
            onClick={() => setIsSidebarOpen(false)}
            aria-hidden="true"
          />
        )}

        <aside
          className={
            isDesktop
              ? `flex-none h-full overflow-hidden transition-[width] duration-200 ease-out ${
                  isSidebarOpen ? "w-72" : "w-0"
                }`
              : `absolute inset-y-0 left-0 z-50 transition-transform duration-200 ease-out ${
                  isSidebarOpen
                    ? "translate-x-0 shadow-xl"
                    : "-translate-x-full"
                }`
          }
          aria-hidden={!isSidebarOpen}
        >
          <ul className="menu p-4 w-72 h-full overflow-y-auto bg-base-100 gap-0.5 border-r border-base-300 flex-nowrap">
            {menuSections.map((section, index) => (
              <li key={section.title} className="w-full">
                {index > 0 && (
                  <div
                    className="divider my-1 pointer-events-none select-none"
                    aria-hidden="true"
                  />
                )}
                <ul className="p-0 m-0">
                  <li className="menu-title text-[11px] uppercase tracking-wider px-0">
                    {section.title}
                  </li>
                  {section.items.map((item) => {
                    const Icon = item.icon;
                    return (
                      <li key={item.to}>
                        <Link
                          to={item.to}
                          onClick={handleNavClick}
                          className={`flex items-center gap-3 ${isActive(item.to)}`}
                        >
                          <Icon className="w-4.5 h-4.5 shrink-0" />
                          <span>{item.label}</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </li>
            ))}

            <div
              className="divider mt-auto mb-1 pointer-events-none select-none"
              aria-hidden="true"
            />
            <li>
              <button
                onClick={handleLogout}
                className="flex items-center gap-3 text-error hover:bg-error/10 font-medium"
              >
                <IconLogout className="w-4.5 h-4.5 shrink-0" />
                <span>Kijelentkezés</span>
              </button>
            </li>
          </ul>
        </aside>

        <main className="flex-1 min-w-0 min-h-0 overflow-y-auto p-6 bg-base-200/40">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
