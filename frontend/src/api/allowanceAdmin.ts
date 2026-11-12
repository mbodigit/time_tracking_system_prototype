import { apiGet, apiPatch } from "./client";
import type { PayrollCodeOption } from "./absenceAdmin";

export interface AdminAllowance {
  id: number;
  name: string;
  code: string | null;
  payrollCodeId: number | null;
  payrollCode: string | null;
  percent: number;
  startHour: string;
  endHour: string;
  workScheduleIds: number[];
  workScheduleNames: string[];
}

export interface AllowanceAdminData {
  allowances: AdminAllowance[];
  payrollCodes: PayrollCodeOption[];
  workSchedules: { id: number; name: string }[];
}

export interface AllowancePayload {
  name: string;
  payrollCodeId: number | null;
  percent: number;
  startHour: string;
  endHour: string;
  workScheduleIds: number[];
}

export const listAllowanceAdmin = () =>
  apiGet<AllowanceAdminData>("/admin/allowances");

export const updateAllowance = (id: number, payload: AllowancePayload) =>
  apiPatch<{ message: string }>(`/admin/allowances/${id}`, payload);
