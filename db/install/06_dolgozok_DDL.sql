USE time_tracking_db_prototype;

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS Employees (
  employee_id                INT          NOT NULL AUTO_INCREMENT,

  employee_code              VARCHAR(10)  NOT NULL,
  employee_title             VARCHAR(10)  NULL,
  employee_first_name        VARCHAR(30)  NOT NULL,
  employee_middle_name       VARCHAR(30)  NULL,
  employee_last_name         VARCHAR(30)  NOT NULL,
  employee_birth_date        DATE         NULL,
  employee_birth_place       VARCHAR(100) NULL,
  employee_gender            VARCHAR(10)  NULL,
  employee_children_count    INT          NOT NULL DEFAULT 0,

  employee_address_line1     VARCHAR(150) NULL,
  employee_address_line2     VARCHAR(150) NULL,
  employee_postal_code       VARCHAR(10)  NULL,
  employee_city              VARCHAR(100) NULL,
  employee_province          VARCHAR(100) NULL,
  employee_country           VARCHAR(100) NULL,

  employee_work_email        VARCHAR(100) NULL,
  employee_private_email     VARCHAR(100) NULL,
  employee_work_phone_num    VARCHAR(30)  NULL,
  employee_private_phone_num VARCHAR(30)  NULL,

  employee_work_schedule_id  INT          NULL,
  employee_working_hour_id   INT          NULL,
  employee_core_hour_id      INT          NULL,
  employee_core_start        TIME         NULL,
  employee_core_end          TIME         NULL,
  employee_break_minutes     INT          NULL,
  employee_break_paid        BOOLEAN      NOT NULL DEFAULT 0,
  employee_break_start       TIME         NULL,
  employee_break_end         TIME         NULL,

  employee_cost_center_id    INT          NOT NULL,
  employee_work_location_id  INT          NULL,
  employee_category_id       INT          NOT NULL,
  employee_status_id         INT          NOT NULL,
  employee_user_group_id     INT          NULL,
  employee_manager_id        INT          NULL,
  employee_annual_leave_days INT          NULL,

  PRIMARY KEY (employee_id),
  UNIQUE KEY uq_employee_code (employee_code),
  KEY idx_employee_manager (employee_manager_id),
  KEY idx_employee_group (employee_user_group_id),
  KEY idx_employee_status (employee_status_id),

  CONSTRAINT fk_employee_work_schedule
    FOREIGN KEY (employee_work_schedule_id) REFERENCES WorkSchedules(work_schedule_id)
    ON DELETE RESTRICT,
  CONSTRAINT fk_employee_working_hour
    FOREIGN KEY (employee_working_hour_id) REFERENCES WorkingHours(working_hour_id)
    ON DELETE RESTRICT,
  CONSTRAINT fk_employee_core_hour
    FOREIGN KEY (employee_core_hour_id) REFERENCES CoreHours(core_hour_id)
    ON DELETE RESTRICT,
  CONSTRAINT fk_employee_cost_center
    FOREIGN KEY (employee_cost_center_id) REFERENCES CostCenters(cost_center_id)
    ON DELETE RESTRICT,
  CONSTRAINT fk_employee_work_location
    FOREIGN KEY (employee_work_location_id) REFERENCES WorkLocations(work_location_id)
    ON DELETE RESTRICT,
  CONSTRAINT fk_employee_category
    FOREIGN KEY (employee_category_id) REFERENCES EmployeeCategories(employee_category_id)
    ON DELETE RESTRICT,
  CONSTRAINT fk_employee_status
    FOREIGN KEY (employee_status_id) REFERENCES EmployeeStatus(employee_status_id)
    ON DELETE RESTRICT,
  CONSTRAINT fk_employee_group
    FOREIGN KEY (employee_user_group_id) REFERENCES UserGroups(user_group_id)
    ON DELETE SET NULL,

  CONSTRAINT fk_employee_manager
    FOREIGN KEY (employee_manager_id) REFERENCES Employees(employee_id)
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS Users (
  user_id                   INT                 NOT NULL AUTO_INCREMENT,
  user_username             VARCHAR(30)         NOT NULL,
  user_password_hash        VARCHAR(100)        NOT NULL,
  user_employee_id          INT                 NULL,
  user_role_id              INT                 NOT NULL,
  user_status               BOOLEAN             NOT NULL DEFAULT 1,
  user_must_change_password BOOLEAN             NOT NULL DEFAULT 1,
  user_failed_attempts      TINYINT UNSIGNED    NOT NULL DEFAULT 0,
  user_locked_at            DATETIME            NULL,
  PRIMARY KEY (user_id),
  UNIQUE KEY uq_user_username (user_username),
  UNIQUE KEY uq_user_employee (user_employee_id),
  CONSTRAINT fk_user_employee
    FOREIGN KEY (user_employee_id) REFERENCES Employees(employee_id)
    ON DELETE CASCADE,
  CONSTRAINT fk_user_role
    FOREIGN KEY (user_role_id) REFERENCES UserRoles(user_role_id)
    ON DELETE RESTRICT,
  CONSTRAINT chk_user_employee_required CHECK (
    user_employee_id IS NOT NULL OR user_username = 'admin'
  )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

SET @sql := IF(
    (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'Areas'
        AND CONSTRAINT_NAME = 'fk_area_manager') = 0,
    'ALTER TABLE Areas ADD CONSTRAINT fk_area_manager
       FOREIGN KEY (area_manager_id) REFERENCES Users(user_id) ON DELETE SET NULL',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql := IF(
    (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'Departments'
        AND CONSTRAINT_NAME = 'fk_department_manager') = 0,
    'ALTER TABLE Departments ADD CONSTRAINT fk_department_manager
       FOREIGN KEY (department_manager_id) REFERENCES Users(user_id) ON DELETE SET NULL',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql := IF(
    (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'Shifts'
        AND CONSTRAINT_NAME = 'fk_shift_manager') = 0,
    'ALTER TABLE Shifts ADD CONSTRAINT fk_shift_manager
       FOREIGN KEY (shift_manager_id) REFERENCES Users(user_id) ON DELETE SET NULL',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql := IF(
    (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'UserGroups'
        AND CONSTRAINT_NAME = 'fk_group_manager') = 0,
    'ALTER TABLE UserGroups ADD CONSTRAINT fk_group_manager
       FOREIGN KEY (user_group_manager_id) REFERENCES Users(user_id) ON DELETE SET NULL',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

CREATE OR REPLACE VIEW EmployeeSettings AS
SELECT
  e.employee_id,
  COALESCE(e.employee_work_schedule_id, g.user_group_work_schedule_id)
    AS employee_setting_work_schedule_id,
  COALESCE(e.employee_working_hour_id, g.user_group_working_hour_id)
    AS employee_setting_working_hour_id,
  COALESCE(e.employee_core_hour_id, g.user_group_core_hour_id)
    AS employee_setting_core_hour_id
FROM Employees e
LEFT JOIN UserGroups g ON g.user_group_id = e.employee_user_group_id;
