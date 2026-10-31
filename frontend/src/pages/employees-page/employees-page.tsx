import { useCallback, useEffect, useMemo, useState } from "react";
import {
  listEmployeeAdmin,
  listEmployeeOptions,
  type AdminEmployee,
  type EmployeeOptions,
  type SystemAccount,
} from "../../api/employeeAdmin";
import { ApiError } from "../../api/client";
import {
  useDataTable,
  TableSearch,
  SortableHeader,
  TablePager,
} from "../../components/data-table/data-table";
import { EmployeeModal } from "./employee-modal";
import { AccountModal, type Credentials } from "./account-modal";

type Tab = "employees" | "accounts";

const fullName = (employee: AdminEmployee) =>
  `${employee.lastName} ${employee.firstName}`;

const employeeSearchText = (employee: AdminEmployee) =>
  [
    employee.code,
    employee.lastName,
    employee.firstName,
    employee.workEmail,
    employee.groupName,
    employee.managerName,
    employee.categoryName,
    employee.statusName,
    employee.workScheduleName,
    employee.username,
  ]
    .filter(Boolean)
    .join(" ");

const employeeSortValue = (
  employee: AdminEmployee,
  key: string,
): number | string => {
  if (key === "code") return employee.code;
  if (key === "name") return fullName(employee);
  if (key === "group") return employee.groupName ?? "";
  if (key === "manager") return employee.managerName ?? "";
  if (key === "category") return employee.categoryName ?? "";
  if (key === "status") return employee.statusName ?? "";
  if (key === "schedule") return employee.workScheduleName ?? "";
  if (key === "account") return employee.username ?? "";
  return "";
};

const accountSearchText = (employee: AdminEmployee) =>
  [
    employee.username,
    employee.code,
    employee.lastName,
    employee.firstName,
    employee.userRoleName,
    employee.statusName,
  ]
    .filter(Boolean)
    .join(" ");

const accountSortValue = (
  employee: AdminEmployee,
  key: string,
): number | string => {
  if (key === "username") return employee.username ?? "";
  if (key === "name") return fullName(employee);
  if (key === "code") return employee.code;
  if (key === "role") return employee.userRoleName ?? "";
  if (key === "status") return employee.statusName ?? "";
  if (key === "active") return employee.userActive ? 1 : 0;
  if (key === "locked") return employee.userLocked ? 1 : 0;
  return "";
};

const rendszerFiokSora = (fiok: SystemAccount): AdminEmployee => ({
  id: -fiok.userId,
  code: "—",
  firstName: "fiók",
  lastName: "Rendszer",
  workEmail: null,
  groupId: null,
  groupName: null,
  categoryId: null,
  categoryName: null,
  statusId: null,
  statusName: "Dolgozó nélküli",
  isActive: true,
  costCenterId: null,
  costCenterName: null,
  workScheduleId: null,
  workScheduleName: null,
  workingHourId: null,
  workingHourNum: null,
  coreHourId: null,
  coreHourName: null,
  breakMinutes: null,
  breakPaid: false,
  breakStart: null,
  breakEnd: null,
  annualLeaveDays: null,
  managerId: null,
  managerName: null,
  userId: fiok.userId,
  username: fiok.username,
  userActive: fiok.userActive,
  userLocked: fiok.userLocked,
  userRoleId: fiok.userRoleId,
  userRoleName: fiok.userRoleName,
});

