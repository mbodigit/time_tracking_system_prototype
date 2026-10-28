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
import { Field, FormGrid } from "../../components/form-field/form-field";

export interface GroupNode {
  areaId: number;
  departmentId: number | null;
  shiftId: number | null;
  label: string;
  path: string;
  managerName: string | null;
}

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

interface PersonListProps {
  title: string;
  people: AssignableEmployee[];
  selected: number[];
  showGroup?: boolean;
  onToggle: (id: number) => void;
  onToggleAll: () => void;
}

const PersonList = ({
  title,
  people,
  selected,
  showGroup,
  onToggle,
  onToggleAll,
}: PersonListProps) => (
  <div className="flex flex-col rounded border border-base-300">
    <div className="flex items-center gap-2 border-b border-base-300 bg-base-200 px-2 py-1">
      <input
        type="checkbox"
        className="checkbox checkbox-xs"
        checked={people.length > 0 && selected.length === people.length}
        onChange={onToggleAll}
        disabled={people.length === 0}
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
            checked={selected.includes(item.id)}
            onChange={() => onToggle(item.id)}
          />
          <span className="flex-1 text-sm">{item.name}</span>
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
  node: GroupNode;
  options: GroupOptions;
  onClose: () => void;
  onSaved: (message: string) => void;
  onChanged: () => void;
}

export const GroupModal = ({
  group,
  node,
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

        setSavedMemberIds(saved);
        setMemberIds(saved);
      })
      .catch(() => setAssignable([]));
  }, [group]);

  const patch = (changes: Partial<GroupPayload>) =>
    setForm((current) => ({ ...current, ...changes }));

  const fail = (error: unknown) =>
    setErrorMessage(
      error instanceof ApiError ? error.message : "Ismeretlen hiba történt.",
    );

  const workingHour = options.workingHours.find(
    (item) => item.id === form.workingHourId,
  );

  const coreHours = workingHour
    ? options.coreHours.filter((item) => item.hours === workingHour.num)
    : [];

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

    const payload: GroupPayload = {
      ...form,
      areaId: node.areaId,
      departmentId: node.departmentId,
      shiftId: node.shiftId,
      managerId: null,
    };

    try {
      let groupId = group?.id ?? 0;
      let message = "";

      if (group) {
        const response = await updateGroup(group.id, payload);
        message = response.message;
      } else {
        const response = await createGroup(payload);
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
            <p className="mt-0.5 text-xs opacity-60">{node.path}</p>
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
            <>
              <div className="rounded border border-base-300 bg-base-200 px-3 py-2 text-sm">
                <p>
                  Szervezeti egység:{" "}
                  <span className="font-semibold">{node.label}</span>
                </p>
                <p className="opacity-70">
                  Vezető: {node.managerName ?? "nincs megadva"} - a csoport
                  vezetője a szervezeti egységtől öröklődik, itt nem
                  módosítható.
                </p>
              </div>

              <FormGrid>
                <Field label="Megnevezés" span={2}>
                  <input
                    type="text"
                    className="input input-sm input-bordered"
                    value={form.name}
                    onChange={(event) => patch({ name: event.target.value })}
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

                <Field
                  label="Törzsidő"
                  hint={
                    workingHour && coreHours.length === 0
                      ? `Nincs ${workingHour.num} órás törzsidő a törzsadatok között.`
                      : undefined
                  }
                >
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
                </Field>

                <Field label="Megjegyzés" span={2}>
                  <input
                    type="text"
                    className="input input-sm input-bordered"
                    value={form.description ?? ""}
                    onChange={(event) =>
                      patch({ description: event.target.value })
                    }
                  />
                </Field>
              </FormGrid>
            </>
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
                  people={members}
                  selected={pickedMembers}
                  onToggle={(id) =>
                    setPickedMembers((current) => toggle(current, id))
                  }
                  onToggleAll={() =>
                    setPickedMembers((current) =>
                      current.length === members.length
                        ? []
                        : members.map((item) => item.id),
                    )
                  }
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
                átkerül ebbe a csoportba. A tagság csak mentéskor változik meg.
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
                  dolgozót? Ők megmaradnak, csak csoport nélkül, és később
                  másik csoportba sorolhatók.
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
                  A csoport üres, a törlés véglegesen eltávolítja. Ha később
                  még szükség lehet rá, inkább állítsd Inaktív állapotra.
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
