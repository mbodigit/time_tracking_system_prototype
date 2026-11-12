import { useState } from "react";
import {
  createAbsence,
  updateAbsence,
  deleteAbsence,
  type AbsencePayload,
  type AdminAbsence,
  type PayrollCodeOption,
} from "../../api/absenceAdmin";
import { ApiError } from "../../api/client";
import { Field, FormGrid } from "../../components/form-field/form-field";

const STATS_NAMES = ["Betegség", "Fizetett szabadság"];

const EMPTY: AbsencePayload = {
  name: "",
  payrollCodeId: null,
  isPaid: true,
  isOpenEnded: false,
  needsApproval: true,
  status: true,
  sort: 0,
  workScheduleIds: [],
};

const toForm = (absence: AdminAbsence): AbsencePayload => ({
  name: absence.name,
  payrollCodeId: absence.payrollCodeId,
  isPaid: absence.isPaid,
  isOpenEnded: absence.isOpenEnded,
  needsApproval: absence.needsApproval,
  status: absence.status,
  sort: absence.sort,
  workScheduleIds: [...absence.workScheduleIds],
});

interface AbsenceModalProps {
  absence: AdminAbsence | null;
  payrollCodes: PayrollCodeOption[];
  workSchedules: { id: number; name: string }[];
  onClose: () => void;
  onSaved: (message: string) => void;
}

