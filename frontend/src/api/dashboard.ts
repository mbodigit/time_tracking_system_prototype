import { apiGet } from "./client";

interface DashboardSummary {
  balanceMinutes: number;
  absences: Record<string, { minutes: number; payrollCode: string | null }>;
}

export interface DashboardOverview {
  year: number;
  month: number;
  employeeName: string;
  employeeCode: string;
  dailyMinutes: number;
  current: DashboardSummary;
  leave: {
    entitlementDays: number;
    usedDays: number;
    remainingDays: number;
  };
  openItems: {
    ownRequests: { pending: number; expired: number };
    missingRecordDays: string[];
  };
  approval?: { pending: number; expired: number };
}

export const getOverview = (year: number, month: number) =>
  apiGet<DashboardOverview>(`/dashboard?year=${year}&month=${month}`);