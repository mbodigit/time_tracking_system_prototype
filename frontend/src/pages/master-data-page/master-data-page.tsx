import { useState } from "react";
import { MasterDataSection, type EntityDef } from "./master-data-section";
import { AbsencesSection } from "./absences-section";

const ENTITIES: EntityDef[] = [
  {
    key: "work-schedules",
    tab: "Munkarendek",
    title: "Munkarend",
    description:
      "A munkarend dönti el, hogy a dolgozóra a műszakpótlék szabályai vonatkoznak-e, és mely távolléti jogcímeket veheti igénybe.",
    fields: [
      { key: "name", label: "Megnevezés", type: "text", required: true },
      { key: "isShift", label: "Műszakos", type: "boolean" },
    ],
  },
  {
    key: "working-hours",
    tab: "Napi munkaidők",
    title: "Napi munkaidő",
    description:
      "A szerződés szerinti napi óraszám. Ehhez igazodik a teljesítendő idő és a választható törzsidő is.",
    fields: [
      { key: "num", label: "Óraszám", type: "integer", required: true },
      { key: "name", label: "Megnevezés", type: "text" },
    ],
  },
  {
    key: "core-hours",
    tab: "Törzsidők",
    title: "Törzsidő",
    description:
      "A kötelező jelenléti sáv. Csak olyan törzsidő választható a dolgozóhoz, amelynek hossza megegyezik a napi munkaidejével.",
    fields: [
      { key: "name", label: "Megnevezés", type: "text", required: true },
      { key: "start", label: "Kezdete", type: "time", required: true },
      { key: "end", label: "Vége", type: "time", required: true },
    ],
  },
  {
    key: "cost-centers",
    tab: "Költséghelyek",
    title: "Költséghely",
    description:
      "A bérfeladás és a riportok bontásának alapja. A kódot a bérszámfejtő rendszer használja.",
    fields: [
      { key: "name", label: "Megnevezés", type: "text", required: true },
      { key: "code", label: "Kód", type: "text", required: true },
    ],
  },
];

const ABSENCES_TAB = "Távolléti jogcímek";

export const MasterDataPage = () => {
  const [tab, setTab] = useState<string>(ENTITIES[0].tab);

  const entity = ENTITIES.find((item) => item.tab === tab) ?? null;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Törzsadatok</h1>

      <div role="tablist" className="tabs tabs-bordered">
        {[...ENTITIES.map((item) => item.tab), ABSENCES_TAB].map((name) => (
          <button
            key={name}
            role="tab"
            className={`tab ${name === tab ? "tab-active" : ""}`}
            onClick={() => setTab(name)}
          >
            {name}
          </button>
        ))}
      </div>

      {entity ? (
        <MasterDataSection key={entity.key} entity={entity} />
      ) : (
        <AbsencesSection />
      )}
    </div>
  );
};