export const AbsenceModal = ({
  absence,
  payrollCodes,
  workSchedules,
  onClose,
  onSaved,
}: AbsenceModalProps) => {
  const isNew = absence === null;

  const [form, setForm] = useState<AbsencePayload>(
    absence ? toForm(absence) : EMPTY,
  );
  const [errorMessage, setErrorMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [askDelete, setAskDelete] = useState(false);

  const isBusy = isSaving || isDeleting;
  const isStatsAbsence = absence !== null && STATS_NAMES.includes(absence.name);

  const codeOptions =
    absence?.payrollCodeId &&
    !payrollCodes.some((item) => item.id === absence.payrollCodeId)
      ? [
          {
            id: absence.payrollCodeId,
            code: absence.payrollCode ?? "",
            name: "jelenlegi",
          },
          ...payrollCodes,
        ]
      : payrollCodes;

  const patch = (changes: Partial<AbsencePayload>) =>
    setForm((current) => ({ ...current, ...changes }));

  const fail = (error: unknown) =>
    setErrorMessage(
      error instanceof ApiError ? error.message : "Ismeretlen hiba történt.",
    );

  const toggleSchedule = (id: number) =>
    setForm((current) => ({
      ...current,
      workScheduleIds: current.workScheduleIds.includes(id)
        ? current.workScheduleIds.filter((item) => item !== id)
        : [...current.workScheduleIds, id],
    }));

  const handleSave = async () => {
    setErrorMessage("");
    setIsSaving(true);

    try {
      const response = absence
        ? await updateAbsence(absence.id, form)
        : await createAbsence(form);

      onSaved(response.message);
    } catch (error) {
      fail(error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!absence) {
      return;
    }

    setErrorMessage("");
    setIsDeleting(true);

    try {
      const response = await deleteAbsence(absence.id);
      onSaved(response.message);
    } catch (error) {
      fail(error);
      setAskDelete(false);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="modal modal-open">
      <div className="modal-box max-w-3xl max-h-[90vh] flex flex-col p-0">
        <div className="flex items-start justify-between gap-3 border-b border-base-300 px-6 pb-3 pt-5">
          <div>
            <h3 className="text-xl font-bold text-primary">
              {isNew ? "Új távolléti jogcím" : "Jogcím módosítása"}
            </h3>
            {absence && (
              <p className="mt-0.5 text-xs opacity-60">{absence.name}</p>
            )}
          </div>
          <button
            type="button"
            className="btn btn-sm btn-ghost btn-circle"
            onClick={onClose}
            disabled={isBusy}
            aria-label="Bezárás"
          >
            ✕
          </button>
        </div>

        <div className="space-y-5 overflow-y-auto px-6 py-5">
          {errorMessage && (
            <div className="alert alert-error py-2 text-sm">
              <span>{errorMessage}</span>
            </div>
          )}

          {isStatsAbsence && (
            <div className="alert alert-warning py-2 text-sm">
              <span>
                A statisztika ezt a jogcímet a megnevezése alapján azonosítja.
                Ha átnevezed, a betegszabadság és a fizetett szabadság mérőszáma
                üresen marad.
              </span>
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
              label="Sorrend"
              hint="A választólisták ez szerint rendeznek."
            >
              <input
                type="number"
                className="input input-sm input-bordered"
                value={form.sort}
                onChange={(event) =>
                  patch({ sort: Number(event.target.value) })
                }
              />
            </Field>
          </FormGrid>

          <div className="space-y-2">
            <p className="text-sm font-medium opacity-80">Tulajdonságok</p>

            <div className="grid gap-2 rounded border border-base-300 px-3 py-2 sm:grid-cols-2">
              <label className="flex cursor-pointer items-center gap-3">
                <input
                  type="checkbox"
                  className="checkbox checkbox-sm"
                  checked={form.isPaid}
                  onChange={(event) => patch({ isPaid: event.target.checked })}
                />
                <span className="text-sm">Fizetett távollét</span>
              </label>

              <label className="flex cursor-pointer items-center gap-3">
                <input
                  type="checkbox"
                  className="checkbox checkbox-sm"
                  checked={form.status}
                  onChange={(event) => patch({ status: event.target.checked })}
                />
                <span className="text-sm">Aktív</span>
              </label>

              <label className="flex cursor-pointer items-center gap-3">
                <input
                  type="checkbox"
                  className="checkbox checkbox-sm"
                  checked={form.isOpenEnded}
                  onChange={(event) =>
                    patch({ isOpenEnded: event.target.checked })
                  }
                />
                <span className="text-sm">Nyitott végű</span>
              </label>

              <label className="flex cursor-pointer items-center gap-3">
                <input
                  type="checkbox"
                  className="checkbox checkbox-sm"
                  checked={form.needsApproval}
                  onChange={(event) =>
                    patch({ needsApproval: event.target.checked })
                  }
                />
                <span className="text-sm">Elbírálást igényel</span>
              </label>
            </div>

            <p className="text-xs opacity-60">
              A nyitott végű jogcím záró nap nélkül is leadható, és a lezárásig
              minden eltelt napra érvényes. Az elbírálást nem igénylő jogcím a
              leadáskor azonnal folyamatban lévő állapotba kerül.
            </p>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium opacity-80">
              Mely munkarendekben vehető igénybe
            </p>

            <div className="flex flex-wrap gap-4 rounded border border-base-300 px-3 py-2">
              {workSchedules.map((item) => (
                <label
                  key={item.id}
                  className="flex cursor-pointer items-center gap-2"
                >
                  <input
                    type="checkbox"
                    className="checkbox checkbox-sm"
                    checked={form.workScheduleIds.includes(item.id)}
                    onChange={() => toggleSchedule(item.id)}
                  />
                  <span className="text-sm">{item.name}</span>
                </label>
              ))}
            </div>

            <p className="mt-1 text-xs opacity-60">
              Legalább egy munkarendet meg kell jelölni, különben a jogcím
              senkinek nem jelenne meg a kérelem űrlapján.
            </p>
          </div>

          {askDelete && (
            <div className="alert alert-warning text-sm">
              <div>
                <p className="font-semibold">Biztosan törlöd a jogcímet?</p>
                <p>
                  Ha már adtak be rá kérelmet, a rendszer elutasítja a törlést.
                  Ilyenkor az Aktív jelölő kikapcsolása a helyes megoldás: a
                  jogcím eltűnik a választható listákból, a korábbi kérelmek
                  viszont értelmezhetők maradnak.
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-base-300 px-6 pb-5 pt-3">
          {absence ? (
            askDelete ? (
              <div className="flex gap-2">
                <button
                  className="btn btn-sm btn-error"
                  onClick={handleDelete}
                  disabled={isBusy}
                >
                  {isDeleting ? "Törlés..." : "Igen, törlöm"}
                </button>
                <button
                  className="btn btn-sm btn-ghost"
                  onClick={() => setAskDelete(false)}
                  disabled={isBusy}
                >
                  Vissza
                </button>
              </div>
            ) : (
              <button
                className="btn btn-sm btn-outline btn-error"
                onClick={() => setAskDelete(true)}
                disabled={isBusy}
              >
                Törlés
              </button>
            )
          ) : (
            <span />
          )}

          <div className="flex gap-2">
            <button
              className="btn btn-sm btn-ghost"
              onClick={onClose}
              disabled={isBusy}
            >
              Mégse
            </button>
            <button
              className="btn btn-sm btn-primary"
              onClick={handleSave}
              disabled={isBusy}
            >
              {isSaving ? "Mentés..." : isNew ? "Létrehozás" : "Módosítás"}
            </button>
          </div>
        </div>
      </div>
      <div className="modal-backdrop" onClick={isBusy ? undefined : onClose} />
    </div>
  );
};
