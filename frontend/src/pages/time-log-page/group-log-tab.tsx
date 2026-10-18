import { useCallback, useEffect, useState } from "react";
import {
  listDaily,
  createBulk,
  type DailyEmployee,
  type BulkResult,
} from "../../api/timeEntries";
import { ApiError } from "../../api/client";
import { formatTime, getWeekdayName, isWeekend } from "../../utils/datetime";

const today = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
};

const shiftDay = (date: string, offset: number) => {
  const value = new Date(`${date}T00:00:00`);
  value.setDate(value.getDate() + offset);
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
};

type Draft = Record<
  number,
  { start: string; end: string; breakStart: string; breakEnd: string }
>;

export const GroupLogTab = () => {
  const [date, setDate] = useState(today());
  const [employees, setEmployees] = useState<DailyEmployee[]>([]);
  const [dayType, setDayType] = useState("workday");
  const [draft, setDraft] = useState<Draft>({});
  const [results, setResults] = useState<BulkResult[]>([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [infoMessage, setInfoMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const load = useCallback(async () => {
    setErrorMessage("");
    setResults([]);
    try {
      const data = await listDaily(date);
      setEmployees(data.employees);
      setDayType(data.dayType);

      const next: Draft = {};
      for (const item of data.employees) {
        next[item.id] = {
          start: formatTime(item.entry?.workStart ?? null).replace("-", ""),
          end: formatTime(item.entry?.workEnd ?? null).replace("-", ""),
          breakStart: formatTime(item.entry?.breakStart ?? null).replace(
            "-",
            "",
          ),
          breakEnd: formatTime(item.entry?.breakEnd ?? null).replace("-", ""),
        };
      }
      setDraft(next);
    } catch (error) {
      setEmployees([]);
      setErrorMessage(
        error instanceof ApiError ? error.message : "Ismeretlen hiba történt.",
      );
    }
  }, [date]);

  useEffect(() => {
    load();
  }, [load]);

  const fillFromTemplate = () => {
    setDraft((current) => {
      const next = { ...current };
      for (const item of employees) {
        if (
          item.absence?.coversDay ||
          !item.templateStart ||
          !item.templateEnd
        ) {
          continue;
        }
        next[item.id] = {
          ...next[item.id],
          start: item.templateStart,
          end: item.templateEnd,
        };
      }
      return next;
    });
  };

  const update = (
    id: number,
    field: "start" | "end" | "breakStart" | "breakEnd",
    value: string,
  ) => {
    setDraft((current) => ({
      ...current,
      [id]: { ...current[id], [field]: value },
    }));
  };

  const handleSave = async () => {
    setErrorMessage("");
    setInfoMessage("");
    setResults([]);

    const entries = employees
      .filter((item) => draft[item.id]?.start && draft[item.id]?.end)
      .map((item) => {
        const row = draft[item.id];
        const endDate = row.end <= row.start ? shiftDay(date, 1) : date;
        const breakDate =
          row.breakStart && row.breakStart < row.start
            ? shiftDay(date, 1)
            : date;
        return {
          employeeId: item.id,
          workStart: `${date} ${row.start}:00`,
          workEnd: `${endDate} ${row.end}:00`,
          ...(row.breakStart && row.breakEnd
            ? {
                breakStart: `${breakDate} ${row.breakStart}:00`,
                breakEnd: `${breakDate} ${row.breakEnd}:00`,
              }
            : {}),
        };
      });

    if (entries.length === 0) {
      setErrorMessage("Egyetlen dolgozóhoz sincs kitöltve kezdés és végzés.");
      return;
    }

    setIsSaving(true);
    try {
      const response = await createBulk(date, entries);
      setInfoMessage(response.message);
      setResults(response.results);
      await load();
    } catch (error) {
      setErrorMessage(
        error instanceof ApiError ? error.message : "Ismeretlen hiba történt.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const resultOf = (id: number) =>
    results.find((item) => item.employeeId === id);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="join">
          <button
            className="btn btn-sm join-item"
            onClick={() => setDate(shiftDay(date, -1))}
          >
            {"<"}
          </button>
          <input
            type="date"
            className="input input-sm input-bordered join-item"
            value={date}
            onChange={(event) => setDate(event.target.value)}
          />
          <button
            className="btn btn-sm join-item"
            onClick={() => setDate(shiftDay(date, 1))}
          >
            {">"}
          </button>
        </div>

        <span className="badge badge-ghost">
          {getWeekdayName(date)}
          {dayType === "holiday" && " — munkaszüneti nap"}
          {dayType === "restday" && " — pihenőnap"}
          {dayType === "workday" && isWeekend(date) && " — hétvége"}
        </span>

        <button className="btn btn-sm ml-auto" onClick={fillFromTemplate}>
          Kitöltés beosztás szerint
        </button>
        <button
          className="btn btn-sm btn-primary"
          onClick={handleSave}
          disabled={isSaving}
        >
          {isSaving ? "Mentés..." : "Mentés"}
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

      <div className="overflow-x-auto">
        <table className="table table-sm">
          <thead>
            <tr>
              <th>Dolgozó</th>
              <th>Munkarend</th>
              <th>Kezdés</th>
              <th>Végzés</th>
              <th>Szünet</th>
              <th>Állapot</th>
            </tr>
          </thead>
          <tbody>
            {employees.map((item) => {
              const row = draft[item.id];
              const blocked =
                Boolean(item.absence?.coversDay) ||
                item.workSchedule === "Kötetlen";
              const result = resultOf(item.id);

              return (
                <tr key={item.id} className={blocked ? "opacity-50" : ""}>
                  <td className="whitespace-nowrap">
                    {item.name}
                    <span className="text-xs opacity-60 ml-2">{item.code}</span>
                  </td>
                  <td className="text-sm">{item.workSchedule ?? "-"}</td>
                  <td>
                    <input
                      type="time"
                      className="input input-xs input-bordered w-24"
                      value={row?.start ?? ""}
                      disabled={blocked}
                      onChange={(event) =>
                        update(item.id, "start", event.target.value)
                      }
                    />
                  </td>
                  <td>
                    <div className="flex items-center gap-1">
                      <input
                        type="time"
                        className="input input-xs input-bordered w-24"
                        value={row?.end ?? ""}
                        disabled={blocked}
                        onChange={(event) =>
                          update(item.id, "end", event.target.value)
                        }
                      />
                      {row?.start && row?.end && row.end <= row.start && (
                        <span
                          className="text-xs opacity-70"
                          title="A munkavégzés másnap végződik"
                        >
                          +1 nap
                        </span>
                      )}
                    </div>
                  </td>

                  <td>
                    <div className="flex items-center gap-1">
                      <input
                        type="time"
                        className="input input-xs input-bordered w-24"
                        value={row?.breakStart ?? ""}
                        disabled={blocked}
                        onChange={(event) =>
                          update(item.id, "breakStart", event.target.value)
                        }
                      />
                      <input
                        type="time"
                        className="input input-xs input-bordered w-24"
                        value={row?.breakEnd ?? ""}
                        disabled={blocked}
                        onChange={(event) =>
                          update(item.id, "breakEnd", event.target.value)
                        }
                      />
                    </div>
                  </td>

                  <td className="whitespace-nowrap">
                    {item.absence && (
                      <span
                        className={`badge badge-sm ${
                          item.absence.coversDay
                            ? "badge-info"
                            : "badge-warning badge-outline"
                        }`}
                      >
                        {item.absence.name}
                      </span>
                    )}
                    {item.entry?.isOrdered && (
                      <span className="badge badge-sm badge-warning ml-1">
                        elrendelt
                      </span>
                    )}
                    {item.workSchedule === "Kötetlen" && (
                      <span className="badge badge-sm badge-ghost">
                        kötetlen
                      </span>
                    )}
                    {result?.status === "error" && (
                      <span
                        className="badge badge-sm badge-error ml-1"
                        title={result.message}
                      >
                        hiba
                      </span>
                    )}
                    {result?.status === "created" && (
                      <span className="badge badge-sm badge-success ml-1">
                        rögzítve
                      </span>
                    )}
                    {result?.status === "updated" && (
                      <span className="badge badge-sm badge-success ml-1">
                        módosítva
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
            {employees.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center opacity-60">
                  Nincs a hatókörödbe tartozó dolgozó.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
