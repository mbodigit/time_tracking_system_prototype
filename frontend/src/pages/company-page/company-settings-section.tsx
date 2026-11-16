import { useEffect, useState } from "react";
import {
  getCompany,
  updateCompany,
  type CompanyPayload,
} from "../../api/company";
import { ApiError } from "../../api/client";
import { Field } from "../../components/form-field/form-field";
import { showToast } from "../../utils/toast";
import { ActionButton } from "../../components/button/button";

const EMPTY_FORM: CompanyPayload = {
  name: "",
  address: "",
  taxNumber: "",
};

export const CompanySettingsSection = () => {
  const [form, setForm] = useState<CompanyPayload>(EMPTY_FORM);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    getCompany()
      .then((data) => {
        setForm({
          name: data.company.name ?? "",
          address: data.company.address ?? "",
          taxNumber: data.company.taxNumber ?? "",
        });
      })
      .catch((error) =>
        showToast(error instanceof ApiError ? error.message : "Ismeretlen hiba történt.", "error"),
      )
      .finally(() => setIsLoading(false));
  }, []);

  const patch = (changes: Partial<CompanyPayload>) =>
    setForm((previous) => ({ ...previous, ...changes }));

  const handleSave = async () => {
        setIsSaving(true);
    try {
      const data = await updateCompany(form);
      showToast(data.message);
    } catch (error) {
      showToast(error instanceof ApiError ? error.message : "Ismeretlen hiba történt.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <span className="loading loading-spinner" />;
  }

  return (
    <div className="space-y-4 max-w-2xl">
      <p className="text-sm opacity-70">
        A cég adatai a bérfeladási exportban és a havi nyomtatványon jelennek
        meg.
      </p>

      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Cégnév" span={2}>
          <input
            className="input input-bordered"
            value={form.name ?? ""}
            onChange={(event) => patch({ name: event.target.value })}
          />
        </Field>

        <Field label="Székhely" span={2}>
          <input
            className="input input-bordered"
            value={form.address ?? ""}
            onChange={(event) => patch({ address: event.target.value })}
          />
        </Field>

        <Field label="Adószám">
          <input
            className="input input-bordered"
            value={form.taxNumber ?? ""}
            onChange={(event) => patch({ taxNumber: event.target.value })}
          />
        </Field>
      </div>

      <ActionButton
        onClick={handleSave}
        disabled={isSaving}
      >
        {isSaving ? "Mentés..." : "Mentés"}
      </ActionButton>
    </div>
  );
};
