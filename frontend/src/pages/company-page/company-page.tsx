import { useState } from "react";
import { CompanySettingsSection } from "./company-settings-section";
import {
  MasterDataSection,
  type EntityDef,
} from "../master-data-page/master-data-section";

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

export const CompanyPage = () => {
  const [tab, setTab] = useState(COMPANY_TAB);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 flex-wrap">
        <h1 className="text-2xl font-bold">Vállalati adatok</h1>

        <div
          role="tablist"
          className="tabs tabs-box tabs-sm bg-base-200 p-1 rounded-lg"
        >
          {[COMPANY_TAB, WORK_LOCATIONS.tab].map((name) => (
            <button
              key={name}
              role="tab"
              className={`tab ${tab === name ? "tab-active" : ""}`}
              onClick={() => setTab(name)}
            >
              {name}
            </button>
          ))}
        </div>
      </div>

      {tab === COMPANY_TAB ? (
        <CompanySettingsSection />
      ) : (
        <MasterDataSection entity={WORK_LOCATIONS} />
      )}
    </div>
  );
};
