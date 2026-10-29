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
} from "../../components/data-table/data-table";
import { AbsenceModal } from "./absence-modal";

const searchText = (absence: AdminAbsence) =>
  [
    absence.name,
    absence.category,
    absence.payrollCode,
    ...absence.workScheduleNames,
  ]
    .filter(Boolean)
    .join(" ");

const sortValue = (absence: AdminAbsence, key: string): number | string => {
  if (key === "sort") return absence.sort;
  if (key === "name") return absence.name;
  if (key === "category") return absence.category;
  if (key === "payrollCode") return absence.payrollCode ?? "";
  if (key === "isPaid") return absence.isPaid ? 1 : 0;
  if (key === "recType") return absence.recType;
  if (key === "status") return absence.status ? 1 : 0;
  return "";
};

export const AbsencesPage = () => {
  const [data, setData] = useState<AbsenceAdminData | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [infoMessage, setInfoMessage] = useState("");
  const [modal, setModal] = useState<{ absence: AdminAbsence | null } | null>(
    null,
  );

  const load = useCallback(async () => {
    setErrorMessage("");
    try {
      setData(await listAbsenceAdmin());
    } catch (error) {
      setData(null);
      setErrorMessage(
        error instanceof ApiError ? error.message : "Ismeretlen hiba történt.",
      );
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
    setErrorMessage("");
    setInfoMessage(message);
    setModal(null);
    await load();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold">Távolléti jogcímek</h1>

        <div className="ml-auto">
          <TableSearch
            table={table}
            placeholder="Keresés megnevezés, kategória, bérkód szerint..."
          />
        </div>

        <button
          className="btn btn-sm btn-primary"
          onClick={() => {
            setInfoMessage("");
            setModal({ absence: null });
          }}
          disabled={!data}
        >
          Új jogcím
        </button>
      </div>

      {errorMessage && (
        <div className="alert alert-error py-2 text-sm">
          <span>{errorMessage}</span>
        </div>
      )}

      {infoMessage && (
        <div className="alert alert-success py-2 text-sm">
          <span>{infoMessage}</span>
        </div>
      )}

      <p className="text-sm opacity-70">
        A jogcím dönti el, hogy a távollét fizetett-e, melyik munkarendben
        igényelhető, kell-e hozzá munkaidőt rögzíteni, és milyen bérkóddal kerül
        a bérfeladásba. A már használt jogcím nem törölhető, csak inaktívvá
        tehető.
      </p>

      <div className="overflow-x-auto">
        <table className="table table-sm">
          <thead>
            <tr>
              <SortableHeader table={table} field="sort" label="Sorrend" />
              <SortableHeader table={table} field="name" label="Megnevezés" />
              <SortableHeader
                table={table}
                field="category"
                label="Kategória"
              />
              <SortableHeader
                table={table}
                field="payrollCode"
                label="Bérkód"
              />
              <SortableHeader table={table} field="isPaid" label="Fizetett" />
              <SortableHeader table={table} field="recType" label="Rögzítés" />
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
                <td>{absence.category}</td>
                <td>{absence.payrollCode ?? "-"}</td>
                <td>{absence.isPaid ? "igen" : "nem"}</td>
                <td className="text-sm">
                  {absence.recType === 1 ? "munkaidővel" : "teljes nap"}
                </td>
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
                  <button
                    className="btn btn-xs"
                    onClick={() => {
                      setInfoMessage("");
                      setModal({ absence });
                    }}
                  >
                    Szerkesztés
                  </button>
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
      </div>

      {modal && data && (
        <AbsenceModal
          absence={modal.absence}
          categories={data.categories}
          workSchedules={data.workSchedules}
          onClose={() => setModal(null)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
};
