import { apiGet, apiPost, apiPatch, apiDelete } from "./client";

export interface AdminAbsence {
  id: number;
  name: string;
  payrollCode: string | null;
  isPaid: boolean;
  category: string;
  isOpenEnded: boolean;
  recType: number;
  status: boolean;
  sort: number;
  workScheduleIds: number[];
  workScheduleNames: string[];
}

export interface AbsenceAdminData {
  absences: AdminAbsence[];
  categories: string[];
  workSchedules: { id: number; name: string }[];
}

export interface AbsencePayload {
  name: string;
  payrollCode: string;
  isPaid: boolean;
  category: string;
  isOpenEnded: boolean;
  recType: number;
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