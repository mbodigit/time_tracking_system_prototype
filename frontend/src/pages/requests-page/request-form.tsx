import { useEffect, useState } from "react";
import { createRequest } from "../../api/requests";
import {
  listAbsences,
  listEmployees,
  type AbsenceType,
  type ScopeEmployee,
} from "../../api/lookups";
import { ApiError } from "../../api/client";
import { Field, FormGrid } from "../../components/form-field/form-field";
import { getCurrentUser } from "../../utils/auth";
import { RequestCalendar } from "./request-calendar";

interface Props {
  defaultDate?: string;
  onClose: () => void;
  onSaved: () => void;
}

export const RequestForm = ({ defaultDate, onClose, onSaved }: Props) => {
  const currentUser = getCurrentUser();

  const [employees, setEmployees] = useState<ScopeEmployee[]>([]);
  const [absences, setAbsences] = useState<AbsenceType[]>([]);
  const [employeeId, setEmployeeId] = useState<number>(
    currentUser?.employeeId ?? 0,
  );
  const [absenceId, setAbsenceId] = useState<number>(0);
  const [startDate, setStartDate] = useState(defaultDate ?? "");
  const [endDate, setEndDate] = useState("");
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    listEmployees()
      .then((data) => setEmployees(data.employees))
      .catch(() => setEmployees([]));
  }, []);

  useEffect(() => {
    if (!employeeId) {
      return;
    }
    listAbsences(employeeId)
      .then((data) => {
        setAbsences(data.absences);
        setAbsenceId(0);
      })
      .catch(() => setAbsences([]));
  }, [employeeId]);

  const selected = absences.find((item) => item.id === absenceId);
  const needsEndDate = Boolean(selected) && !selected!.isOpenEnded;

  const handlePick = (date: string) => {
    if (!startDate || (startDate && endDate)) {
      setStartDate(date);
      setEndDate("");
      return;
    }

    if (date < startDate) {
      setStartDate(date);
      return;
    }

    setEndDate(date);
  };

  const handleSubmit = async () => {
    setErrorMessage("");

    if (!absenceId || !startDate) {
      setErrorMessage("A jogcím és a kezdő nap megadása kötelező.");
      return;
    }

    setIsSaving(true);
    try {
      await createRequest({
        employeeId,
        absenceId,
        startDate,
        ...(endDate ? { endDate } : {}),
        ...(message ? { message } : {}),
      });
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
      <div className="modal-box max-w-2xl p-0">
        <div className="flex items-start justify-between gap-3 border-b border-base-300 px-6 pb-3 pt-5">
          <h3 className="text-xl font-bold text-primary">
            Új távolléti kérelem
          </h3>
          <button
            type="button"
            className="btn btn-sm btn-ghost btn-circle"
            onClick={onClose}
            disabled={isSaving}
            aria-label="Bezárás"
          >
            ✕
          </button>
        </div>

        <div className="space-y-5 px-6 py-5">
          {errorMessage && (
            <div className="alert alert-error py-2 text-sm">
              <span>{errorMessage}</span>
            </div>
          )}

          <FormGrid columns={2}>
            {employees.length > 1 && (
              <Field label="Dolgozó" span={2}>
                <select
                  className="select select-sm select-bordered"
                  value={employeeId}
                  onChange={(event) =>
                    setEmployeeId(Number(event.target.value))
                  }
                >
                  {employees.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name} {item.isSelf ? "(saját)" : `— ${item.code}`}
                    </option>
                  ))}
                </select>
              </Field>
            )}

            <Field label="Távolléti jogcím" span={2}>
              <select
                className="select select-sm select-bordered"
                value={absenceId}
                onChange={(event) => setAbsenceId(Number(event.target.value))}
              >
                <option value={0}>Válassz jogcímet</option>
                {absences.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                    {item.isPaid ? "" : " (nem fizetett)"}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Kezdő nap">
              <input
                type="date"
                className="input input-sm input-bordered"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
              />
            </Field>

            <Field
              label={`Záró nap${needsEndDate ? "" : " (elhagyható)"}`}
              hint={
                selected?.isOpenEnded
                  ? "Nyitott végű jogcím: ha a záró nap még nem ismert, hagyd üresen, és később pontosítható."
                  : undefined
              }
            >
              <input
                type="date"
                className="input input-sm input-bordered"
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
              />
            </Field>

            <Field label="Megjegyzés" span={2}>
              <textarea
                className="textarea textarea-sm textarea-bordered"
                rows={2}
                value={message}
                onChange={(event) => setMessage(event.target.value)}
              />
            </Field>
          </FormGrid>

          <div className="space-y-2">
            <span className="text-sm font-medium opacity-80">
              A dolgozó naptára
            </span>

            <RequestCalendar
              employeeId={employeeId || null}
              startDate={startDate}
              endDate={endDate}
              onPick={handlePick}
            />

            <p className="text-xs opacity-60">
              Az első kattintás a kezdő napot állítja be, a második a zárót. Ha
              újra a kezdő nap elé kattintasz, az lesz az új kezdet. A dátumok
              kézzel is írhatók a mezőkbe.
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-base-300 px-6 pb-5 pt-3">
          <button
            className="btn btn-sm btn-ghost"
            onClick={onClose}
            disabled={isSaving}
          >
            Mégse
          </button>
          <button
            className="btn btn-sm btn-primary"
            onClick={handleSubmit}
            disabled={isSaving}
          >
            {isSaving ? "Mentés..." : "Kérelem leadása"}
          </button>
        </div>
      </div>
      <div
        className="modal-backdrop"
        onClick={isSaving ? undefined : onClose}
      />
    </div>
  );
};
