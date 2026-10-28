import { useCallback, useEffect, useState } from "react";
import {
  listGroups,
  listGroupOptions,
  type Group,
  type GroupOptions,
} from "../../api/groups";
import { ApiError } from "../../api/client";
import {
  useDataTable,
  TableSearch,
  SortableHeader,
} from "../../components/data-table/data-table";
import { GroupModal } from "./group-modal";

const groupSearchText = (group: Group) =>
  [
    group.name,
    group.status,
    group.areaName,
    group.departmentName,
    group.shiftName,
    group.workScheduleName,
    group.coreHourName,
    group.managerName,
  ]
    .filter(Boolean)
    .join(" ");

const groupSortValue = (group: Group, key: string): number | string => {
  if (key === "name") return group.name;
  if (key === "area") return group.areaName ?? "";
  if (key === "department") return group.departmentName ?? "";
  if (key === "shift") return group.shiftName ?? "";
  if (key === "schedule") return group.workScheduleName ?? "";
  if (key === "coreHour") return group.coreHourName ?? "";
  if (key === "manager") return group.managerName ?? "";
  if (key === "employees") return group.activeEmployees;
  return "";
};

export const GroupsPage = () => {
  const [groups, setGroups] = useState<Group[]>([]);
  const [options, setOptions] = useState<GroupOptions | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [infoMessage, setInfoMessage] = useState("");
  const [modal, setModal] = useState<{ group: Group | null } | null>(null);

  const groupTable = useDataTable({
    rows: groups,
    searchText: groupSearchText,
    sortValue: groupSortValue,
    initialSortKey: "name",
  });

  const load = useCallback(async () => {
    setErrorMessage("");
    try {
      const data = await listGroups();
      setGroups(data.groups);
    } catch (error) {
      setGroups([]);
      setErrorMessage(
        error instanceof ApiError ? error.message : "Ismeretlen hiba történt.",
      );
    }
  }, []);

  useEffect(() => {
    load();
    listGroupOptions()
      .then(setOptions)
      .catch(() => setOptions(null));
  }, [load]);

  const handleSaved = async (message: string) => {
    setErrorMessage("");
    setInfoMessage(message);
    setModal(null);
    await load();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold">Csoportok</h1>

        <div className="ml-auto">
          <TableSearch
            table={groupTable}
            placeholder="Keresés csoport, terület, vezető szerint..."
          />
        </div>

        <button
          className="btn btn-sm btn-primary"
          onClick={() => setModal({ group: null })}
          disabled={!options}
        >
          Új csoport
        </button>
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
              <SortableHeader table={groupTable} field="name" label="Csoport" />
              <SortableHeader table={groupTable} field="area" label="Terület" />
              <SortableHeader
                table={groupTable}
                field="department"
                label="Részleg"
              />
              <SortableHeader table={groupTable} field="shift" label="Műszak" />
              <SortableHeader
                table={groupTable}
                field="schedule"
                label="Munkarend"
              />
              <SortableHeader
                table={groupTable}
                field="coreHour"
                label="Törzsidő"
              />
              <SortableHeader
                table={groupTable}
                field="manager"
                label="Vezető"
              />
              <SortableHeader
                table={groupTable}
                field="employees"
                label="Aktív dolgozó"
              />
              <th />
            </tr>
          </thead>
          <tbody>
            {groupTable.rows.map((group) => (
              <tr key={group.id} className="hover">
                <td className="whitespace-nowrap">
                  {group.name}
                  {group.status !== "Aktív" && (
                    <span className="badge badge-sm badge-ghost ml-2">
                      {group.status}
                    </span>
                  )}
                </td>
                <td>{group.areaName ?? "-"}</td>
                <td>{group.departmentName ?? "-"}</td>
                <td>{group.shiftName ?? "-"}</td>
                <td>{group.workScheduleName ?? "-"}</td>
                <td>{group.coreHourName ?? "-"}</td>
                <td>{group.managerName ?? "-"}</td>
                <td>{group.activeEmployees}</td>
                <td className="whitespace-nowrap text-right">
                  <button
                    className="btn btn-xs"
                    onClick={() => setModal({ group })}
                    disabled={!options}
                  >
                    Szerkesztés
                  </button>
                </td>
              </tr>
            ))}

            {groupTable.rows.length === 0 && (
              <tr>
                <td colSpan={9} className="text-center opacity-60">
                  Nincs a keresésnek megfelelő csoport.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {modal && options && (
        <GroupModal
          group={modal.group}
          options={options}
          onChanged={load}
          onClose={() => setModal(null)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
};
