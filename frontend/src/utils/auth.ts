export interface CurrentUser {
  userId: number;
  username: string;
  role: string;
  employeeId: number;
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

export const isLoggedIn = (): boolean => {
  return Boolean(getToken()) && getCurrentUser() !== null;
};

export const clearSession = (): void => {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
};