import { useEffect } from "react";
import { createPortal } from "react-dom";
import type { MonthlyLog } from "../../api/timeEntries";
import { formatMinutes, formatMonth } from "../../utils/datetime";

interface MonthlyPrintoutProps {
  report: MonthlyLog;
  onClose: () => void;
}

const Row = ({ label, value }: { label: string; value: string }) => (
  <tr>
    <th className="border border-black px-2 py-1 text-left font-semibold">
      {label}
    </th>
    <td className="w-32 border border-black px-2 py-1 text-right">{value}</td>
  </tr>
);

const Sheet = ({ report }: { report: MonthlyLog }) => {
  const summary = report.summary;
  const absences = summary.absences ?? {};

  const allowanceRows = report.allowanceTypes
    .map((type) => ({
      label: `${type.name} (${type.percent}%)`,
      minutes: summary.allowances[type.code] || 0,
    }))
    .filter((item) => item.minutes > 0);

  const absenceRows = Object.entries(absences)
    .filter(([, value]) => value.minutes > 0)
    .map(([name, value]) => ({ label: name, minutes: value.minutes }));

  return (
    <div className="bg-white text-sm text-black">
      <table className="w-full border-collapse">
        <tbody>
          <tr>
            <th className="w-44 border border-black px-2 py-1 text-left">
              Név
            </th>
            <td className="border border-black px-2 py-1">
              {report.employeeName} ({report.employeeCode})
            </td>
          </tr>
          <tr>
            <th className="border border-black px-2 py-1 text-left">Terület</th>
            <td className="border border-black px-2 py-1">
              {report.employeeArea ?? "-"}
            </td>
          </tr>
          <tr>
            <th className="border border-black px-2 py-1 text-left">
              Munkavégzés helye
            </th>
            <td className="border border-black px-2 py-1">
              {report.employeeWorkLocation ?? "-"}
            </td>
          </tr>
          <tr>
            <th className="border border-black px-2 py-1 text-left">Időszak</th>
            <td className="border border-black px-2 py-1">
              {formatMonth(report.year, report.month)}
            </td>
          </tr>
        </tbody>
      </table>

      <h2 className="mt-4 border border-black border-b-0 py-1 text-center text-base font-bold">
        Összesítő
      </h2>

      <table className="w-full border-collapse">
        <tbody>
          <Row
            label="Havi munkaóra"
            value={formatMinutes(summary.requiredMinutes ?? 0)}
          />
          <Row
            label="Összes elszámolt óra"
            value={formatMinutes(summary.settledMinutes)}
          />
          <Row
            label="Ledolgozott óra"
            value={formatMinutes(summary.workedMinutes)}
          />
          <Row
            label="Munkaközi szünet"
            value={formatMinutes(summary.breakMinutes)}
          />

          {allowanceRows.map((item) => (
            <Row
              key={item.label}
              label={item.label}
              value={formatMinutes(item.minutes)}
            />
          ))}

          {absenceRows.map((item) => (
            <Row
              key={item.label}
              label={item.label}
              value={formatMinutes(item.minutes)}
            />
          ))}

          <Row label="Egyenleg" value={formatMinutes(summary.balanceMinutes)} />
        </tbody>
      </table>

      {report.leave && (
        <table className="mt-4 w-full border-collapse">
          <tbody>
            <Row
              label="Éves szabadságkeret (nap)"
              value={String(report.leave.entitlementDays)}
            />
            <Row
              label="Felhasznált szabadság (nap)"
              value={String(report.leave.usedDays)}
            />
            <Row
              label="Fennmaradó szabadság (nap)"
              value={String(report.leave.remainingDays)}
            />
          </tbody>
        </table>
      )}

      <div className="mt-20 flex justify-between gap-12 text-center">
        <div className="flex-1 border-t border-black pt-1">
          Dolgozó aláírása
        </div>
        <div className="flex-1 border-t border-black pt-1">
          Felettes aláírása
        </div>
      </div>
    </div>
  );
};

export const MonthlyPrintout = ({ report, onClose }: MonthlyPrintoutProps) => {
  const fileName = [
    "Havi_osszesito",
    report.employeeCode ?? "",
    report.year,
    String(report.month).padStart(2, "0"),
  ]
    .filter(Boolean)
    .join("_");

  useEffect(() => {
    const restore = () => {
      document.title = "Munkaidő-nyilvántartó rendszer";
    };

    window.addEventListener("afterprint", restore);

    return () => {
      window.removeEventListener("afterprint", restore);
      restore();
    };
  }, []);

  const handlePrint = () => {
    document.title = fileName;
    window.print();
  };

  return (
    <>
      <div className="modal modal-open print:hidden">
        <div className="modal-box max-w-3xl max-h-[90vh] flex flex-col p-0">
          <div className="flex items-center justify-between gap-3 border-b border-base-300 px-6 pb-3 pt-5">
            <h3 className="text-xl font-bold text-primary">Havi összesítő</h3>

            <div className="flex gap-2">
              <button className="btn btn-sm btn-primary" onClick={handlePrint}>
                Nyomtatás
              </button>
              <button className="btn btn-sm btn-ghost" onClick={onClose}>
                Bezárás
              </button>
            </div>
          </div>

          <div className="overflow-y-auto px-6 py-5">
            <Sheet report={report} />
          </div>
        </div>
        <div className="modal-backdrop" onClick={onClose} />
      </div>

      {createPortal(
        <div id="printout" className="hidden print:block">
          <Sheet report={report} />
        </div>,
        document.body,
      )}
    </>
  );
};
