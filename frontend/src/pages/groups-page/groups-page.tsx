import { useCallback, useEffect, useState } from "react";
import {
  listGroups,
  listGroupOptions,
  createGroup,
  updateGroup,
  deleteGroup,
  type Group,
  type GroupOptions,
  type GroupPayload,
} from "../../api/groups";
import { ApiError } from "../../api/client";

const EMPTY_FORM: GroupPayload = {
  name: "",
  status: "Aktív",
  description: "",
  areaId: null,
  departmentId: null,
  shiftId: null,
  costCenterId: null,
  workScheduleId: null,
  workingHourId: null,
  coreHourId: null,
  managerId: null,
};

const toNumber = (value: string): number | null =>
  value ? Number(value) : null;

export const GroupsPage = () => {
  const [groups, setGroups] = useState<Group[]>([]);
  const [options, setOptions] = useState<GroupOptions | null>(null);
  const [form, setForm] = useState<GroupPayload>(EMPTY_FORM);
  const [editedId, setEditedId] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [infoMessage, setInfoMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const load = useCallback(async () => {
    setErrorMessage("");
    try {
      const data = await listGroups();
      setGroups(data.groups);
    } catch (error) {
      setGroups([]);
      setErrorMessage(
        error instanceof ApiError ? error.message : "Ismeretlen hiba történt.",
      );
    }
  }, []);

  useEffect(() => {
    load();
    listGroupOptions()
      .then(setOptions)
      .catch(() => setOptions(null));
  }, [load]);

  const startNew = () => {
    setEditedId(null);
    setForm(EMPTY_FORM);
    setInfoMessage("");
    setErrorMessage("");
  };

  const startEdit = (group: Group) => {
    setEditedId(group.id);
    setInfoMessage("");
    setErrorMessage("");
    setForm({
      name: group.name,
      status: group.status,
      description: group.description ?? "",
      areaId: group.areaId,
      departmentId: group.departmentId,
      shiftId: group.shiftId,
      costCenterId: group.costCenterId,
      workScheduleId: group.workScheduleId,
      workingHourId: group.workingHourId,
      coreHourId: group.coreHourId,
      managerId: group.managerId,
    });
  };

  const handleSave = async () => {
    setErrorMessage("");
    setInfoMessage("");
    setIsSaving(true);
    try {
      const response = editedId
        ? await updateGroup(editedId, form)
        : await createGroup(form);
      setInfoMessage(response.message);
      await load();
      if (!editedId) {
        setForm(EMPTY_FORM);
      }
    } catch (error) {
      setErrorMessage(
        error instanceof ApiError ? error.message : "Ismeretlen hiba történt.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (group: Group) => {
    setErrorMessage("");
    setInfoMessage("");
    try {
      const response = await deleteGroup(group.id);
      setInfoMessage(response.message);
      if (editedId === group.id) {
        startNew();
      }
      await load();
    } catch (error) {
      setErrorMessage(
        error instanceof ApiError ? error.message : "Ismeretlen hiba történt.",
      );
    }
  };

  const departments = (options?.departments ?? []).filter(
    (item) => item.areaId === form.areaId,
  );

  const shifts = (options?.shifts ?? []).filter(
    (item) => item.departmentId === form.departmentId,
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold">Csoportok</h1>
        <button className="btn btn-sm ml-auto" onClick={startNew}>
          Új csoport
        </button>
      </div>

      {errorMessage && (
        <div className="alert alert-error text-sm py-2">
          <span>{errorMessage}</span>
        </div>
      )}

      {infoMessage && (
        <div className="alert alert-success text-sm py-2">
          <span>{infoMessage}</span>
        </div>
      )}

      <div className="card bg-base-200">
        <div className="card-body space-y-3">
          <h2 className="card-title text-base">
            {editedId ? "Csoport módosítása" : "Új csoport felvétele"}
          </h2>

          <div className="grid gap-3 md:grid-cols-3">
            <label className="form-control">
              <div className="label py-1">
                <span className="label-text">Megnevezés</span>
              </div>
              <input
                type="text"
                className="input input-sm input-bordered"
                value={form.name}
                onChange={(event) =>
                  setForm({ ...form, name: event.target.value })
                }
              />
            </label>

            <label className="form-control">
              <div className="label py-1">
                <span className="label-text">Terület</span>
              </div>
              <select
                className="select select-sm select-bordered"
                value={form.areaId ?? ""}
                onChange={(event) =>
                  setForm({
                    ...form,
                    areaId: toNumber(event.target.value),
                    departmentId: null,
                    shiftId: null,
                  })
                }
              >
                <option value="">Válassz</option>
                {options?.areas.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="form-control">
              <div className="label py-1">
                <span className="label-text">Részleg</span>
              </div>
              <select
                className="select select-sm select-bordered"
                value={form.departmentId ?? ""}
                disabled={!form.areaId}
                onChange={(event) =>
                  setForm({
                    ...form,
                    departmentId: toNumber(event.target.value),
                    shiftId: null,
                  })
                }
              >
                <option value="">Nincs</option>
                {departments.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="form-control">
              <div className="label py-1">
                <span className="label-text">Műszak</span>
              </div>
              <select
                className="select select-sm select-bordered"
                value={form.shiftId ?? ""}
                disabled={!form.departmentId}
                onChange={(event) =>
                  setForm({ ...form, shiftId: toNumber(event.target.value) })
                }
              >
                <option value="">Nincs</option>
                {shifts.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="form-control">
              <div className="label py-1">
                <span className="label-text">Költséghely</span>
              </div>
              <select
                className="select select-sm select-bordered"
                value={form.costCenterId ?? ""}
                onChange={(event) =>
                  setForm({
                    ...form,
                    costCenterId: toNumber(event.target.value),
                  })
                }
              >
                <option value="">Válassz</option>
                {options?.costCenters.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="form-control">
              <div className="label py-1">
                <span className="label-text">Munkarend</span>
              </div>
              <select
                className="select select-sm select-bordered"
                value={form.workScheduleId ?? ""}
                onChange={(event) =>
                  setForm({
                    ...form,
                    workScheduleId: toNumber(event.target.value),
                  })
                }
              >
                <option value="">Nincs</option>
                {options?.workSchedules.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="form-control">
              <div className="label py-1">
                <span className="label-text">Munkaidő</span>
              </div>
              <select
                className="select select-sm select-bordered"
                value={form.workingHourId ?? ""}
                onChange={(event) =>
                  setForm({
                    ...form,
                    workingHourId: toNumber(event.target.value),
                  })
                }
              >
                <option value="">Nincs</option>
                {options?.workingHours.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="form-control">
              <div className="label py-1">
                <span className="label-text">Törzsidő</span>
              </div>
              <select
                className="select select-sm select-bordered"
                value={form.coreHourId ?? ""}
                onChange={(event) =>
                  setForm({ ...form, coreHourId: toNumber(event.target.value) })
                }
              >
                <option value="">Nincs</option>
                {options?.coreHours.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="form-control">
              <div className="label py-1">
                <span className="label-text">Területi vezető</span>
              </div>
              <select
                className="select select-sm select-bordered"
                value={form.managerId ?? ""}
                onChange={(event) =>
                  setForm({ ...form, managerId: toNumber(event.target.value) })
                }
              >
                <option value="">Válassz</option>
                {options?.managers.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="form-control md:col-span-2">
              <div className="label py-1">
                <span className="label-text">Megjegyzés</span>
              </div>
              <input
                type="text"
                className="input input-sm input-bordered"
                value={form.description ?? ""}
                onChange={(event) =>
                  setForm({ ...form, description: event.target.value })
                }
              />
            </label>

            <label className="form-control">
              <div className="label py-1">
                <span className="label-text">Állapot</span>
              </div>
              <select
                className="select select-sm select-bordered"
                value={form.status}
                onChange={(event) =>
                  setForm({ ...form, status: event.target.value })
                }
              >
                <option value="Aktív">Aktív</option>
                <option value="Inaktív">Inaktív</option>
              </select>
            </label>
          </div>

          <div className="flex gap-2">
            <button
              className="btn btn-sm btn-primary"
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving ? "Mentés..." : editedId ? "Módosítás" : "Létrehozás"}
            </button>
            {editedId && (
              <button className="btn btn-sm btn-ghost" onClick={startNew}>
                Mégse
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="table table-sm">
          <thead>
            <tr>
              <th>Csoport</th>
              <th>Terület</th>
              <th>Részleg</th>
              <th>Műszak</th>
              <th>Munkarend</th>
              <th>Törzsidő</th>
              <th>Vezető</th>
              <th>Aktív dolgozó</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {groups.map((group) => (
              <tr
                key={group.id}
                className={editedId === group.id ? "bg-base-300" : ""}
              >
                <td className="whitespace-nowrap">
                  {group.name}
                  {group.status !== "Aktív" && (
                    <span className="badge badge-sm badge-ghost ml-2">
                      {group.status}
                    </span>
                  )}
                </td>
                <td>{group.areaName ?? "-"}</td>
                <td>{group.departmentName ?? "-"}</td>
                <td>{group.shiftName ?? "-"}</td>
                <td>{group.workScheduleName ?? "-"}</td>
                <td>{group.coreHourName ?? "-"}</td>
                <td>{group.managerName ?? "-"}</td>
                <td>{group.activeEmployees}</td>
                <td className="whitespace-nowrap">
                  <button
                    className="btn btn-xs"
                    onClick={() => startEdit(group)}
                  >
                    Szerkesztés
                  </button>
                  <button
                    className="btn btn-xs btn-ghost ml-1"
                    onClick={() => handleDelete(group)}
                    disabled={group.activeEmployees > 0}
                    title={
                      group.activeEmployees > 0
                        ? "Aktív dolgozó tartozik a csoporthoz"
                        : undefined
                    }
                  >
                    Törlés
                  </button>
                </td>
              </tr>
            ))}

            {groups.length === 0 && (
              <tr>
                <td colSpan={9} className="text-center opacity-60">
                  Még nincs felvett csoport.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
