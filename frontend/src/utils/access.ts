import { getCurrentUser } from "./auth";

export const PAGE_PERMISSION: Record<string, string> = {
  "/dashboard": "dashboard",
  "/time-log": "time_log",
  "/requests": "requests",
  "/reports": "reports",
  "/admin-employees": "employees",
  "/admin-org-structure": "organisation",
  "/admin-master-data": "master_data",
  "/admin-calendar": "calendar",
  "/admin-company": "company",
  "/admin-permissions": "permissions",
};

export const currentPermissions = (): string[] =>
  getCurrentUser()?.permissions ?? [];

export const hasPermission = (
  permissions: string[],
  key: string,
): boolean => permissions.includes(key);

export const hasAnyPermission = (
  permissions: string[],
  prefix: string,
): boolean =>
  permissions.some(
    (item) => item === prefix || item.startsWith(`${prefix}.`),
  );

export const canOpenPage = (permissions: string[], path: string): boolean => {
  const key = PAGE_PERMISSION[path];

  return key ? hasAnyPermission(permissions, key) : true;
};
