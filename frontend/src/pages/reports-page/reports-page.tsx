import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  listMonthlyReport,
  downloadPayroll,
  type MonthlyReport,
  type ReportRow,
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

const CHART_COLORS = [
  "#2563eb",
  "#0ea5e9",
  "#f59e0b",
  "#ef4444",
  "#10b981",
  "#8b5cf6",
  "#64748b",
];

const toHours = (minutes: number): number =>
  Math.round((minutes / 60) * 100) / 100;

const hourLabel = (value: number): string =>
  `${value.toString().replace(".", ",")} óra`;

type SortDirection = "asc" | "desc";

export const ReportsPage = () => {
  const [period, setPeriod] = useState(getCurrentMonth());
  const [report, setReport] = useState<MonthlyReport | null>(null);
  const [employees, setEmployees] = useState<ScopeEmployee[]>([]);
  const [employeeId, setEmployeeId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState("employeeName");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
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

  const sortValue = (row: ReportRow, key: string): number | string => {
    if (key === "employeeName") return row.employeeName;
    if (key.startsWith("allowance:")) {
      return row.allowances[key.slice("allowance:".length)] ?? 0;
    }
    return (row as unknown as Record<string, number>)[key] ?? 0;
  };

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDirection((direction) => (direction === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(key);
    setSortDirection("asc");
  };

  const sortIndicator = (key: string) =>
    sortKey === key ? (sortDirection === "asc" ? " ▲" : " ▼") : "";

  const visibleRows = useMemo(() => {
    const rows = (report?.employees ?? []).filter((row) => {
      const term = search.trim().toLowerCase();
      if (!term) return true;
      return (
        row.employeeName.toLowerCase().includes(term) ||
        row.employeeCode.toLowerCase().includes(term)
      );
    });

    return [...rows].sort((a, b) => {
      const left = sortValue(a, sortKey);
      const right = sortValue(b, sortKey);

      const result =
        typeof left === "string" && typeof right === "string"
          ? left.localeCompare(right, "hu")
          : Number(left) - Number(right);

      return sortDirection === "asc" ? result : -result;
    });
  }, [report, search, sortKey, sortDirection]);

  const visibleTotals = useMemo(() => {
    const totals = {
      workedMinutes: 0,
      presenceMinutes: 0,
      breakMinutes: 0,
      balanceMinutes: 0,
      absenceMinutes: 0,
      settledMinutes: 0,
      allowances: {} as Record<string, number>,
      absences: {} as Record<string, number>,
    };

    for (const row of visibleRows) {
      totals.workedMinutes += row.workedMinutes;
      totals.presenceMinutes += row.presenceMinutes;
      totals.breakMinutes += row.breakMinutes;
      totals.balanceMinutes += row.balanceMinutes;
      totals.absenceMinutes += row.absenceMinutes;
      totals.settledMinutes += row.settledMinutes;

      for (const [code, minutes] of Object.entries(row.allowances)) {
        totals.allowances[code] = (totals.allowances[code] || 0) + minutes;
      }
      for (const [name, absence] of Object.entries(row.absences || {})) {
        totals.absences[name] = (totals.absences[name] || 0) + absence.minutes;
      }
    }

    return totals;
  }, [visibleRows]);

  const employeeChartData = visibleRows.map((row) => ({
    name: row.employeeName,
    Ledolgozott: toHours(row.workedMinutes),
  }));

  const absenceChartData = Object.entries(visibleTotals.absences).map(
    ([code, minutes]) => ({ name: code, value: toHours(minutes) }),
  );

  const allowanceChartData = allowanceTypes
    .filter((type) => visibleTotals.allowances[type.code])
    .map((type) => ({
      name: type.name,
      Óra: toHours(visibleTotals.allowances[type.code]),
    }));

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Riport és bérfeladás</h1>

      <div className="flex items-center gap-3 flex-wrap">
        <input
          type="search"
          className="input input-sm input-bordered w-64"
          placeholder="Keresés névre vagy kódra"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />

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

      {report && visibleRows.length > 0 && (
        <>
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="card bg-base-200">
              <div className="card-body">
                <h2 className="card-title text-base">
                  Ledolgozott idő dolgozónként
                </h2>
                <div className="h-80 w-full [&_*:focus]:outline-none">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={employeeChartData} margin={{ bottom: 60 }}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                      <XAxis
                        dataKey="name"
                        fontSize={11}
                        angle={-35}
                        textAnchor="end"
                        interval={0}
                      />
                      <YAxis fontSize={12} unit=" ó" />
                      <Tooltip
                        formatter={(value) => hourLabel(Number(value))}
                      />
                      <Bar dataKey="Ledolgozott" fill={CHART_COLORS[0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <div className="card bg-base-200">
              <div className="card-body">
                <h2 className="card-title text-base">
                  Távolléti jogcímek megoszlása
                </h2>
                {absenceChartData.length === 0 ? (
                  <p className="text-sm opacity-70 py-16 text-center">
                    Ebben a hónapban nincs jogcímmel fedett távollét.
                  </p>
                ) : (
                  <div className="h-80 w-full [&_*:focus]:outline-none">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={absenceChartData}
                          dataKey="value"
                          nameKey="name"
                          innerRadius="45%"
                          outerRadius="75%"
                          paddingAngle={2}
                        >
                          {absenceChartData.map((entry, index) => (
                            <Cell
                              key={entry.name}
                              fill={CHART_COLORS[index % CHART_COLORS.length]}
                            />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value) => hourLabel(Number(value))}
                        />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="card bg-base-200">
            <div className="card-body">
              <h2 className="card-title text-base">Pótlékok jogcímenként</h2>
              {allowanceChartData.length === 0 ? (
                <p className="text-sm opacity-70 py-10 text-center">
                  Ebben a hónapban nem keletkezett pótlék.
                </p>
              ) : (
                <div className="h-72 w-full [&_*:focus]:outline-none">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={allowanceChartData} margin={{ bottom: 40 }}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                      <XAxis
                        dataKey="name"
                        fontSize={11}
                        angle={-20}
                        textAnchor="end"
                        interval={0}
                      />
                      <YAxis fontSize={12} unit=" ó" />
                      <Tooltip
                        formatter={(value) => hourLabel(Number(value))}
                      />
                      <Bar dataKey="Óra" fill={CHART_COLORS[2]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {report && (
        <div className="overflow-x-auto">
          <table className="table table-sm table-pin-rows">
            <thead>
              <tr>
                <th
                  className="cursor-pointer"
                  onClick={() => handleSort("employeeName")}
                >
                  Dolgozó{sortIndicator("employeeName")}
                </th>
                <th
                  className="cursor-pointer"
                  onClick={() => handleSort("recordedDays")}
                >
                  Rögzített napok{sortIndicator("recordedDays")}
                </th>
                <th
                  className="cursor-pointer"
                  onClick={() => handleSort("presenceMinutes")}
                >
                  Jelenlét{sortIndicator("presenceMinutes")}
                </th>
                <th
                  className="cursor-pointer"
                  onClick={() => handleSort("breakMinutes")}
                >
                  Szünet{sortIndicator("breakMinutes")}
                </th>
                <th
                  className="cursor-pointer"
                  onClick={() => handleSort("workedMinutes")}
                >
                  Ledolgozott{sortIndicator("workedMinutes")}
                </th>
                <th
                  className="cursor-pointer"
                  onClick={() => handleSort("absenceMinutes")}
                >
                  Jogcímmel fedett{sortIndicator("absenceMinutes")}
                </th>
                <th
                  className="cursor-pointer"
                  onClick={() => handleSort("settledMinutes")}
                >
                  Elszámolt{sortIndicator("settledMinutes")}
                </th>
                <th
                  className="cursor-pointer"
                  onClick={() => handleSort("balanceMinutes")}
                >
                  Egyenleg{sortIndicator("balanceMinutes")}
                </th>
                {allowanceTypes.map((type) => (
                  <th
                    key={type.code}
                    className="cursor-pointer"
                    onClick={() => handleSort(`allowance:${type.code}`)}
                  >
                    {type.name}
                    <div className="font-normal opacity-60">
                      {type.percent}%{sortIndicator(`allowance:${type.code}`)}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((row) => (
                <tr key={row.employeeId} className="hover:bg-base-200">
                  <td className="whitespace-nowrap">
                    {row.employeeName}
                    <span className="text-xs opacity-60 ml-2">
                      {row.employeeCode}
                    </span>
                  </td>
                  <td>{row.recordedDays}</td>
                  <td>{formatMinutes(row.presenceMinutes)}</td>
                  <td>{formatMinutes(row.breakMinutes)}</td>
                  <td>{formatMinutes(row.workedMinutes)}</td>
                  <td>{formatMinutes(row.absenceMinutes)}</td>
                  <td>{formatMinutes(row.settledMinutes)}</td>
                  <td className={row.balanceMinutes < 0 ? "text-error" : ""}>
                    {formatSignedMinutes(row.balanceMinutes)}
                  </td>
                  {allowanceTypes.map((type) => (
                    <td key={type.code}>
                      {formatMinutes(row.allowances[type.code] ?? 0)}
                    </td>
                  ))}
                </tr>
              ))}

              {visibleRows.length === 0 && (
                <tr>
                  <td
                    colSpan={8 + allowanceTypes.length}
                    className="text-center opacity-60"
                  >
                    Nincs a keresésnek megfelelő adat.
                  </td>
                </tr>
              )}
            </tbody>

            {visibleRows.length > 0 && (
              <tfoot>
                <tr className="font-bold">
                  <td>Összesen ({visibleRows.length} fő)</td>
                  <td />
                  <td>{formatMinutes(visibleTotals.presenceMinutes)}</td>
                  <td>{formatMinutes(visibleTotals.breakMinutes)}</td>
                  <td>{formatMinutes(visibleTotals.workedMinutes)}</td>
                  <td>{formatMinutes(visibleTotals.absenceMinutes)}</td>
                  <td>{formatMinutes(visibleTotals.settledMinutes)}</td>
                  <td>{formatSignedMinutes(visibleTotals.balanceMinutes)}</td>
                  {allowanceTypes.map((type) => (
                    <td key={type.code}>
                      {formatMinutes(visibleTotals.allowances[type.code] ?? 0)}
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
