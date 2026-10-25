import { ApiError, apiGet } from "./client";
import { getToken } from "../utils/auth";
import type { AllowanceType } from "./timeEntries";

export interface ReportRow {
  employeeId: number;
  employeeCode: string;
  employeeName: string;
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

const buildParams = (year: number, month: number, employeeId?: number) => {
  const params = new URLSearchParams({
    year: String(year),
    month: String(month),
  });

  if (employeeId) {
    params.set("employeeId", String(employeeId));
  }

  return params.toString();
};

export const listMonthlyReport = (
  year: number,
  month: number,
  employeeId?: number,
) => apiGet<MonthlyReport>(`/reports/monthly?${buildParams(year, month, employeeId)}`);

export const downloadPayroll = async (
  year: number,
  month: number,
  employeeId?: number,
) => {
  const response = await fetch(
    `${import.meta.env.VITE_API_URL}/reports/payroll?${buildParams(year, month, employeeId)}`,
    { headers: { Authorization: `Bearer ${getToken()}` } },
  );

  if (!response.ok) {
    throw new ApiError(
      response.status,
      "A bérfeladási fájl nem állítható elő.",
    );
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = `berfeladas_${year}_${String(month).padStart(2, "0")}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};