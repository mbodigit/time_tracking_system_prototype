import { useEffect, useState } from "react";
import { createRequest } from "../../api/requests";
import {
  listAbsences,
  listEmployees,
  type AbsenceType,
  type ScopeEmployee,
} from "../../api/lookups";
import { ApiError } from "../../api/client";
import { getCurrentUser } from "../../utils/auth";

interface Props {
  onClose: () => void;
  onSaved: () => void;
}

export const RequestForm = ({ onClose, onSaved }: Props) => {
  const currentUser = getCurrentUser();

  const [employees, setEmployees] = useState<ScopeEmployee[]>([]);
  const [absences, setAbsences] = useState<AbsenceType[]>([]);
  const [employeeId, setEmployeeId] = useState<number>(
    currentUser?.employeeId ?? 0,
  );
  const [absenceId, setAbsenceId] = useState<number>(0);
  const [startDate, setStartDate] = useState("");
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
      <div className="modal-box space-y-3">
        <h3 className="font-bold text-lg">Új távolléti kérelem</h3>

        {errorMessage && (
          <div className="alert alert-error text-sm py-2">
            <span>{errorMessage}</span>
          </div>
        )}

        {employees.length > 1 && (
          <label className="form-control">
            <div className="label py-1">
              <span className="label-text">Dolgozó</span>
            </div>
            <select
              className="select select-bordered"
              value={employeeId}
              onChange={(event) => setEmployeeId(Number(event.target.value))}
            >
              {employees.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} {item.isSelf ? "(saját)" : `— ${item.code}`}
                </option>
              ))}
            </select>
          </label>
        )}

        <label className="form-control">
          <div className="label py-1">
            <span className="label-text">Távolléti jogcím</span>
          </div>
          <select
            className="select select-bordered"
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
        </label>

        <div className="flex gap-3">
          <label className="form-control flex-1">
            <div className="label py-1">
              <span className="label-text">Kezdő nap</span>
            </div>
            <input
              type="date"
              className="input input-bordered"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
            />
          </label>

          <label className="form-control flex-1">
            <div className="label py-1">
              <span className="label-text">
                Záró nap{needsEndDate ? "" : " (elhagyható)"}
              </span>
            </div>
            <input
              type="date"
              className="input input-bordered"
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
            />
          </label>
        </div>

        {selected?.isOpenEnded && (
          <div className="alert alert-info text-sm py-2">
            <span>
              Nyitott végű jogcím. Ha a záró nap még nem ismert, hagyd üresen —
              a kezdő nap kerül rögzítésre, és később pontosítható.
            </span>
          </div>
        )}

        <label className="form-control">
          <div className="label py-1">
            <span className="label-text">Megjegyzés</span>
          </div>
          <textarea
            className="textarea textarea-bordered"
            rows={2}
            value={message}
            onChange={(event) => setMessage(event.target.value)}
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
            {isSaving ? "Mentés..." : "Kérelem leadása"}
          </button>
        </div>
      </div>
    </div>
  );
};