export const EmployeesPage = () => {
  const [employees, setEmployees] = useState<AdminEmployee[]>([]);
  const [systemAccounts, setSystemAccounts] = useState<SystemAccount[]>([]);
  const [options, setOptions] = useState<EmployeeOptions | null>(null);
  const [tab, setTab] = useState<Tab>("employees");
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
      setSystemAccounts(data.systemAccounts ?? []);
    } catch (error) {
      setEmployees([]);
      setSystemAccounts([]);
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

  const accountSource = useMemo(
    () => [
      ...systemAccounts.map(rendszerFiokSora),
      ...employees.filter((employee) => employee.userId),
    ],
    [employees, systemAccounts],
  );

  const candidates = useMemo(
    () =>
      employees.filter((employee) => !employee.userId && employee.workEmail),
    [employees],
  );

  const employeeTable = useDataTable({
    rows: employees,
    searchText: employeeSearchText,
    sortValue: employeeSortValue,
    initialSortKey: "name",
  });

  const accountTable = useDataTable({
    rows: accountSource,
    searchText: accountSearchText,
    sortValue: accountSortValue,
    initialSortKey: "username",
  });

  const activeTable = tab === "employees" ? employeeTable : accountTable;

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

        <div className="ml-auto">
          <TableSearch
            table={activeTable}
            placeholder={
              tab === "employees"
                ? "Keresés név, kód, csoport szerint..."
                : "Keresés felhasználónév, szerepkör szerint..."
            }
          />
        </div>

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
          Dolgozók ({employeeTable.filtered})
        </button>
        <button
          role="tab"
          className={`tab ${tab === "accounts" ? "tab-active" : ""}`}
          onClick={() => setTab("accounts")}
        >
          Fiókok ({accountTable.filtered})
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
                <SortableHeader
                  table={employeeTable}
                  field="code"
                  label="Kód"
                />
                <SortableHeader
                  table={employeeTable}
                  field="name"
                  label="Név"
                />
                <SortableHeader
                  table={employeeTable}
                  field="group"
                  label="Csoport"
                />
                <SortableHeader
                  table={employeeTable}
                  field="manager"
                  label="Közvetlen felettes"
                />
                <SortableHeader
                  table={employeeTable}
                  field="category"
                  label="Állománycsoport"
                />
                <SortableHeader
                  table={employeeTable}
                  field="status"
                  label="Státusz"
                />
                <SortableHeader
                  table={employeeTable}
                  field="schedule"
                  label="Munkarend"
                />
                <SortableHeader
                  table={employeeTable}
                  field="account"
                  label="Fiók"
                />
                <th />
              </tr>
            </thead>
            <tbody>
              {employeeTable.rows.map((employee) => (
                <tr key={employee.id} className="hover">
                  <td className="whitespace-nowrap">{employee.code}</td>
                  <td className="whitespace-nowrap">{fullName(employee)}</td>
                  <td>{employee.groupName ?? "-"}</td>
                  <td className="whitespace-nowrap">
                    {employee.managerName ?? "-"}
                  </td>
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

              {employeeTable.rows.length === 0 && (
                <tr>
                  <td colSpan={9} className="text-center opacity-60">
                    Nincs a keresésnek megfelelő dolgozó.
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          <TablePager table={employeeTable} unit="dolgozó" />
        </div>
      )}

      {tab === "accounts" && (
        <div className="overflow-x-auto">
          <table className="table table-sm">
            <thead>
              <tr>
                <SortableHeader
                  table={accountTable}
                  field="username"
                  label="Felhasználónév"
                />
                <SortableHeader
                  table={accountTable}
                  field="name"
                  label="Dolgozó"
                />
                <SortableHeader table={accountTable} field="code" label="Kód" />
                <SortableHeader
                  table={accountTable}
                  field="role"
                  label="Szerepkör"
                />
                <SortableHeader
                  table={accountTable}
                  field="status"
                  label="Dolgozó státusza"
                />
                <SortableHeader
                  table={accountTable}
                  field="active"
                  label="Fiók állapota"
                />
                <th />
              </tr>
            </thead>
            <tbody>
              {accountTable.rows.map((employee) => (
                <tr key={employee.id} className="hover">
                  <td className="whitespace-nowrap">{employee.username}</td>
                  <td className="whitespace-nowrap">{fullName(employee)}</td>
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
                    {employee.userLocked && (
                      <span className="badge badge-sm badge-warning ml-1">
                        zárolva
                      </span>
                    )}
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

              {accountTable.rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center opacity-60">
                    Nincs a keresésnek megfelelő fiók.
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          <TablePager table={accountTable} unit="fiók" />
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
