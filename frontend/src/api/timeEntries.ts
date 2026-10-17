import { apiGet, apiPost, apiPatch } from "./client";

export type DayType = "workday" | "restday" | "holiday";

export interface TimeEntryDay {
  id: number | null;
  date: string;
  dayType: DayType;
  workStart: string | null;
  workEnd: string | null;
    absence: {
    id: number;
    name: string;
    isPaid: boolean;
    status: "Függőben" | "Jóváhagyva";
    coversDay: boolean;
  } | null;
  absenceMinutes: number;
  settledMinutes: number;
  isOrdered: boolean;
  presenceMinutes: number;
  breakMinutes: number;
  scheduledMinutes: number | null;
  balanceMinutes: number | null;
  scheduleMissing?: boolean;
  workedMinutes: number;
  allowances: Record<string, number>;
}

export interface MonthlyLog {
  employeeId: number;
  year: number;
  month: number;
  days: TimeEntryDay[];
  summary: {
    recordedDays: number;
    workedMinutes: number;
    presenceMinutes: number;
    breakMinutes: number;
    balanceMinutes: number;
    absenceMinutes: number;
    settledMinutes: number;
    allowances: Record<string, number>;
  };
}

export const listMonth = (year: number, month: number, employeeId?: number) => {
  const params = new URLSearchParams({ year: String(year), month: String(month) });
  if (employeeId) {
    params.set("employeeId", String(employeeId));
  }
  return apiGet<MonthlyLog>(`/time-entries?${params.toString()}`);
};

export const createEntry = (payload: Record<string, unknown>) =>
  apiPost<{ message: string; id: number }>("/time-entries", payload);

export const updateEntry = (id: number, payload: Record<string, unknown>) =>
  apiPatch<{ message: string }>(`/time-entries/${id}`, payload);