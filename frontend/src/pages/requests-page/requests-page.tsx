import { useCallback, useEffect, useState } from "react";
import {
  listOwnRequests,
  listPendingRequests,
  decideRequest,
  withdrawRequest,
  setOrdered,
  type AbsenceRequest,
} from "../../api/requests";
import { listEmployees, type ScopeEmployee } from "../../api/lookups";
import { ApiError } from "../../api/client";
import { RequestForm } from "./request-form";

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
  return item.status;
};

export const RequestsPage = () => {
  const [tab, setTab] = useState<Tab>("own");
  const [own, setOwn] = useState<AbsenceRequest[]>([]);
  const [pending, setPending] = useState<AbsenceRequest[]>([]);
  const [employees, setEmployees] = useState<ScopeEmployee[]>([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [infoMessage, setInfoMessage] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);

  const [orderEmployeeId, setOrderEmployeeId] = useState(0);
  const [orderDate, setOrderDate] = useState("");

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
        const pendingData = await listPendingRequests();
        setPending(pendingData.requests);
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
    const reason = window.prompt("Az elutasítás indoklása:");
    if (!reason) {
      return;
    }
    runAction(() => decideRequest(item.id, "Elutasítva", reason));
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
            {pending.length > 0 && (
              <span className="badge badge-sm badge-warning ml-2">
                {pending.length}
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
          <button
            className="btn btn-primary btn-sm"
            onClick={() => setIsFormOpen(true)}
          >
            Új kérelem
          </button>

          <div className="overflow-x-auto">
            <table className="table table-sm">
              <thead>
                <tr>
                  <th>Jogcím</th>
                  <th>Időszak</th>
                  <th>Állapot</th>
                  <th>Indoklás</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {own.map((item) => (
                  <tr key={item.id}>
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
                {own.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center opacity-60">
                      Még nincs leadott kérelem.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "pending" && (
        <div className="overflow-x-auto">
          <table className="table table-sm">
            <thead>
              <tr>
                <th>Dolgozó</th>
                <th>Jogcím</th>
                <th>Időszak</th>
                <th>Megjegyzés</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {pending.map((item) => (
                <tr
                  key={item.id}
                  className={item.isExpired ? "bg-error/10" : ""}
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
                  <td className="text-sm">{item.message ?? "-"}</td>
                  <td className="whitespace-nowrap">
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
                  </td>
                </tr>
              ))}
              {pending.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center opacity-60">
                    Nincs elbírálásra váró kérelem.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
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

            <label className="form-control">
              <div className="label py-1">
                <span className="label-text">Dolgozó</span>
              </div>
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
            </label>

            <label className="form-control">
              <div className="label py-1">
                <span className="label-text">Nap</span>
              </div>
              <input
                type="date"
                className="input input-bordered"
                value={orderDate}
                onChange={(event) => setOrderDate(event.target.value)}
              />
            </label>

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
    </div>
  );
};
