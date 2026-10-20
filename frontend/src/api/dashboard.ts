import { apiGet } from "./client";
import type { AllowanceType } from "./timeEntries";

export interface DashboardSummary {
  workedMinutes: number;
  settledMinutes: number;
  absenceMinutes: number;
  balanceMinutes: number;
  minusMinutes: number;
  allowances: Record<string, number>;
  absences: Record<string, number>;
}

export interface DashboardOverview {
  year: number;
  month: number;
  allowanceTypes: AllowanceType[];
  current: DashboardSummary;
  previous: DashboardSummary | null;
  previousPeriod: { year: number; month: number };
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