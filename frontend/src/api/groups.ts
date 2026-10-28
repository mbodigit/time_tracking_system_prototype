import { apiGet, apiPost, apiPatch, apiDelete } from "./client";

export interface Group {
  id: number;
  name: string;
  status: string;
  description: string | null;
  areaId: number | null;
  areaName: string | null;
  departmentId: number | null;
  departmentName: string | null;
  shiftId: number | null;
  shiftName: string | null;
  costCenterId: number | null;
  costCenterName: string | null;
  workScheduleId: number | null;
  workScheduleName: string | null;
  workingHourId: number | null;
  workingHourNum: number | null;
  coreHourId: number | null;
  coreHourName: string | null;
  managerId: number | null;
  managerName: string | null;
  activeEmployees: number;
}

export interface Option {
  id: number;
  name: string;
}

export interface DependentOption extends Option {
  areaId?: number;
  departmentId?: number;
}

export interface GroupOptions {
  areas: Option[];
  departments: DependentOption[];
  shifts: DependentOption[];
  costCenters: Option[];
  workSchedules: Option[];
  workingHours: Option[];
  coreHours: Option[];
  managers: Option[];
}

export interface GroupPayload {
  name: string;
  status: string;
  description?: string;
  areaId: number | null;
  departmentId: number | null;
  shiftId: number | null;
  costCenterId: number | null;
  workScheduleId: number | null;
  workingHourId: number | null;
  coreHourId: number | null;
  managerId: number | null;
}

export interface AssignableEmployee {
  id: number;
  code: string;
  name: string;
  groupId: number | null;
  groupName: string | null;
  categoryName: string | null;
  workScheduleName: string | null;
}

export const listGroups = () => apiGet<{ groups: Group[] }>("/groups");

export const listGroupOptions = () => apiGet<GroupOptions>("/groups/options");

export const createGroup = (payload: GroupPayload) =>
  apiPost<{ message: string; id: number }>("/groups", payload);

export const updateGroup = (id: number, payload: GroupPayload) =>
  apiPatch<{ message: string }>(`/groups/${id}`, payload);

export const deleteGroup = (id: number) =>
  apiDelete<{ message: string }>(`/groups/${id}`);

export const listAssignableEmployees = () =>
  apiGet<{ employees: AssignableEmployee[] }>("/groups/members");

export const updateGroupMembers = (
  id: number,
  payload: { add: number[]; remove: number[] },
) => apiPatch<{ message: string }>(`/groups/${id}/members`, payload);