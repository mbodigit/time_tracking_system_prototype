import { useState } from "react";
import {
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

const toForm = (group: Group): GroupPayload => ({
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

const Field = ({
  label,
  wide,
  children,
}: {
  label: string;
  wide?: boolean;
  children: React.ReactNode;
}) => (
  <label className={`form-control ${wide ? "md:col-span-2" : ""}`}>
    <div className="label py-1">
      <span className="label-text">{label}</span>
    </div>
    {children}
  </label>
);

interface GroupModalProps {
  group: Group | null;
  options: GroupOptions;
  onClose: () => void;
  onSaved: (message: string) => void;
}

export const GroupModal = ({
  group,
  options,
  onClose,
  onSaved,
}: GroupModalProps) => {
  const isNew = group === null;
  const [form, setForm] = useState<GroupPayload>(
    group ? toForm(group) : EMPTY_FORM,
  );
  const [errorMessage, setErrorMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [askDelete, setAskDelete] = useState(false);

  const isBusy = isSaving || isDeleting;
  const canDelete = Boolean(group) && group!.activeEmployees === 0;

  const patch = (changes: Partial<GroupPayload>) =>
    setForm((current) => ({ ...current, ...changes }));

  const fail = (error: unknown) =>
    setErrorMessage(
      error instanceof ApiError ? error.message : "Ismeretlen hiba történt.",
    );

  const departments = options.departments.filter(
    (item) => item.areaId === form.areaId,
  );

  const shifts = options.shifts.filter(
    (item) => item.departmentId === form.departmentId,
  );

  const handleSave = async () => {
    setErrorMessage("");
    setIsSaving(true);

    try {
      const response = group
        ? await updateGroup(group.id, form)
        : await createGroup(form);
      onSaved(response.message);
    } catch (error) {
      fail(error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!group) {
      return;
    }

    setErrorMessage("");
    setIsDeleting(true);

    try {
      const response = await deleteGroup(group.id);
      onSaved(response.message);
    } catch (error) {
      fail(error);
      setAskDelete(false);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="modal modal-open">
      <div className="modal-box max-w-3xl max-h-[90vh] flex flex-col p-0">
        <div className="flex items-start justify-between gap-3 border-b border-base-300 px-6 pb-3 pt-5">
          <div>
            <h3 className="text-xl font-bold text-primary">
              {isNew ? "Új csoport felvétele" : "Csoport módosítása"}
            </h3>
            {group && (
              <p className="mt-0.5 text-xs opacity-60">
                {group.name} — {group.activeEmployees} aktív dolgozó
              </p>
            )}
          </div>
          <button
            type="button"
            className="btn btn-sm btn-ghost btn-circle"
            onClick={onClose}
            disabled={isBusy}
            aria-label="Bezárás"
          >
            ✕
          </button>
        </div>

        <div className="space-y-3 overflow-y-auto px-6 py-4">
          {errorMessage && (
            <div className="alert alert-error py-2 text-sm">
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="grid gap-3 md:grid-cols-3">
            <Field label="Megnevezés">
              <input
                type="text"
                className="input input-sm input-bordered"
                value={form.name}
                onChange={(event) => patch({ name: event.target.value })}
              />
            </Field>

            <Field label="Terület">
              <select
                className="select select-sm select-bordered"
                value={form.areaId ?? ""}
                onChange={(event) =>
                  patch({
                    areaId: toNumber(event.target.value),
                    departmentId: null,
                    shiftId: null,
                  })
                }
              >
                <option value="">Válassz</option>
                {options.areas.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Részleg">
              <select
                className="select select-sm select-bordered"
                value={form.departmentId ?? ""}
                disabled={!form.areaId}
                onChange={(event) =>
                  patch({
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
            </Field>

            <Field label="Műszak">
              <select
                className="select select-sm select-bordered"
                value={form.shiftId ?? ""}
                disabled={!form.departmentId}
                onChange={(event) =>
                  patch({ shiftId: toNumber(event.target.value) })
                }
              >
                <option value="">Nincs</option>
                {shifts.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Költséghely">
              <select
                className="select select-sm select-bordered"
                value={form.costCenterId ?? ""}
                onChange={(event) =>
                  patch({ costCenterId: toNumber(event.target.value) })
                }
              >
                <option value="">Válassz</option>
                {options.costCenters.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Munkarend">
              <select
                className="select select-sm select-bordered"
                value={form.workScheduleId ?? ""}
                onChange={(event) =>
                  patch({ workScheduleId: toNumber(event.target.value) })
                }
              >
                <option value="">Nincs</option>
                {options.workSchedules.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Munkaidő">
              <select
                className="select select-sm select-bordered"
                value={form.workingHourId ?? ""}
                onChange={(event) =>
                  patch({ workingHourId: toNumber(event.target.value) })
                }
              >
                <option value="">Nincs</option>
                {options.workingHours.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Törzsidő">
              <select
                className="select select-sm select-bordered"
                value={form.coreHourId ?? ""}
                onChange={(event) =>
                  patch({ coreHourId: toNumber(event.target.value) })
                }
              >
                <option value="">Nincs</option>
                {options.coreHours.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Területi vezető">
              <select
                className="select select-sm select-bordered"
                value={form.managerId ?? ""}
                onChange={(event) =>
                  patch({ managerId: toNumber(event.target.value) })
                }
              >
                <option value="">Válassz</option>
                {options.managers.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Megjegyzés" wide>
              <input
                type="text"
                className="input input-sm input-bordered"
                value={form.description ?? ""}
                onChange={(event) => patch({ description: event.target.value })}
              />
            </Field>

            <Field label="Állapot">
              <select
                className="select select-sm select-bordered"
                value={form.status}
                onChange={(event) => patch({ status: event.target.value })}
              >
                <option value="Aktív">Aktív</option>
                <option value="Inaktív">Inaktív</option>
              </select>
            </Field>
          </div>

          {askDelete && (
            <div className="alert alert-warning text-sm">
              <div>
                <p className="font-semibold">Biztosan törlöd a csoportot?</p>
                <p>
                  A törlés csak akkor lehetséges, ha a csoporthoz nem tartozik
                  aktív dolgozó. Ha a csoport már nem használatos, de meg kell
                  őrizni, állítsd Inaktív állapotra.
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-base-300 px-6 pb-5 pt-3">
          {group ? (
            askDelete ? (
              <div className="flex gap-2">
                <button
                  className="btn btn-sm btn-error"
                  onClick={handleDelete}
                  disabled={isBusy}
                >
                  {isDeleting ? "Törlés..." : "Igen, törlöm"}
                </button>
                <button
                  className="btn btn-sm btn-ghost"
                  onClick={() => setAskDelete(false)}
                  disabled={isBusy}
                >
                  Vissza
                </button>
              </div>
            ) : (
              <button
                className="btn btn-sm btn-outline btn-error"
                onClick={() => setAskDelete(true)}
                disabled={isBusy || !canDelete}
                title={
                  canDelete
                    ? undefined
                    : "Aktív dolgozóval rendelkező csoport nem törölhető"
                }
              >
                Törlés
              </button>
            )
          ) : (
            <span />
          )}

          <div className="flex gap-2">
            <button
              className="btn btn-sm btn-ghost"
              onClick={onClose}
              disabled={isBusy}
            >
              Mégse
            </button>
            <button
              className="btn btn-sm btn-primary"
              onClick={handleSave}
              disabled={isBusy}
            >
              {isSaving ? "Mentés..." : isNew ? "Létrehozás" : "Módosítás"}
            </button>
          </div>
        </div>
      </div>
      <div className="modal-backdrop" onClick={isBusy ? undefined : onClose} />
    </div>
  );
};
