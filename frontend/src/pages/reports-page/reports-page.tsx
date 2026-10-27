import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  listMonthlyReport,
  listStatistics,
  downloadPayroll,
  type MonthlyReport,
  type ReportRow,
  type StatisticsReport,
  type StatisticsRow,
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

const MEASURES: {
  key: keyof StatisticsRow;
  label: string;
  isCount?: boolean;
}[] = [
  { key: "headcount", label: "Létszám", isCount: true },
  { key: "workedMinutes", label: "Ledolgozott idő" },
  { key: "overtimeMinutes", label: "Túlóra" },
  { key: "shiftPremiumMinutes", label: "Műszakpótlék" },
  { key: "sickMinutes", label: "Betegszabadság" },
  { key: "vacationMinutes", label: "Fizetett szabadság" },
  { key: "absenceMinutes", label: "Jogcímmel fedett" },
  { key: "minusMinutes", label: "Mínusz óra" },
  { key: "settledMinutes", label: "Elszámolt" },
];

const toHours = (minutes: number): number =>
  Math.round((minutes / 60) * 100) / 100;

type SortDirection = "asc" | "desc";

export const ReportsPage = () => {
  const [tab, setTab] = useState<"employees" | "statistics">("employees");

  const [period, setPeriod] = useState(getCurrentMonth());
  const [employeeId, setEmployeeId] = useState<number | null>(null);
  const [groupId, setGroupId] = useState<number | null>(null);

  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState("employeeName");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  const [dimension, setDimension] = useState("workSchedule");
  const [measure, setMeasure] = useState<keyof StatisticsRow>("workedMinutes");
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  const [report, setReport] = useState<MonthlyReport | null>(null);
  const [statistics, setStatistics] = useState<StatisticsReport | null>(null);
  const [employees, setEmployees] = useState<ScopeEmployee[]>([]);
  const [groupOptions, setGroupOptions] = useState<[number, string][]>([]);

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
        groupId ?? undefined,
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
  }, [period, employeeId, groupId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    listEmployees()
      .then((data) => setEmployees(data.employees))
      .catch(() => setEmployees([]));
  }, []);

  useEffect(() => {
    if (employeeId || groupId) {
      return;
    }

    const seen = new Map<number, string>();

    for (const row of report?.employees ?? []) {
      if (row.employeeGroupId && row.employeeGroup) {
        seen.set(row.employeeGroupId, row.employeeGroup);
      }
    }

    setGroupOptions(
      [...seen.entries()].sort((a, b) => a[1].localeCompare(b[1], "hu")),
    );
  }, [report, employeeId, groupId]);

  useEffect(() => {
    if (tab !== "statistics") {
      return;
    }

    setSelectedKey(null);

    listStatistics(
      period.year,
      period.month,
      dimension,
      employeeId ?? undefined,
      groupId ?? undefined,
    )
      .then(setStatistics)
      .catch((error) => {
        setStatistics(null);
        setErrorMessage(
          error instanceof ApiError
            ? error.message
            : "Ismeretlen hiba történt.",
        );
      });
  }, [tab, period, dimension, employeeId, groupId]);

  const handleExport = async () => {
    setErrorMessage("");
    setIsExporting(true);
    try {
      await downloadPayroll(
        period.year,
        period.month,
        employeeId ?? undefined,
        groupId ?? undefined,
      );
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
    if (key === "employeeGroup") return row.employeeGroup ?? "";
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
    const term = search.trim().toLowerCase();

    const rows = (report?.employees ?? []).filter((row) => {
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
    }

    return totals;
  }, [visibleRows]);

  const activeMeasure =
    MEASURES.find((item) => item.key === measure) ?? MEASURES[1];

  const chartData = (statistics?.rows ?? []).map((row) => ({
    name: row.key,
    value: activeMeasure.isCount
      ? Number(row[activeMeasure.key])
      : toHours(Math.abs(Number(row[activeMeasure.key]))),
  }));

  const selectedRow =
    statistics?.rows.find((row) => row.key === selectedKey) ?? null;

  const measureValue = (row: StatisticsRow, key: keyof StatisticsRow) =>
    key === "headcount"
      ? `${row.headcount} fő`
      : key === "minusMinutes"
        ? formatSignedMinutes(Number(row[key]))
        : formatMinutes(Number(row[key]));

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

        <select
          className="select select-sm select-bordered"
          value={groupId ?? ""}
          onChange={(event) =>
            setGroupId(event.target.value ? Number(event.target.value) : null)
          }
        >
          <option value="">Minden csoport</option>
          {groupOptions.map(([id, name]) => (
            <option key={id} value={id}>
              {name}
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

      <div role="tablist" className="tabs tabs-bordered">
        <button
          role="tab"
          className={`tab ${tab === "employees" ? "tab-active" : ""}`}
          onClick={() => setTab("employees")}
        >
          Dolgozói bontás
        </button>
        <button
          role="tab"
          className={`tab ${tab === "statistics" ? "tab-active" : ""}`}
          onClick={() => setTab("statistics")}
        >
          Statisztika
        </button>
      </div>

      {errorMessage && (
        <div className="alert alert-error text-sm py-2">
          <span>{errorMessage}</span>
        </div>
      )}

      {isLoading && <span className="loading loading-spinner" />}

      {tab === "employees" && report && (
        <>
          <input
            type="search"
            className="input input-sm input-bordered w-72"
            placeholder="Keresés névre vagy dolgozói kódra"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />

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
                    onClick={() => handleSort("employeeGroup")}
                  >
                    Csoport{sortIndicator("employeeGroup")}
                  </th>
                  <th
                    className="cursor-pointer"
                    onClick={() => handleSort("recordedDays")}
                  >
                    Rögzített napok{sortIndicator("recordedDays")}
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
                    <td className="whitespace-nowrap">
                      {row.employeeGroup ?? "-"}
                    </td>
                    <td>{row.recordedDays}</td>
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
                      colSpan={7 + allowanceTypes.length}
                      className="text-center opacity-60"
                    >
                      Nincs a szűrésnek megfelelő adat.
                    </td>
                  </tr>
                )}
              </tbody>

              {visibleRows.length > 0 && (
                <tfoot>
                  <tr className="font-bold">
                    <td>Összesen ({visibleRows.length} fő)</td>
                    <td />
                    <td />
                    <td>{formatMinutes(visibleTotals.workedMinutes)}</td>
                    <td>{formatMinutes(visibleTotals.absenceMinutes)}</td>
                    <td>{formatMinutes(visibleTotals.settledMinutes)}</td>
                    <td>{formatSignedMinutes(visibleTotals.balanceMinutes)}</td>
                    {allowanceTypes.map((type) => (
                      <td key={type.code}>
                        {formatMinutes(
                          visibleTotals.allowances[type.code] ?? 0,
                        )}
                      </td>
                    ))}
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </>
      )}

      {tab === "statistics" && statistics && (
        <>
          <div className="flex items-center gap-3 flex-wrap">
            <label className="form-control">
              <div className="label py-1">
                <span className="label-text">Bontás</span>
              </div>
              <select
                className="select select-sm select-bordered"
                value={dimension}
                onChange={(event) => setDimension(event.target.value)}
              >
                {Object.entries(statistics.dimensions).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </label>

            <label className="form-control">
              <div className="label py-1">
                <span className="label-text">Mérőszám</span>
              </div>
              <select
                className="select select-sm select-bordered"
                value={measure}
                onChange={(event) =>
                  setMeasure(event.target.value as keyof StatisticsRow)
                }
              >
                {MEASURES.map((item) => (
                  <option key={item.key} value={item.key}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {statistics.rows.length === 0 ? (
            <div className="alert text-sm py-2">
              <span>Ebben a hónapban nincs a szűrésnek megfelelő adat.</span>
            </div>
          ) : (
            <>
              <div className="card bg-base-200">
                <div className="card-body">
                  <h2 className="card-title text-base">
                    {activeMeasure.label} —{" "}
                    {statistics.dimensions[statistics.dimension]} szerint
                  </h2>
                  <p className="text-sm opacity-70">
                    Kattints egy oszlopra a részletekért.
                  </p>

                  <div className="h-80 w-full [&_*:focus]:outline-none">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData} margin={{ bottom: 50 }}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                        <XAxis
                          dataKey="name"
                          fontSize={11}
                          angle={-25}
                          textAnchor="end"
                          interval={0}
                        />
                        <YAxis
                          fontSize={12}
                          unit={activeMeasure.isCount ? " fő" : " ó"}
                          allowDecimals={!activeMeasure.isCount}
                        />
                        <Tooltip
                          formatter={(value) =>
                            activeMeasure.isCount
                              ? `${value} fő`
                              : `${String(value).replace(".", ",")} óra`
                          }
                        />
                        <Bar
                          dataKey="value"
                          name={activeMeasure.label}
                          onClick={(entry) => {
                            const name = (entry as { name?: string }).name;

                            if (!name) {
                              return;
                            }

                            setSelectedKey(name === selectedKey ? null : name);
                          }}
                        >
                          {chartData.map((entry) => (
                            <Cell
                              key={entry.name}
                              cursor="pointer"
                              fill={
                                selectedKey && selectedKey !== entry.name
                                  ? "#cbd5e1"
                                  : "#2563eb"
                              }
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {selectedRow && (
                <div className="card bg-base-200">
                  <div className="card-body">
                    <div className="flex items-center gap-3">
                      <h2 className="card-title text-base">
                        {selectedRow.key}
                      </h2>
                      <button
                        className="btn btn-xs ml-auto"
                        onClick={() => setSelectedKey(null)}
                      >
                        Kijelölés törlése
                      </button>
                    </div>

                    <div className="stats stats-horizontal bg-base-100 w-full overflow-x-auto">
                      {MEASURES.map((item) => (
                        <div className="stat py-3" key={item.key}>
                          <div className="stat-title text-xs">{item.label}</div>
                          <div className="stat-value text-xl">
                            {measureValue(selectedRow, item.key)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <div className="overflow-x-auto">
                <table className="table table-sm">
                  <thead>
                    <tr>
                      <th>{statistics.dimensions[statistics.dimension]}</th>
                      {MEASURES.map((item) => (
                        <th key={item.key}>{item.label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {statistics.rows.map((row) => (
                      <tr
                        key={row.key}
                        className={`cursor-pointer hover:bg-base-200 ${
                          selectedKey === row.key ? "bg-base-300" : ""
                        }`}
                        onClick={() =>
                          setSelectedKey(
                            selectedKey === row.key ? null : row.key,
                          )
                        }
                      >
                        <td className="whitespace-nowrap">{row.key}</td>
                        {MEASURES.map((item) => (
                          <td key={item.key}>{measureValue(row, item.key)}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
};
