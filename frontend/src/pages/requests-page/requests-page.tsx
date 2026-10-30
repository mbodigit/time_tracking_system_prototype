import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  listOwnRequests,
  listManagedRequests,
  decideRequest,
  withdrawRequest,
  setOrdered,
  type AbsenceRequest,
} from "../../api/requests";
import { listEmployees, type ScopeEmployee } from "../../api/lookups";
import { ApiError } from "../../api/client";
import { Field } from "../../components/form-field/form-field";
import { RequestForm } from "./request-form";
import {
  useDataTable,
  TableSearch,
  SortableHeader,
} from "../../components/data-table/data-table";

type Tab = "own" | "pending" | "ordered";

const STATUS_CLASS: Record<string, string> = {
  Függőben: "badge-warning",
  Jóváhagyva: "badge-success",
  Elutasítva: "badge-error",
  Visszavonva: "badge-ghost",
};

const statusLabel = (item: AbsenceRequest) => {
  if (item.isExpired) {
    return "Elbírálatlanul lejárt";
  }

  if (item.isBackdated) {
    return "Visszamenőleges";
  }

  return item.status;
};

const STATUS_FILTERS = [
  "Mind",
  "Függőben",
  "Jóváhagyva",
  "Elutasítva",
  "Visszavonva",
];

const formatStamp = (value: string | null) =>
  value ? String(value).slice(0, 16).replace("T", " ") : "-";

const ownSearchText = (item: AbsenceRequest) =>
  [item.absenceName, item.status, item.decisionReason, item.startDate]
    .filter(Boolean)
    .join(" ");

const ownSortValue = (item: AbsenceRequest, key: string): number | string => {
  if (key === "absence") return item.absenceName;
  if (key === "period") return item.startDate;
  if (key === "status") return statusLabel(item);
  if (key === "createdAt") return item.createdAt;
  if (key === "decisionBy") return item.decisionBy ?? "";
  if (key === "decisionAt") return item.decisionAt ?? "";
  if (key === "reason") return item.decisionReason ?? "";
  return "";
};

const managedSearchText = (item: AbsenceRequest) =>
  [
    item.employeeName,
    item.absenceName,
    item.message,
    item.status,
    item.decisionBy,
    item.startDate,
  ]
    .filter(Boolean)
    .join(" ");

const managedSortValue = (
  item: AbsenceRequest,
  key: string,
): number | string => {
  if (key === "employee") return item.employeeName ?? "";
  if (key === "absence") return item.absenceName;
  if (key === "period") return item.startDate;
  if (key === "status") return statusLabel(item);
  if (key === "message") return item.message ?? "";
  if (key === "decisionBy") return item.decisionBy ?? "";
  if (key === "decisionAt") return item.decisionAt ?? "";
  return "";
};

