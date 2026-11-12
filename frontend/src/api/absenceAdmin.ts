import { apiGet, apiPost, apiPatch, apiDelete } from "./client";

export interface AdminAbsence {
  id: number;
  name: string;
  payrollCodeId: number | null;
  payrollCode: string | null;
  isPaid: boolean;
  isOpenEnded: boolean;
  needsApproval: boolean;
  status: boolean;
  sort: number;
  workScheduleIds: number[];
  workScheduleNames: string[];
}

export interface PayrollCodeOption {
  id: number;
  code: string;
  name: string;
}

export interface AbsenceAdminData {
  absences: AdminAbsence[];
  payrollCodes: PayrollCodeOption[];
  workSchedules: { id: number; name: string }[];
}

export interface AbsencePayload {
  name: string;
  payrollCodeId: number | null;
  isPaid: boolean;
  isOpenEnded: boolean;
  needsApproval: boolean;
  status: boolean;
  sort: number;
  workScheduleIds: number[];
}

export const listAbsenceAdmin = () => apiGet<AbsenceAdminData>("/admin/absences");

export const createAbsence = (payload: AbsencePayload) =>
  apiPost<{ message: string; id: number }>("/admin/absences", payload);

export const updateAbsence = (id: number, payload: AbsencePayload) =>
  apiPatch<{ message: string }>(`/admin/absences/${id}`, payload);

export const deleteAbsence = (id: number) =>
  apiDelete<{ message: string }>(`/admin/absences/${id}`);