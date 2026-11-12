import { apiGet, apiPost, apiPatch, apiDelete } from "./client";

export interface AdminEmployee {
  id: number;
  code: string;
  title: string | null;
  firstName: string;
  middleName: string | null;
  lastName: string;
  name: string;
  birthDate: string | null;
  birthPlace: string | null;
  gender: string | null;
  country: string | null;
  postalCode: string | null;
  city: string | null;
  address: string | null;
  workEmail: string | null;
  privateEmail: string | null;
  workPhone: string | null;
  privatePhone: string | null;
  workLocationId: number | null;
  workLocationName: string | null;
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
  userLocked: boolean;
  userRoleId: number | null;
  userRoleName: string | null;
}

export interface SystemAccount {
  userId: number;
  username: string;
  userActive: boolean;
  userLocked: boolean;
  userRoleId: number;
  userRoleName: string;
}

export interface AdminOption {
  id: number;
  name: string;
  isActive?: boolean;
  num?: number;
  hours?: number;
}

interface ManagerOption extends AdminOption {
  managedGroupId: number | null;
  managedGroupName: string | null;
}

export interface EmployeeOptions {
  genders: string[];
  workLocations: AdminOption[];
  groups: AdminOption[];
  categories: AdminOption[];
  statuses: AdminOption[];
  costCenters: AdminOption[];
  workSchedules: AdminOption[];
  workingHours: AdminOption[];
  coreHours: AdminOption[];
  managers: ManagerOption[];
  roles: AdminOption[];
}

export interface EmployeePayload {
  title: string;
  lastName: string;
  firstName: string;
  middleName: string;
  birthDate: string;
  birthPlace: string;
  gender: string;
  country: string;
  postalCode: string;
  city: string;
  address: string;
  workEmail: string;
  privateEmail: string;
  workPhone: string;
  privatePhone: string;
  workLocationId: number | null;
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
  apiGet<{ employees: AdminEmployee[]; systemAccounts: SystemAccount[] }>(
    "/admin/employees",
  );

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

export const unlockUser = (userId: number) =>
  apiPatch<{ message: string }>(`/admin/users/${userId}`, { unlock: true });

export const resetUserPassword = (userId: number) =>
  apiPatch<{ message: string; password: string }>(`/admin/users/${userId}`, {
    resetPassword: true,
  });

export const deleteEmployee = (id: number) =>
  apiDelete<{ message: string }>(`/admin/employees/${id}`);

export const setUserRole = (userId: number, roleId: number) =>
  apiPatch<{ message: string }>(`/admin/users/${userId}`, { roleId });


export const deleteUserAccount = (userId: number) =>
  apiDelete<{ message: string }>(`/admin/users/${userId}`);