export const RequestsPage = () => {
  const [searchParams] = useSearchParams();

  const [tab, setTab] = useState<Tab>(() => {
    const requested = searchParams.get("tab");
    return requested === "pending" || requested === "ordered"
      ? requested
      : "own";
  });
  const [own, setOwn] = useState<AbsenceRequest[]>([]);
  const [managed, setManaged] = useState<AbsenceRequest[]>([]);
  const [employees, setEmployees] = useState<ScopeEmployee[]>([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [infoMessage, setInfoMessage] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [rejected, setRejected] = useState<AbsenceRequest | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const [orderEmployeeId, setOrderEmployeeId] = useState(0);
  const [orderDate, setOrderDate] = useState("");

  const [ownStatus, setOwnStatus] = useState("Mind");
  const [managedStatus, setManagedStatus] = useState("Függőben");

  const ownRows = useMemo(
    () =>
      ownStatus === "Mind"
        ? own
        : own.filter((item) => item.status === ownStatus),
    [own, ownStatus],
  );

  const managedRows = useMemo(
    () =>
      managedStatus === "Mind"
        ? managed
        : managed.filter((item) => item.status === managedStatus),
    [managed, managedStatus],
  );

  const pendingCount = managed.filter(
    (item) => item.status === "Függőben",
  ).length;

  const ownTable = useDataTable({
    rows: ownRows,
    searchText: ownSearchText,
    sortValue: ownSortValue,
    initialSortKey: "period",
    initialDirection: "desc",
  });

  const managedTable = useDataTable({
    rows: managedRows,
    searchText: managedSearchText,
    sortValue: managedSortValue,
    initialSortKey: "period",
    initialDirection: "desc",
  });

  const load = useCallback(async () => {
    setErrorMessage("");
    try {
      const [ownData, employeeData] = await Promise.all([
        listOwnRequests(),
        listEmployees(),
      ]);
      setOwn(ownData.requests);
      setEmployees(employeeData.employees);

      const others = employeeData.employees.filter((item) => !item.isSelf);
      if (others.length > 0) {
        const managedData = await listManagedRequests();
        setManaged(managedData.requests);
        setOrderEmployeeId((current) => current || others[0].id);
      }
    } catch (error) {
      setErrorMessage(
        error instanceof ApiError ? error.message : "Ismeretlen hiba történt.",
      );
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const hasSubordinates = employees.some((item) => !item.isSelf);

  const runAction = async (action: () => Promise<{ message: string }>) => {
    setErrorMessage("");
    setInfoMessage("");
    try {
      const result = await action();
      setInfoMessage(result.message);
      await load();
    } catch (error) {
      setErrorMessage(
        error instanceof ApiError ? error.message : "Ismeretlen hiba történt.",
      );
    }
  };

  const handleDecide = (item: AbsenceRequest, approve: boolean) => {
    if (approve) {
      runAction(() => decideRequest(item.id, "Jóváhagyva"));
      return;
    }

    setRejectReason("");
    setRejected(item);
  };

  const handleReject = async () => {
    const item = rejected;
    const reason = rejectReason.trim();

    if (!item || !reason) {
      return;
    }

    setRejected(null);
    await runAction(() => decideRequest(item.id, "Elutasítva", reason));
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Kérelmek és elrendelések</h1>

      <div role="tablist" className="tabs tabs-bordered">
        <button
          role="tab"
          className={`tab ${tab === "own" ? "tab-active" : ""}`}
          onClick={() => setTab("own")}
        >
          Kérelmeim
        </button>
        {hasSubordinates && (
          <button
            role="tab"
            className={`tab ${tab === "pending" ? "tab-active" : ""}`}
            onClick={() => setTab("pending")}
          >
            Elbírálás
            {pendingCount > 0 && (
              <span className="badge badge-sm badge-warning ml-2">
                {pendingCount}
              </span>
            )}
          </button>
        )}
        {hasSubordinates && (
          <button
            role="tab"
            className={`tab ${tab === "ordered" ? "tab-active" : ""}`}
            onClick={() => setTab("ordered")}
          >
            Elrendelés
          </button>
        )}
      </div>

      {errorMessage && (
        <div className="alert alert-error text-sm py-2">
          <span>{errorMessage}</span>
        </div>
      )}

      {infoMessage && (
        <div className="alert alert-success text-sm py-2">
          <span>{infoMessage}</span>
        </div>
      )}

      {tab === "own" && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <TableSearch
              table={ownTable}
              placeholder="Keresés jogcím, elbíráló szerint..."
            />
            <select
              className="select select-sm select-bordered"
              value={ownStatus}
              onChange={(event) => setOwnStatus(event.target.value)}
            >
              {STATUS_FILTERS.map((item) => (
                <option key={item} value={item}>
                  {item === "Mind" ? "Minden állapot" : item}
                </option>
              ))}
            </select>
            <button
              className="btn btn-primary btn-sm ml-auto"
              onClick={() => setIsFormOpen(true)}
            >
              Új kérelem
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="table table-sm">
              <thead>
                <tr>
                  <SortableHeader
                    table={ownTable}
                    field="absence"
                    label="Jogcím"
                  />
                  <SortableHeader
                    table={ownTable}
                    field="period"
                    label="Időszak"
                  />
                  <SortableHeader
                    table={ownTable}
                    field="status"
                    label="Állapot"
                  />
                  <SortableHeader
                    table={ownTable}
                    field="createdAt"
                    label="Beadva"
                  />
                  <SortableHeader
                    table={ownTable}
                    field="decisionBy"
                    label="Elbíráló"
                  />
                  <SortableHeader
                    table={ownTable}
                    field="decisionAt"
                    label="Elbírálva"
                  />
                  <SortableHeader
                    table={ownTable}
                    field="reason"
                    label="Indoklás"
                  />
                  <th />
                </tr>
              </thead>
              <tbody>
                {ownTable.rows.map((item) => (
                  <tr key={item.id} className="hover">
                    <td>{item.absenceName}</td>
                    <td className="whitespace-nowrap">
                      {item.startDate}
                      {item.endDate !== item.startDate && ` – ${item.endDate}`}
                    </td>
                    <td>
                      <span
                        className={`badge badge-sm ${STATUS_CLASS[item.status]}`}
                      >
                        {statusLabel(item)}
                      </span>
                    </td>
                    <td className="whitespace-nowrap text-sm">
                      {formatStamp(item.createdAt)}
                    </td>
                    <td className="text-sm">{item.decisionBy ?? "-"}</td>
                    <td className="whitespace-nowrap text-sm">
                      {formatStamp(item.decisionAt)}
                    </td>
                    <td className="text-sm">{item.decisionReason ?? "-"}</td>
                    <td>
                      {item.status === "Függőben" && (
                        <button
                          className="btn btn-xs btn-ghost"
                          onClick={() =>
                            runAction(() => withdrawRequest(item.id))
                          }
                        >
                          Visszavonás
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {ownTable.rows.length === 0 && (
                  <tr>
                    <td colSpan={8} className="text-center opacity-60">
                      Nincs a szűrésnek megfelelő kérelem.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "pending" && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <TableSearch
              table={managedTable}
              placeholder="Keresés dolgozó, jogcím, elbíráló szerint..."
            />
            <select
              className="select select-sm select-bordered"
              value={managedStatus}
              onChange={(event) => setManagedStatus(event.target.value)}
            >
              {STATUS_FILTERS.map((item) => (
                <option key={item} value={item}>
                  {item === "Mind" ? "Minden állapot" : item}
                </option>
              ))}
            </select>
          </div>

          <div className="overflow-x-auto">
            <table className="table table-sm">
              <thead>
                <tr>
                  <SortableHeader
                    table={managedTable}
                    field="employee"
                    label="Dolgozó"
                  />
                  <SortableHeader
                    table={managedTable}
                    field="absence"
                    label="Jogcím"
                  />
                  <SortableHeader
                    table={managedTable}
                    field="period"
                    label="Időszak"
                  />
                  <SortableHeader
                    table={managedTable}
                    field="status"
                    label="Állapot"
                  />
                  <SortableHeader
                    table={managedTable}
                    field="message"
                    label="Megjegyzés"
                  />
                  <SortableHeader
                    table={managedTable}
                    field="decisionBy"
                    label="Elbíráló"
                  />
                  <SortableHeader
                    table={managedTable}
                    field="decisionAt"
                    label="Elbírálva"
                  />
                  <th />
                </tr>
              </thead>
              <tbody>
                {managedTable.rows.map((item) => (
                  <tr
                    key={item.id}
                    className={item.isExpired ? "bg-error/10" : "hover"}
                  >
                    <td className="whitespace-nowrap">{item.employeeName}</td>
                    <td>
                      {item.absenceName}
                      {item.isUrgent && (
                        <span className="badge badge-sm badge-error ml-2">
                          sürgős
                        </span>
                      )}
                      {item.isExpired && (
                        <span className="badge badge-sm badge-ghost ml-2">
                          lejárt
                        </span>
                      )}
                    </td>
                    <td className="whitespace-nowrap">
                      {item.startDate}
                      {item.endDate !== item.startDate && ` – ${item.endDate}`}
                    </td>
                    <td>
                      <span
                        className={`badge badge-sm ${STATUS_CLASS[item.status]}`}
                      >
                        {statusLabel(item)}
                      </span>
                    </td>
                    <td className="text-sm">{item.message ?? "-"}</td>
                    <td className="text-sm">{item.decisionBy ?? "-"}</td>
                    <td className="whitespace-nowrap text-sm">
                      {formatStamp(item.decisionAt)}
                    </td>
                    <td className="whitespace-nowrap">
                      {item.status === "Függőben" ? (
                        <>
                          <button
                            className="btn btn-xs btn-success mr-2"
                            onClick={() => handleDecide(item, true)}
                          >
                            Jóváhagyás
                          </button>
                          <button
                            className="btn btn-xs btn-error"
                            onClick={() => handleDecide(item, false)}
                          >
                            Elutasítás
                          </button>
                        </>
                      ) : (
                        <span className="text-sm opacity-60">lezárva</span>
                      )}
                    </td>
                  </tr>
                ))}
                {managedTable.rows.length === 0 && (
                  <tr>
                    <td colSpan={8} className="text-center opacity-60">
                      Nincs a szűrésnek megfelelő kérelem.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "ordered" && (
        <div className="card bg-base-200 max-w-xl">
          <div className="card-body space-y-3">
            <p className="text-sm">
              Elrendelés pihenőnapra, hétvégére, munkaszüneti napra, illetve
              munkanapon a beosztás szerinti munkaidőn felüli munkavégzésre
              adható. Jóváhagyott távolléti jogcímmel fedett napra nem.
            </p>

            <Field label="Dolgozó">
              <select
                className="select select-bordered"
                value={orderEmployeeId}
                onChange={(event) =>
                  setOrderEmployeeId(Number(event.target.value))
                }
              >
                {employees
                  .filter((item) => !item.isSelf)
                  .map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name} — {item.code}
                    </option>
                  ))}
              </select>
            </Field>

            <Field label="Nap">
              <input
                type="date"
                className="input input-bordered"
                value={orderDate}
                onChange={(event) => setOrderDate(event.target.value)}
              />
            </Field>

            <div className="flex gap-2">
              <button
                className="btn btn-primary btn-sm"
                disabled={!orderEmployeeId || !orderDate}
                onClick={() =>
                  runAction(() => setOrdered(orderEmployeeId, orderDate, true))
                }
              >
                Elrendelés
              </button>
              <button
                className="btn btn-outline btn-sm"
                disabled={!orderEmployeeId || !orderDate}
                onClick={() =>
                  runAction(() => setOrdered(orderEmployeeId, orderDate, false))
                }
              >
                Visszavonás
              </button>
            </div>
          </div>
        </div>
      )}

      {isFormOpen && (
        <RequestForm
          onClose={() => setIsFormOpen(false)}
          onSaved={() => {
            setIsFormOpen(false);
            setInfoMessage("A kérelem rögzítésre került.");
            load();
          }}
        />
      )}

      {rejected && (
        <div className="modal modal-open">
          <div className="modal-box max-w-lg p-0">
            <div className="flex items-start justify-between gap-3 border-b border-base-300 px-6 pb-3 pt-5">
              <div>
                <h3 className="text-xl font-bold text-primary">
                  Kérelem elutasítása
                </h3>
                <p className="mt-0.5 text-xs opacity-60">
                  {rejected.employeeName} — {rejected.absenceName},{" "}
                  {rejected.startDate}
                  {rejected.endDate !== rejected.startDate &&
                    ` – ${rejected.endDate}`}
                </p>
              </div>
              <button
                type="button"
                className="btn btn-sm btn-ghost btn-circle"
                onClick={() => setRejected(null)}
                aria-label="Bezárás"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 px-6 py-5">
              <span className="text-sm font-medium opacity-80">
                Az elutasítás indoklása
              </span>
              <textarea
                className="textarea textarea-sm textarea-bordered w-full"
                rows={3}
                autoFocus
                value={rejectReason}
                onChange={(event) => setRejectReason(event.target.value)}
              />
              <p className="text-xs opacity-60">
                Az indoklás megadása kötelező, és a dolgozó számára is látható
                lesz a kérelme mellett.
              </p>
            </div>

            <div className="flex justify-end gap-2 border-t border-base-300 px-6 pb-5 pt-3">
              <button
                className="btn btn-sm btn-ghost"
                onClick={() => setRejected(null)}
              >
                Mégse
              </button>
              <button
                className="btn btn-sm btn-error"
                onClick={handleReject}
                disabled={!rejectReason.trim()}
              >
                Elutasítás
              </button>
            </div>
          </div>
          <div className="modal-backdrop" onClick={() => setRejected(null)} />
        </div>
      )}
    </div>
  );
};
