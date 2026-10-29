import { useCallback, useEffect, useState } from "react";
import {
  listMasterData,
  type MasterEntity,
  type MasterItem,
} from "../../api/masterData";
import { ApiError } from "../../api/client";
import {
  MasterDataModal,
  toFormValue,
  type MasterField,
} from "./master-data-modal";

interface EntityDef {
  key: MasterEntity;
  tab: string;
  title: string;
  description: string;
  fields: MasterField[];
}

const ENTITIES: EntityDef[] = [
  {
    key: "work-schedules",
    tab: "Munkarendek",
    title: "Munkarend",
    description:
      "A munkarend dönti el, hogy a dolgozóra a műszakpótlék szabályai vonatkoznak-e, és hogy mely távolléti jogcímeket veheti igénybe.",
    fields: [
      { key: "name", label: "Megnevezés", type: "text", required: true },
      { key: "isShift", label: "Műszakos munkarend", type: "boolean" },
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

export const MasterDataPage = () => {
  const [entity, setEntity] = useState<EntityDef>(ENTITIES[0]);
  const [items, setItems] = useState<MasterItem[]>([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [infoMessage, setInfoMessage] = useState("");
  const [modal, setModal] = useState<{ item: MasterItem | null } | null>(null);

  const load = useCallback(async () => {
    setErrorMessage("");
    try {
      const data = await listMasterData(entity.key);
      setItems(data.items);
    } catch (error) {
      setItems([]);
      setErrorMessage(
        error instanceof ApiError ? error.message : "Ismeretlen hiba történt.",
      );
    }
  }, [entity]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSaved = async (message: string) => {
    setErrorMessage("");
    setInfoMessage(message);
    setModal(null);
    await load();
  };

  const cell = (item: MasterItem, field: MasterField) => {
    if (field.type === "boolean") {
      return item[field.key] ? "igen" : "nem";
    }

    const value = toFormValue(item[field.key], field.type);
    return value === "" ? "-" : value;
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold">Törzsadatok</h1>

        <button
          className="btn btn-sm btn-primary ml-auto"
          onClick={() => {
            setInfoMessage("");
            setModal({ item: null });
          }}
        >
          Új {entity.title.toLowerCase()}
        </button>
      </div>

      <div role="tablist" className="tabs tabs-bordered">
        {ENTITIES.map((item) => (
          <button
            key={item.key}
            role="tab"
            className={`tab ${item.key === entity.key ? "tab-active" : ""}`}
            onClick={() => {
              setEntity(item);
              setInfoMessage("");
            }}
          >
            {item.tab}
          </button>
        ))}
      </div>

      {errorMessage && (
        <div className="alert alert-error py-2 text-sm">
          <span>{errorMessage}</span>
        </div>
      )}

      {infoMessage && (
        <div className="alert alert-success py-2 text-sm">
          <span>{infoMessage}</span>
        </div>
      )}

      <p className="text-sm opacity-70">{entity.description}</p>

      <div className="overflow-x-auto">
        <table className="table table-sm">
          <thead>
            <tr>
              {entity.fields.map((field) => (
                <th key={field.key}>{field.label}</th>
              ))}
              <th />
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="hover">
                {entity.fields.map((field) => (
                  <td key={field.key} className="whitespace-nowrap">
                    {cell(item, field)}
                  </td>
                ))}
                <td className="whitespace-nowrap text-right">
                  <button
                    className="btn btn-xs"
                    onClick={() => {
                      setInfoMessage("");
                      setModal({ item });
                    }}
                  >
                    Szerkesztés
                  </button>
                </td>
              </tr>
            ))}

            {items.length === 0 && (
              <tr>
                <td
                  colSpan={entity.fields.length + 1}
                  className="text-center opacity-60"
                >
                  Még nincs felvett adat.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {modal && (
        <MasterDataModal
          entity={entity.key}
          title={entity.title}
          fields={entity.fields}
          item={modal.item}
          onClose={() => setModal(null)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
};
