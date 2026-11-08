import { useState } from "react";
import {
  createEmployee,
  updateEmployee,
  deleteEmployee,
  type AdminEmployee,
  type AdminOption,
  type EmployeeOptions,
  type EmployeePayload,
} from "../../api/employeeAdmin";
import { ApiError } from "../../api/client";
import { Field, FormGrid } from "../../components/form-field/form-field";

const EMPTY_FORM: EmployeePayload = {
  lastName: "",
  firstName: "",
  workEmail: "",
  groupId: null,
  categoryId: null,
  statusId: null,
  costCenterId: null,
  workScheduleId: null,
  workingHourId: null,
  coreHourId: null,
  breakMinutes: null,
  breakPaid: false,
  breakStart: "",
  breakEnd: "",
  annualLeaveDays: null,
  managerId: null,
};

const toNumber = (value: string): number | null =>
  value ? Number(value) : null;

const toTime = (value: string | null): string =>
  value ? String(value).slice(0, 5) : "";

const toForm = (employee: AdminEmployee): EmployeePayload => ({
  lastName: employee.lastName,
  firstName: employee.firstName,
  workEmail: employee.workEmail ?? "",
  groupId: employee.groupId,
  categoryId: employee.categoryId,
  statusId: employee.statusId,
  costCenterId: employee.costCenterId,
  workScheduleId: employee.workScheduleId,
  workingHourId: employee.workingHourId,
  coreHourId: employee.coreHourId,
  breakMinutes: employee.breakMinutes,
  breakPaid: employee.breakPaid,
  breakStart: toTime(employee.breakStart),
  breakEnd: toTime(employee.breakEnd),
  annualLeaveDays: employee.annualLeaveDays,
  managerId: employee.managerId,
});

const SelectField = ({
  label,
  value,
  items,
  placeholder,
  onChange,
  hint,
}: {
  label: string;
  value: number | null;
  items: AdminOption[];
  placeholder: string;
  onChange: (value: number | null) => void;
  hint?: string;
}) => (
  <Field label={label} hint={hint}>
    <select
      className="select select-sm select-bordered"
      value={value ?? ""}
      onChange={(event) => onChange(toNumber(event.target.value))}
    >
      <option value="">{placeholder}</option>
      {items.map((item) => (
        <option key={item.id} value={item.id}>
          {item.name}
        </option>
      ))}
    </select>
  </Field>
);

interface EmployeeModalProps {
  employee: AdminEmployee | null;
  options: EmployeeOptions;
  onClose: () => void;
  onSaved: (message: string) => void;
}

