import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getOverview, type DashboardOverview } from "../../api/dashboard";
import { ApiError } from "../../api/client";
import { EmptyState } from "../../components/empty-state/empty-state";
import {
  formatSignedMinutes,
  formatMonth,
  getCurrentMonth,
  getWeekdayFullName,
  shiftMonth,
} from "../../utils/datetime";
import { showToast } from "../../utils/toast";

const SICK_ABSENCE = "Betegség";

interface Teendo {
  key: string;
  to: string;
  label: string;
  detail?: string;
  days?: string[];
  urgent?: boolean;
}

const Mutato = ({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) => (
  <div className="rounded border border-base-300 px-4 py-3">
    <div className="text-sm opacity-60">{label}</div>
    <div className="text-2xl font-semibold">{value}</div>
    {hint && <div className="text-xs opacity-60">{hint}</div>}
  </div>
);

export const DashboardPage = () => {
  const [period, setPeriod] = useState(getCurrentMonth());
  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getOverview(period.year, period.month);
      setOverview(data);
    } catch (error) {
      setOverview(null);
      showToast(error instanceof ApiError ? error.message : "Ismeretlen hiba történt.", "error");
    } finally {
      setIsLoading(false);
    }
  }, [period]);

  useEffect(() => {
    load();
  }, [load]);

  const dailyMinutes = overview?.dailyMinutes ?? 0;

  const toDays = (minutes: number): string =>
    dailyMinutes > 0
      ? `${Math.round((minutes / dailyMinutes) * 10) / 10} nap`
      : "-";

  const sickMinutes = overview?.current.absences?.[SICK_ABSENCE]?.minutes ?? 0;

  const missingDays = overview?.openItems.missingRecordDays ?? [];
  const ownRequests = overview?.openItems.ownRequests;
  const approval = overview?.approval;

  const teendok: Teendo[] = [];

  if (missingDays.length > 0) {
    teendok.push({
      key: "missing",
      to: "/time-log",
      label: `${missingDays.length} nap munkaidő-rögzítése hiányzik`,
      days: [...missingDays].sort().reverse(),
    });
  }

  if (ownRequests && ownRequests.pending > 0) {
    teendok.push({
      key: "own-pending",
      to: "/requests",
      label: `${ownRequests.pending} kérelmed elbírálásra vár`,
    });
  }

  if (ownRequests && ownRequests.expired > 0) {
    teendok.push({
      key: "own-expired",
      to: "/requests",
      label: `${ownRequests.expired} kérelmed elbírálatlanul lejárt`,
      detail: "A kezdőnap elmúlt, a HR tudja rendezni.",
      urgent: true,
    });
  }

  if (approval && approval.pending > 0) {
    teendok.push({
      key: "approval-pending",
      to: "/requests",
      label: `${approval.pending} kérelem vár a döntésedre`,
    });
  }

  if (approval && approval.expired > 0) {
    teendok.push({
      key: "approval-expired",
      to: "/requests",
      label: `${approval.expired} kérelem elbírálatlanul lejárt`,
      detail: "A távollét kezdőnapja már elmúlt.",
      urgent: true,
    });
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 items-center gap-3">
        <div className="leading-tight">
          <div className="text-lg font-semibold">{overview?.employeeName}</div>
          {overview?.employeeCode && (
            <div className="text-sm opacity-60">{overview.employeeCode}</div>
          )}
        </div>

        <div className="join justify-self-center">
          <button
            className="btn btn-sm join-item"
            onClick={() => setPeriod(shiftMonth(period.year, period.month, -1))}
          >
            {"<"}
          </button>
          <span className="btn btn-sm join-item no-animation pointer-events-none min-w-40">
            {formatMonth(period.year, period.month)}
          </span>
          <button
            className="btn btn-sm join-item"
            onClick={() => setPeriod(shiftMonth(period.year, period.month, 1))}
          >
            {">"}
          </button>
        </div>

        <div />
      </div>

      {isLoading && <span className="loading loading-spinner" />}

      {overview && (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <Mutato
              label="Havi egyenleg"
              value={formatSignedMinutes(overview.current.balanceMinutes)}
              hint={formatMonth(period.year, period.month)}
            />
            <Mutato
              label="Fennmaradó szabadság"
              value={`${overview.leave.remainingDays} nap`}
              hint={`A keret ${overview.leave.entitlementDays} nap`}
            />
            <Mutato
              label="Betegszabadság"
              value={toDays(sickMinutes)}
              hint={formatMonth(period.year, period.month)}
            />
          </div>

          <div className="space-y-2">
            <h2 className="text-sm font-semibold opacity-80">
              Rendezendő tételek
            </h2>

            {teendok.length === 0 ? (
              <EmptyState message="Nincs rendezendő tétel ebben a hónapban." />
            ) : (
              <ul className="divide-y divide-base-300 rounded border border-base-300">
                {teendok.map((item) => (
                  <li key={item.key}>
                    <Link
                      to={item.to}
                      className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-base-200"
                    >
                      <span>
                        <span
                          className={
                            item.urgent ? "font-medium text-error" : "font-medium"
                          }
                        >
                          {item.label}
                        </span>
                        {item.detail && (
                          <span className="block text-xs opacity-60">
                            {item.detail}
                          </span>
                        )}
                        {item.days && (
                          <span className="mt-1 block text-xs opacity-60">
                            {item.days.map((nap) => (
                              <span key={nap} className="block">
                                {nap} ({getWeekdayFullName(nap)})
                              </span>
                            ))}
                          </span>
                        )}
                      </span>
                      <span className="text-sm opacity-60">Megnyitás</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
};
