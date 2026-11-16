import { useCallback, useEffect, useState } from "react";
import {
  listCalendar,
  saveCalendarDay,
  deleteCalendarDay,
  type CalendarYear,
} from "../../api/calendar";
import { ApiError } from "../../api/client";
import { Field } from "../../components/form-field/form-field";
import { getWeekdayName, isWeekend } from "../../utils/datetime";
import { showToast } from "../../utils/toast";
import { ActionButton, PlainButton } from "../../components/button/button";

const MONTH_NAMES = [
  "január",
  "február",
  "március",
  "április",
  "május",
  "június",
  "július",
  "augusztus",
  "szeptember",
  "október",
  "november",
  "december",
];

export const CalendarPage = () => {
  const [year, setYear] = useState(new Date().getFullYear());
  const [calendar, setCalendar] = useState<CalendarYear | null>(null);
  const [date, setDate] = useState("");
  const [dayType, setDayType] = useState("Munkaszüneti nap");
  const [note, setNote] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await listCalendar(year);
      setCalendar(data);
    } catch (error) {
      setCalendar(null);
      showToast(error instanceof ApiError ? error.message : "Ismeretlen hiba történt.", "error");
    }
  }, [year]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSave = async () => {
        if (!date) {
      showToast("A dátum megadása kötelező.", "error");
      return;
    }

    setIsSaving(true);
    try {
      const response = await saveCalendarDay({ date, dayType, note });
      showToast(response.message);
      setNote("");
      await load();
    } catch (error) {
      showToast(error instanceof ApiError ? error.message : "Ismeretlen hiba történt.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (value: string) => {
        try {
      const response = await deleteCalendarDay(value);
      showToast(response.message);
      await load();
    } catch (error) {
      showToast(error instanceof ApiError ? error.message : "Ismeretlen hiba történt.", "error");
    }
  };

  const dayTypes = calendar?.dayTypes ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">

        <div className="join ml-auto">
          <button
            className="btn btn-sm join-item"
            onClick={() => setYear(year - 1)}
          >
            {"<"}
          </button>
          <span className="btn btn-sm join-item no-animation pointer-events-none min-w-24">
            {year}
          </span>
          <button
            className="btn btn-sm join-item"
            onClick={() => setYear(year + 1)}
          >
            {">"}
          </button>
        </div>
      </div>

      <div className="card bg-base-200">
        <div className="card-body">
          <h2 className="card-title text-base">
            Nap felvétele vagy módosítása
          </h2>

          <div className="flex gap-3 flex-wrap items-end">
            <Field label="Dátum" grow>
              <input
                type="date"
                className="input input-sm input-bordered"
                value={date}
                onChange={(event) => setDate(event.target.value)}
              />
            </Field>

            <Field label="Naptípus" grow>
              <select
                className="select select-sm select-bordered"
                value={dayType}
                onChange={(event) => setDayType(event.target.value)}
              >
                {dayTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Megjegyzés (elhagyható)" grow>
              <input
                type="text"
                className="input input-sm input-bordered"
                value={note}
                onChange={(event) => setNote(event.target.value)}
              />
            </Field>

            <ActionButton
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving ? "Mentés..." : "Mentés"}
            </ActionButton>
          </div>

          <p className="text-sm opacity-70">
            A Munkanap típus az áthelyezett munkanapokhoz használandó: a
            hétvégére eső nap ettől rendes munkanapként kerül elszámolásra,
            beosztással és műszakpótlékkal, szombati vagy vasárnapi felár
            nélkül.
          </p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="table table-sm">
          <thead>
            <tr>
              <th>Hónap</th>
              <th>Nap</th>
              <th>Naptípus</th>
              <th>Megjegyzés</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {calendar?.days.map((day) => (
              <tr
                key={day.date}
                className={isWeekend(day.date) ? "bg-base-200" : ""}
              >
                <td>{MONTH_NAMES[Number(day.date.slice(5, 7)) - 1]}</td>
                <td className="whitespace-nowrap">
                  {Number(day.date.slice(8, 10))}. ({getWeekdayName(day.date)})
                </td>
                <td>
                  <span
                    className={`badge badge-sm ${
                      day.dayType === "Munkaszüneti nap"
                        ? "badge-error"
                        : day.dayType === "Pihenőnap"
                          ? "badge-ghost"
                          : "badge-success"
                    }`}
                  >
                    {day.dayType}
                  </span>
                </td>
                <td>{day.note ?? "-"}</td>
                <td>
                  <PlainButton size="xs"
                    onClick={() => handleDelete(day.date)}
                  >
                    Törlés
                  </PlainButton>
                </td>
              </tr>
            ))}

            {calendar && calendar.days.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center opacity-60">
                  Erre az évre még nincs naptári bejegyzés.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
