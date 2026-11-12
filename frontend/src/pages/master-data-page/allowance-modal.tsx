import { useState } from "react";
import {
  updateAllowance,
  type AdminAllowance,
  type AllowancePayload,
} from "../../api/allowanceAdmin";
import type { PayrollCodeOption } from "../../api/absenceAdmin";
import { ApiError } from "../../api/client";
import { Field, FormGrid } from "../../components/form-field/form-field";

const toTime = (value: string) => String(value).slice(0, 5);

const toForm = (allowance: AdminAllowance): AllowancePayload => ({
  name: allowance.name,
  payrollCodeId: allowance.payrollCodeId,
  percent: allowance.percent,
  startHour: toTime(allowance.startHour),
  endHour: toTime(allowance.endHour),
  workScheduleIds: allowance.workScheduleIds,
});

interface AllowanceModalProps {
  allowance: AdminAllowance;
  payrollCodes: PayrollCodeOption[];
  workSchedules: { id: number; name: string }[];
  onClose: () => void;
  onSaved: (message: string) => void;
}

export const AllowanceModal = ({
  allowance,
  payrollCodes,
  workSchedules,
  onClose,
  onSaved,
}: AllowanceModalProps) => {
  const [form, setForm] = useState<AllowancePayload>(toForm(allowance));
  const [errorMessage, setErrorMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const patch = (changes: Partial<AllowancePayload>) =>
    setForm((current) => ({ ...current, ...changes }));

  const toggleSchedule = (id: number) =>
    patch({
      workScheduleIds: form.workScheduleIds.includes(id)
        ? form.workScheduleIds.filter((item) => item !== id)
        : [...form.workScheduleIds, id],
    });

  const codeOptions = allowance.payrollCodeId
    ? [
        ...payrollCodes,
        ...(payrollCodes.some((item) => item.id === allowance.payrollCodeId)
          ? []
          : [
              {
                id: allowance.payrollCodeId,
                code: allowance.payrollCode ?? "",
                name: "jelenlegi",
              },
            ]),
      ]
    : payrollCodes;

  const handleSave = async () => {
    setErrorMessage("");
    setIsSaving(true);
    try {
      const data = await updateAllowance(allowance.id, form);
      onSaved(data.message);
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
          <div>
            <h3 className="text-xl font-bold text-primary">
              Pótlék szerkesztése
            </h3>
            <p className="mt-0.5 text-xs opacity-60">
              Számítási kulcs: {allowance.code}
            </p>
          </div>
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

        <div className="space-y-3 px-6 py-4">
          {errorMessage && (
            <div className="alert alert-error py-2 text-sm">
              <span>{errorMessage}</span>
            </div>
          )}

          <FormGrid columns={2}>
            <Field label="Megnevezés" span={2}>
              <input
                type="text"
                className="input input-sm input-bordered"
                value={form.name}
                onChange={(event) => patch({ name: event.target.value })}
              />
            </Field>

            <Field label="Százalék">
              <input
                type="number"
                className="input input-sm input-bordered"
                value={form.percent}
                onChange={(event) =>
                  patch({ percent: Number(event.target.value) })
                }
              />
            </Field>

            <Field
              label="Bérkód"
              hint="Csak szabad bérkód választható."
            >
              <select
                className="select select-sm select-bordered"
                value={form.payrollCodeId ?? ""}
                onChange={(event) =>
                  patch({
                    payrollCodeId: event.target.value
                      ? Number(event.target.value)
                      : null,
                  })
                }
              >
                <option value="">Nincs</option>
                {codeOptions.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.code} — {item.name}
                  </option>
                ))}
              </select>
            </Field>

            <Field
              label="Idősáv kezdete"
              hint="Azonos kezdet és vég esetén a pótlék egész nap érvényes."
            >
              <input
                type="time"
                className="input input-sm input-bordered"
                value={form.startHour}
                onChange={(event) => patch({ startHour: event.target.value })}
              />
            </Field>

            <Field label="Idősáv vége">
              <input
                type="time"
                className="input input-sm input-bordered"
                value={form.endHour}
                onChange={(event) => patch({ endHour: event.target.value })}
              />
            </Field>
          </FormGrid>

          <div className="space-y-1">
            <span className="text-sm font-medium opacity-80">Munkarendek</span>
            <div className="flex flex-wrap gap-4">
              {workSchedules.map((schedule) => (
                <label
                  key={schedule.id}
                  className="flex cursor-pointer items-center gap-2"
                >
                  <input
                    type="checkbox"
                    className="checkbox checkbox-sm"
                    checked={form.workScheduleIds.includes(schedule.id)}
                    onChange={() => toggleSchedule(schedule.id)}
                  />
                  <span className="text-sm">{schedule.name}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-base-300 px-6 pb-5 pt-3">
          <button
            className="btn btn-sm btn-ghost"
            onClick={onClose}
            disabled={isSaving}
          >
            Mégse
          </button>
          <button
            className="btn btn-sm btn-primary"
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? "Mentés..." : "Módosítás"}
          </button>
        </div>
      </div>
      <div className="modal-backdrop" onClick={isSaving ? undefined : onClose} />
    </div>
  );
};
