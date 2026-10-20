import { useCallback, useEffect, useState } from "react";
import { getOverview, type DashboardOverview } from "../../api/dashboard";
import { ApiError } from "../../api/client";
import { getCurrentUser } from "../../utils/auth";
import {
  formatMinutes,
  formatSignedMinutes,
  formatMonth,
  getCurrentMonth,
  getWeekdayName,
  shiftMonth,
} from "../../utils/datetime";

const difference = (current: number, previous: number | undefined) => {
  if (previous === undefined || previous === null) {
    return null;
  }
  return current - previous;
};

export const DashboardPage = () => {
  const [period, setPeriod] = useState(getCurrentMonth());
  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const user = getCurrentUser();

  const load = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage("");
    try {
      const data = await getOverview(period.year, period.month);
      setOverview(data);
    } catch (error) {
      setOverview(null);
      setErrorMessage(
        error instanceof ApiError ? error.message : "Ismeretlen hiba történt.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [period]);

  useEffect(() => {
    load();
  }, [load]);

  const current = overview?.current;
  const previous = overview?.previous;
  const allowanceTypes = overview?.allowanceTypes ?? [];

  const workedDifference = current
    ? difference(current.workedMinutes, previous?.workedMinutes)
    : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <h1 className="text-2xl font-bold">
          Áttekintő
          {user?.fullName && (
            <span className="text-base font-normal opacity-60 ml-3">
              {user.fullName}
            </span>
          )}
        </h1>

        <div className="join ml-auto">
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
      </div>

      {errorMessage && (
        <div className="alert alert-error text-sm py-2">
          <span>{errorMessage}</span>
        </div>
      )}

      {isLoading && <span className="loading loading-spinner" />}

      {overview && current && (
        <>
          <div className="stats stats-horizontal bg-base-200 w-full">
            <div className="stat py-3">
              <div className="stat-title">Elszámolt összesen</div>
              <div className="stat-value text-2xl">
                {formatMinutes(current.settledMinutes)}
              </div>
            </div>
            <div className="stat py-3">
              <div className="stat-title">Ledolgozott munkaidő</div>
              <div className="stat-value text-2xl">
                {formatMinutes(current.workedMinutes)}
              </div>
              {workedDifference !== null && (
                <div className="stat-desc">
                  {formatSignedMinutes(workedDifference)} az előző hónaphoz
                  képest
                </div>
              )}
            </div>
            <div className="stat py-3">
              <div className="stat-title">Jogcímmel fedett</div>
              <div className="stat-value text-2xl">
                {formatMinutes(current.absenceMinutes)}
              </div>
            </div>
            <div className="stat py-3">
              <div className="stat-title">Mínusz órák</div>
              <div
                className={`stat-value text-2xl ${
                  current.minusMinutes < 0 ? "text-error" : ""
                }`}
              >
                {formatSignedMinutes(current.minusMinutes)}
              </div>
            </div>
            <div className="stat py-3">
              <div className="stat-title">Havi egyenleg</div>
              <div
                className={`stat-value text-2xl ${
                  current.balanceMinutes < 0 ? "text-error" : ""
                }`}
              >
                {formatSignedMinutes(current.balanceMinutes)}
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="card bg-base-200">
              <div className="card-body">
                <h2 className="card-title text-base">Éves szabadságkeret</h2>
                <p className="text-3xl font-bold">
                  {overview.leave.remainingDays} nap
                </p>
                <p className="text-sm opacity-70">
                  {overview.leave.usedDays} nap felhasználva a keretből (
                  {overview.leave.entitlementDays} nap)
                </p>
              </div>
            </div>

            <div className="card bg-base-200">
              <div className="card-body">
                <h2 className="card-title text-base">Saját kérelmeim</h2>
                <p className="text-sm">
                  Függőben: {overview.openItems.ownRequests.pending} db
                </p>
                {overview.openItems.ownRequests.expired > 0 && (
                  <p className="text-sm text-warning">
                    Ebből elbírálatlanul lejárt:{" "}
                    {overview.openItems.ownRequests.expired} db
                  </p>
                )}
              </div>
            </div>

            {overview.approval && (
              <div className="card bg-base-200">
                <div className="card-body">
                  <h2 className="card-title text-base">
                    Elbírálásra vár tőlem
                  </h2>
                  <p className="text-sm">
                    Függőben: {overview.approval.pending} db
                  </p>
                  {overview.approval.expired > 0 && (
                    <p className="text-sm text-warning">
                      Ebből már lejárt: {overview.approval.expired} db
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="card bg-base-200">
            <div className="card-body">
              <h2 className="card-title text-base">
                Hiányzó munkaidő-rögzítés
              </h2>
              {overview.openItems.missingRecordDays.length === 0 ? (
                <p className="text-sm opacity-70">
                  Nincs pótolni való nap ebben a hónapban.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {overview.openItems.missingRecordDays.map((date) => (
                    <span key={date} className="badge badge-warning">
                      {Number(date.slice(8, 10))}. ({getWeekdayName(date)})
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {allowanceTypes.some((type) => current.allowances[type.code]) && (
            <div className="overflow-x-auto">
              <table className="table table-sm">
                <thead>
                  <tr>
                    <th>Pótlék jogcíme</th>
                    <th>Ebben a hónapban</th>
                    <th>Előző hónapban</th>
                  </tr>
                </thead>
                <tbody>
                  {allowanceTypes
                    .filter(
                      (type) =>
                        current.allowances[type.code] ||
                        previous?.allowances[type.code],
                    )
                    .map((type) => (
                      <tr key={type.code}>
                        <td className="whitespace-nowrap">
                          {type.name}
                          <span className="opacity-60 ml-2">
                            {type.percent}%
                          </span>
                        </td>
                        <td>
                          {formatMinutes(current.allowances[type.code] ?? 0)}
                        </td>
                        <td className="opacity-70">
                          {formatMinutes(previous?.allowances[type.code] ?? 0)}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
};
