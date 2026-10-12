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

export const TimeLogPage = () => {
  const [period, setPeriod] = useState(getCurrentMonth());
  const [log, setLog] = useState<MonthlyLog | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [editedDay, setEditedDay] = useState<TimeEntryDay | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage("");
    try {
      const data = await listMonth(period.year, period.month);
      setLog(data);
    } catch (error) {
      setLog(null);
      setErrorMessage(
        error instanceof ApiError ? error.message : "Ismeretlen hiba történt.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [period]);

  useEffect(() => {
    load();
  }, [load]);

  const summary = log?.summary;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold">Havi munkaidő-nyilvántartás</h1>
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
                <th>Egyenleg</th>
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
                  <td
                    className={
                      day.balanceMinutes && day.balanceMinutes < 0
                        ? "text-error"
                        : ""
                    }
                  >
                    {formatSignedMinutes(day.balanceMinutes)}
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
