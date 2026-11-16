import { useEffect, useState } from "react";
import { listEmployees } from "../../api/lookups";
import { currentPermissions, hasPermission } from "../../utils/access";
import { MonthlyLogTab } from "./monthly-log-tab";
import { GroupLogTab } from "./group-log-tab";
import { TAB_LIST_CLASS, tabClass } from "../../components/tabs/tabs";

export const TimeLogPage = () => {
  const [tab, setTab] = useState<"own" | "group">("own");
  const [hasSubordinates, setHasSubordinates] = useState(false);

  const canGroupLog =
    hasPermission(currentPermissions(), "time_log.group") && hasSubordinates;

  useEffect(() => {
    listEmployees()
      .then((data) =>
        setHasSubordinates(data.employees.some((item) => !item.isSelf)),
      )
      .catch(() => setHasSubordinates(false));
  }, []);

  return (
    <div className="space-y-4">
      {canGroupLog && (
        <div role="tablist" className={TAB_LIST_CLASS}>
          <button
            role="tab"
            className={tabClass(tab === "own")}
            onClick={() => setTab("own")}
          >
            Egyéni
          </button>
          <button
            role="tab"
            className={tabClass(tab === "group")}
            onClick={() => setTab("group")}
          >
            Csoportos
          </button>
        </div>
      )}

      {tab === "group" && canGroupLog ? <GroupLogTab /> : <MonthlyLogTab />}
    </div>
  );
};
