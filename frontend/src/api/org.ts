import { apiGet, apiPost, apiPatch, apiDelete } from "./client";

export type OrgEntity = "areas" | "departments" | "shifts";

export interface OrgManager {
  id: number;
  name: string;
}

export interface OrgGroup {
  id: number;
  name: string;
  status: string;
  activeEmployees: number;
}

export interface OrgShift {
  id: number;
  name: string;
  departmentId: number;
  managerId: number | null;
  managerName: string | null;
  group: OrgGroup | null;
}

export interface OrgDepartment {
  id: number;
  name: string;
  areaId: number;
  managerId: number | null;
  managerName: string | null;
  group: OrgGroup | null;
  shifts: OrgShift[];
}

export interface OrgArea {
  id: number;
  name: string;
  parentId: number | null;
  managerId: number | null;
  managerName: string | null;
  group: OrgGroup | null;
  departments: OrgDepartment[];
}

export interface OrgTree {
  areas: OrgArea[];
  managers: OrgManager[];
}

export const listOrg = () => apiGet<OrgTree>("/org");

export const createUnit = (
  entity: OrgEntity,
  payload: {
    name: string;
    parentId?: number | null;
    managerId: number | null;
  },
) => apiPost<{ message: string; id: number }>(`/org/${entity}`, payload);

export const updateUnit = (
  entity: OrgEntity,
  id: number,
  payload: {
    name: string;
    parentId?: number | null;
    managerId: number | null;
  },
) => apiPatch<{ message: string }>(`/org/${entity}/${id}`, payload);

export const deleteUnit = (entity: OrgEntity, id: number) =>
  apiDelete<{ message: string }>(`/org/${entity}/${id}`);