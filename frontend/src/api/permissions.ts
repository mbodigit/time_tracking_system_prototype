import { apiGet, apiPatch } from "./client";

export interface PermissionRole {
  id: number;
  name: string;
  isAdmin: boolean;
}

export interface PermissionNode {
  id: number;
  key: string;
  name: string;
  parentKey: string | null;
  isGroup: boolean;
}

export interface PermissionMatrix {
  roles: PermissionRole[];
  permissions: PermissionNode[];
  matrix: Record<string, string[]>;
}

export const listPermissions = () =>
  apiGet<PermissionMatrix>("/admin/permissions");

export const setPermission = (
  roleId: number,
  permissionId: number,
  granted: boolean,
) =>
  apiPatch<{ message: string }>("/admin/permissions", {
    roleId,
    permissionId,
    granted,
  });
