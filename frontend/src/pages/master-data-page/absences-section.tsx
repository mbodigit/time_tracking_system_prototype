import { useCallback, useEffect, useState } from "react";
import {
  listAbsenceAdmin,
  type AbsenceAdminData,
  type AdminAbsence,
} from "../../api/absenceAdmin";
import { ApiError } from "../../api/client";
import {
  useDataTable,
  TableSearch,
  SortableHeader,
  TablePager,
} from "../../components/data-table/data-table";
import { AbsenceModal } from "./absence-modal";
import { showToast } from "../../utils/toast";
import { ActionButton, PlainButton } from "../../components/button/button";

const searchText = (absence: AdminAbsence) =>
  [
    absence.name,
    absence.payrollCode,
    ...absence.workScheduleNames,
  ]
    .filter(Boolean)
    .join(" ");

const sortValue = (absence: AdminAbsence, key: string): number | string => {
  if (key === "sort") return absence.sort;
  if (key === "name") return absence.name;
  if (key === "payrollCode") return absence.payrollCode ?? "";
  if (key === "isPaid") return absence.isPaid ? 1 : 0;
  if (key === "status") return absence.status ? 1 : 0;
  return "";
};

export const AbsencesSection = () => {
  const [data, setData] = useState<AbsenceAdminData | null>(null);
  const [modal, setModal] = useState<{ absence: AdminAbsence | null } | null>(
    null,
  );

  const load = useCallback(async () => {
    try {
      setData(await listAbsenceAdmin());
    } catch (error) {
      setData(null);
      showToast(error instanceof ApiError ? error.message : "Ismeretlen hiba történt.", "error");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const table = useDataTable({
    rows: data?.absences ?? [],
    searchText,
    sortValue,
    initialSortKey: "sort",
  });

  const handleSaved = async (message: string) => {
    showToast(message);
    setModal(null);
    await load();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start gap-3">
        <p className="min-w-0 max-w-[50%] flex-1 text-sm leading-snug opacity-70">
          A jogcím dönti el, hogy a távollét fizetett-e, melyik munkarendben
          igényelhető, kell-e hozzá munkaidőt rögzíteni, és milyen bérkóddal
          kerül a bérfeladásba. A már használt jogcím nem törölhető, csak
          inaktívvá tehető.
        </p>

        <div className="ml-auto flex shrink-0 flex-col items-stretch gap-2">
          <TableSearch
            table={table}
            placeholder="Keresés megnevezés, kategória szerint..."
          />

          <ActionButton
            onClick={() => {
                            setModal({ absence: null });
            }}
            disabled={!data}
          >
            Új jogcím
          </ActionButton>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="table table-sm">
          <thead>
            <tr>
              <SortableHeader table={table} field="sort" label="Sorrend" />
              <SortableHeader table={table} field="name" label="Megnevezés" />
              <SortableHeader
                table={table}
                field="payrollCode"
                label="Bérkód"
              />
              <SortableHeader table={table} field="isPaid" label="Fizetett" />
              <th>Munkarendek</th>
              <SortableHeader table={table} field="status" label="Állapot" />
              <th />
            </tr>
          </thead>
          <tbody>
            {table.rows.map((absence) => (
              <tr key={absence.id} className="hover">
                <td>{absence.sort}</td>
                <td className="whitespace-nowrap">
                  {absence.name}
                  {absence.isOpenEnded && (
                    <span className="badge badge-sm badge-ghost ml-2">
                      nyitott végű
                    </span>
                  )}
                </td>
                <td>{absence.payrollCode ?? "-"}</td>
                <td>{absence.isPaid ? "igen" : "nem"}</td>
                <td className="text-sm">
                  {absence.workScheduleNames.join(", ") || "-"}
                </td>
                <td>
                  <span
                    className={`badge badge-sm ${
                      absence.status ? "badge-success" : "badge-ghost"
                    }`}
                  >
                    {absence.status ? "aktív" : "inaktív"}
                  </span>
                </td>
                <td className="whitespace-nowrap text-right">
                  <PlainButton size="xs"
                    onClick={() => {
                                            setModal({ absence });
                    }}
                  >
                    Szerkesztés
                  </PlainButton>
                </td>
              </tr>
            ))}

            {table.rows.length === 0 && (
              <tr>
                <td colSpan={9} className="text-center opacity-60">
                  Nincs a keresésnek megfelelő jogcím.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        <TablePager table={table} unit="jogcím" />
      </div>

      {modal && data && (
        <AbsenceModal
          absence={modal.absence}
          payrollCodes={data.payrollCodes}
          workSchedules={data.workSchedules}
          onClose={() => setModal(null)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
};
