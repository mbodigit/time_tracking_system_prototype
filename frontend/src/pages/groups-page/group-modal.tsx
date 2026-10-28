import { useEffect, useState } from "react";
import {
  createGroup,
  updateGroup,
  deleteGroup,
  listAssignableEmployees,
  updateGroupMembers,
  type AssignableEmployee,
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

interface PersonListProps {
  title: string;
  people: AssignableEmployee[];
  selected: number[];
  showGroup?: boolean;
  lockedId?: number | null;
  onToggle: (id: number) => void;
  onToggleAll: () => void;
}

const PersonList = ({
  title,
  people,
  selected,
  showGroup,
  lockedId,
  onToggle,
  onToggleAll,
}: PersonListProps) => (
  <div className="flex flex-col rounded border border-base-300">
    <div className="flex items-center gap-2 border-b border-base-300 bg-base-200 px-2 py-1">
      <input
        type="checkbox"
        className="checkbox checkbox-xs"
        checked={
          people.filter((item) => item.id !== lockedId).length > 0 &&
          selected.length ===
            people.filter((item) => item.id !== lockedId).length
        }
        onChange={onToggleAll}
        disabled={people.filter((item) => item.id !== lockedId).length === 0}
      />
      <span className="text-sm font-semibold">
        {title} ({people.length})
      </span>
    </div>

    <div className="h-64 overflow-y-auto">
      {people.map((item) => (
        <label
          key={item.id}
          className="flex cursor-pointer items-center gap-2 px-2 py-1 hover:bg-base-200"
        >
          <input
            type="checkbox"
            className="checkbox checkbox-xs"
            checked={item.id !== lockedId && selected.includes(item.id)}
            disabled={item.id === lockedId}
            onChange={() => onToggle(item.id)}
          />
          <span className="flex-1 text-sm">
            {item.name}
            {item.id === lockedId && (
              <span className="badge badge-sm badge-primary ml-2">vezető</span>
            )}
          </span>
          {showGroup && (
            <span className="text-xs opacity-60">
              {item.groupName ?? "nincs csoport"}
            </span>
          )}
          <span className="text-xs opacity-60">{item.code}</span>
        </label>
      ))}

      {people.length === 0 && (
        <p className="px-2 py-3 text-center text-sm opacity-60">
          Nincs találat.
        </p>
      )}
    </div>
  </div>
);

interface GroupModalProps {
  group: Group | null;
  options: GroupOptions;
  onClose: () => void;
  onSaved: (message: string) => void;
  onChanged: () => void;
}

export const GroupModal = ({
  group,
  options,
  onClose,
  onSaved,
  onChanged,
}: GroupModalProps) => {
  const isNew = group === null;

  const [tab, setTab] = useState<"data" | "members">("data");
  const [form, setForm] = useState<GroupPayload>(
    group ? toForm(group) : EMPTY_FORM,
  );

  const [assignable, setAssignable] = useState<AssignableEmployee[]>([]);
  const [memberIds, setMemberIds] = useState<number[]>([]);
  const [savedMemberIds, setSavedMemberIds] = useState<number[]>([]);
  const [filter, setFilter] = useState("");
  const [pickedMembers, setPickedMembers] = useState<number[]>([]);
  const [pickedCandidates, setPickedCandidates] = useState<number[]>([]);

  const [errorMessage, setErrorMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteStep, setDeleteStep] = useState<"members" | "group" | null>(
    null,
  );

  const isBusy = isSaving || isDeleting;

  useEffect(() => {
    listAssignableEmployees()
      .then((data) => {
        setAssignable(data.employees);

        const saved = group
          ? data.employees
              .filter((item) => item.groupId === group.id)
              .map((item) => item.id)
          : [];

        const managerEmployee = group
          ? (options.managers.find((item) => item.id === group.managerId)
              ?.employeeId ?? null)
          : null;

        setSavedMemberIds(saved);
        setMemberIds(
          managerEmployee && !saved.includes(managerEmployee)
            ? [...saved, managerEmployee]
            : saved,
        );
      })
      .catch(() => setAssignable([]));
  }, [group, options]);

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

  const workingHour = options.workingHours.find(
    (item) => item.id === form.workingHourId,
  );

  const coreHours = workingHour
    ? options.coreHours.filter((item) => item.hours === workingHour.num)
    : [];

  const managerEmployeeId =
    options.managers.find((item) => item.id === form.managerId)?.employeeId ??
    null;

  const term = filter.trim().toLowerCase();

  const members = assignable.filter((item) => memberIds.includes(item.id));

  const candidates = assignable
    .filter((item) => !memberIds.includes(item.id))
    .filter(
      (item) =>
        !term ||
        [
          item.name,
          item.code,
          item.groupName,
          item.categoryName,
          item.workScheduleName,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(term),
    );

  const toggle = (list: number[], id: number) =>
    list.includes(id) ? list.filter((item) => item !== id) : [...list, id];

  const addPicked = () => {
    setMemberIds((current) => [...current, ...pickedCandidates]);
    setPickedCandidates([]);
  };

  const removePicked = () => {
    setMemberIds((current) =>
      current.filter((id) => !pickedMembers.includes(id)),
    );
    setPickedMembers([]);
  };

  const memberDiff = (saved: number[], wanted: number[]) => ({
    add: wanted.filter((id) => !saved.includes(id)),
    remove: saved.filter((id) => !wanted.includes(id)),
  });

  const handleSave = async () => {
    setErrorMessage("");
    setIsSaving(true);

    try {
      let groupId = group?.id ?? 0;
      let message = "";

      if (group) {
        const response = await updateGroup(group.id, form);
        message = response.message;
      } else {
        const response = await createGroup(form);
        groupId = response.id;
        message = response.message;
      }

      const diff = memberDiff(savedMemberIds, memberIds);

      if (diff.add.length > 0 || diff.remove.length > 0) {
        const response = await updateGroupMembers(groupId, diff);
        message = `${message} ${response.message}`;
      }

      onSaved(message);
    } catch (error) {
      fail(error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteClick = () => {
    setErrorMessage("");
    setDeleteStep(savedMemberIds.length > 0 ? "members" : "group");
  };

  const handleRemoveAll = async () => {
    if (!group) {
      return;
    }

    setErrorMessage("");
    setIsDeleting(true);

    try {
      await updateGroupMembers(group.id, { add: [], remove: savedMemberIds });
      setSavedMemberIds([]);
      setMemberIds([]);
      onChanged();
      setDeleteStep("group");
    } catch (error) {
      fail(error);
      setDeleteStep(null);
    } finally {
      setIsDeleting(false);
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
      setDeleteStep(null);
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
              {isNew ? "Új csoport felvétele" : "Csoport módosítása"}
            </h3>
            {group && <p className="mt-0.5 text-xs opacity-60">{group.name}</p>}
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

        <div role="tablist" className="tabs tabs-bordered px-6 pt-2">
          <button
            role="tab"
            className={`tab ${tab === "data" ? "tab-active" : ""}`}
            onClick={() => setTab("data")}
          >
            Adatok
          </button>
          <button
            role="tab"
            className={`tab ${tab === "members" ? "tab-active" : ""}`}
            onClick={() => setTab("members")}
          >
            Tagok ({memberIds.length})
          </button>
        </div>

        <div className="space-y-3 overflow-y-auto px-6 py-4">
          {errorMessage && (
            <div className="alert alert-error py-2 text-sm">
              <span>{errorMessage}</span>
            </div>
          )}

          {tab === "data" && (
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
                    patch({
                      workingHourId: toNumber(event.target.value),
                      coreHourId: null,
                    })
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
                  disabled={!workingHour || coreHours.length === 0}
                  onChange={(event) =>
                    patch({ coreHourId: toNumber(event.target.value) })
                  }
                >
                  <option value="">Nincs</option>
                  {coreHours.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
                {workingHour && coreHours.length === 0 && (
                  <div className="label py-1">
                    <span className="label-text-alt opacity-70">
                      Nincs {workingHour.num} órás törzsidő a törzsadatok
                      között.
                    </span>
                  </div>
                )}
              </Field>

              <Field label="Területi vezető">
                <select
                  className="select select-sm select-bordered"
                  value={form.managerId ?? ""}
                  onChange={(event) => {
                    const nextManagerId = toNumber(event.target.value);
                    const previous = managerEmployeeId;
                    const next =
                      options.managers.find((item) => item.id === nextManagerId)
                        ?.employeeId ?? null;

                    patch({ managerId: nextManagerId });

                    setMemberIds((current) => {
                      const kept = current.filter((id) => id !== previous);
                      return next && !kept.includes(next)
                        ? [...kept, next]
                        : kept;
                    });
                    setPickedMembers([]);
                  }}
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
                  onChange={(event) =>
                    patch({ description: event.target.value })
                  }
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
          )}

          {tab === "members" && (
            <div className="space-y-3">
              <input
                type="search"
                className="input input-sm input-bordered w-full"
                placeholder="Szűrés névre, kódra, jelenlegi csoportra, munkarendre..."
                value={filter}
                onChange={(event) => setFilter(event.target.value)}
              />

              <div className="grid items-start gap-3 md:grid-cols-[1fr_auto_1fr]">
                <PersonList
                  title="A csoport tagjai"
                  lockedId={managerEmployeeId}
                  people={members}
                  selected={pickedMembers}
                  onToggle={(id) =>
                    setPickedMembers((current) => toggle(current, id))
                  }
                  onToggleAll={() => {
                    const selectable = members
                      .filter((item) => item.id !== managerEmployeeId)
                      .map((item) => item.id);

                    setPickedMembers((current) =>
                      current.length === selectable.length ? [] : selectable,
                    );
                  }}
                />

                <div className="flex flex-row justify-center gap-2 md:mt-16 md:flex-col">
                  <button
                    className="btn btn-sm"
                    onClick={removePicked}
                    disabled={pickedMembers.length === 0}
                    title="Kijelöltek eltávolítása a csoportból"
                  >
                    →
                  </button>
                  <button
                    className="btn btn-sm"
                    onClick={addPicked}
                    disabled={pickedCandidates.length === 0}
                    title="Kijelöltek hozzáadása a csoporthoz"
                  >
                    ←
                  </button>
                </div>

                <PersonList
                  title="Hozzáadható dolgozók"
                  people={candidates}
                  selected={pickedCandidates}
                  showGroup
                  onToggle={(id) =>
                    setPickedCandidates((current) => toggle(current, id))
                  }
                  onToggleAll={() =>
                    setPickedCandidates((current) =>
                      current.length === candidates.length
                        ? []
                        : candidates.map((item) => item.id),
                    )
                  }
                />
              </div>

              <p className="text-sm opacity-70">
                A jobb oldali listában a dolgozó mellett a jelenlegi csoportja
                látszik. Ha olyat adsz hozzá, aki már máshová tartozik, az
                átkerül ebbe a csoportba. A csoport vezetője mindig tagja a
                csoportnak, és nem vehető ki belőle - ha mást kell megbízni, az
                Adatok fülön válassz másik vezetőt, és a rendszer egy lépésben
                elvégzi a cserét. A tagság csak mentéskor változik meg.
              </p>
            </div>
          )}

          {deleteStep === "members" && (
            <div className="alert alert-warning text-sm">
              <div>
                <p className="font-semibold">
                  A csoportban még {savedMemberIds.length} dolgozó van.
                </p>
                <p>
                  A csoport csak üresen törölhető. Eltávolítsam előbb az összes
                  dolgozót? Ők megmaradnak, csak csoport nélkül, és később másik
                  csoportba sorolhatók.
                </p>
                <div className="mt-2 flex gap-2">
                  <button
                    className="btn btn-sm btn-warning"
                    onClick={handleRemoveAll}
                    disabled={isBusy}
                  >
                    {isDeleting ? "Eltávolítás..." : "Igen, eltávolítom"}
                  </button>
                  <button
                    className="btn btn-sm btn-ghost"
                    onClick={() => setDeleteStep(null)}
                    disabled={isBusy}
                  >
                    Mégse
                  </button>
                </div>
              </div>
            </div>
          )}

          {deleteStep === "group" && (
            <div className="alert alert-error text-sm">
              <div>
                <p className="font-semibold">Biztosan törlöd a csoportot?</p>
                <p>
                  A csoport üres, a törlés véglegesen eltávolítja. Ha később még
                  szükség lehet rá, inkább állítsd Inaktív állapotra.
                </p>
                <div className="mt-2 flex gap-2">
                  <button
                    className="btn btn-sm btn-error"
                    onClick={handleDelete}
                    disabled={isBusy}
                  >
                    {isDeleting ? "Törlés..." : "Igen, törlöm"}
                  </button>
                  <button
                    className="btn btn-sm btn-ghost"
                    onClick={() => setDeleteStep(null)}
                    disabled={isBusy}
                  >
                    Mégse
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-base-300 px-6 pb-5 pt-3">
          {group ? (
            <button
              className="btn btn-sm btn-outline btn-error"
              onClick={handleDeleteClick}
              disabled={isBusy || deleteStep !== null}
            >
              Törlés
            </button>
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
