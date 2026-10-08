import { apiPost, apiPatch, apiGet } from "./client";
import type { CurrentUser } from "../utils/auth";

export interface LoginResponse {
  message: string;
  token: string;
  user: CurrentUser;
}

export const login = (username: string, password: string) =>
  apiPost<LoginResponse>("/login", { username, password });

export const changePassword = (currentPassword: string, newPassword: string) =>
  apiPatch<{ message: string }>("/me/password", { currentPassword, newPassword });

export const getMe = () => apiGet<{ user: CurrentUser }>("/me");