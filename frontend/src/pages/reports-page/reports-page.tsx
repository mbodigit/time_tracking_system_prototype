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
import {
  listEmployees,
  type ScopeEmployee,
  type ScopeGroup,
} from "../../api/lookups";
import { ApiError } from "../../api/client";
import { Field } from "../../components/form-field/form-field";
import { EmptyState } from "../../components/empty-state/empty-state";
import { currentPermissions, hasPermission } from "../../utils/access";
import {
  formatMinutes,
  formatSignedMinutes,
  formatMonth,
  getCurrentMonth,
  shiftMonth,
} from "../../utils/datetime";

import {
  useDataTable,
  TableSearch,
  SortableHeader,
  TablePager,
} from "../../components/data-table/data-table";

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

const reportSearchText = (row: ReportRow) =>
  `${row.employeeName} ${row.employeeCode}`;

const reportSortValue = (row: ReportRow, key: string): number | string => {
  if (key === "employeeName") return row.employeeName;
  if (key === "employeeGroup") return row.employeeGroup ?? "";
  if (key.startsWith("allowance:")) {
    return row.allowances[key.slice("allowance:".length)] ?? 0;
  }
  return (row as unknown as Record<string, number>)[key] ?? 0;
};

export const ReportsPage = () => {
  const [tab, setTab] = useState<"employees" | "statistics">("employees");

  const [period, setPeriod] = useState(getCurrentMonth());
  const [employeeId, setEmployeeId] = useState<number | null>(null);
  const [groupId, setGroupId] = useState<number | null>(null);

  const [dimension, setDimension] = useState("workSchedule");
  const [measure, setMeasure] = useState<keyof StatisticsRow>("workedMinutes");
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  const [report, setReport] = useState<MonthlyReport | null>(null);
  const [statistics, setStatistics] = useState<StatisticsReport | null>(null);
  const [employees, setEmployees] = useState<ScopeEmployee[]>([]);
  const [groupOptions, setGroupOptions] = useState<ScopeGroup[]>([]);

  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const canExport = hasPermission(currentPermissions(), "reports.employees");

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
      .then((data) => {
        setEmployees(data.employees);
        setGroupOptions(data.groups);
      })
      .catch(() => {
        setEmployees([]);
        setGroupOptions([]);
      });
  }, []);

  const visibleEmployees = useMemo(
    () =>
      groupId === null
        ? employees
        : employees.filter((item) => item.groupId === groupId),
    [employees, groupId],
  );

  const selectGroup = (nextGroupId: number | null) => {
    setGroupId(nextGroupId);

    const selected = employees.find((item) => item.id === employeeId);

    if (selected && nextGroupId !== null && selected.groupId !== nextGroupId) {
      setEmployeeId(null);
    }
  };

  const selectEmployee = (nextEmployeeId: number | null) => {
    setEmployeeId(nextEmployeeId);

    const selected = employees.find((item) => item.id === nextEmployeeId);

    if (selected) {
      setGroupId(selected.groupId);
    }
  };

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

  const reportTable = useDataTable({
    rows: report?.employees ?? [],
    searchText: reportSearchText,
    sortValue: reportSortValue,
    initialSortKey: "employeeName",
  });

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

    for (const row of reportTable.allRows) {
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
  }, [reportTable.allRows]);

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
      <div className="flex items-center gap-4 flex-wrap">
        <h1 className="text-2xl font-bold">Riport és bérfeladás</h1>

        <div
          role="tablist"
          className="tabs tabs-box tabs-sm bg-base-200 p-1 rounded-lg"
        >
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
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <select
          className="select select-sm select-bordered"
          value={groupId ?? ""}
          onChange={(event) =>
            selectGroup(event.target.value ? Number(event.target.value) : null)
          }
        >
          <option value="">Minden csoport</option>
          {groupOptions.map((group) => (
            <option key={group.id} value={group.id}>
              {group.name}
            </option>
          ))}
        </select>

        <select
          className="select select-sm select-bordered"
          value={employeeId ?? ""}
          onChange={(event) =>
            selectEmployee(
              event.target.value ? Number(event.target.value) : null,
            )
          }
        >
          <option value="">
            {groupId === null
              ? "Minden dolgozó"
              : `A csoport minden dolgozója (${visibleEmployees.length})`}
          </option>
          {visibleEmployees.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name} ({item.code})
            </option>
          ))}
        </select>

        {(groupId !== null || employeeId !== null) && (
          <button
            className="btn btn-sm btn-ghost"
            onClick={() => {
              setGroupId(null);
              setEmployeeId(null);
            }}
          >
            Szűrés törlése
          </button>
        )}

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

      {tab === "employees" && report && reportTable.allRows.length === 0 && (
        <EmptyState
          message="Ehhez a szűréshez nincs riportadat ebben a hónapban."
          hint={
            groupId !== null || employeeId !== null
              ? "Válassz másik hónapot, vagy töröld a szűrést."
              : "Válassz másik hónapot."
          }
        />
      )}

      {tab === "employees" && report && reportTable.allRows.length > 0 && (
        <>
          <TableSearch
            table={reportTable}
            placeholder="Keresés névre vagy dolgozói kódra"
            className="input input-sm input-bordered w-72"
          />

          <div className="overflow-x-auto">
            <table className="table table-sm table-pin-rows">
              <thead>
                <tr>
                  <SortableHeader
                    table={reportTable}
                    field="employeeName"
                    label="Dolgozó"
                  />
                  <SortableHeader
                    table={reportTable}
                    field="employeeGroup"
                    label="Csoport"
                  />
                  <SortableHeader
                    table={reportTable}
                    field="recordedDays"
                    label="Rögzített napok"
                  />
                  <SortableHeader
                    table={reportTable}
                    field="workedMinutes"
                    label="Ledolgozott"
                  />
                  <SortableHeader
                    table={reportTable}
                    field="absenceMinutes"
                    label="Jogcímmel fedett"
                  />
                  <SortableHeader
                    table={reportTable}
                    field="settledMinutes"
                    label="Elszámolt"
                  />
                  <SortableHeader
                    table={reportTable}
                    field="balanceMinutes"
                    label="Egyenleg"
                  />
                  {allowanceTypes.map((type) => (
                    <SortableHeader
                      key={type.code}
                      table={reportTable}
                      field={`allowance:${type.code}`}
                      label={type.name}
                      sublabel={`${type.percent}%`}
                    />
                  ))}
                </tr>
              </thead>
              <tbody>
                {reportTable.rows.map((row) => (
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

                {reportTable.rows.length === 0 && (
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

              {reportTable.filtered > 0 && (
                <tfoot>
                  <tr className="font-bold">
                    <td>Összesen ({reportTable.filtered} fő)</td>
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

            <TablePager table={reportTable} unit="fő" />
          </div>
        </>
      )}

      {tab === "statistics" && statistics && statistics.rows.length === 0 && (
        <EmptyState
          message="Ehhez a szűréshez nincs statisztikai adat ebben a hónapban."
          hint={
            groupId !== null || employeeId !== null
              ? "Válassz másik hónapot, vagy töröld a szűrést."
              : "Válassz másik hónapot."
          }
        />
      )}

      {tab === "statistics" && statistics && statistics.rows.length > 0 && (
        <>
          <div className="flex items-center gap-3 flex-wrap">
            <Field label="Bontás">
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
            </Field>

            <Field label="Mérőszám">
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
            </Field>
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
