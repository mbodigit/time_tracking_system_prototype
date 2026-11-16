import { useEffect } from "react";
import { createPortal } from "react-dom";
import type { MonthlyLog } from "../../api/timeEntries";
import { formatMinutes, formatMonth } from "../../utils/datetime";
import { ActionButton, GhostButton } from "../../components/button/button";

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

  const dailyMinutes = (report.employeeProfile?.workingHourNum ?? 0) * 60;

  const toDays = (minutes: number): string =>
    dailyMinutes > 0
      ? `${Math.round((minutes / dailyMinutes) * 10) / 10} nap`
      : formatMinutes(minutes);

  const allowanceRows = report.allowanceTypes
    .map((type) => ({
      label: `${type.name} (${type.percent}%)`,
      minutes: summary.allowances[type.code] || 0,
    }))
    .filter((item) => item.minutes > 0);

  const absenceRows = Object.entries(absences)
    .filter(([, value]) => value.minutes > 0)
    .map(([name, value]) => ({ label: name, minutes: value.minutes }));

  const hasAbsence = absenceRows.length > 0;
  const hasAllowance = allowanceRows.length > 0;

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
            label="Havi kötelező munkaóra"
            value={formatMinutes(summary.frameMinutes ?? 0)}
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

          <Row label="Egyenleg" value={formatMinutes(summary.balanceMinutes)} />
        </tbody>
      </table>

      {hasAllowance && (
        <>
          <h2 className="mt-4 border border-black border-b-0 py-1 text-center text-base font-bold">
            Bérpótlékok
          </h2>

          <table className="w-full border-collapse">
            <tbody>
              {allowanceRows.map((item) => (
                <Row
                  key={item.label}
                  label={item.label}
                  value={formatMinutes(item.minutes)}
                />
              ))}
            </tbody>
          </table>
        </>
      )}

      {hasAbsence && (
        <>
          <h2 className="mt-4 border border-black border-b-0 py-1 text-center text-base font-bold">
            Felhasznált távolléti jogcímek
          </h2>

          <table className="w-full border-collapse">
            <tbody>
              {absenceRows.map((item) => (
                <Row
                  key={item.label}
                  label={item.label}
                  value={toDays(item.minutes)}
                />
              ))}
            </tbody>
          </table>
        </>
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
              <ActionButton onClick={handlePrint}>
                Nyomtatás
              </ActionButton>
              <GhostButton onClick={onClose}>
                Bezárás
              </GhostButton>
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
