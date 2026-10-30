import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
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

const CHART_COLORS = [
  "#2563eb",
  "#0ea5e9",
  "#f59e0b",
  "#ef4444",
  "#10b981",
  "#8b5cf6",
  "#64748b",
];

const toHours = (minutes: number): number =>
  Math.round((minutes / 60) * 100) / 100;

const hourLabel = (value: number): string =>
  `${value.toString().replace(".", ",")} óra`;

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

  const comparisonData = current
    ? [
        {
          name: "Ledolgozott",
          "Ez a hónap": toHours(current.workedMinutes),
          "Előző hónap": toHours(previous?.workedMinutes ?? 0),
        },
        {
          name: "Jogcímmel fedett",
          "Ez a hónap": toHours(current.absenceMinutes),
          "Előző hónap": toHours(previous?.absenceMinutes ?? 0),
        },
        {
          name: "Elszámolt",
          "Ez a hónap": toHours(current.settledMinutes),
          "Előző hónap": toHours(previous?.settledMinutes ?? 0),
        },
      ]
    : [];

  const allowanceData = current
    ? allowanceTypes
        .filter((type) => current.allowances[type.code])
        .map((type) => ({
          name: type.name,
          value: toHours(current.allowances[type.code]),
        }))
    : [];

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

                <progress
                  className="progress progress-primary w-full"
                  value={overview.leave.usedDays}
                  max={overview.leave.entitlementDays || 1}
                />

                <p className="text-sm opacity-70">
                  {overview.leave.usedDays} nap felhasználva a keretből (
                  {overview.leave.entitlementDays} nap)
                </p>
              </div>
            </div>

            <Link
              to="/requests?tab=own"
              className="card bg-base-200 transition hover:bg-base-300"
            >
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
                <span className="mt-1 text-xs opacity-60">
                  Kattints a kérelmeid megnyitásához
                </span>
              </div>
            </Link>

            {overview.approval && (
              <Link
                to="/requests?tab=pending"
                className="card bg-base-200 transition hover:bg-base-300"
              >
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
                  <span className="mt-1 text-xs opacity-60">
                    Kattints az elbíráláshoz
                  </span>
                </div>
              </Link>
            )}
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="card bg-base-200">
              <div className="card-body">
                <h2 className="card-title text-base">
                  Összehasonlítás az előző hónappal
                </h2>
                <p className="text-sm opacity-70">
                  {formatMonth(period.year, period.month)} és{" "}
                  {formatMonth(
                    overview.previousPeriod.year,
                    overview.previousPeriod.month,
                  )}
                </p>

                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={comparisonData}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                      <XAxis dataKey="name" fontSize={12} />
                      <YAxis fontSize={12} unit=" ó" />
                      <Tooltip
                        formatter={(value) => hourLabel(Number(value))}
                      />
                      <Legend />
                      <Bar dataKey="Ez a hónap" fill={CHART_COLORS[0]} />
                      <Bar dataKey="Előző hónap" fill={CHART_COLORS[6]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <div className="card bg-base-200">
              <div className="card-body">
                <h2 className="card-title text-base">Pótlékok megoszlása</h2>
                <p className="text-sm opacity-70">
                  {formatMonth(period.year, period.month)}
                </p>

                {allowanceData.length === 0 ? (
                  <p className="text-sm opacity-70 py-12 text-center">
                    Ebben a hónapban nem keletkezett pótlék.
                  </p>
                ) : (
                  <div className="h-72 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={allowanceData}
                          dataKey="value"
                          nameKey="name"
                          innerRadius="45%"
                          outerRadius="75%"
                          paddingAngle={2}
                        >
                          {allowanceData.map((entry, index) => (
                            <Cell
                              key={entry.name}
                              fill={CHART_COLORS[index % CHART_COLORS.length]}
                            />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value) => hourLabel(Number(value))}
                        />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            </div>
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
