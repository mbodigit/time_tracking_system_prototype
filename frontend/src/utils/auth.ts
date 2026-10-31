export interface CurrentUser {
  userId: number;
  username: string;
  role: string;
  employeeId: number | null;
  fullName: string;
  mustChangePassword: boolean;
}

export const getToken = (): string | null => {
  return localStorage.getItem("token");
};

export const getCurrentUser = (): CurrentUser | null => {
  const raw = localStorage.getItem("user");
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as CurrentUser;
  } catch {
    return null;
  }
};

export const saveCurrentUser = (user: CurrentUser): void => {
  localStorage.setItem("user", JSON.stringify(user));
};

export const getLandingPath = (user: CurrentUser): string =>
  user.employeeId ? "/dashboard" : "/admin-employees";

export const isLoggedIn = (): boolean => {
  return Boolean(getToken()) && getCurrentUser() !== null;
};

export const clearSession = (): void => {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
};

export const getInitials = (fullName: string): string => {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) {
    return "?";
  }
  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase();
  }

  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
};