import { useState } from "react";
import {
  createUserAccount,
  resetUserPassword,
  setUserActive,
  setUserRole,
  type AdminEmployee,
  type AdminOption,
} from "../../api/employeeAdmin";
import { ApiError } from "../../api/client";
import { Field } from "../../components/form-field/form-field";

export interface Credentials {
  username: string;
  password: string;
}

interface AccountModalProps {
  employee: AdminEmployee | null;
  candidates: AdminEmployee[];
  roles: AdminOption[];
  onClose: () => void;
  onSaved: (message: string, credentials?: Credentials) => void;
}

export const AccountModal = ({
  employee,
  candidates,
  roles,
  onClose,
  onSaved,
}: AccountModalProps) => {
  const isNew = employee === null;
  const [employeeId, setEmployeeId] = useState<number | null>(
    candidates[0]?.id ?? null,
  );
  const [roleId, setRoleId] = useState<number | null>(
    employee?.userRoleId ?? roles[0]?.id ?? null,
  );
  const [errorMessage, setErrorMessage] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const [askDisable, setAskDisable] = useState(false);

  const run = async <T,>(action: () => Promise<T>): Promise<T | null> => {
    setErrorMessage("");
    setIsBusy(true);

    try {
      return await action();
    } catch (error) {
      setErrorMessage(
        error instanceof ApiError ? error.message : "Ismeretlen hiba történt.",
      );
      return null;
    } finally {
      setIsBusy(false);
    }
  };

  const handleCreate = async () => {
    if (!employeeId || !roleId) {
      setErrorMessage("A dolgozó és a szerepkör megadása kötelező.");
      return;
    }

    const response = await run(() => createUserAccount(employeeId, roleId));

    if (response) {
      onSaved(response.message, {
        username: response.username,
        password: response.password,
      });
    }
  };

  const handleRole = async () => {
    if (!employee?.userId || !roleId) {
      return;
    }

    const userId = employee.userId;
    const response = await run(() => setUserRole(userId, roleId));

    if (response) {
      onSaved(response.message);
    }
  };

  const handlePassword = async () => {
    if (!employee?.userId) {
      return;
    }

    const userId = employee.userId;
    const response = await run(() => resetUserPassword(userId));

    if (response) {
      onSaved(response.message, {
        username: employee.username ?? "",
        password: response.password,
      });
    }
  };

  const handleActive = async (isActive: boolean) => {
    if (!employee?.userId) {
      return;
    }

    const userId = employee.userId;
    const response = await run(() => setUserActive(userId, isActive));

    if (response) {
      onSaved(response.message);
    }
  };

  return (
    <div className="modal modal-open">
      <div className="modal-box max-w-xl p-0">
        <div className="flex items-start justify-between gap-3 border-b border-base-300 px-6 pb-3 pt-5">
          <div>
            <h3 className="text-xl font-bold text-primary">
              {isNew ? "Új fiók létrehozása" : "Fiók kezelése"}
            </h3>
            {employee && (
              <p className="mt-0.5 text-xs opacity-60">
                {employee.username} — {employee.lastName} {employee.firstName}
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

        <div className="space-y-3 px-6 py-4">
          {errorMessage && (
            <div className="alert alert-error py-2 text-sm">
              <span>{errorMessage}</span>
            </div>
          )}

          {isNew && candidates.length === 0 && (
            <div className="alert alert-info py-2 text-sm">
              <span>
                Nincs olyan dolgozó, akinek vállalati e-mail címe van és még
                nincs fiókja. Fiók csak ilyen dolgozóhoz hozható létre.
              </span>
            </div>
          )}

          {isNew && candidates.length > 0 && (
            <Field label="Dolgozó">
              <select
                className="select select-sm select-bordered"
                value={employeeId ?? ""}
                onChange={(event) =>
                  setEmployeeId(
                    event.target.value ? Number(event.target.value) : null,
                  )
                }
              >
                {candidates.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.code} — {item.lastName} {item.firstName} (
                    {item.workEmail})
                  </option>
                ))}
              </select>
            </Field>
          )}

          {!isNew && employee && (
            <div className="flex items-center gap-3 text-sm">
              <span className="opacity-70">A fiók állapota:</span>
              <span
                className={`badge badge-sm ${
                  employee.userActive ? "badge-success" : "badge-error"
                }`}
              >
                {employee.userActive ? "aktív" : "letiltva"}
              </span>
            </div>
          )}

          <Field label="Szerepkör">
            <select
              className="select select-sm select-bordered"
              value={roleId ?? ""}
              onChange={(event) =>
                setRoleId(
                  event.target.value ? Number(event.target.value) : null,
                )
              }
            >
              {roles.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </Field>

          {isNew ? (
            <p className="text-sm opacity-70">
              A felhasználónév a vállalati e-mail cím előtagjából képződik, a
              kezdeti jelszót a rendszer generálja, és a dolgozónak az első
              belépéskor kötelezően cserélnie kell.
            </p>
          ) : (
            <>
              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  className="btn btn-sm btn-primary"
                  onClick={handleRole}
                  disabled={isBusy || roleId === employee?.userRoleId}
                >
                  Szerepkör mentése
                </button>
                <button
                  className="btn btn-sm"
                  onClick={handlePassword}
                  disabled={isBusy}
                >
                  Új jelszó generálása
                </button>
                {employee?.userActive ? (
                  <button
                    className="btn btn-sm btn-outline btn-error"
                    onClick={() => setAskDisable(true)}
                    disabled={isBusy || askDisable}
                  >
                    Letiltás
                  </button>
                ) : (
                  <button
                    className="btn btn-sm btn-outline"
                    onClick={() => handleActive(true)}
                    disabled={isBusy}
                  >
                    Engedélyezés
                  </button>
                )}
              </div>

              {askDisable && (
                <div className="alert alert-warning text-sm">
                  <div>
                    <p className="font-semibold">Biztosan letiltod a fiókot?</p>
                    <p>
                      A dolgozó ezután nem tud belépni, de a törzsadata és a
                      korábban rögzített munkaideje megmarad, a munkaidejét
                      pedig a műszakvezető a csoportos rögzítésben továbbra is
                      rögzítheti.
                    </p>
                    <div className="mt-2 flex gap-2">
                      <button
                        className="btn btn-sm btn-error"
                        onClick={() => handleActive(false)}
                        disabled={isBusy}
                      >
                        Igen, letiltom
                      </button>
                      <button
                        className="btn btn-sm btn-ghost"
                        onClick={() => setAskDisable(false)}
                        disabled={isBusy}
                      >
                        Vissza
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <p className="text-sm opacity-70">
                A letiltás a hozzáférést vonja meg, nem a munkaviszonyt zárja le
                - akkor is indokolt, ha a dolgozónak az új területén már nincs
                szüksége fiókra. A saját fiók és az utolsó aktív Admin fiók nem
                tiltható le. A fiók fizikai törlésére nincs lehetőség, mert a
                rögzített munkaidő-adatok és a jóváhagyások hozzá kapcsolódnak.
              </p>
            </>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-base-300 px-6 pb-5 pt-3">
          <button
            className="btn btn-sm btn-ghost"
            onClick={onClose}
            disabled={isBusy}
          >
            Bezárás
          </button>
          {isNew && (
            <button
              className="btn btn-sm btn-primary"
              onClick={handleCreate}
              disabled={isBusy || candidates.length === 0}
            >
              {isBusy ? "Létrehozás..." : "Fiók létrehozása"}
            </button>
          )}
        </div>
      </div>
      <div className="modal-backdrop" onClick={isBusy ? undefined : onClose} />
    </div>
  );
};
