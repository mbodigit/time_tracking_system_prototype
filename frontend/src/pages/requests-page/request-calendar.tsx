import { useEffect, useState } from "react";
import { listMonth, type TimeEntryDay } from "../../api/timeEntries";
import {
  formatMonth,
  getCurrentMonth,
  getDayNumber,
  isWeekend,
  shiftMonth,
} from "../../utils/datetime";

const WEEKDAYS = ["H", "K", "Sze", "Cs", "P", "Szo", "V"];

const monthOf = (date: string) => ({
  year: Number(date.slice(0, 4)),
  month: Number(date.slice(5, 7)),
});

const dayClass = (day: TimeEntryDay, inRange: boolean, isEdge: boolean) => {
  if (isEdge) {
    return "bg-primary text-primary-content font-semibold";
  }

  if (inRange) {
    return "bg-primary/25";
  }

  if (day.dayType === "holiday") {
    return "bg-error/20";
  }

  if (day.dayType === "restday") {
    return "bg-warning/25";
  }

  if (day.dayType === "transferred") {
    return "bg-info/20";
  }

  if (isWeekend(day.date)) {
    return "bg-base-200";
  }

  return "";
};

interface RequestCalendarProps {
  employeeId: number | null;
  startDate: string;
  endDate: string;
  onPick: (date: string) => void;
}

export const RequestCalendar = ({
  employeeId,
  startDate,
  endDate,
  onPick,
}: RequestCalendarProps) => {
  const [period, setPeriod] = useState(() =>
    startDate ? monthOf(startDate) : getCurrentMonth(),
  );
  const [days, setDays] = useState<TimeEntryDay[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);

    listMonth(period.year, period.month, employeeId ?? undefined)
      .then((data) => {
        if (!cancelled) {
          setDays(data.days);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setDays([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [period, employeeId]);

  const first = days[0];
  const leading = first
    ? (new Date(`${first.date}T00:00:00`).getDay() + 6) % 7
    : 0;

  return (
    <div className="rounded-lg border border-base-300 p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <button
          type="button"
          className="btn btn-xs"
          onClick={() => setPeriod(shiftMonth(period.year, period.month, -1))}
        >
          {"<"}
        </button>

        <span className="text-sm font-semibold">
          {formatMonth(period.year, period.month)}
        </span>

        <button
          type="button"
          className="btn btn-xs"
          onClick={() => setPeriod(shiftMonth(period.year, period.month, 1))}
        >
          {">"}
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-xs opacity-60">
        {WEEKDAYS.map((name) => (
          <span key={name}>{name}</span>
        ))}
      </div>

      <div className="mt-1 grid grid-cols-7 gap-1">
        {Array.from({ length: leading }).map((_, index) => (
          <span key={`empty-${index}`} />
        ))}

        {days.map((day) => {
          const isEdge = day.date === startDate || day.date === endDate;
          const inRange =
            Boolean(startDate) &&
            Boolean(endDate) &&
            day.date > startDate &&
            day.date < endDate;

          return (
            <button
              key={day.date}
              type="button"
              onClick={() => onPick(day.date)}
              title={[
                day.absence
                  ? `${day.absence.name} (${day.absence.status})`
                  : "",
                day.workStart ? "rögzített munkaidő" : "",
                day.isOrdered ? "elrendelt munkavégzés" : "",
              ]
                .filter(Boolean)
                .join(", ")}
              className={`relative rounded py-1 text-sm hover:ring-1 hover:ring-primary ${dayClass(
                day,
                inRange,
                isEdge,
              )}`}
            >
              {getDayNumber(day.date)}

              {day.absence && (
                <span
                  className={`absolute bottom-0.5 left-1/2 h-1 w-3 -translate-x-1/2 rounded ${
                    day.absence.status === "Jóváhagyva"
                      ? "bg-success"
                      : "bg-warning"
                  }`}
                />
              )}

              {!day.absence && day.workStart && (
                <span className="absolute bottom-0.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-base-content/50" />
              )}
            </button>
          );
        })}
      </div>

      {isLoading && (
        <p className="mt-2 text-center text-xs opacity-60">Betöltés...</p>
      )}

      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs opacity-70">
        <span>
          <span className="mr-1 inline-block h-2 w-3 rounded bg-error/40" />
          munkaszüneti
        </span>
        <span>
          <span className="mr-1 inline-block h-2 w-3 rounded bg-warning/50" />
          pihenőnap
        </span>
        <span>
          <span className="mr-1 inline-block h-2 w-3 rounded bg-info/40" />
          áthelyezett munkanap
        </span>
        <span>
          <span className="mr-1 inline-block h-2 w-3 rounded bg-success" />
          jóváhagyott távollét
        </span>
        <span>
          <span className="mr-1 inline-block h-2 w-3 rounded bg-warning" />
          függőben
        </span>
      </div>
    </div>
  );
};
