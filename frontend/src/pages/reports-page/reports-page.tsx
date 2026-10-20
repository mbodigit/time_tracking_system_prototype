import { useCallback, useEffect, useState } from "react";
import {
  listMonthlyReport,
  downloadPayroll,
  type MonthlyReport,
} from "../../api/reports";
import { listEmployees, type ScopeEmployee } from "../../api/lookups";
import { ApiError } from "../../api/client";
import { getCurrentUser } from "../../utils/auth";
import {
  formatMinutes,
  formatSignedMinutes,
  formatMonth,
  getCurrentMonth,
  shiftMonth,
} from "../../utils/datetime";

const EXPORT_ROLES = ["Vezető", "HR-Bér", "Admin"];

export const ReportsPage = () => {
  const [period, setPeriod] = useState(getCurrentMonth());
  const [report, setReport] = useState<MonthlyReport | null>(null);
  const [employees, setEmployees] = useState<ScopeEmployee[]>([]);
  const [employeeId, setEmployeeId] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const user = getCurrentUser();
  const canExport = EXPORT_ROLES.includes(user?.role ?? "");

  const load = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage("");
    try {
      const data = await listMonthlyReport(
        period.year,
        period.month,
        employeeId ?? undefined,
      );
      setReport(data);
    } catch (error) {
      setReport(null);
      setErrorMessage(
        error instanceof ApiError ? error.message : "Ismeretlen hiba történt.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [period, employeeId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    listEmployees()
      .then((data) => setEmployees(data.employees))
      .catch(() => setEmployees([]));
  }, []);

  const handleExport = async () => {
    setErrorMessage("");
    setIsExporting(true);
    try {
      await downloadPayroll(period.year, period.month, employeeId ?? undefined);
    } catch (error) {
      setErrorMessage(
        error instanceof ApiError ? error.message : "Ismeretlen hiba történt.",
      );
    } finally {
      setIsExporting(false);
    }
  };

  const allowanceTypes = report?.allowanceTypes ?? [];
  const totals = report?.totals;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Riport és bérfeladás</h1>

      <div className="flex items-center gap-3 flex-wrap">
        <select
          className="select select-sm select-bordered"
          value={employeeId ?? ""}
          onChange={(event) =>
            setEmployeeId(
              event.target.value ? Number(event.target.value) : null,
            )
          }
        >
          <option value="">Minden dolgozó</option>
          {employees.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name} ({item.code})
            </option>
          ))}
        </select>

        <div className="join ml-auto">
          <button
            className="btn btn-sm join-item"
            onClick={() => setPeriod(shiftMonth(period.year, period.month, -1))}
          >
            {"<"}
          </button>
          <span className="btn btn-sm join-item no-animation pointer-events-none min-w-40">
            {formatMonth(period.year, period.month)}
          </span>
          <button
            className="btn btn-sm join-item"
            onClick={() => setPeriod(shiftMonth(period.year, period.month, 1))}
          >
            {">"}
          </button>
        </div>

        {canExport && (
          <button
            className="btn btn-sm btn-primary"
            onClick={handleExport}
            disabled={isExporting}
          >
            {isExporting ? "Előállítás..." : "Bérfeladási CSV letöltése"}
          </button>
        )}
      </div>

      {errorMessage && (
        <div className="alert alert-error text-sm py-2">
          <span>{errorMessage}</span>
        </div>
      )}

      {isLoading && <span className="loading loading-spinner" />}

      {report && (
        <div className="overflow-x-auto">
          <table className="table table-sm table-pin-rows">
            <thead>
              <tr>
                <th>Dolgozó</th>
                <th>Rögzített napok</th>
                <th>Jelenlét</th>
                <th>Szünet</th>
                <th>Ledolgozott</th>
                <th>Jogcímmel fedett</th>
                <th>Elszámolt</th>
                <th>Egyenleg</th>
                {allowanceTypes.map((tipus) => (
                  <th key={tipus.code}>
                    {tipus.name}
                    <div className="font-normal opacity-60">
                      {tipus.percent}%
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {report.employees.map((sor) => (
                <tr key={sor.employeeId}>
                  <td className="whitespace-nowrap">
                    {sor.employeeName}
                    <span className="text-xs opacity-60 ml-2">
                      {sor.employeeCode}
                    </span>
                  </td>
                  <td>{sor.recordedDays}</td>
                  <td>{formatMinutes(sor.presenceMinutes)}</td>
                  <td>{formatMinutes(sor.breakMinutes)}</td>
                  <td>{formatMinutes(sor.workedMinutes)}</td>
                  <td>{formatMinutes(sor.absenceMinutes)}</td>
                  <td>{formatMinutes(sor.settledMinutes)}</td>
                  <td className={sor.balanceMinutes < 0 ? "text-error" : ""}>
                    {formatSignedMinutes(sor.balanceMinutes)}
                  </td>
                  {allowanceTypes.map((tipus) => (
                    <td key={tipus.code}>
                      {formatMinutes(sor.allowances[tipus.code] ?? 0)}
                    </td>
                  ))}
                </tr>
              ))}

              {report.employees.length === 0 && (
                <tr>
                  <td
                    colSpan={8 + allowanceTypes.length}
                    className="text-center opacity-60"
                  >
                    Nincs a hatókörödbe tartozó adat erre a hónapra.
                  </td>
                </tr>
              )}
            </tbody>

            {totals && report.employees.length > 0 && (
              <tfoot>
                <tr className="font-bold">
                  <td>Összesen</td>
                  <td />
                  <td>{formatMinutes(totals.presenceMinutes)}</td>
                  <td>{formatMinutes(totals.breakMinutes)}</td>
                  <td>{formatMinutes(totals.workedMinutes)}</td>
                  <td>{formatMinutes(totals.absenceMinutes)}</td>
                  <td>{formatMinutes(totals.settledMinutes)}</td>
                  <td>{formatSignedMinutes(totals.balanceMinutes)}</td>
                  {allowanceTypes.map((tipus) => (
                    <td key={tipus.code}>
                      {formatMinutes(totals.allowances[tipus.code] ?? 0)}
                    </td>
                  ))}
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}
    </div>
  );
};
