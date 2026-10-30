import { useCallback, useEffect, useMemo, useState } from "react";
import {
  listMasterData,
  type MasterEntity,
  type MasterItem,
} from "../../api/masterData";
import { ApiError } from "../../api/client";
import {
  useDataTable,
  TableSearch,
  SortableHeader,
  TablePager,
} from "../../components/data-table/data-table";
import {
  MasterDataModal,
  toFormValue,
  type MasterField,
} from "./master-data-modal";

export interface EntityDef {
  key: MasterEntity;
  tab: string;
  title: string;
  description: string;
  fields: MasterField[];
}

interface MasterDataSectionProps {
  entity: EntityDef;
}

export const MasterDataSection = ({ entity }: MasterDataSectionProps) => {
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

  const searchText = useMemo(
    () => (item: MasterItem) =>
      entity.fields
        .map((field) => toFormValue(item[field.key], field.type))
        .join(" "),
    [entity],
  );

  const sortValue = useMemo(
    () =>
      (item: MasterItem, key: string): number | string => {
        const field = entity.fields.find((candidate) => candidate.key === key);

        if (!field) {
          return "";
        }

        if (field.type === "boolean") {
          return item[key] ? 1 : 0;
        }

        if (field.type === "integer") {
          return Number(item[key] ?? 0);
        }

        return String(item[key] ?? "");
      },
    [entity],
  );

  const table = useDataTable({
    rows: items,
    searchText,
    sortValue,
    initialSortKey: entity.fields[0].key,
  });

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
      <div className="flex flex-wrap items-start gap-3">
        <p className="min-w-0 max-w-[50%] flex-1 text-sm leading-snug opacity-70">
          {entity.description}
        </p>

        <div className="ml-auto flex shrink-0 flex-col items-stretch gap-2">
          <TableSearch table={table} placeholder="Keresés..." />

          <button
            className="btn btn-sm btn-primary"
            onClick={() => {
              setInfoMessage("");
              setModal({ item: null });
            }}
          >
            Új {entity.title.toLowerCase()}
          </button>
        </div>
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

      <div className="overflow-x-auto">
        <table className="table table-sm">
          <thead>
            <tr>
              {entity.fields.map((field) => (
                <SortableHeader
                  key={field.key}
                  table={table}
                  field={field.key}
                  label={field.label}
                />
              ))}
              <th />
            </tr>
          </thead>
          <tbody>
            {table.rows.map((item) => (
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

            {table.rows.length === 0 && (
              <tr>
                <td
                  colSpan={entity.fields.length + 1}
                  className="text-center opacity-60"
                >
                  Nincs a keresésnek megfelelő adat.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        <TablePager table={table} unit="tétel" />
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
