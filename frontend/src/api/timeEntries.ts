import { apiGet, apiPost, apiPatch, apiDelete } from "./client";

export type DayType = "workday" | "restday" | "holiday" | "transferred";

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
    status: "Függőben" | "Folyamatban" | "Jóváhagyva";
    coversDay: boolean;
  } | null;
  absenceMinutes: number;
  settledMinutes: number;
  isOrdered: boolean;
  presenceMinutes: number;
  breakMinutes: number;
  breakStart: string | null;
  breakEnd: string | null;
  scheduleStart: string | null;
  scheduleEnd: string | null;
  scheduleFromEntry: boolean;
  scheduledMinutes: number | null;
  balanceMinutes: number | null;
  scheduleMissing?: boolean;
  workedMinutes: number;
  allowances: Record<string, number>;
}

export interface AllowanceType {
  code: string;
  name: string;
  percent: number;
}

export interface MonthlyLog {
  employeeId: number;
  year: number;
  month: number;
  isFlexible: boolean;
  employeeName?: string;
  employeeCode?: string;
  employeeArea?: string | null;
  employeeWorkLocation?: string | null;
  leave?: {
    entitlementDays: number;
    usedDays: number;
    remainingDays: number;
  };
  employeeProfile?: {
    code: string;
    name: string;
    workScheduleName: string | null;
    workingHourNum: number | null;
    coreStart: string | null;
    coreEnd: string | null;
    breakMinutes: number | null;
    breakPaid: boolean;
    breakStart: string | null;
    breakEnd: string | null;
    groupName: string | null;
    areaName: string | null;
    workLocationName: string | null;
    username: string | null;
    hasAccount: boolean;
    accountActive: boolean | null;
  };
  allowanceTypes: AllowanceType[];
  days: TimeEntryDay[];
  summary: {
    recordedDays: number;
    workedMinutes: number;
    presenceMinutes: number;
    breakMinutes: number;
    balanceMinutes: number;
    absenceMinutes: number;
    settledMinutes: number;
    frameMinutes?: number;
    requiredMinutes?: number;
    absences?: Record<string, { minutes: number; payrollCode: string | null }>;    
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

export const deleteEntry = (id: number) =>
  apiDelete<{ message: string }>(`/time-entries/${id}`);

export interface DailyEmployee {
  id: number;
  code: string;
  name: string;
  workSchedule: string | null;
  isShiftWorker: boolean;
  templateStart: string | null;
  templateEnd: string | null;
  entry: {
    id: number;
    workStart: string | null;
    workEnd: string | null;
    breakStart: string | null;
    breakEnd: string | null;
    isOrdered: boolean;
  } | null;
  absence: {
    name: string;
    status: string;
    coversDay: boolean;
  } | null;
  isSelf: boolean;
}

export interface DailyLog {
  date: string;
  dayType: DayType;
  employees: DailyEmployee[];
}

export interface BulkResult {
  employeeId: number;
  status: "created" | "updated" | "error";
  id?: number;
  message?: string;
}

export const listDaily = (date: string) =>
  apiGet<DailyLog>(`/time-entries/daily?date=${date}`);

export const createBulk = (
  workingDate: string,
  entries: {
    employeeId: number;
    workStart: string;
    workEnd: string;
    breakStart?: string;
    breakEnd?: string;
  }[],
) =>
  apiPost<{ message: string; results: BulkResult[] }>("/time-entries/bulk", {
    workingDate,
    entries,
  });