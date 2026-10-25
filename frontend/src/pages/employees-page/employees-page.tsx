import { useCallback, useEffect, useState } from "react";
import {
  listEmployeeAdmin,
  listEmployeeOptions,
  createEmployee,
  updateEmployee,
  createUserAccount,
  setUserActive,
  resetUserPassword,
  type AdminEmployee,
  type EmployeeOptions,
  type EmployeePayload,
} from "../../api/employeeAdmin";
import { ApiError } from "../../api/client";

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

export const EmployeesPage = () => {
  const [employees, setEmployees] = useState<AdminEmployee[]>([]);
  const [options, setOptions] = useState<EmployeeOptions | null>(null);
  const [form, setForm] = useState<EmployeePayload>(EMPTY_FORM);
  const [editedId, setEditedId] = useState<number | null>(null);
  const [roleId, setRoleId] = useState<number | null>(null);
  const [credentials, setCredentials] = useState<{
    username: string;
    password: string;
  } | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [infoMessage, setInfoMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await listEmployeeAdmin();
      setEmployees(data.employees);
    } catch (error) {
      setEmployees([]);
      setErrorMessage(
        error instanceof ApiError ? error.message : "Ismeretlen hiba történt.",
      );
    }
  }, []);

  useEffect(() => {
    load();
    listEmployeeOptions()
      .then((data) => {
        setOptions(data);
        setRoleId(data.roles[0]?.id ?? null);
      })
      .catch(() => setOptions(null));
  }, [load]);

  const reset = () => {
    setEditedId(null);
    setForm(EMPTY_FORM);
    setErrorMessage("");
    setInfoMessage("");
    setCredentials(null);
  };

  const startEdit = (employee: AdminEmployee) => {
    setEditedId(employee.id);
    setErrorMessage("");
    setInfoMessage("");
    setCredentials(null);
    setForm({
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
  };

  const handleSave = async () => {
    setErrorMessage("");
    setInfoMessage("");
    setIsSaving(true);
    try {
      if (editedId) {
        const response = await updateEmployee(editedId, form);
        setInfoMessage(response.message);
      } else {
        const response = await createEmployee(form);
        setInfoMessage(`${response.message} Dolgozói kód: ${response.code}`);
        setForm(EMPTY_FORM);
      }
      await load();
    } catch (error) {
      setErrorMessage(
        error instanceof ApiError ? error.message : "Ismeretlen hiba történt.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const runAccountAction = async <T extends { message: string }>(
    action: () => Promise<T>,
  ): Promise<T | null> => {
    setErrorMessage("");
    setInfoMessage("");
    setCredentials(null);
    try {
      const response = await action();
      setInfoMessage(response.message);
      await load();
      return response;
    } catch (error) {
      setErrorMessage(
        error instanceof ApiError ? error.message : "Ismeretlen hiba történt.",
      );
      return null;
    }
  };

  const handleCreateAccount = async (employee: AdminEmployee) => {
    if (!roleId) {
      setErrorMessage("Válassz szerepkört a fiók létrehozásához.");
      return;
    }

    const response = await runAccountAction(() =>
      createUserAccount(employee.id, roleId),
    );

    if (response) {
      setCredentials({
        username: response.username,
        password: response.password,
      });
    }
  };

  const handleResetPassword = async (employee: AdminEmployee) => {
    if (!employee.userId) {
      return;
    }

    const response = await runAccountAction(() =>
      resetUserPassword(employee.userId as number),
    );

    if (response) {
      setCredentials({
        username: employee.username ?? "",
        password: response.password,
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold">Dolgozók és fiókok</h1>
        <button className="btn btn-sm ml-auto" onClick={reset}>
          Új dolgozó
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

      {credentials && (
        <div className="alert alert-warning text-sm">
          <div>
            <p className="font-semibold">
              Jegyezd fel, mert többször nem jelenik meg.
            </p>
            <p>
              Felhasználónév: <code>{credentials.username}</code> — kezdeti
              jelszó: <code>{credentials.password}</code>
            </p>
            <p className="opacity-80">
              A dolgozó az első belépéskor kötelezően jelszót cserél.
            </p>
          </div>
        </div>
      )}

      <div className="card bg-base-200">
        <div className="card-body space-y-3">
          <h2 className="card-title text-base">
            {editedId ? "Dolgozó adatai" : "Új dolgozó felvétele"}
          </h2>

          <div className="grid gap-3 md:grid-cols-4">
            <label className="form-control">
              <div className="label py-1">
                <span className="label-text">Vezetéknév</span>
              </div>
              <input
                type="text"
                className="input input-sm input-bordered"
                value={form.lastName}
                onChange={(event) =>
                  setForm({ ...form, lastName: event.target.value })
                }
              />
            </label>

            <label className="form-control">
              <div className="label py-1">
                <span className="label-text">Keresztnév</span>
              </div>
              <input
                type="text"
                className="input input-sm input-bordered"
                value={form.firstName}
                onChange={(event) =>
                  setForm({ ...form, firstName: event.target.value })
                }
              />
            </label>

            <label className="form-control md:col-span-2">
              <div className="label py-1">
                <span className="label-text">Vállalati e-mail cím</span>
              </div>
              <input
                type="email"
                className="input input-sm input-bordered"
                value={form.workEmail}
                onChange={(event) =>
                  setForm({ ...form, workEmail: event.target.value })
                }
              />
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
                <span className="label-text">Állománycsoport</span>
              </div>
              <select
                className="select select-sm select-bordered"
                value={form.categoryId ?? ""}
                onChange={(event) =>
                  setForm({ ...form, categoryId: toNumber(event.target.value) })
                }
              >
                <option value="">Válassz</option>
                {options?.categories.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="form-control">
              <div className="label py-1">
                <span className="label-text">Státusz</span>
              </div>
              <select
                className="select select-sm select-bordered"
                value={form.statusId ?? ""}
                onChange={(event) =>
                  setForm({ ...form, statusId: toNumber(event.target.value) })
                }
              >
                <option value="">Válassz</option>
                {options?.statuses.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="form-control">
              <div className="label py-1">
                <span className="label-text">Csoport</span>
              </div>
              <select
                className="select select-sm select-bordered"
                value={form.groupId ?? ""}
                onChange={(event) =>
                  setForm({ ...form, groupId: toNumber(event.target.value) })
                }
              >
                <option value="">Nincs</option>
                {options?.groups.map((item) => (
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
                <span className="label-text">Napi munkaidő</span>
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
                <span className="label-text">Közvetlen felettes</span>
              </div>
              <select
                className="select select-sm select-bordered"
                value={form.managerId ?? ""}
                onChange={(event) =>
                  setForm({ ...form, managerId: toNumber(event.target.value) })
                }
              >
                <option value="">Nincs</option>
                {options?.managers
                  .filter((item) => item.id !== editedId)
                  .map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
              </select>
            </label>

            <label className="form-control">
              <div className="label py-1">
                <span className="label-text">Szünet kezdete</span>
              </div>
              <input
                type="time"
                className="input input-sm input-bordered"
                value={form.breakStart}
                onChange={(event) =>
                  setForm({ ...form, breakStart: event.target.value })
                }
              />
            </label>

            <label className="form-control">
              <div className="label py-1">
                <span className="label-text">Szünet vége</span>
              </div>
              <input
                type="time"
                className="input input-sm input-bordered"
                value={form.breakEnd}
                onChange={(event) =>
                  setForm({ ...form, breakEnd: event.target.value })
                }
              />
            </label>

            <label className="form-control">
              <div className="label py-1">
                <span className="label-text">Szünet hossza (perc)</span>
              </div>
              <input
                type="number"
                className="input input-sm input-bordered"
                value={form.breakMinutes ?? ""}
                onChange={(event) =>
                  setForm({
                    ...form,
                    breakMinutes: toNumber(event.target.value),
                  })
                }
              />
            </label>

            <label className="form-control">
              <div className="label py-1">
                <span className="label-text">Éves szabadságkeret (nap)</span>
              </div>
              <input
                type="number"
                className="input input-sm input-bordered"
                value={form.annualLeaveDays ?? ""}
                onChange={(event) =>
                  setForm({
                    ...form,
                    annualLeaveDays: toNumber(event.target.value),
                  })
                }
              />
            </label>

            <label className="label cursor-pointer justify-start gap-3 mt-7">
              <input
                type="checkbox"
                className="checkbox checkbox-sm"
                checked={form.breakPaid}
                onChange={(event) =>
                  setForm({ ...form, breakPaid: event.target.checked })
                }
              />
              <span className="label-text">A szünet munkaidőnek számít</span>
            </label>
          </div>

          <div className="flex gap-2">
            <button
              className="btn btn-sm btn-primary"
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving ? "Mentés..." : editedId ? "Módosítás" : "Felvétel"}
            </button>
            {editedId && (
              <button className="btn btn-sm btn-ghost" onClick={reset}>
                Mégse
              </button>
            )}
          </div>

          {!editedId && (
            <p className="text-sm opacity-70">
              A dolgozói kód központi sorszámból képződik, egyszer kerül
              kiadásra, és később sem változik - így a dolgozó területet vagy
              költséghelyet válthat anélkül, hogy az azonosítója érvénytelenné
              válna.
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <span className="text-sm opacity-70">
          Fiók létrehozásakor a szerepkör:
        </span>
        <select
          className="select select-sm select-bordered"
          value={roleId ?? ""}
          onChange={(event) => setRoleId(toNumber(event.target.value))}
        >
          {options?.roles.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-x-auto">
        <table className="table table-sm">
          <thead>
            <tr>
              <th>Kód</th>
              <th>Név</th>
              <th>Csoport</th>
              <th>Állománycsoport</th>
              <th>Státusz</th>
              <th>Munkarend</th>
              <th>Fiók</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {employees.map((employee) => (
              <tr
                key={employee.id}
                className={editedId === employee.id ? "bg-base-300" : ""}
              >
                <td className="whitespace-nowrap">{employee.code}</td>
                <td className="whitespace-nowrap">
                  {employee.lastName} {employee.firstName}
                </td>
                <td>{employee.groupName ?? "-"}</td>
                <td>{employee.categoryName ?? "-"}</td>
                <td>
                  <span
                    className={`badge badge-sm ${
                      employee.isActive ? "badge-success" : "badge-ghost"
                    }`}
                  >
                    {employee.statusName ?? "-"}
                  </span>
                </td>
                <td>{employee.workScheduleName ?? "-"}</td>
                <td className="whitespace-nowrap">
                  {employee.userId ? (
                    <>
                      {employee.username}
                      <span
                        className={`badge badge-sm ml-2 ${
                          employee.userActive ? "badge-success" : "badge-error"
                        }`}
                      >
                        {employee.userActive ? "aktív" : "letiltva"}
                      </span>
                    </>
                  ) : (
                    <span className="opacity-60">nincs fiók</span>
                  )}
                </td>
                <td className="whitespace-nowrap">
                  <button
                    className="btn btn-xs"
                    onClick={() => startEdit(employee)}
                  >
                    Szerkesztés
                  </button>

                  {!employee.userId && (
                    <button
                      className="btn btn-xs btn-ghost ml-1"
                      onClick={() => handleCreateAccount(employee)}
                      disabled={!employee.workEmail}
                      title={
                        employee.workEmail
                          ? undefined
                          : "Vállalati e-mail cím nélkül nem hozható létre fiók"
                      }
                    >
                      Fiók létrehozása
                    </button>
                  )}

                  {employee.userId && (
                    <>
                      <button
                        className="btn btn-xs btn-ghost ml-1"
                        onClick={() => handleResetPassword(employee)}
                      >
                        Új jelszó
                      </button>
                      <button
                        className="btn btn-xs btn-ghost ml-1"
                        onClick={() =>
                          runAccountAction(() =>
                            setUserActive(
                              employee.userId as number,
                              !employee.userActive,
                            ),
                          )
                        }
                      >
                        {employee.userActive ? "Letiltás" : "Engedélyezés"}
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
