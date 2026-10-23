import { useCallback, useEffect, useState } from "react";
import {
  listOrg,
  createUnit,
  updateUnit,
  deleteUnit,
  type OrgEntity,
  type OrgManager,
  type OrgTree,
} from "../../api/org";
import { ApiError } from "../../api/client";

interface UnitRowProps {
  entity: OrgEntity;
  id: number;
  name: string;
  managerId: number | null;
  managers: OrgManager[];
  onSaved: (message: string) => void;
  onFailed: (message: string) => void;
}

const UnitRow = ({
  entity,
  id,
  name,
  managerId,
  managers,
  onSaved,
  onFailed,
}: UnitRowProps) => {
  const [unitName, setUnitName] = useState(name);
  const [unitManagerId, setUnitManagerId] = useState<number | null>(managerId);

  useEffect(() => {
    setUnitName(name);
    setUnitManagerId(managerId);
  }, [name, managerId]);

  const run = async (action: () => Promise<{ message: string }>) => {
    try {
      const response = await action();
      onSaved(response.message);
    } catch (error) {
      onFailed(
        error instanceof ApiError ? error.message : "Ismeretlen hiba történt.",
      );
    }
  };

  return (
    <div className="flex gap-2 items-center flex-wrap">
      <input
        type="text"
        className="input input-sm input-bordered w-56"
        value={unitName}
        onChange={(event) => setUnitName(event.target.value)}
      />
      <select
        className="select select-sm select-bordered w-56"
        value={unitManagerId ?? ""}
        onChange={(event) =>
          setUnitManagerId(
            event.target.value ? Number(event.target.value) : null,
          )
        }
      >
        <option value="">Nincs vezető</option>
        {managers.map((manager) => (
          <option key={manager.id} value={manager.id}>
            {manager.name}
          </option>
        ))}
      </select>
      <button
        className="btn btn-xs"
        onClick={() =>
          run(() =>
            updateUnit(entity, id, {
              name: unitName,
              managerId: unitManagerId,
            }),
          )
        }
      >
        Mentés
      </button>
      <button
        className="btn btn-xs btn-ghost"
        onClick={() => run(() => deleteUnit(entity, id))}
      >
        Törlés
      </button>
    </div>
  );
};

interface NewUnitProps {
  entity: OrgEntity;
  parentId?: number;
  label: string;
  managers: OrgManager[];
  onSaved: (message: string) => void;
  onFailed: (message: string) => void;
}

const NewUnit = ({
  entity,
  parentId,
  label,
  managers,
  onSaved,
  onFailed,
}: NewUnitProps) => {
  const [unitName, setUnitName] = useState("");
  const [unitManagerId, setUnitManagerId] = useState<number | null>(null);

  const handleCreate = async () => {
    try {
      const response = await createUnit(entity, {
        name: unitName,
        parentId,
        managerId: unitManagerId,
      });
      setUnitName("");
      setUnitManagerId(null);
      onSaved(response.message);
    } catch (error) {
      onFailed(
        error instanceof ApiError ? error.message : "Ismeretlen hiba történt.",
      );
    }
  };

  return (
    <div className="flex gap-2 items-center flex-wrap">
      <input
        type="text"
        className="input input-sm input-bordered w-56"
        placeholder={label}
        value={unitName}
        onChange={(event) => setUnitName(event.target.value)}
      />
      <select
        className="select select-sm select-bordered w-56"
        value={unitManagerId ?? ""}
        onChange={(event) =>
          setUnitManagerId(
            event.target.value ? Number(event.target.value) : null,
          )
        }
      >
        <option value="">Nincs vezető</option>
        {managers.map((manager) => (
          <option key={manager.id} value={manager.id}>
            {manager.name}
          </option>
        ))}
      </select>
      <button className="btn btn-xs btn-primary" onClick={handleCreate}>
        Hozzáadás
      </button>
    </div>
  );
};

export const OrgPage = () => {
  const [tree, setTree] = useState<OrgTree | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [infoMessage, setInfoMessage] = useState("");

  const load = useCallback(async () => {
    try {
      const data = await listOrg();
      setTree(data);
    } catch (error) {
      setTree(null);
      setErrorMessage(
        error instanceof ApiError ? error.message : "Ismeretlen hiba történt.",
      );
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleSaved = (message: string) => {
    setErrorMessage("");
    setInfoMessage(message);
    load();
  };

  const handleFailed = (message: string) => {
    setInfoMessage("");
    setErrorMessage(message);
  };

  const managers = tree?.managers ?? [];

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Szervezeti egységek</h1>

      <p className="text-sm opacity-70 max-w-3xl">
        A szintekhez rendelt vezető a saját egysége alá tartozó valamennyi
        dolgozó adatát eléri: a területi vezető az összes részleget és műszakot,
        a részlegvezető a saját részlegének műszakjait. A vezető mező üresen is
        hagyható, ilyenkor az adott szint nem ad hozzáférést.
      </p>

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

      <div className="card bg-base-200">
        <div className="card-body">
          <h2 className="card-title text-base">Új terület</h2>
          <NewUnit
            entity="areas"
            label="Terület megnevezése"
            managers={managers}
            onSaved={handleSaved}
            onFailed={handleFailed}
          />
        </div>
      </div>

      {tree?.areas.map((area) => (
        <div key={area.id} className="card bg-base-200">
          <div className="card-body space-y-3">
            <h2 className="card-title text-base">{area.name}</h2>

            <UnitRow
              entity="areas"
              id={area.id}
              name={area.name}
              managerId={area.managerId}
              managers={managers}
              onSaved={handleSaved}
              onFailed={handleFailed}
            />

            <div className="pl-6 space-y-3 border-l border-base-300">
              {area.departments.map((department) => (
                <div key={department.id} className="space-y-2">
                  <UnitRow
                    entity="departments"
                    id={department.id}
                    name={department.name}
                    managerId={department.managerId}
                    managers={managers}
                    onSaved={handleSaved}
                    onFailed={handleFailed}
                  />

                  <div className="pl-6 space-y-2 border-l border-base-300">
                    {department.shifts.map((shift) => (
                      <UnitRow
                        key={shift.id}
                        entity="shifts"
                        id={shift.id}
                        name={shift.name}
                        managerId={shift.managerId}
                        managers={managers}
                        onSaved={handleSaved}
                        onFailed={handleFailed}
                      />
                    ))}

                    <NewUnit
                      entity="shifts"
                      parentId={department.id}
                      label="Új műszak"
                      managers={managers}
                      onSaved={handleSaved}
                      onFailed={handleFailed}
                    />
                  </div>
                </div>
              ))}

              <NewUnit
                entity="departments"
                parentId={area.id}
                label="Új részleg"
                managers={managers}
                onSaved={handleSaved}
                onFailed={handleFailed}
              />
            </div>
          </div>
        </div>
      ))}

      {tree && tree.areas.length === 0 && (
        <div className="alert text-sm py-2">
          <span>Még nincs felvett terület.</span>
        </div>
      )}
    </div>
  );
};
