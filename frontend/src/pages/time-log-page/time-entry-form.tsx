import { useState } from "react";
import {
  createEntry,
  updateEntry,
  type TimeEntryDay,
} from "../../api/timeEntries";
import { ApiError } from "../../api/client";
import { Field } from "../../components/form-field/form-field";
import { formatTime } from "../../utils/datetime";

interface Props {
  day: TimeEntryDay;
  employeeId?: number | null;
  onClose: () => void;
  onSaved: () => void;
}

const addOneDay = (date: string): string => {
  const next = new Date(`${date}T00:00:00`);
  next.setDate(next.getDate() + 1);
  const year = next.getFullYear();
  const month = String(next.getMonth() + 1).padStart(2, "0");
  const day = String(next.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const isBackdated = (date: string): boolean => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(`${date}T00:00:00`) < today;
};

const BREAK_EARLIEST_MINUTES = 3 * 60;
const BREAK_LATEST_MINUTES = 6 * 60;

const toMinutes = (time: string): number => {
  const [hour, minute] = time.split(":").map(Number);
  return hour * 60 + minute;
};

const toTime = (minutes: number): string => {
  const normalized = ((minutes % 1440) + 1440) % 1440;
  const hour = String(Math.floor(normalized / 60)).padStart(2, "0");
  const minute = String(normalized % 60).padStart(2, "0");
  return `${hour}:${minute}`;
};

const breakWindow = (workStart: string): { from: string; to: string } => ({
  from: toTime(toMinutes(workStart) + BREAK_EARLIEST_MINUTES),
  to: toTime(toMinutes(workStart) + BREAK_LATEST_MINUTES),
});

const breakOffsetMinutes = (workStart: string, breakStart: string): number => {
  const offset = toMinutes(breakStart) - toMinutes(workStart);
  return offset < 0 ? offset + 1440 : offset;
};

export const TimeEntryForm = ({ day, employeeId, onClose, onSaved }: Props) => {
  const initialStart = formatTime(day.workStart);
  const initialEnd = formatTime(day.workEnd);

  const [workStart, setWorkStart] = useState(
    initialStart === "-" ? "" : initialStart,
  );
  const [workEnd, setWorkEnd] = useState(initialEnd === "-" ? "" : initialEnd);
  const [breakStart, setBreakStart] = useState(
    day.breakMinutes && day.workStart ? "" : "",
  );
  const [breakEnd, setBreakEnd] = useState("");
  const [note, setNote] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const noteRequired = isBackdated(day.date);

  const handleSubmit = async () => {
    setErrorMessage("");

    if (!workStart || !workEnd) {
      setErrorMessage("A munkavégzés kezdete és vége kötelező.");
      return;
    }

    if (breakStart && breakEnd) {
      const offset = breakOffsetMinutes(workStart, breakStart);

      if (offset < BREAK_EARLIEST_MINUTES || offset > BREAK_LATEST_MINUTES) {
        const window = breakWindow(workStart);
        setErrorMessage(
          `A munkaközi szünetet legalább három, legfeljebb hat óra munkavégzést ` +
            `követően kell kiadni, ebben az esetben ${window.from} és ${window.to} között.`,
        );
        return;
      }
    }

    const startValue = `${day.date} ${workStart}:00`;
    const endDate = workEnd <= workStart ? addOneDay(day.date) : day.date;
    const endValue = `${endDate} ${workEnd}:00`;

    const breakStartDate = breakStart <= workStart ? addOneDay(day.date) : day.date;
    const breakEndDate = breakEnd <= breakStart ? addOneDay(breakStartDate) : breakStartDate;

    const breakFields =
      breakStart && breakEnd
        ? {
            breakStart: `${breakStartDate} ${breakStart}:00`,
            breakEnd: `${breakEndDate} ${breakEnd}:00`,
          }
        : {};

    setIsSaving(true);
    try {
      if (day.id) {
        await updateEntry(day.id, {
          workStart: startValue,
          workEnd: endValue,
          ...breakFields,
          ...(note ? { note } : {}),
        });
      } else {
        await createEntry({
          ...(employeeId ? { employeeId } : {}),
          workingDate: day.date,
          workStart: startValue,
          workEnd: endValue,
          ...breakFields,
          ...(note ? { note } : {}),
        });
      }
      onSaved();
    } catch (error) {
      setErrorMessage(
        error instanceof ApiError ? error.message : "Ismeretlen hiba történt.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="modal modal-open">
      <div className="modal-box space-y-3">
        <h3 className="font-bold text-lg">
          {day.date} - {day.id ? "munkaidő módosítása" : "munkaidő rögzítése"}
        </h3>

        {errorMessage && (
          <div className="alert alert-error text-sm py-2">
            <span>{errorMessage}</span>
          </div>
        )}

        <div className="flex gap-3">
          <Field label="Munkavégzés kezdete" grow>
            <input
              type="time"
              className="input input-bordered"
              value={workStart}
              onChange={(event) => setWorkStart(event.target.value)}
            />
          </Field>

          <Field label="Munkavégzés vége" grow>
            <input
              type="time"
              className="input input-bordered"
              value={workEnd}
              onChange={(event) => setWorkEnd(event.target.value)}
            />
          </Field>
        </div>

        {workStart && workEnd && workEnd <= workStart && (
          <div className="alert alert-info text-sm py-2">
            <span>A munkavégzés a következő napon végződik.</span>
          </div>
        )}

        <div className="flex gap-3">
          <Field label="Szünet kezdete (elhagyható)" grow>
            <input
              type="time"
              className="input input-bordered"
              value={breakStart}
              onChange={(event) => setBreakStart(event.target.value)}
            />
          </Field>

          <Field label="Szünet vége" grow>
            <input
              type="time"
              className="input input-bordered"
              value={breakEnd}
              onChange={(event) => setBreakEnd(event.target.value)}
            />
          </Field>
        </div>

        {workStart && (
          <p className="text-xs opacity-70">
            A munkaközi szünetet a jogszabály szerint legalább három, legfeljebb hat
            óra munkavégzést követően kell kiadni, ebben az esetben{" "}
            {breakWindow(workStart).from} és {breakWindow(workStart).to} között.
          </p>
        )}

        <Field
          label={`Indoklás${
            noteRequired ? " (visszamenőleges rögzítésnél kötelező)" : ""
          }`}
        >
          <textarea
            className="textarea textarea-bordered"
            rows={2}
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />
        </Field>

        <div className="modal-action">
          <button
            className="btn btn-ghost"
            onClick={onClose}
            disabled={isSaving}
          >
            Mégse
          </button>
          <button
            className="btn btn-primary"
            onClick={handleSubmit}
            disabled={isSaving}
          >
            {isSaving ? "Mentés..." : "Mentés"}
          </button>
        </div>
      </div>
    </div>
  );
};
