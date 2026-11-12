import { useCallback, useEffect, useState } from "react";
import {
  listPermissions,
  setPermission,
  type PermissionMatrix,
  type PermissionNode,
} from "../../api/permissions";
import { ApiError } from "../../api/client";

export const PermissionsPage = () => {
  const [data, setData] = useState<PermissionMatrix | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [savingKey, setSavingKey] = useState("");

  const load = useCallback(async () => {
    setErrorMessage("");
    try {
      setData(await listPermissions());
    } catch (error) {
      setData(null);
      setErrorMessage(
        error instanceof ApiError ? error.message : "Ismeretlen hiba történt.",
      );
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const isGranted = (roleName: string, key: string) =>
    (data?.matrix[roleName] ?? []).includes(key);

  const toggle = async (
    roleId: number,
    roleName: string,
    node: PermissionNode,
  ) => {
    const granted = !isGranted(roleName, node.key);
    setSavingKey(`${roleId}-${node.id}`);
    setErrorMessage("");

    try {
      await setPermission(roleId, node.id, granted);
      await load();
    } catch (error) {
      setErrorMessage(
        error instanceof ApiError ? error.message : "Ismeretlen hiba történt.",
      );
    } finally {
      setSavingKey("");
    }
  };

  const children = (parentKey: string) =>
    (data?.permissions ?? []).filter((item) => item.parentKey === parentKey);

  const pages = (data?.permissions ?? []).filter((item) => !item.parentKey);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Jogosultságok</h1>

      <p className="text-sm opacity-70">
        A sorok a rendszer lapjait és a lapokon belüli füleket mutatják, az
        oszlopok a szerepköröket. A jelölőnégyzet átállítása azonnal érvénybe
        lép, a felhasználók a következő lapváltáskor látják. Az adminisztrátor
        minden jogosultságot megkap, és ez nem vehető el tőle.
      </p>

      {errorMessage && (
        <div className="alert alert-error text-sm py-2">
          <span>{errorMessage}</span>
        </div>
      )}

      {data && (
        <div className="overflow-x-auto">
          <table className="table table-sm">
            <thead>
              <tr>
                <th>Lap és fül</th>
                {data.roles.map((role) => (
                  <th key={role.id} className="text-center">
                    {role.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pages.map((page) => {
                const tabs = children(page.key);

                return (
                  <>
                    <tr key={page.key} className="bg-base-200">
                      <td className="font-semibold">{page.name}</td>
                      {data.roles.map((role) => (
                        <td key={role.id} className="text-center">
                          {page.isGroup ? (
                            <span className="opacity-40">—</span>
                          ) : (
                            <input
                              type="checkbox"
                              className="checkbox checkbox-sm"
                              checked={
                                role.isAdmin || isGranted(role.name, page.key)
                              }
                              disabled={
                                role.isAdmin ||
                                savingKey === `${role.id}-${page.id}`
                              }
                              onChange={() => toggle(role.id, role.name, page)}
                            />
                          )}
                        </td>
                      ))}
                    </tr>

                    {tabs.map((tab) => (
                      <tr key={tab.key} className="hover">
                        <td className="pl-8 text-sm opacity-80">{tab.name}</td>
                        {data.roles.map((role) => (
                          <td key={role.id} className="text-center">
                            <input
                              type="checkbox"
                              className="checkbox checkbox-sm"
                              checked={
                                role.isAdmin || isGranted(role.name, tab.key)
                              }
                              disabled={
                                role.isAdmin ||
                                savingKey === `${role.id}-${tab.id}`
                              }
                              onChange={() => toggle(role.id, role.name, tab)}
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
