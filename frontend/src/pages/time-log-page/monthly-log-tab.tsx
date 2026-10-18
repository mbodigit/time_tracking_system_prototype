import { useCallback, useEffect, useState } from "react";
import {
  listMonth,
  type MonthlyLog,
  type TimeEntryDay,
} from "../../api/timeEntries";
import { ApiError } from "../../api/client";
import {
  formatMinutes,
  formatSignedMinutes,
  formatMonth,
  formatTime,
  getCurrentMonth,
  getDayNumber,
  getWeekdayName,
  isWeekend,
  shiftMonth,
} from "../../utils/datetime";
import { listEmployees, type ScopeEmployee } from "../../api/lookups";
import { TimeEntryForm } from "./time-entry-form";

const ALLOWANCE_KEYS = ["15", "30", "50", "100", "200"];

const getDayLabel = (day: TimeEntryDay): string => {
  if (day.dayType === "holiday") return "Munkaszüneti nap";
  if (day.dayType === "restday") return "Pihenőnap";
  if (isWeekend(day.date)) return "Hétvége";
  return "Munkanap";
};

const getRowClass = (day: TimeEntryDay): string => {
  if (day.dayType === "holiday") return "bg-error/10";
  if (day.dayType === "restday" || isWeekend(day.date)) return "bg-base-200";
  return "";
};

export const MonthlyLogTab = () => {
  const [period, setPeriod] = useState(getCurrentMonth());
  const [log, setLog] = useState<MonthlyLog | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [editedDay, setEditedDay] = useState<TimeEntryDay | null>(null);
  const [employees, setEmployees] = useState<ScopeEmployee[]>([]);
  const [employeeId, setEmployeeId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage("");
    try {
      const data = await listMonth(
        period.year,
        period.month,
        employeeId ?? undefined,
      );
      setLog(data);
    } catch (error) {
      setLog(null);
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

  const otherEmployees = employees.filter((item) => !item.isSelf);

  const summary = log?.summary;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        {otherEmployees.length > 0 && (
          <select
            className="select select-sm select-bordered"
            value={employeeId ?? ""}
            onChange={(event) =>
              setEmployeeId(
                event.target.value ? Number(event.target.value) : null,
              )
            }
          >
            <option value="">Saját munkaidő</option>
            {otherEmployees.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name} ({item.code})
              </option>
            ))}
          </select>
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
        <button
          className="btn btn-sm"
          onClick={() => setPeriod(getCurrentMonth())}
        >
          Aktuális hónap
        </button>
      </div>

      {errorMessage && (
        <div className="alert alert-error text-sm py-2">
          <span>{errorMessage}</span>
        </div>
      )}

      {summary && (
        <div className="stats stats-horizontal bg-base-200">
          <div className="stat py-3">
            <div className="stat-title">Rögzített napok</div>
            <div className="stat-value text-2xl">{summary.recordedDays}</div>
          </div>
          <div className="stat py-3">
            <div className="stat-title">Ledolgozott munkaidő</div>
            <div className="stat-value text-2xl">
              {formatMinutes(summary.workedMinutes)}
            </div>
          </div>
          <div className="stat py-3">
            <div className="stat-title">Szünet</div>
            <div className="stat-value text-2xl">
              {formatMinutes(summary.breakMinutes)}
            </div>
          </div>
          <div className="stat py-3">
            <div className="stat-title">Jogcímmel fedett</div>
            <div className="stat-value text-2xl">
              {formatMinutes(summary.absenceMinutes)}
            </div>
          </div>
          <div className="stat py-3">
            <div className="stat-title">Elszámolt összesen</div>
            <div className="stat-value text-2xl">
              {formatMinutes(summary.settledMinutes)}
            </div>
          </div>
          <div className="stat py-3">
            <div className="stat-title">Egyenleg</div>
            <div className="stat-value text-2xl">
              {formatSignedMinutes(summary.balanceMinutes)}
            </div>
          </div>

          {ALLOWANCE_KEYS.filter((key) => summary.allowances[key]).map(
            (key) => (
              <div className="stat py-3" key={key}>
                <div className="stat-title">{key}% pótlék</div>
                <div className="stat-value text-2xl">
                  {formatMinutes(summary.allowances[key])}
                </div>
              </div>
            ),
          )}
        </div>
      )}

      {isLoading && <span className="loading loading-spinner" />}

      {log && (
        <div className="overflow-x-auto">
          <table className="table table-sm table-pin-rows">
            <thead>
              <tr>
                <th>Nap</th>
                <th>Jelleg</th>
                <th>Kezdés</th>
                <th>Végzés</th>
                <th>Jelenlét</th>
                <th>Szünet</th>
                <th>Ledolgozott</th>
                <th>Ledolgozandó</th>
                <th>Egyenleg</th>
                <th>Jogcím</th>
                <th>Elszámolt</th>
                {ALLOWANCE_KEYS.map((key) => (
                  <th key={key}>{key}%</th>
                ))}
                <th />
              </tr>
            </thead>
            <tbody>
              {log.days.map((day) => (
                <tr key={day.date} className={getRowClass(day)}>
                  <td className="whitespace-nowrap">
                    {getDayNumber(day.date)}. ({getWeekdayName(day.date)})
                  </td>
                  <td className="whitespace-nowrap">
                    {getDayLabel(day)}
                    {day.isOrdered && (
                      <span className="badge badge-sm badge-warning ml-2">
                        elrendelt
                      </span>
                    )}
                    {day.scheduleMissing && (
                      <span
                        className="badge badge-sm badge-ghost ml-2"
                        title="Erre a napra nincs beosztás, a számítás a tényleges időpontokkal történt."
                      >
                        beosztás nélkül
                      </span>
                    )}
                  </td>
                  <td>{formatTime(day.workStart)}</td>
                  <td>{formatTime(day.workEnd)}</td>
                  <td>{formatMinutes(day.presenceMinutes)}</td>
                  <td>{formatMinutes(day.breakMinutes)}</td>
                  <td>{formatMinutes(day.workedMinutes)}</td>
                  <td>{formatMinutes(day.scheduledMinutes ?? 0)}</td>
                  <td
                    className={
                      day.balanceMinutes && day.balanceMinutes < 0
                        ? "text-error"
                        : ""
                    }
                  >
                    {formatSignedMinutes(day.balanceMinutes)}
                  </td>
                  <td className="whitespace-nowrap">
                    {day.absence ? (
                      <span
                        className={`badge badge-sm ${
                          day.absence.coversDay
                            ? "badge-info"
                            : "badge-warning badge-outline"
                        }`}
                        title={
                          day.absence.coversDay
                            ? "Jóváhagyott jogcím, az óraszám elszámolásra kerül."
                            : "Függőben lévő kérelem, óraszámot nem számol el."
                        }
                      >
                        {day.absence.name}
                      </span>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td>
                    {day.settledMinutes
                      ? formatMinutes(day.settledMinutes)
                      : day.absence
                        ? "0:00"
                        : "-"}
                  </td>
                  {ALLOWANCE_KEYS.map((key) => (
                    <td key={key}>{formatMinutes(day.allowances[key] ?? 0)}</td>
                  ))}
                  <td>
                    <button
                      className="btn btn-xs"
                      onClick={() => setEditedDay(day)}
                    >
                      {day.id ? "Módosítás" : "Rögzítés"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editedDay && (
        <TimeEntryForm
          day={editedDay}
          employeeId={employeeId}
          onClose={() => setEditedDay(null)}
          onSaved={() => {
            setEditedDay(null);
            load();
          }}
        />
      )}
    </div>
  );
};
