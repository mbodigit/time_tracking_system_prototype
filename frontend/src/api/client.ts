import { clearSession, getToken } from "../utils/auth";

const BASE_URL = import.meta.env.VITE_API_URL;
const TIMEOUT_MS = 15000;

export class ApiError extends Error {
  status: number;
  isOffline: boolean;

  constructor(status: number, message: string, isOffline = false) {
    super(message);
    this.status = status;
    this.isOffline = isOffline;
  }
}

type ConnectionListener = (online: boolean) => void;

const listeners = new Set<ConnectionListener>();
let isOnline = true;

export const subscribeConnection = (listener: ConnectionListener) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

const setConnection = (online: boolean) => {
  if (isOnline === online) {
    return;
  }
  isOnline = online;
  listeners.forEach((listener) => listener(online));
};

export const pingServer = async (): Promise<boolean> => {
  try {
    await fetch(`${BASE_URL}/me`, { method: "GET" });
    setConnection(true);
    return true;
  } catch {
    return false;
  }
};

const expireSession = () => {
  clearSession();

  if (window.location.pathname !== "/") {
    window.location.replace("/");
  }
};

const request = async <T>(path: string, options: RequestInit = {}): Promise<T> => {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  const token = getToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), TIMEOUT_MS);

  let response: Response;

  try {
    response = await fetch(`${BASE_URL}${path}`, {
      ...options,
      headers,
      signal: controller.signal,
    });
  } catch (error) {
    setConnection(false);

    const timedOut = error instanceof DOMException && error.name === "AbortError";

    throw new ApiError(
      0,
      timedOut
        ? "A szerver nem válaszolt időben."
        : "Nem érhető el a szerver.",
      true,
    );
  } finally {
    window.clearTimeout(timer);
  }

  setConnection(true);

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const code = (data as { code?: string }).code;

    if (response.status === 401 || code === "INVALID_TOKEN") {
      expireSession();
    }

    throw new ApiError(
      response.status,
      (data as { message?: string }).message ?? "Ismeretlen hiba történt.",
    );
  }

  return data as T;
};

export const apiGet = <T>(path: string) => request<T>(path);

export const apiPost = <T>(path: string, body: unknown) =>
  request<T>(path, { method: "POST", body: JSON.stringify(body) });

export const apiPatch = <T>(path: string, body: unknown) =>
  request<T>(path, { method: "PATCH", body: JSON.stringify(body) });

export const apiPut = <T>(path: string, body: unknown) =>
  request<T>(path, { method: "PUT", body: JSON.stringify(body) });

export const apiDelete = <T>(path: string) =>
  request<T>(path, { method: "DELETE" });


export const apiDownload = async (
  path: string,
  fileName: string,
): Promise<void> => {
  const headers: Record<string, string> = {};
  const token = getToken();

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), TIMEOUT_MS);

  let response: Response;

  try {
    response = await fetch(`${BASE_URL}${path}`, {
      headers,
      signal: controller.signal,
    });
  } catch (error) {
    setConnection(false);

    const timedOut = error instanceof DOMException && error.name === "AbortError";

    throw new ApiError(
      0,
      timedOut
        ? "A szerver nem válaszolt időben."
        : "Nem érhető el a szerver.",
      true,
    );
  } finally {
    window.clearTimeout(timer);
  }

  setConnection(true);

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    const code = (data as { code?: string }).code;

    if (response.status === 401 || code === "INVALID_TOKEN") {
      expireSession();
    }

    throw new ApiError(
      response.status,
      (data as { message?: string }).message ?? "A fájl nem állítható elő.",
    );
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};