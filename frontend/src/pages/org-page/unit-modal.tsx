import { useState } from "react";
import {
  createUnit,
  updateUnit,
  deleteUnit,
  type OrgEntity,
  type OrgManager,
} from "../../api/org";
import { ApiError } from "../../api/client";
import { Field, FormGrid } from "../../components/form-field/form-field";

export interface UnitDraft {
  id: number;
  name: string;
  parentId: number | null;
  managerId: number | null;
}

export interface DerivedGroup {
  name: string;
  activeEmployees: number;
}

interface UnitModalProps {
  entity: OrgEntity;
  label: string;
  unit: UnitDraft | null;
  parentId: number | null;
  parentLabel: string;
  parentOptions: { id: number; name: string }[];
  parentRequired: boolean;
  managers: OrgManager[];
  derivedGroups: DerivedGroup[];
  onClose: () => void;
  onSaved: (message: string) => void;
}

export const UnitModal = ({
  entity,
  label,
  unit,
  parentId,
  parentLabel,
  parentOptions,
  parentRequired,
  managers,
  derivedGroups,
  onClose,
  onSaved,
}: UnitModalProps) => {
  const isNew = unit === null;

  const [name, setName] = useState(unit?.name ?? "");
  const [selectedParentId, setSelectedParentId] = useState<number | null>(
    unit ? unit.parentId : parentId,
  );
  const [managerId, setManagerId] = useState<number | null>(
    unit?.managerId ?? null,
  );
  const [errorMessage, setErrorMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [askDelete, setAskDelete] = useState(false);

  const isBusy = isSaving || isDeleting;

  const availableManagers = managers.filter(
    (item) => !item.assignedUnit || item.id === unit?.managerId,
  );

  const totalEmployees = derivedGroups.reduce(
    (sum, item) => sum + item.activeEmployees,
    0,
  );

  const fail = (error: unknown) =>
    setErrorMessage(
      error instanceof ApiError ? error.message : "Ismeretlen hiba történt.",
    );

  const handleSave = async () => {
    setErrorMessage("");

    if (!name.trim()) {
      setErrorMessage("A megnevezés megadása kötelező.");
      return;
    }

    if (parentRequired && !selectedParentId) {
      setErrorMessage(`A felettes ${parentLabel.toLowerCase()} megadása kötelező.`);
      return;
    }

    setIsSaving(true);

    try {
      const payload = {
        name: name.trim(),
        parentId: selectedParentId,
        managerId,
      };

      const response = unit
        ? await updateUnit(entity, unit.id, payload)
        : await createUnit(entity, payload);

      onSaved(response.message);
    } catch (error) {
      fail(error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!unit) {
      return;
    }

    setErrorMessage("");
    setIsDeleting(true);

    try {
      const response = await deleteUnit(entity, unit.id);
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
      <div className="modal-box max-w-2xl p-0">
        <div className="flex items-start justify-between gap-3 border-b border-base-300 px-6 pb-3 pt-5">
          <div>
            <h3 className="text-xl font-bold text-primary">
              {isNew ? `Új ${label.toLowerCase()}` : `${label} módosítása`}
            </h3>
            {unit && <p className="mt-0.5 text-xs opacity-60">{unit.name}</p>}
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

        <div className="space-y-5 px-6 py-5">
          {errorMessage && (
            <div className="alert alert-error py-2 text-sm">
              <span>{errorMessage}</span>
            </div>
          )}

          <FormGrid columns={2}>
            <Field label="Megnevezés" span={2}>
              <input
                type="text"
                className="input input-sm input-bordered"
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </Field>

            <Field label={`Felettes ${parentLabel.toLowerCase()}`}>
              <select
                className="select select-sm select-bordered"
                value={selectedParentId ?? ""}
                onChange={(event) =>
                  setSelectedParentId(
                    event.target.value ? Number(event.target.value) : null,
                  )
                }
              >
                <option value="">
                  {parentRequired ? "Válassz" : "Nincs - ez a legfelső szint"}
                </option>
                {parentOptions.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </Field>

            <Field
              label="Vezető"
              hint="Egy vezető egyetlen szervezeti egységet vezethet, ezért csak a még szabad vezetők választhatók. A csoport vezetője innen öröklődik."
            >
              <select
                className="select select-sm select-bordered"
                value={managerId ?? ""}
                onChange={(event) =>
                  setManagerId(
                    event.target.value ? Number(event.target.value) : null,
                  )
                }
              >
                <option value="">Nincs vezető</option>
                {availableManagers.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </Field>
          </FormGrid>

          {!isNew && (
            <div className="rounded-lg border border-base-300 bg-base-200 px-4 py-3 text-sm">
              <p className="font-semibold">
                Ezen a szinten keresztül látott csoportok
              </p>
              {derivedGroups.length === 0 ? (
                <p className="mt-1 opacity-70">
                  Egyetlen csoport sem tartozik ide vagy az alatta lévő
                  szintekre.
                </p>
              ) : (
                <>
                  <ul className="mt-2 grid gap-x-6 gap-y-1 sm:grid-cols-2">
                    {derivedGroups.map((item) => (
                      <li
                        key={item.name}
                        className="flex justify-between gap-3 border-b border-base-300/60 pb-1"
                      >
                        <span>{item.name}</span>
                        <span className="whitespace-nowrap opacity-70">
                          {item.activeEmployees} fő
                        </span>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-2 opacity-70">
                    Összesen {derivedGroups.length} csoport, {totalEmployees}{" "}
                    aktív dolgozó.
                  </p>
                </>
              )}
            </div>
          )}

          {askDelete && (
            <div className="alert alert-warning text-sm">
              <div>
                <p className="font-semibold">
                  Biztosan törlöd ezt a szervezeti egységet?
                </p>
                <p>
                  A törlés csak akkor lehetséges, ha nem tartozik hozzá sem
                  alárendelt egység, sem csoport.
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-base-300 px-6 pb-5 pt-3">
          {unit ? (
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
              {isSaving ? "Mentés..." : isNew ? "Létrehozás" : "Módosítás"}
            </button>
          </div>
        </div>
      </div>
      <div className="modal-backdrop" onClick={isBusy ? undefined : onClose} />
    </div>
  );
};
