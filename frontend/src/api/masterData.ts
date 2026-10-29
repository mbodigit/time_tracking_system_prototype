import { apiGet, apiPost, apiPatch, apiDelete } from "./client";

export type MasterEntity =
  | "work-schedules"
  | "working-hours"
  | "core-hours"
  | "cost-centers";

export type MasterValue = string | number | boolean | null;

export interface MasterItem {
  id: number;
  [key: string]: MasterValue;
}

export const listMasterData = (entity: MasterEntity) =>
  apiGet<{ items: MasterItem[] }>(`/admin/master-data/${entity}`);

export const createMasterItem = (
  entity: MasterEntity,
  payload: Record<string, MasterValue>,
) =>
  apiPost<{ message: string; id: number }>(
    `/admin/master-data/${entity}`,
    payload,
  );

export const updateMasterItem = (
  entity: MasterEntity,
  id: number,
  payload: Record<string, MasterValue>,
) =>
  apiPatch<{ message: string }>(`/admin/master-data/${entity}/${id}`, payload);

export const deleteMasterItem = (entity: MasterEntity, id: number) =>
  apiDelete<{ message: string }>(`/admin/master-data/${entity}/${id}`);