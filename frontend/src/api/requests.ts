import { apiGet, apiPost, apiPatch, apiPut } from "./client";

export type RequestStatus = "Függőben" | "Jóváhagyva" | "Elutasítva" | "Visszavonva";

export interface AbsenceRequest {
  id: number;
  employeeId: number;
  employeeCode: string;
  employeeName: string;
  absenceId: number;
  absenceName: string;
  isPaid: boolean;
  category: string;
  startDate: string;
  endDate: string;
  message: string | null;
  status: RequestStatus;
  decisionAt: string | null;
  decisionReason: string | null;
  decisionBy: string | null;
  createdAt: string;
  isUrgent: boolean;
  isBackdated: boolean;
  isExpired: boolean;
}

export const listOwnRequests = () =>
  apiGet<{ requests: AbsenceRequest[] }>("/requests");

export const listManagedRequests = () =>
  apiGet<{ requests: AbsenceRequest[] }>("/requests?scope=managed");

export const createRequest = (payload: Record<string, unknown>) =>
  apiPost<{ message: string; id: number }>("/requests", payload);

export const decideRequest = (id: number, status: RequestStatus, reason?: string) =>
  apiPatch<{ message: string }>(`/requests/${id}`, { status, reason });

export const withdrawRequest = (id: number) =>
  apiPatch<{ message: string }>(`/requests/${id}/withdraw`, {});

export const setOrdered = (
  employeeId: number,
  workingDate: string,
  isOrdered: boolean,
) =>
  apiPut<{ message: string; id: number }>("/time-entries/ordered", {
    employeeId,
    workingDate,
    isOrdered,
  });