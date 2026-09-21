CREATE DATABASE IF NOT EXISTS time_tracking_db_prototype
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_0900_ai_ci;

USE time_tracking_db_prototype;

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS UserRoles (
  user_role_id   INT         NOT NULL AUTO_INCREMENT,
  user_role_name VARCHAR(30) NOT NULL,
  PRIMARY KEY (user_role_id),
  UNIQUE KEY uq_user_role_name (user_role_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS Permissions (
  permission_id        INT          NOT NULL AUTO_INCREMENT,
  permission_key       VARCHAR(60)  NOT NULL,
  permission_name      VARCHAR(100) NOT NULL,
  permission_parent_id INT          NULL,
  permission_is_group  BOOLEAN      NOT NULL DEFAULT 0,
  permission_route     VARCHAR(100) NULL,
  permission_sort      INT          NOT NULL DEFAULT 0,
  PRIMARY KEY (permission_id),
  UNIQUE KEY uq_permission_key (permission_key),
  CONSTRAINT fk_permission_parent
    FOREIGN KEY (permission_parent_id) REFERENCES Permissions(permission_id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS RolePermissions (
  user_role_id  INT NOT NULL,
  permission_id INT NOT NULL,
  PRIMARY KEY (user_role_id, permission_id),
  CONSTRAINT fk_rp_role
    FOREIGN KEY (user_role_id) REFERENCES UserRoles(user_role_id)
    ON DELETE CASCADE,
  CONSTRAINT fk_rp_permission
    FOREIGN KEY (permission_id) REFERENCES Permissions(permission_id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS EmployeeStatus (
  employee_status_id        INT         NOT NULL AUTO_INCREMENT,
  employee_status_name      VARCHAR(50) NOT NULL,
  employee_status_is_active BOOLEAN     NOT NULL DEFAULT 1,
  PRIMARY KEY (employee_status_id),
  UNIQUE KEY uq_employee_status_name (employee_status_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS EmployeeCategories (
  employee_category_id   INT         NOT NULL AUTO_INCREMENT,
  employee_category_name VARCHAR(50) NOT NULL,
  PRIMARY KEY (employee_category_id),
  UNIQUE KEY uq_employee_category_name (employee_category_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS CostCenters (
  cost_center_id                INT         NOT NULL AUTO_INCREMENT,
  cost_center_name              VARCHAR(50) NOT NULL,
  cost_center_code              VARCHAR(10) NOT NULL,
  cost_center_next_employee_seq INT         NOT NULL DEFAULT 1,
  PRIMARY KEY (cost_center_id),
  UNIQUE KEY uq_cost_center_code (cost_center_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS WorkLocations (
  work_location_id            INT          NOT NULL AUTO_INCREMENT,
  work_location_name          VARCHAR(100) NOT NULL,
  work_location_code          VARCHAR(10)  NULL,
  work_location_address_line1 VARCHAR(150) NULL,
  work_location_address_line2 VARCHAR(150) NULL,
  work_location_postal_code   VARCHAR(10)  NULL,
  work_location_city          VARCHAR(100) NULL,
  work_location_country       VARCHAR(100) NULL,
  PRIMARY KEY (work_location_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS WorkSchedules (
  work_schedule_id       INT         NOT NULL AUTO_INCREMENT,
  work_schedule_name     VARCHAR(30) NOT NULL,
  work_schedule_is_shift BOOLEAN     NOT NULL DEFAULT 0,
  PRIMARY KEY (work_schedule_id),
  UNIQUE KEY uq_work_schedule_name (work_schedule_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS WorkingHours (
  working_hour_id   INT         NOT NULL AUTO_INCREMENT,
  working_hour_num  TINYINT     NOT NULL,
  working_hour_name VARCHAR(20) NULL,
  PRIMARY KEY (working_hour_id),
  UNIQUE KEY uq_working_hour_num (working_hour_num),
  CONSTRAINT chk_working_hour_num CHECK (working_hour_num BETWEEN 1 AND 24)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS CoreHours (
  core_hour_id    INT         NOT NULL AUTO_INCREMENT,
  core_hour_name  VARCHAR(20) NOT NULL,
  core_hour_start TIME        NOT NULL,
  core_hour_end   TIME        NOT NULL,
  PRIMARY KEY (core_hour_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS Absences (
  absence_id            INT         NOT NULL AUTO_INCREMENT,
  absence_name          VARCHAR(50) NOT NULL,
  absence_is_paid       BOOLEAN     NOT NULL DEFAULT 1,
  absence_category      VARCHAR(30) NOT NULL DEFAULT 'Egyéb',
  absence_is_open_ended BOOLEAN     NOT NULL DEFAULT 0,
  absence_rec_type      TINYINT     NOT NULL DEFAULT 0,
  absence_status        TINYINT     NOT NULL DEFAULT 1,
  absence_sort          INT         NOT NULL DEFAULT 0,
  PRIMARY KEY (absence_id),
  UNIQUE KEY uq_absence_name (absence_name),
  KEY idx_absence_status (absence_status)
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
  allowance_id         INT          NOT NULL AUTO_INCREMENT,
  allowance_name       VARCHAR(50)  NOT NULL,
  allowance_percent    DECIMAL(5,2) NOT NULL,
  allowance_start_hour TIME         NOT NULL,
  allowance_end_hour   TIME         NOT NULL,
  PRIMARY KEY (allowance_id),
  CONSTRAINT chk_allowance_percent CHECK (allowance_percent > 0)
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

CREATE TABLE IF NOT EXISTS GlobalCalendar (
  gl_cal_id       INT          NOT NULL AUTO_INCREMENT,
  gl_cal_date     DATE         NOT NULL,
  gl_cal_day_type VARCHAR(50)  NOT NULL,
  gl_cal_note     VARCHAR(255) NULL,
  PRIMARY KEY (gl_cal_id),
  UNIQUE KEY uq_gl_cal_date (gl_cal_date),
  KEY idx_gl_cal_day_type (gl_cal_day_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS CompanySettings (
  company_settings_id INT          NOT NULL DEFAULT 1,
  company_name        VARCHAR(150) NULL,
  company_address     VARCHAR(255) NULL,
  company_tax_number  VARCHAR(20)  NULL,
  company_logo_url    TEXT         NULL,
  PRIMARY KEY (company_settings_id),
  CONSTRAINT chk_company_single_row CHECK (company_settings_id = 1)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

SET @van_target := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'Absences'
    AND COLUMN_NAME = 'absence_target'
);

SET @sql := IF(@van_target > 0, '
  INSERT INTO AbsenceWorkSchedules (absence_id, work_schedule_id)
  SELECT a.absence_id, w.work_schedule_id
  FROM Absences a
  JOIN WorkSchedules w
    ON a.absence_target = ''Mind''
    OR (a.absence_target = ''Műszakos''     AND w.work_schedule_is_shift = 1)
    OR (a.absence_target = ''Nem műszakos'' AND w.work_schedule_is_shift = 0)
  WHERE NOT EXISTS (
    SELECT 1 FROM AbsenceWorkSchedules x
    WHERE x.absence_id = a.absence_id AND x.work_schedule_id = w.work_schedule_id
  )',
  'SELECT ''Nincs átvezetendő adat'' AS allapot');

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql := IF(@van_target > 0,
  'ALTER TABLE Absences DROP COLUMN absence_target',
  'SELECT ''Az oszlop már nincs meg'' AS allapot');

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SELECT t.TABLE_NAME                      AS tabla,
       COUNT(DISTINCT k.CONSTRAINT_NAME) AS idegen_kulcsok
FROM information_schema.TABLES t
LEFT JOIN information_schema.KEY_COLUMN_USAGE k
       ON k.TABLE_SCHEMA = t.TABLE_SCHEMA
      AND k.TABLE_NAME   = t.TABLE_NAME
      AND k.REFERENCED_TABLE_NAME IS NOT NULL
WHERE t.TABLE_SCHEMA = DATABASE()
GROUP BY t.TABLE_NAME
ORDER BY t.TABLE_NAME;
