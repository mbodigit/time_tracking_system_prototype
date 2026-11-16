import { useCallback, useEffect, useState } from "react";
import {
  listAllowanceAdmin,
  type AdminAllowance,
  type AllowanceAdminData,
} from "../../api/allowanceAdmin";
import { ApiError } from "../../api/client";
import { EmptyState } from "../../components/empty-state/empty-state";
import { AllowanceModal } from "./allowance-modal";
import { showToast } from "../../utils/toast";
import { GhostButton } from "../../components/button/button";

const toTime = (value: string) => String(value).slice(0, 5);

export const AllowancesSection = () => {
  const [data, setData] = useState<AllowanceAdminData | null>(null);
  const [modal, setModal] = useState<{ allowance: AdminAllowance } | null>(
    null,
  );

  const load = useCallback(async () => {
    try {
      setData(await listAllowanceAdmin());
    } catch (error) {
      setData(null);
      showToast(error instanceof ApiError ? error.message : "Ismeretlen hiba történt.", "error");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleSaved = (message: string) => {
    setModal(null);
    showToast(message);
    load();
  };

  return (
    <div className="space-y-3">
      <p className="text-sm opacity-70">
        A pótlékok listája rögzített. A százalék, az idősáv, a bérkód és az
        érintett munkarendek módosíthatók.
      </p>

      {data && data.allowances.length === 0 && (
        <EmptyState message="Nincs felvett pótlék." />
      )}

      {data && data.allowances.length > 0 && (
        <div className="overflow-x-auto">
          <table className="table table-sm">
            <thead>
              <tr>
                <th>Megnevezés</th>
                <th>Kulcs</th>
                <th>Bérkód</th>
                <th>Százalék</th>
                <th>Idősáv</th>
                <th>Munkarendek</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {data.allowances.map((allowance) => (
                <tr key={allowance.id} className="hover">
                  <td className="whitespace-nowrap">{allowance.name}</td>
                  <td className="font-mono text-xs">{allowance.code}</td>
                  <td>{allowance.payrollCode ?? "-"}</td>
                  <td>{allowance.percent}%</td>
                  <td className="whitespace-nowrap">
                    {toTime(allowance.startHour) === toTime(allowance.endHour)
                      ? "egész nap"
                      : `${toTime(allowance.startHour)} - ${toTime(allowance.endHour)}`}
                  </td>
                  <td>{allowance.workScheduleNames.join(", ") || "-"}</td>
                  <td className="text-right">
                    <GhostButton size="xs"
                      onClick={() => setModal({ allowance })}
                    >
                      Szerkesztés
                    </GhostButton>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal && data && (
        <AllowanceModal
          allowance={modal.allowance}
          payrollCodes={data.payrollCodes}
          workSchedules={data.workSchedules}
          onClose={() => setModal(null)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
};
