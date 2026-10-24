import { apiGet, apiPost, apiPatch, apiDelete } from "./client";

export type OrgEntity = "areas" | "departments" | "shifts";

export interface OrgManager {
  id: number;
  name: string;
}

export interface OrgShift {
  id: number;
  name: string;
  departmentId: number;
  managerId: number | null;
  managerName: string | null;
}

export interface OrgDepartment {
  id: number;
  name: string;
  areaId: number;
  managerId: number | null;
  managerName: string | null;
  shifts: OrgShift[];
}

export interface OrgArea {
  id: number;
  name: string;
  managerId: number | null;
  managerName: string | null;
  departments: OrgDepartment[];
}

export interface OrgTree {
  areas: OrgArea[];
  managers: OrgManager[];
}

export const listOrg = () => apiGet<OrgTree>("/org");

export const createUnit = (
  entity: OrgEntity,
  payload: { name: string; parentId?: number; managerId: number | null },
) => apiPost<{ message: string; id: number }>(`/org/${entity}`, payload);

export const updateUnit = (
  entity: OrgEntity,
  id: number,
  payload: { name: string; managerId: number | null },
) => apiPatch<{ message: string }>(`/org/${entity}/${id}`, payload);

export const deleteUnit = (entity: OrgEntity, id: number) =>
  apiDelete<{ message: string }>(`/org/${entity}/${id}`);