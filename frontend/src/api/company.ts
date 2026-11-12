import { apiGet, apiPatch } from "./client";

export interface CompanySettings {
  name: string | null;
  address: string | null;
  taxNumber: string | null;
}

export type CompanyPayload = CompanySettings;

export const getCompany = () =>
  apiGet<{ company: CompanySettings }>("/admin/company");

export const updateCompany = (payload: CompanyPayload) =>
  apiPatch<{ message: string }>("/admin/company", payload);
