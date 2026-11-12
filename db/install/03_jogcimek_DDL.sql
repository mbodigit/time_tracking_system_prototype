USE time_tracking_db_prototype;

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS PayrollCodes (
  payroll_code_id      INT          NOT NULL AUTO_INCREMENT,
  payroll_code         VARCHAR(20)  NOT NULL,
  payroll_code_name    VARCHAR(100) NOT NULL,
  payroll_code_is_base BOOLEAN      NOT NULL DEFAULT 0,
  PRIMARY KEY (payroll_code_id),
  UNIQUE KEY uq_payroll_code (payroll_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS Absences (
  absence_id            INT         NOT NULL AUTO_INCREMENT,
  absence_name          VARCHAR(50) NOT NULL,
  absence_payroll_code_id INT       NULL,
  absence_is_paid       BOOLEAN     NOT NULL DEFAULT 1,
  absence_is_open_ended BOOLEAN     NOT NULL DEFAULT 0,
  absence_needs_approval BOOLEAN    NOT NULL DEFAULT 1,
  absence_status        TINYINT     NOT NULL DEFAULT 1,
  absence_sort          INT         NOT NULL DEFAULT 0,
  PRIMARY KEY (absence_id),
  UNIQUE KEY uq_absence_name (absence_name),
  UNIQUE KEY uq_absence_payroll_code (absence_payroll_code_id),
  KEY idx_absence_status (absence_status),
  CONSTRAINT fk_absence_payroll_code
    FOREIGN KEY (absence_payroll_code_id) REFERENCES PayrollCodes(payroll_code_id)
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS AbsenceWorkSchedules (
  absence_id       INT NOT NULL,
  work_schedule_id INT NOT NULL,
  PRIMARY KEY (absence_id, work_schedule_id),
  CONSTRAINT fk_aws_absence
    FOREIGN KEY (absence_id) REFERENCES Absences(absence_id)
    ON DELETE CASCADE,
  CONSTRAINT fk_aws_work_schedule
    FOREIGN KEY (work_schedule_id) REFERENCES WorkSchedules(work_schedule_id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS Allowances (
  allowance_id           INT          NOT NULL AUTO_INCREMENT,
  allowance_name         VARCHAR(50)  NOT NULL,
  allowance_code         VARCHAR(30)  NULL,
  allowance_payroll_code_id INT       NULL,
  allowance_percent      DECIMAL(5,2) NOT NULL,
  allowance_start_hour   TIME         NOT NULL,
  allowance_end_hour     TIME         NOT NULL,
  PRIMARY KEY (allowance_id),
  UNIQUE KEY uq_allowance_code (allowance_code),
  UNIQUE KEY uq_allowance_payroll_code (allowance_payroll_code_id),
  CONSTRAINT chk_allowance_percent CHECK (allowance_percent > 0),
  CONSTRAINT fk_allowance_payroll_code
    FOREIGN KEY (allowance_payroll_code_id) REFERENCES PayrollCodes(payroll_code_id)
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS WorkScheduleAllowances (
  work_schedule_id INT NOT NULL,
  allowance_id     INT NOT NULL,
  PRIMARY KEY (work_schedule_id, allowance_id),
  CONSTRAINT fk_wsa_work_schedule
    FOREIGN KEY (work_schedule_id) REFERENCES WorkSchedules(work_schedule_id)
    ON DELETE CASCADE,
  CONSTRAINT fk_wsa_allowance
    FOREIGN KEY (allowance_id) REFERENCES Allowances(allowance_id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
