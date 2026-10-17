import { apiGet } from "./client";

export interface ScopeEmployee {
  id: number;
  code: string;
  name: string;
  workSchedule: string | null;
  isSelf: boolean;
}

export interface AbsenceType {
  id: number;
  name: string;
  isPaid: boolean;
  category: string;
  isOpenEnded: boolean;
}

export const listEmployees = () =>
  apiGet<{ employees: ScopeEmployee[] }>("/employees");

export const listAbsences = (employeeId?: number) => {
  const query = employeeId ? `?employeeId=${employeeId}` : "";
  return apiGet<{ absences: AbsenceType[] }>(`/absences${query}`);
};