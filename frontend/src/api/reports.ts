import { apiGet, apiDownload } from "./client";
import type { AllowanceType } from "./timeEntries";

export interface ReportRow {
  employeeId: number;
  employeeCode: string;
  employeeName: string;
  employeeGroupId: number | null;
  employeeGroup: string | null;
  employeeArea: string | null;
  recordedDays: number;
  workedMinutes: number;
  presenceMinutes: number;
  breakMinutes: number;
  balanceMinutes: number;
  absenceMinutes: number;
  settledMinutes: number;
  allowances: Record<string, number>;
  absences: Record<string, { minutes: number; payrollCode: string | null }>;
}

export interface MonthlyReport {
  year: number;
  month: number;
  allowanceTypes: AllowanceType[];
  employees: ReportRow[];
  totals: {
    workedMinutes: number;
    presenceMinutes: number;
    breakMinutes: number;
    balanceMinutes: number;
    absenceMinutes: number;
    settledMinutes: number;
    allowances: Record<string, number>;
    absences: Record<string, number>;
  };
}

const buildParams = (
  year: number,
  month: number,
  employeeId?: number,
  groupId?: number,
) => {
  const params = new URLSearchParams({
    year: String(year),
    month: String(month),
  });

  if (employeeId) {
    params.set("employeeId", String(employeeId));
  }

  if (groupId) {
    params.set("groupId", String(groupId));
  }

  return params.toString();
};

export const listMonthlyReport = (
  year: number,
  month: number,
  employeeId?: number,
  groupId?: number,
) =>
  apiGet<MonthlyReport>(
    `/reports/monthly?${buildParams(year, month, employeeId, groupId)}`,
  );

export const downloadPayroll = (
  year: number,
  month: number,
  employeeId?: number,
  groupId?: number,
) =>
  apiDownload(
    `/reports/payroll?${buildParams(year, month, employeeId, groupId)}`,
    `berfeladas_${year}_${String(month).padStart(2, "0")}.csv`,
  );

export interface StatisticsRow {
  key: string;
  headcount: number;
  workedMinutes: number;
  absenceMinutes: number;
  settledMinutes: number;
  minusMinutes: number;
  overtimeMinutes: number;
  shiftPremiumMinutes: number;
  sickMinutes: number;
  vacationMinutes: number;
}

export interface StatisticsReport {
  year: number;
  month: number;
  dimension: string;
  dimensions: Record<string, string>;
  rows: StatisticsRow[];
}

export const listStatistics = (
  year: number,
  month: number,
  dimension: string,
  employeeId?: number,
  groupId?: number,
) =>
  apiGet<StatisticsReport>(
    `/reports/statistics?${buildParams(year, month, employeeId, groupId)}&dimension=${dimension}`,
  );