import type { AdminEmployee } from "../../api/employeeAdmin";

interface EmployeeDetailsModalProps {
  employee: AdminEmployee;
  onClose: () => void;
  onEdit: () => void;
}

const Row = ({ label, value }: { label: string; value: string | null }) => (
  <div className="flex flex-col gap-0.5">
    <span className="text-xs opacity-60">{label}</span>
    <span className="text-sm">{value || "—"}</span>
  </div>
);

const Block = ({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) => (
  <div className="space-y-2">
    <h4 className="text-sm font-semibold text-primary">{title}</h4>
    <div className="grid gap-3 md:grid-cols-3">{children}</div>
  </div>
);

const toTime = (value: string | null) =>
  value ? String(value).slice(0, 5) : null;

export const EmployeeDetailsModal = ({
  employee,
  onClose,
  onEdit,
}: EmployeeDetailsModalProps) => (
  <div className="modal modal-open">
    <div className="modal-box max-w-4xl max-h-[90vh] flex flex-col p-0">
      <div className="flex items-start justify-between gap-3 border-b border-base-300 px-6 pb-3 pt-5">
        <div>
          <h3 className="text-xl font-bold text-primary">{employee.name}</h3>
          <p className="mt-0.5 text-xs opacity-60">
            {employee.code}
            {employee.groupName ? ` — ${employee.groupName}` : ""}
          </p>
        </div>
        <button
          type="button"
          className="btn btn-sm btn-ghost btn-circle"
          onClick={onClose}
          aria-label="Bezárás"
        >
          ✕
        </button>
      </div>

      <div className="space-y-5 overflow-y-auto px-6 py-4">
        <Block title="Személyes adatok">
          <Row label="Megszólítás" value={employee.title} />
          <Row label="Vezetéknév" value={employee.lastName} />
          <Row label="Keresztnév" value={employee.firstName} />
          <Row label="Második keresztnév" value={employee.middleName} />
          <Row label="Születési dátum" value={employee.birthDate} />
          <Row label="Születési hely" value={employee.birthPlace} />
          <Row label="Nem" value={employee.gender} />
        </Block>

        <Block title="Elérhetőségek">
          <Row label="Ország" value={employee.country} />
          <Row label="Irányítószám" value={employee.postalCode} />
          <Row label="Település" value={employee.city} />
          <Row label="Cím" value={employee.address} />
          <Row label="Vállalati e-mail cím" value={employee.workEmail} />
          <Row label="Magán e-mail cím" value={employee.privateEmail} />
          <Row label="Munkahelyi telefonszám" value={employee.workPhone} />
          <Row label="Magán telefonszám" value={employee.privatePhone} />
        </Block>

        <Block title="Munkaviszony">
          <Row label="Költséghely" value={employee.costCenterName} />
          <Row label="Telephely" value={employee.workLocationName} />
          <Row label="Állománycsoport" value={employee.categoryName} />
          <Row label="Státusz" value={employee.statusName} />
          <Row label="Csoport" value={employee.groupName} />
          <Row label="Közvetlen felettes" value={employee.managerName} />
          <Row
            label="Éves szabadságkeret"
            value={
              employee.annualLeaveDays === null
                ? null
                : `${employee.annualLeaveDays} nap`
            }
          />
        </Block>

        <Block title="Munkaidő">
          <Row label="Munkarend" value={employee.workScheduleName} />
          <Row
            label="Napi munkaidő"
            value={
              employee.workingHourNum === null
                ? null
                : `${employee.workingHourNum} óra`
            }
          />
          <Row label="Törzsidő" value={employee.coreHourName} />
          <Row label="Szünet kezdete" value={toTime(employee.breakStart)} />
          <Row label="Szünet vége" value={toTime(employee.breakEnd)} />
          <Row
            label="Szünet hossza"
            value={
              employee.breakMinutes === null
                ? null
                : `${employee.breakMinutes} perc`
            }
          />
          <Row
            label="A szünet munkaidőnek számít"
            value={employee.breakPaid ? "Igen" : "Nem"}
          />
        </Block>

        <Block title="Felhasználói fiók">
          <Row label="Felhasználónév" value={employee.username} />
          <Row label="Szerepkör" value={employee.userRoleName} />
          <Row
            label="Fiók állapota"
            value={
              employee.userId === null
                ? "Nincs fiók"
                : employee.userLocked
                  ? "Zárolt"
                  : employee.userActive
                    ? "Aktív"
                    : "Letiltott"
            }
          />
        </Block>
      </div>

      <div className="flex items-center justify-end gap-2 border-t border-base-300 px-6 pb-5 pt-3">
        <button className="btn btn-sm btn-ghost" onClick={onClose}>
          Bezárás
        </button>
        <button className="btn btn-sm btn-primary" onClick={onEdit}>
          Szerkesztés
        </button>
      </div>
    </div>
    <div className="modal-backdrop" onClick={onClose} />
  </div>
);
