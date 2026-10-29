import { useState } from "react";
import {
  createMasterItem,
  updateMasterItem,
  deleteMasterItem,
  type MasterEntity,
  type MasterItem,
  type MasterValue,
} from "../../api/masterData";
import { ApiError } from "../../api/client";
import { Field, FormGrid } from "../../components/form-field/form-field";

export interface MasterField {
  key: string;
  label: string;
  type: "text" | "integer" | "time" | "boolean";
  required?: boolean;
}

export const toFormValue = (value: MasterValue, type: MasterField["type"]) => {
  if (type === "boolean") {
    return Boolean(value);
  }

  if (type === "time") {
    return value ? String(value).slice(0, 5) : "";
  }

  return value === null || value === undefined ? "" : String(value);
};

interface MasterDataModalProps {
  entity: MasterEntity;
  title: string;
  fields: MasterField[];
  item: MasterItem | null;
  onClose: () => void;
  onSaved: (message: string) => void;
}

export const MasterDataModal = ({
  entity,
  title,
  fields,
  item,
  onClose,
  onSaved,
}: MasterDataModalProps) => {
  const isNew = item === null;

  const [form, setForm] = useState<Record<string, string | boolean>>(() => {
    const initial: Record<string, string | boolean> = {};

    for (const field of fields) {
      initial[field.key] = toFormValue(
        item ? item[field.key] : null,
        field.type,
      );
    }

    return initial;
  });

  const [errorMessage, setErrorMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [askDelete, setAskDelete] = useState(false);

  const isBusy = isSaving || isDeleting;

  const fail = (error: unknown) =>
    setErrorMessage(
      error instanceof ApiError ? error.message : "Ismeretlen hiba történt.",
    );

  const buildPayload = (): Record<string, MasterValue> => {
    const payload: Record<string, MasterValue> = {};

    for (const field of fields) {
      const value = form[field.key];

      if (field.type === "boolean") {
        payload[field.key] = Boolean(value);
      } else if (field.type === "integer") {
        payload[field.key] = value === "" ? null : Number(value);
      } else {
        payload[field.key] = String(value);
      }
    }

    return payload;
  };

  const handleSave = async () => {
    setErrorMessage("");
    setIsSaving(true);

    try {
      const payload = buildPayload();

      const response = item
        ? await updateMasterItem(entity, item.id, payload)
        : await createMasterItem(entity, payload);

      onSaved(response.message);
    } catch (error) {
      fail(error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!item) {
      return;
    }

    setErrorMessage("");
    setIsDeleting(true);

    try {
      const response = await deleteMasterItem(entity, item.id);
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
      <div className="modal-box max-w-xl p-0">
        <div className="flex items-start justify-between gap-3 border-b border-base-300 px-6 pb-3 pt-5">
          <h3 className="text-xl font-bold text-primary">
            {isNew ? `Új ${title.toLowerCase()}` : `${title} módosítása`}
          </h3>
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
            {fields.map((field) =>
              field.type === "boolean" ? (
                <label
                  key={field.key}
                  className="flex cursor-pointer items-center gap-3 md:col-span-2"
                >
                  <input
                    type="checkbox"
                    className="checkbox checkbox-sm"
                    checked={Boolean(form[field.key])}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        [field.key]: event.target.checked,
                      }))
                    }
                  />
                  <span className="text-sm">{field.label}</span>
                </label>
              ) : (
                <Field key={field.key} label={field.label}>
                  <input
                    type={
                      field.type === "time"
                        ? "time"
                        : field.type === "integer"
                          ? "number"
                          : "text"
                    }
                    className="input input-sm input-bordered"
                    value={String(form[field.key] ?? "")}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        [field.key]: event.target.value,
                      }))
                    }
                  />
                </Field>
              ),
            )}
          </FormGrid>

          {askDelete && (
            <div className="alert alert-warning text-sm">
              <div>
                <p className="font-semibold">Biztosan törlöd?</p>
                <p>
                  A törlés csak akkor lehetséges, ha egyetlen dolgozó vagy
                  csoport sem hivatkozik rá. A rendszer ezt ellenőrzi, és
                  megmondja, ha van ilyen hivatkozás.
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-base-300 px-6 pb-5 pt-3">
          {item ? (
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
