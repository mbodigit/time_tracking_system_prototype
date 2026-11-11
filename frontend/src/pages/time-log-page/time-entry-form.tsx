import { useState } from "react";
import {
  createEntry,
  deleteEntry,
  updateEntry,
  type TimeEntryDay,
} from "../../api/timeEntries";
import { ApiError } from "../../api/client";
import { Field } from "../../components/form-field/form-field";
import { getCurrentUser } from "../../utils/auth";

interface FormDefaults {
  coreStart: string | null;
  coreEnd: string | null;
  breakStart: string | null;
  breakEnd: string | null;
  breakMinutes: number | null;
}

interface Props {
  day: TimeEntryDay;
  employeeId?: number | null;
  defaults?: FormDefaults | null;
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

const toInputTime = (value: string | null): string => {
  if (!value) {
    return "";
  }

  return value.length > 8 ? value.slice(11, 16) : value.slice(0, 5);
};

const firstTime = (...values: (string | null | undefined)[]): string => {
  for (const value of values) {
    const time = toInputTime(value ?? null);

    if (time) {
      return time;
    }
  }

  return "";
};

export const TimeEntryForm = ({
  day,
  employeeId,
  defaults,
  onClose,
  onSaved,
}: Props) => {
  const initialWorkStart = firstTime(
    day.workStart,
    day.scheduleStart,
    defaults?.coreStart,
  );

  const templateBreak = toInputTime(defaults?.breakStart ?? null);
  const templateFits =
    Boolean(initialWorkStart) &&
    Boolean(templateBreak) &&
    breakOffsetMinutes(initialWorkStart, templateBreak) >=
      BREAK_EARLIEST_MINUTES &&
    breakOffsetMinutes(initialWorkStart, templateBreak) <= BREAK_LATEST_MINUTES;

  const suggestedBreakStart = !initialWorkStart
    ? ""
    : templateFits
      ? templateBreak
      : toTime(toMinutes(initialWorkStart) + BREAK_EARLIEST_MINUTES);

  const suggestedBreakEnd =
    suggestedBreakStart && defaults?.breakMinutes
      ? toTime(toMinutes(suggestedBreakStart) + defaults.breakMinutes)
      : "";

  const [workStart, setWorkStart] = useState(initialWorkStart);
  const [workEnd, setWorkEnd] = useState(
    firstTime(day.workEnd, day.scheduleEnd, defaults?.coreEnd),
  );
  const [breakStart, setBreakStart] = useState(
    firstTime(day.breakStart) || suggestedBreakStart,
  );
  const [breakEnd, setBreakEnd] = useState(
    firstTime(day.breakEnd) || suggestedBreakEnd,
  );
  const [scheduleShown, setScheduleShown] = useState(day.scheduleFromEntry);
  const [scheduleStart, setScheduleStart] = useState(
    day.scheduleFromEntry ? toInputTime(day.scheduleStart) : "",
  );
  const [scheduleEnd, setScheduleEnd] = useState(
    day.scheduleFromEntry ? toInputTime(day.scheduleEnd) : "",
  );
  const [note, setNote] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const noteRequired = isBackdated(day.date);
  const canSetSchedule = ["Vezető", "HR-Bér", "Admin"].includes(
    getCurrentUser()?.role ?? "",
  );

  const changeBreakStart = (value: string) => {
    setBreakStart(value);

    if (value && defaults?.breakMinutes) {
      setBreakEnd(toTime(toMinutes(value) + defaults.breakMinutes));
    }
  };

  const handleDelete = async () => {
    if (!day.id) {
      return;
    }

    const confirmed = window.confirm(
      "Biztosan törlöd a nap rögzítését? A művelet nem vonható vissza.",
    );

    if (!confirmed) {
      return;
    }

    setErrorMessage("");
    setIsDeleting(true);

    try {
      await deleteEntry(day.id);
      onSaved();
    } catch (error) {
      setErrorMessage(
        error instanceof ApiError ? error.message : "A törlés nem sikerült.",
      );
    } finally {
      setIsDeleting(false);
    }
  };

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

    const scheduleEndDate =
      scheduleEnd <= scheduleStart ? addOneDay(day.date) : day.date;

    const scheduleFields = !canSetSchedule
      ? {}
      : scheduleStart && scheduleEnd
        ? {
            scheduleStart: `${day.date} ${scheduleStart}:00`,
            scheduleEnd: `${scheduleEndDate} ${scheduleEnd}:00`,
          }
        : day.scheduleFromEntry
          ? { scheduleStart: null, scheduleEnd: null }
          : {};

    setIsSaving(true);
    try {
      if (day.id) {
        await updateEntry(day.id, {
          workStart: startValue,
          workEnd: endValue,
          ...breakFields,
          ...scheduleFields,
          ...(note ? { note } : {}),
        });
      } else {
        await createEntry({
          ...(employeeId ? { employeeId } : {}),
          workingDate: day.date,
          workStart: startValue,
          workEnd: endValue,
          ...breakFields,
          ...scheduleFields,
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
              onChange={(event) => changeBreakStart(event.target.value)}
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

        {canSetSchedule && (
          <div>
          <button
            type="button"
            className="btn btn-xs btn-ghost px-0"
            onClick={() => setScheduleShown((current) => !current)}
          >
            {scheduleShown
              ? "▲ Aznapi beosztás elrejtése"
              : "▼ Aznapi beosztás módosítása"}
          </button>
          </div>
        )}

        {canSetSchedule && scheduleShown && (
          <>
            <div className="flex gap-3">
              <Field label="Beosztás kezdete" grow>
                <input
                  type="time"
                  className="input input-bordered"
                  value={scheduleStart}
                  onChange={(event) => setScheduleStart(event.target.value)}
                />
              </Field>

              <Field label="Beosztás vége" grow>
                <input
                  type="time"
                  className="input input-bordered"
                  value={scheduleEnd}
                  onChange={(event) => setScheduleEnd(event.target.value)}
                />
              </Field>

              <button
                type="button"
                className="btn btn-sm btn-ghost self-end"
                disabled={!scheduleStart && !scheduleEnd}
                title="A két mező kiürítése"
                onClick={() => {
                  setScheduleStart("");
                  setScheduleEnd("");
                }}
              >
                Ürítés
              </button>
            </div>

            <p className="text-xs opacity-70">
              Üresen hagyva a munkavállaló törzsideje, illetve a csoport
              műszakrotációja adja a beosztást. Töltsd ki, ha ezen a napon a
              tényleges műszak ettől eltért, például műszakcsere miatt. A két
              mező kiürítésével a napra rögzített beosztás törlődik.
            </p>
          </>
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
          {day.id && (
            <button
              className="btn btn-outline btn-error mr-auto"
              onClick={handleDelete}
              disabled={isSaving || isDeleting}
            >
              {isDeleting ? "Törlés..." : "Nap törlése"}
            </button>
          )}
          <button
            className="btn btn-ghost"
            onClick={onClose}
            disabled={isSaving || isDeleting}
          >
            Mégse
          </button>
          <button
            className="btn btn-primary"
            onClick={handleSubmit}
            disabled={isSaving || isDeleting}
          >
            {isSaving ? "Mentés..." : "Mentés"}
          </button>
        </div>
      </div>
    </div>
  );
};
