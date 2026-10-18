import { useEffect, useState } from "react";
import { listEmployees } from "../../api/lookups";
import { MonthlyLogTab } from "./monthly-log-tab";
import { GroupLogTab } from "./group-log-tab";

export const TimeLogPage = () => {
  const [tab, setTab] = useState<"own" | "group">("own");
  const [hasSubordinates, setHasSubordinates] = useState(false);

  useEffect(() => {
    listEmployees()
      .then((data) =>
        setHasSubordinates(data.employees.some((item) => !item.isSelf)),
      )
      .catch(() => setHasSubordinates(false));
  }, []);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Munkaidő rögzítése</h1>

      <div role="tablist" className="tabs tabs-bordered">
        <button
          role="tab"
          className={`tab ${tab === "own" ? "tab-active" : ""}`}
          onClick={() => setTab("own")}
        >
          Egyéni
        </button>
        {hasSubordinates && (
          <button
            role="tab"
            className={`tab ${tab === "group" ? "tab-active" : ""}`}
            onClick={() => setTab("group")}
          >
            Csoportos
          </button>
        )}
      </div>

      {tab === "own" ? <MonthlyLogTab /> : <GroupLogTab />}
    </div>
  );
};
