import { useState } from "react";
import { CompanySettingsSection } from "./company-settings-section";
import {
  MasterDataSection,
  type EntityDef,
} from "../master-data-page/master-data-section";
import { currentPermissions, hasPermission } from "../../utils/access";
import { TAB_LIST_CLASS, tabClass } from "../../components/tabs/tabs";

const WORK_LOCATIONS: EntityDef = {
  key: "work-locations",
  tab: "Telephelyek",
  title: "Telephely",
  description:
    "A vállalat munkavégzési helyei. A dolgozóhoz rendelt telephely a havi nyomtatványon és a riportban jelenik meg.",
  fields: [
    { key: "name", label: "Megnevezés", type: "text", required: true },
    { key: "code", label: "Kód", type: "text" },
    { key: "country", label: "Ország", type: "text" },
    { key: "postalCode", label: "Irányítószám", type: "text" },
    { key: "city", label: "Település", type: "text" },
    { key: "address", label: "Cím", type: "text" },
  ],
};

const COMPANY_TAB = "Cégadatok";

const TAB_PERMISSION: Record<string, string> = {
  [COMPANY_TAB]: "company.settings",
  [WORK_LOCATIONS.tab]: "company.locations",
};

export const CompanyPage = () => {
  const permissions = currentPermissions();

  const visibleTabs = [COMPANY_TAB, WORK_LOCATIONS.tab].filter((name) =>
    hasPermission(permissions, TAB_PERMISSION[name]),
  );

  const [tab, setTab] = useState(visibleTabs[0] ?? "");

  return (
    <div className="space-y-4">
      <div role="tablist" className={TAB_LIST_CLASS}>
        {visibleTabs.map((name) => (
          <button
            key={name}
            role="tab"
            className={tabClass(tab === name)}
            onClick={() => setTab(name)}
          >
            {name}
          </button>
        ))}
      </div>

      {tab === COMPANY_TAB ? (
        <CompanySettingsSection />
      ) : (
        <MasterDataSection entity={WORK_LOCATIONS} />
      )}
    </div>
  );
};
