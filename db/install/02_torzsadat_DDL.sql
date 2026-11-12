USE time_tracking_db_prototype;

SET NAMES utf8mb4;

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
  cost_center_id   INT         NOT NULL AUTO_INCREMENT,
  cost_center_name VARCHAR(50) NOT NULL,
  cost_center_code VARCHAR(10) NOT NULL,
  PRIMARY KEY (cost_center_id),
  UNIQUE KEY uq_cost_center_code (cost_center_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS WorkLocations (
  work_location_id            INT          NOT NULL AUTO_INCREMENT,
  work_location_name          VARCHAR(100) NOT NULL,
  work_location_code          VARCHAR(10)  NULL,
  work_location_country       VARCHAR(100) NULL,
  work_location_postal_code   VARCHAR(10)  NULL,
  work_location_city          VARCHAR(100) NULL,
  work_location_address       VARCHAR(150) NULL,
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
  CONSTRAINT chk_working_hour_num CHECK (working_hour_num BETWEEN 1 AND 12)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS CoreHours (
  core_hour_id    INT         NOT NULL AUTO_INCREMENT,
  core_hour_name  VARCHAR(20) NOT NULL,
  core_hour_start TIME        NOT NULL,
  core_hour_end   TIME        NOT NULL,
  PRIMARY KEY (core_hour_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS CompanySettings (
  company_settings_id       INT          NOT NULL DEFAULT 1,
  company_name              VARCHAR(150) NULL,
  company_address           VARCHAR(255) NULL,
  company_tax_number        VARCHAR(20)  NULL,
  company_next_employee_code INT         NOT NULL DEFAULT 1,
  PRIMARY KEY (company_settings_id),
  CONSTRAINT chk_company_single_row CHECK (company_settings_id = 1)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS ShiftRotations (
  shift_rotation_id           INT         NOT NULL AUTO_INCREMENT,
  shift_rotation_position     TINYINT     NOT NULL,
  shift_rotation_core_hour_id INT         NOT NULL,
  PRIMARY KEY (shift_rotation_id),
  UNIQUE KEY uq_shift_rotation_position (shift_rotation_position),
  UNIQUE KEY uq_shift_rotation_core_hour (shift_rotation_core_hour_id),
  CONSTRAINT chk_shift_rotation_position CHECK (shift_rotation_position >= 0),
  CONSTRAINT fk_shift_rotation_core_hour
    FOREIGN KEY (shift_rotation_core_hour_id) REFERENCES CoreHours(core_hour_id)
    ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