export const EmployeeModal = ({
  employee,
  options,
  onClose,
  onSaved,
}: EmployeeModalProps) => {
  const isNew = employee === null;
  const [form, setForm] = useState<EmployeePayload>(
    employee ? toForm(employee) : EMPTY_FORM,
  );
  const [errorMessage, setErrorMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [askDelete, setAskDelete] = useState(false);
  const [isSuggestionDismissed, setIsSuggestionDismissed] = useState(false);

  const isBusy = isSaving || isDeleting;

  const workingHour = options.workingHours.find(
    (item) => item.id === form.workingHourId,
  );

  const coreHours = workingHour
    ? options.coreHours.filter((item) => item.hours === workingHour.num)
    : [];

  const patch = (changes: Partial<EmployeePayload>) =>
    setForm((current) => ({ ...current, ...changes }));

  const currentGroupName =
    options.groups.find((item) => item.id === form.groupId)?.name ?? null;

  const inheritsFromGroup = Boolean(form.groupId);

  const selectedManager = form.managerId
    ? options.managers.find((item) => item.id === form.managerId)
    : undefined;

  const groupSuggestion =
    selectedManager &&
    selectedManager.managedGroupId &&
    selectedManager.managedGroupId !== form.groupId
      ? selectedManager
      : null;

  const acceptGroupSuggestion = () => {
    if (groupSuggestion?.managedGroupId) {
      patch({ groupId: groupSuggestion.managedGroupId });
    }
    setIsSuggestionDismissed(false);
  };

  const fail = (error: unknown) =>
    setErrorMessage(
      error instanceof ApiError ? error.message : "Ismeretlen hiba történt.",
    );

  const handleSave = async () => {
    setErrorMessage("");
    setIsSaving(true);

    try {
      if (employee) {
        const response = await updateEmployee(employee.id, form);
        onSaved(response.message);
      } else {
        const response = await createEmployee(form);
        onSaved(`${response.message} Dolgozói kód: ${response.code}`);
      }
    } catch (error) {
      fail(error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!employee) {
      return;
    }

    setErrorMessage("");
    setIsDeleting(true);

    try {
      const response = await deleteEmployee(employee.id);
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
      <div className="modal-box max-w-4xl max-h-[90vh] flex flex-col p-0">
        <div className="flex items-start justify-between gap-3 border-b border-base-300 px-6 pb-3 pt-5">
          <div>
            <h3 className="text-xl font-bold text-primary">
              {isNew ? "Új dolgozó felvétele" : "Dolgozó szerkesztése"}
            </h3>
            {employee && (
              <p className="mt-0.5 text-xs opacity-60">
                {employee.code} — {employee.lastName} {employee.firstName}
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
          <div className="space-y-2">
            <h4 className="text-sm font-semibold">Kötelező adatok</h4>

            <FormGrid columns={3}>
              <Field label="Vezetéknév">
                <input
                  type="text"
                  className="input input-sm input-bordered"
                  value={form.lastName}
                  onChange={(event) => patch({ lastName: event.target.value })}
                />
              </Field>

              <Field label="Keresztnév">
                <input
                  type="text"
                  className="input input-sm input-bordered"
                  value={form.firstName}
                  onChange={(event) => patch({ firstName: event.target.value })}
                />
              </Field>

              <Field label="Éves szabadságkeret (nap)">
                <input
                  type="number"
                  className="input input-sm input-bordered"
                  value={form.annualLeaveDays ?? ""}
                  onChange={(event) =>
                    patch({ annualLeaveDays: toNumber(event.target.value) })
                  }
                />
              </Field>

              <SelectField
                label="Költséghely"
                value={form.costCenterId}
                items={options.costCenters}
                placeholder="Válassz"
                onChange={(costCenterId) => patch({ costCenterId })}
              />

              <SelectField
                label="Állománycsoport"
                value={form.categoryId}
                items={options.categories}
                placeholder="Válassz"
                onChange={(categoryId) => patch({ categoryId })}
              />

              <SelectField
                label="Státusz"
                value={form.statusId}
                items={options.statuses}
                placeholder="Válassz"
                onChange={(statusId) => patch({ statusId })}
              />

              <SelectField
                label="Munkarend"
                value={form.workScheduleId}
                items={options.workSchedules}
                placeholder={inheritsFromGroup ? "A csoporté" : "Válassz"}
                hint={inheritsFromGroup ? undefined : "Csoport nélkül kötelező."}
                onChange={(workScheduleId) => patch({ workScheduleId })}
              />

              <SelectField
                label="Napi munkaidő"
                value={form.workingHourId}
                items={options.workingHours}
                placeholder={inheritsFromGroup ? "A csoporté" : "Válassz"}
                hint={inheritsFromGroup ? undefined : "Csoport nélkül kötelező."}
                onChange={(workingHourId) =>
                  patch({ workingHourId, coreHourId: null })
                }
              />

              <span />

              <SelectField
                label="Csoport"
                value={form.groupId}
                items={options.groups}
                placeholder="Nincs"
                onChange={(groupId) => {
                  patch({ groupId });
                  setIsSuggestionDismissed(false);
                }}
              />

              <SelectField
                label="Közvetlen felettes"
                value={form.managerId}
                items={options.managers.filter(
                  (item) => item.id !== employee?.id,
                )}
                placeholder="Nincs"
                onChange={(managerId) => {
                  patch({ managerId });
                  setIsSuggestionDismissed(false);
                }}
              />
            </FormGrid>

            {groupSuggestion && !isSuggestionDismissed && (
              <div className="alert alert-info flex-nowrap items-center gap-3 py-2 text-sm">
                <span className="flex-1">
                  {groupSuggestion.name} a(z){" "}
                  <strong>{groupSuggestion.managedGroupName}</strong> csoportot
                  vezeti. Bekerüljön a dolgozó ebbe a csoportba?
                  {currentGroupName && (
                    <> A jelenlegi {currentGroupName} csoport lecserélődne.</>
                  )}
                </span>
                <button
                  type="button"
                  className="btn btn-xs btn-primary"
                  onClick={acceptGroupSuggestion}
                >
                  Igen
                </button>
                <button
                  type="button"
                  className="btn btn-xs btn-ghost"
                  onClick={() => setIsSuggestionDismissed(true)}
                >
                  Most nem
                </button>
              </div>
            )}

            {groupSuggestion && isSuggestionDismissed && (
              <button
                type="button"
                className="link link-primary self-start text-xs"
                onClick={acceptGroupSuggestion}
              >
                Mégis kerüljön be a(z) {groupSuggestion.managedGroupName}{" "}
                csoportba
              </button>
            )}

            <p className="text-xs opacity-60">
              Csoportot vagy közvetlen felettest meg kell adni - ezek
              valamelyikén keresztül látja a vezető a dolgozó adatait.
            </p>
          </div>

          <div className="space-y-2 border-t border-base-300 pt-4">
            <h4 className="text-sm font-semibold">Elhagyható adatok</h4>

            <FormGrid columns={3}>
              <Field label="Vállalati e-mail cím" span={2}>
                <input
                  type="email"
                  className="input input-sm input-bordered"
                  value={form.workEmail}
                  onChange={(event) => patch({ workEmail: event.target.value })}
                />
              </Field>

              <SelectField
                label="Törzsidő"
                value={form.coreHourId}
                items={coreHours}
                placeholder={
                  inheritsFromGroup
                    ? "A csoporté (nincs egyéni törzsidő)"
                    : "Válassz"
                }
                hint={
                  inheritsFromGroup
                    ? "Az első elem törli az egyéni törzsidőt, ilyenkor a csoporté érvényes."
                    : "Csoport nélkül kötelező."
                }
                onChange={(coreHourId) => patch({ coreHourId })}
              />

              <Field label="Szünet kezdete">
                <input
                  type="time"
                  className="input input-sm input-bordered"
                  value={form.breakStart}
                  onChange={(event) => patch({ breakStart: event.target.value })}
                />
              </Field>

              <Field label="Szünet vége">
                <input
                  type="time"
                  className="input input-sm input-bordered"
                  value={form.breakEnd}
                  onChange={(event) => patch({ breakEnd: event.target.value })}
                />
              </Field>

              <Field label="Szünet hossza (perc)">
                <input
                  type="number"
                  className="input input-sm input-bordered"
                  value={form.breakMinutes ?? ""}
                  onChange={(event) =>
                    patch({ breakMinutes: toNumber(event.target.value) })
                  }
                />
              </Field>

              <label className="mt-7 flex cursor-pointer items-center gap-3 md:col-span-3">
                <input
                  type="checkbox"
                  className="checkbox checkbox-sm"
                  checked={form.breakPaid}
                  onChange={(event) => patch({ breakPaid: event.target.checked })}
                />
                <span className="text-sm">A szünet munkaidőnek számít</span>
              </label>
            </FormGrid>
          </div>

          {isNew && (
            <p className="text-sm opacity-70">
              A dolgozói kód központi sorszámból képződik, egyszer kerül
              kiadásra, és később sem változik - így a dolgozó területet vagy
              költséghelyet válthat anélkül, hogy az azonosítója érvénytelenné
              válna.
            </p>
          )}

          {askDelete && (
            <div className="alert alert-warning text-sm">
              <div>
                <p className="font-semibold">Biztosan törlöd a dolgozót?</p>
                <p>
                  Törlésre csak akkor van lehetőség, ha a dolgozóhoz még nem
                  tartozik munkaidő-adat, kérelem, fiók és beosztott. Egyébként
                  a Kilépett státusz a helyes megoldás, mert a nyilvántartás
                  előzményeit meg kell őrizni.
                </p>
              </div>
            </div>
          )}
        </div>

        {errorMessage && (
          <div className="border-t border-base-300 px-6 pt-3">
            <div className="alert alert-error py-2 text-sm">
              <span>{errorMessage}</span>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between gap-2 border-t border-base-300 px-6 pb-5 pt-3">
          {employee ? (
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
                disabled={isBusy}
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
              {isSaving ? "Mentés..." : isNew ? "Felvétel" : "Módosítás"}
            </button>
          </div>
        </div>
      </div>
      <div className="modal-backdrop" onClick={isBusy ? undefined : onClose} />
    </div>
  );
};
