import { apiGet, apiPost, apiPatch, apiDelete } from "./client";

export interface AdminEmployee {
  id: number;
  code: string;
  firstName: string;
  lastName: string;
  workEmail: string | null;
  groupId: number | null;
  groupName: string | null;
  categoryId: number | null;
  categoryName: string | null;
  statusId: number | null;
  statusName: string | null;
  isActive: boolean;
  costCenterId: number | null;
  costCenterName: string | null;
  workScheduleId: number | null;
  workScheduleName: string | null;
  workingHourId: number | null;
  workingHourNum: number | null;
  coreHourId: number | null;
  coreHourName: string | null;
  breakMinutes: number | null;
  breakPaid: boolean;
  breakStart: string | null;
  breakEnd: string | null;
  annualLeaveDays: number | null;
  managerId: number | null;
  managerName: string | null;
  userId: number | null;
  username: string | null;
  userActive: boolean | null;
  userRoleId: number | null;
  userRoleName: string | null;
}

export interface AdminOption {
  id: number;
  name: string;
  isActive?: boolean;
  num?: number;
  hours?: number;
}

export interface EmployeeOptions {
  groups: AdminOption[];
  categories: AdminOption[];
  statuses: AdminOption[];
  costCenters: AdminOption[];
  workSchedules: AdminOption[];
  workingHours: AdminOption[];
  coreHours: AdminOption[];
  managers: AdminOption[];
  roles: AdminOption[];
}

export interface EmployeePayload {
  lastName: string;
  firstName: string;
  workEmail: string;
  groupId: number | null;
  categoryId: number | null;
  statusId: number | null;
  costCenterId: number | null;
  workScheduleId: number | null;
  workingHourId: number | null;
  coreHourId: number | null;
  breakMinutes: number | null;
  breakPaid: boolean;
  breakStart: string;
  breakEnd: string;
  annualLeaveDays: number | null;
  managerId: number | null;
}

export const listEmployeeAdmin = () =>
  apiGet<{ employees: AdminEmployee[] }>("/admin/employees");

export const listEmployeeOptions = () =>
  apiGet<EmployeeOptions>("/admin/employees/options");

export const createEmployee = (payload: EmployeePayload) =>
  apiPost<{ message: string; id: number; code: string }>(
    "/admin/employees",
    payload,
  );

export const updateEmployee = (id: number, payload: EmployeePayload) =>
  apiPatch<{ message: string }>(`/admin/employees/${id}`, payload);

export const createUserAccount = (employeeId: number, roleId: number) =>
  apiPost<{ message: string; id: number; username: string; password: string }>(
    `/admin/employees/${employeeId}/user`,
    { roleId },
  );

export const setUserActive = (userId: number, isActive: boolean) =>
  apiPatch<{ message: string }>(`/admin/users/${userId}`, { isActive });

export const resetUserPassword = (userId: number) =>
  apiPatch<{ message: string; password: string }>(`/admin/users/${userId}`, {
    resetPassword: true,
  });

export const deleteEmployee = (id: number) =>
  apiDelete<{ message: string }>(`/admin/employees/${id}`);

export const setUserRole = (userId: number, roleId: number) =>
  apiPatch<{ message: string }>(`/admin/users/${userId}`, { roleId });