import { useCallback, useEffect, useMemo, useState } from "react";
import {
  listEmployeeAdmin,
  listEmployeeOptions,
  type AdminEmployee,
  type EmployeeOptions,
} from "../../api/employeeAdmin";
import { ApiError } from "../../api/client";
import { EmployeeModal } from "./employee-modal";
import { AccountModal, type Credentials } from "./account-modal";

type Tab = "employees" | "accounts";

const searchText = (employee: AdminEmployee): string =>
  [
    employee.code,
    employee.lastName,
    employee.firstName,
    employee.workEmail,
    employee.groupName,
    employee.categoryName,
    employee.statusName,
    employee.workScheduleName,
    employee.username,
    employee.userRoleName,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

export const EmployeesPage = () => {
  const [employees, setEmployees] = useState<AdminEmployee[]>([]);
  const [options, setOptions] = useState<EmployeeOptions | null>(null);
  const [tab, setTab] = useState<Tab>("employees");
  const [search, setSearch] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [infoMessage, setInfoMessage] = useState("");
  const [credentials, setCredentials] = useState<Credentials | null>(null);
  const [employeeModal, setEmployeeModal] = useState<{
    employee: AdminEmployee | null;
  } | null>(null);
  const [accountModal, setAccountModal] = useState<{
    employee: AdminEmployee | null;
  } | null>(null);

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
      .then(setOptions)
      .catch(() => setOptions(null));
  }, [load]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) {
      return employees;
    }

    return employees.filter((employee) => searchText(employee).includes(term));
  }, [employees, search]);

  const accountRows = useMemo(
    () => filtered.filter((employee) => employee.userId),
    [filtered],
  );

  const candidates = useMemo(
    () =>
      employees.filter((employee) => !employee.userId && employee.workEmail),
    [employees],
  );

  const handleSaved = async (message: string, next?: Credentials) => {
    setErrorMessage("");
    setInfoMessage(message);
    setCredentials(next ?? null);
    setEmployeeModal(null);
    setAccountModal(null);
    await load();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold">Dolgozók és fiókok</h1>

        <input
          type="search"
          className="input input-sm input-bordered ml-auto w-64"
          placeholder="Keresés név, kód, csoport szerint..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />

        {tab === "employees" ? (
          <button
            className="btn btn-sm btn-primary"
            onClick={() => setEmployeeModal({ employee: null })}
            disabled={!options}
          >
            Új dolgozó
          </button>
        ) : (
          <button
            className="btn btn-sm btn-primary"
            onClick={() => setAccountModal({ employee: null })}
            disabled={!options || candidates.length === 0}
            title={
              candidates.length === 0
                ? "Nincs olyan dolgozó, akinek vállalati e-mail címe van és még nincs fiókja"
                : undefined
            }
          >
            Új fiók
          </button>
        )}
      </div>

      <div role="tablist" className="tabs tabs-bordered">
        <button
          role="tab"
          className={`tab ${tab === "employees" ? "tab-active" : ""}`}
          onClick={() => setTab("employees")}
        >
          Dolgozók ({filtered.length})
        </button>
        <button
          role="tab"
          className={`tab ${tab === "accounts" ? "tab-active" : ""}`}
          onClick={() => setTab("accounts")}
        >
          Fiókok ({accountRows.length})
        </button>
      </div>

      {errorMessage && (
        <div className="alert alert-error py-2 text-sm">
          <span>{errorMessage}</span>
        </div>
      )}

      {infoMessage && (
        <div className="alert alert-success py-2 text-sm">
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

      {tab === "employees" && (
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
              {filtered.map((employee) => (
                <tr key={employee.id} className="hover">
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
                      employee.username
                    ) : (
                      <span className="opacity-60">nincs</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap text-right">
                    <button
                      className="btn btn-xs"
                      onClick={() => setEmployeeModal({ employee })}
                      disabled={!options}
                    >
                      Szerkesztés
                    </button>
                  </td>
                </tr>
              ))}

              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center opacity-60">
                    Nincs a keresésnek megfelelő dolgozó.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {tab === "accounts" && (
        <div className="overflow-x-auto">
          <table className="table table-sm">
            <thead>
              <tr>
                <th>Felhasználónév</th>
                <th>Dolgozó</th>
                <th>Kód</th>
                <th>Szerepkör</th>
                <th>Dolgozó státusza</th>
                <th>Fiók állapota</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {accountRows.map((employee) => (
                <tr key={employee.id} className="hover">
                  <td className="whitespace-nowrap">{employee.username}</td>
                  <td className="whitespace-nowrap">
                    {employee.lastName} {employee.firstName}
                  </td>
                  <td className="whitespace-nowrap">{employee.code}</td>
                  <td>{employee.userRoleName ?? "-"}</td>
                  <td>{employee.statusName ?? "-"}</td>
                  <td>
                    <span
                      className={`badge badge-sm ${
                        employee.userActive ? "badge-success" : "badge-error"
                      }`}
                    >
                      {employee.userActive ? "aktív" : "letiltva"}
                    </span>
                  </td>
                  <td className="whitespace-nowrap text-right">
                    <button
                      className="btn btn-xs"
                      onClick={() => setAccountModal({ employee })}
                      disabled={!options}
                    >
                      Kezelés
                    </button>
                  </td>
                </tr>
              ))}

              {accountRows.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center opacity-60">
                    Nincs a keresésnek megfelelő fiók.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {employeeModal && options && (
        <EmployeeModal
          employee={employeeModal.employee}
          options={options}
          onClose={() => setEmployeeModal(null)}
          onSaved={handleSaved}
        />
      )}

      {accountModal && options && (
        <AccountModal
          employee={accountModal.employee}
          candidates={candidates}
          roles={options.roles}
          onClose={() => setAccountModal(null)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
};
