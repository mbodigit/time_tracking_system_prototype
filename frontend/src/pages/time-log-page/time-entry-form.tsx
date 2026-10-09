import { useState } from "react";
import {
  createEntry,
  updateEntry,
  type TimeEntryDay,
} from "../../api/timeEntries";
import { ApiError } from "../../api/client";
import { formatTime } from "../../utils/datetime";

interface Props {
  day: TimeEntryDay;
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

export const TimeEntryForm = ({ day, onClose, onSaved }: Props) => {
  const initialStart = formatTime(day.workStart);
  const initialEnd = formatTime(day.workEnd);
  const crossesMidnight =
    Boolean(day.workEnd) && day.workEnd!.slice(0, 10) !== day.date;

  const [workStart, setWorkStart] = useState(
    initialStart === "-" ? "" : initialStart,
  );
  const [workEnd, setWorkEnd] = useState(initialEnd === "-" ? "" : initialEnd);
  const [endsNextDay, setEndsNextDay] = useState(crossesMidnight);
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

    const startValue = `${day.date} ${workStart}:00`;
    const endDate = endsNextDay ? addOneDay(day.date) : day.date;
    const endValue = `${endDate} ${workEnd}:00`;

    setIsSaving(true);
    try {
      if (day.id) {
        await updateEntry(day.id, {
          workStart: startValue,
          workEnd: endValue,
          ...(note ? { note } : {}),
        });
      } else {
        await createEntry({
          workingDate: day.date,
          workStart: startValue,
          workEnd: endValue,
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
          <label className="form-control flex-1">
            <div className="label py-1">
              <span className="label-text">Munkavégzés kezdete</span>
            </div>
            <input
              type="time"
              className="input input-bordered"
              value={workStart}
              onChange={(event) => setWorkStart(event.target.value)}
            />
          </label>

          <label className="form-control flex-1">
            <div className="label py-1">
              <span className="label-text">Munkavégzés vége</span>
            </div>
            <input
              type="time"
              className="input input-bordered"
              value={workEnd}
              onChange={(event) => setWorkEnd(event.target.value)}
            />
          </label>
        </div>

        <label className="label cursor-pointer justify-start gap-2">
          <input
            type="checkbox"
            className="checkbox checkbox-sm"
            checked={endsNextDay}
            onChange={(event) => setEndsNextDay(event.target.checked)}
          />
          <span className="label-text">
            A munkavégzés a következő napon végződik
          </span>
        </label>

        <label className="form-control">
          <div className="label py-1">
            <span className="label-text">
              Indoklás
              {noteRequired ? " (visszamenőleges rögzítésnél kötelező)" : ""}
            </span>
          </div>
          <textarea
            className="textarea textarea-bordered"
            rows={2}
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />
        </label>

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
