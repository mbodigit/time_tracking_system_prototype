import { useCallback, useEffect, useState, type ReactNode } from "react";
import {
  listOrg,
  type OrgArea,
  type OrgDepartment,
  type OrgEntity,
  type OrgGroup,
  type OrgShift,
  type OrgTree,
} from "../../api/org";
import {
  listGroups,
  listGroupOptions,
  type Group,
  type GroupOptions,
} from "../../api/groups";
import { ApiError } from "../../api/client";
import { GroupModal, type GroupNode } from "./group-modal";
import { UnitModal, type DerivedGroup, type UnitDraft } from "./unit-modal";
import { getCurrentUser } from "../../utils/auth";

interface UnitModalState {
  entity: OrgEntity;
  label: string;
  unit: UnitDraft | null;
  parentId: number | null;
  parentLabel: string;
  parentOptions: { id: number; name: string }[];
  parentRequired: boolean;
  derivedGroups: DerivedGroup[];
}

interface GroupModalState {
  group: Group | null;
  node: GroupNode;
}

const toDerived = (group: OrgGroup | null): DerivedGroup[] =>
  group ? [{ name: group.name, activeEmployees: group.activeEmployees }] : [];

export const OrgPage = () => {
  const canEdit = getCurrentUser()?.role === "Admin";

  const [tree, setTree] = useState<OrgTree | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [groupOptions, setGroupOptions] = useState<GroupOptions | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [infoMessage, setInfoMessage] = useState("");
  const [unitModal, setUnitModal] = useState<UnitModalState | null>(null);
  const [groupModal, setGroupModal] = useState<GroupModalState | null>(null);

  const load = useCallback(async () => {
    setErrorMessage("");
    try {
      const [orgData, groupData] = await Promise.all([listOrg(), listGroups()]);
      setTree(orgData);
      setGroups(groupData.groups);
    } catch (error) {
      setTree(null);
      setErrorMessage(
        error instanceof ApiError ? error.message : "Ismeretlen hiba történt.",
      );
    }
  }, []);

  useEffect(() => {
    load();

    if (!canEdit) {
      return;
    }

    listGroupOptions()
      .then(setGroupOptions)
      .catch(() => setGroupOptions(null));
  }, [load, canEdit]);

  const areas = tree?.areas ?? [];
  const managers = tree?.managers ?? [];

  const childAreasOf = (parentId: number | null) =>
    areas.filter((item) => item.parentId === parentId);

  const departmentsOf = (area: OrgArea): OrgDepartment[] => area.departments;

  const derivedOfDepartment = (department: OrgDepartment): DerivedGroup[] => [
    ...toDerived(department.group),
    ...department.shifts.flatMap((shift) => toDerived(shift.group)),
  ];

  const derivedOfArea = (area: OrgArea): DerivedGroup[] => [
    ...toDerived(area.group),
    ...departmentsOf(area).flatMap(derivedOfDepartment),
    ...childAreasOf(area.id).flatMap(derivedOfArea),
  ];

  const descendantAreaIds = (areaId: number): number[] => {
    const children = childAreasOf(areaId);
    return [
      areaId,
      ...children.flatMap((child) => descendantAreaIds(child.id)),
    ];
  };

  const handleSaved = async (message: string) => {
    setErrorMessage("");
    setInfoMessage(message);
    setUnitModal(null);
    setGroupModal(null);
    await load();
  };

  const openGroup = (group: OrgGroup | null, node: GroupNode) => {
    setErrorMessage("");
    setInfoMessage("");

    if (!group) {
      setGroupModal({ group: null, node });
      return;
    }

    const full = groups.find((item) => item.id === group.id) ?? null;

    if (!full) {
      setErrorMessage("A csoport adatai nem érhetők el.");
      return;
    }

    setGroupModal({ group: full, node });
  };

  const groupCell = (group: OrgGroup | null, node: GroupNode) => {
    if (!canEdit) {
      return group ? (
        <span>
          {group.name}
          <span className="badge badge-sm ml-2">
            {group.activeEmployees} fő
          </span>
        </span>
      ) : (
        <span className="opacity-50">nincs csoport</span>
      );
    }

    if (!group) {
      return (
        <button
          className="btn btn-xs btn-ghost"
          onClick={() => openGroup(null, node)}
          disabled={!groupOptions || !node.managerName}
          title={
            node.managerName
              ? undefined
              : "Előbb vezetőt kell rendelni a szervezeti egységhez"
          }
        >
          + Csoport létrehozása
        </button>
      );
    }

    return (
      <button
        className="btn btn-xs"
        onClick={() => openGroup(group, node)}
        disabled={!groupOptions}
      >
        {group.name}
        <span className="badge badge-sm ml-2">{group.activeEmployees} fő</span>
        {group.status !== "Aktív" && (
          <span className="badge badge-sm badge-ghost ml-1">
            {group.status}
          </span>
        )}
      </button>
    );
  };

  const unitRow = (
    key: string,
    depth: number,
    icon: string,
    name: string,
    managerName: string | null,
    derived: DerivedGroup[],
    group: OrgGroup | null,
    node: GroupNode,
    onEdit: () => void,
    extra?: ReactNode,
  ) => (
    <tr key={key} className="hover">
      <td>
        <div
          className="flex items-center gap-2"
          style={{ paddingLeft: `${depth * 1.5}rem` }}
        >
          <span className="opacity-50">{icon}</span>
          <span className={depth === 0 ? "font-semibold" : ""}>{name}</span>
        </div>
      </td>
      <td className="whitespace-nowrap">
        {managerName ? (
          <div className="flex flex-col">
            <span>{managerName}</span>
            <span className="text-xs opacity-60">
              {derived.length} csoport ·{" "}
              {derived.reduce((sum, item) => sum + item.activeEmployees, 0)} fő
              a hatókörében
            </span>
          </div>
        ) : (
          <span className="opacity-50">nincs vezető</span>
        )}
      </td>
      <td>{groupCell(group, node)}</td>
      <td className="whitespace-nowrap text-right">
        {canEdit && (
          <>
            {extra}
            <button className="btn btn-xs ml-1" onClick={onEdit}>
              Szerkesztés
            </button>
          </>
        )}
      </td>
    </tr>
  );

  const renderShift = (
    shift: OrgShift,
    area: OrgArea,
    department: OrgDepartment,
    depth: number,
    path: string,
  ): ReactNode =>
    unitRow(
      `shift-${shift.id}`,
      depth,
      "└",
      shift.name,
      shift.managerName,
      toDerived(shift.group),
      shift.group,
      {
        areaId: area.id,
        departmentId: department.id,
        shiftId: shift.id,
        label: shift.name,
        path: `${path} › ${shift.name}`,
        managerName: shift.managerName,
      },
      () =>
        setUnitModal({
          entity: "shifts",
          label: "Műszak",
          unit: {
            id: shift.id,
            name: shift.name,
            parentId: department.id,
            managerId: shift.managerId,
          },
          parentId: department.id,
          parentLabel: "részleg",
          parentOptions: areas.flatMap((item) =>
            item.departments.map((dep) => ({ id: dep.id, name: dep.name })),
          ),
          parentRequired: true,
          derivedGroups: toDerived(shift.group),
        }),
    );

  const renderDepartment = (
    department: OrgDepartment,
    area: OrgArea,
    depth: number,
    path: string,
  ): ReactNode[] => {
    const own = `${path} › ${department.name}`;

    return [
      unitRow(
        `department-${department.id}`,
        depth,
        "├",
        department.name,
        department.managerName,
        derivedOfDepartment(department),
        department.group,
        {
          areaId: area.id,
          departmentId: department.id,
          shiftId: null,
          label: department.name,
          path: own,
          managerName: department.managerName,
        },
        () =>
          setUnitModal({
            entity: "departments",
            label: "Részleg",
            unit: {
              id: department.id,
              name: department.name,
              parentId: area.id,
              managerId: department.managerId,
            },
            parentId: area.id,
            parentLabel: "terület",
            parentOptions: areas.map((item) => ({
              id: item.id,
              name: item.name,
            })),
            parentRequired: true,
            derivedGroups: derivedOfDepartment(department),
          }),
        <button
          className="btn btn-xs btn-ghost"
          onClick={() =>
            setUnitModal({
              entity: "shifts",
              label: "Műszak",
              unit: null,
              parentId: department.id,
              parentLabel: "részleg",
              parentOptions: areas.flatMap((item) =>
                item.departments.map((dep) => ({
                  id: dep.id,
                  name: dep.name,
                })),
              ),
              parentRequired: true,
              derivedGroups: [],
            })
          }
        >
          + Műszak
        </button>,
      ),
      ...department.shifts.map((shift) =>
        renderShift(shift, area, department, depth + 1, own),
      ),
    ];
  };

  const renderArea = (
    area: OrgArea,
    depth: number,
    path: string,
  ): ReactNode[] => {
    const own = path ? `${path} › ${area.name}` : area.name;

    return [
      unitRow(
        `area-${area.id}`,
        depth,
        depth === 0 ? "■" : "├",
        area.name,
        area.managerName,
        derivedOfArea(area),
        area.group,
        {
          areaId: area.id,
          departmentId: null,
          shiftId: null,
          label: area.name,
          path: own,
          managerName: area.managerName,
        },
        () =>
          setUnitModal({
            entity: "areas",
            label: "Terület",
            unit: {
              id: area.id,
              name: area.name,
              parentId: area.parentId,
              managerId: area.managerId,
            },
            parentId: area.parentId,
            parentLabel: "terület",
            parentOptions: areas
              .filter((item) => !descendantAreaIds(area.id).includes(item.id))
              .map((item) => ({ id: item.id, name: item.name })),
            parentRequired: false,
            derivedGroups: derivedOfArea(area),
          }),
        <>
          <button
            className="btn btn-xs btn-ghost"
            onClick={() =>
              setUnitModal({
                entity: "areas",
                label: "Terület",
                unit: null,
                parentId: area.id,
                parentLabel: "terület",
                parentOptions: areas.map((item) => ({
                  id: item.id,
                  name: item.name,
                })),
                parentRequired: false,
                derivedGroups: [],
              })
            }
          >
            + Terület
          </button>
          <button
            className="btn btn-xs btn-ghost ml-1"
            onClick={() =>
              setUnitModal({
                entity: "departments",
                label: "Részleg",
                unit: null,
                parentId: area.id,
                parentLabel: "terület",
                parentOptions: areas.map((item) => ({
                  id: item.id,
                  name: item.name,
                })),
                parentRequired: true,
                derivedGroups: [],
              })
            }
          >
            + Részleg
          </button>
        </>,
      ),
      ...departmentsOf(area).flatMap((department) =>
        renderDepartment(department, area, depth + 1, own),
      ),
      ...childAreasOf(area.id).flatMap((child) =>
        renderArea(child, depth + 1, own),
      ),
    ];
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold">Szervezet és csoportok</h1>

        {canEdit && (
          <button
            className="btn btn-sm btn-primary ml-auto"
            onClick={() =>
              setUnitModal({
                entity: "areas",
                label: "Terület",
                unit: null,
                parentId: null,
                parentLabel: "terület",
                parentOptions: areas.map((item) => ({
                  id: item.id,
                  name: item.name,
                })),
                parentRequired: false,
                derivedGroups: [],
              })
            }
          >
            Új terület
          </button>
        )}
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

      <p className="text-sm opacity-70">
        A szervezeti felépítés adja a hierarchiát: a vezető minden alatta lévő
        szintet lát. A csoport az a halmaz, ahová a dolgozók tartoznak, és egy
        szervezeti egységhez egy csoport tartozhat. A csoport vezetője mindig a
        szervezeti egység vezetője.
      </p>

      <div className="overflow-x-auto">
        <table className="table table-sm">
          <thead>
            <tr>
              <th>Szervezeti egység</th>
              <th>Vezető</th>
              <th>Csoport</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {childAreasOf(null).flatMap((area) => renderArea(area, 0, ""))}

            {areas.length === 0 && (
              <tr>
                <td colSpan={4} className="text-center opacity-60">
                  Még nincs szervezeti egység.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {unitModal && (
        <UnitModal
          entity={unitModal.entity}
          label={unitModal.label}
          unit={unitModal.unit}
          parentId={unitModal.parentId}
          parentLabel={unitModal.parentLabel}
          parentOptions={unitModal.parentOptions}
          parentRequired={unitModal.parentRequired}
          managers={managers}
          derivedGroups={unitModal.derivedGroups}
          onClose={() => setUnitModal(null)}
          onSaved={handleSaved}
        />
      )}

      {groupModal && groupOptions && (
        <GroupModal
          group={groupModal.group}
          node={groupModal.node}
          options={groupOptions}
          onClose={() => setGroupModal(null)}
          onSaved={handleSaved}
          onChanged={load}
        />
      )}
    </div>
  );
};
