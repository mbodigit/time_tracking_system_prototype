USE time_tracking_db_prototype;

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS Areas (
  area_id         INT         NOT NULL AUTO_INCREMENT,
  area_name       VARCHAR(30) NOT NULL,
  area_manager_id INT         NULL,
  area_parent_id  INT         NULL,
  PRIMARY KEY (area_id),
  UNIQUE KEY uq_area_name (area_name),
  KEY idx_area_manager (area_manager_id),
  KEY idx_area_parent (area_parent_id),
  CONSTRAINT fk_area_parent
    FOREIGN KEY (area_parent_id) REFERENCES Areas(area_id)
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS Departments (
  department_id         INT         NOT NULL AUTO_INCREMENT,
  department_name       VARCHAR(30) NOT NULL,
  department_area_id    INT         NOT NULL,
  department_manager_id INT         NULL,
  PRIMARY KEY (department_id),
  UNIQUE KEY uq_department_name_in_area (department_area_id, department_name),
  UNIQUE KEY uq_department_identity (department_id, department_area_id),
  KEY idx_department_manager (department_manager_id),
  CONSTRAINT fk_department_area
    FOREIGN KEY (department_area_id) REFERENCES Areas(area_id)
    ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS Shifts (
  shift_id            INT         NOT NULL AUTO_INCREMENT,
  shift_name          VARCHAR(50) NOT NULL,
  shift_department_id INT         NOT NULL,
  shift_manager_id    INT         NULL,
  PRIMARY KEY (shift_id),
  UNIQUE KEY uq_shift_name_in_department (shift_department_id, shift_name),
  UNIQUE KEY uq_shift_identity (shift_id, shift_department_id),
  KEY idx_shift_manager (shift_manager_id),
  CONSTRAINT fk_shift_department
    FOREIGN KEY (shift_department_id) REFERENCES Departments(department_id)
    ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS UserGroups (
  user_group_id               INT          NOT NULL AUTO_INCREMENT,
  user_group_name             VARCHAR(50)  NOT NULL,
  user_group_status           VARCHAR(20)  NOT NULL DEFAULT 'Aktív',
  user_group_description      VARCHAR(255) NULL,
  user_group_area_id          INT          NOT NULL,
  user_group_department_id    INT          NULL,
  user_group_shift_id         INT          NULL,
  user_group_cost_center_id   INT          NOT NULL,
  user_group_work_schedule_id INT          NULL,
  user_group_working_hour_id  INT          NULL,
  user_group_core_hour_id     INT          NULL,
  user_group_manager_id       INT          NULL,
  user_group_rotation_position TINYINT     NULL,
  user_group_rotation_start    DATE        NULL,
  PRIMARY KEY (user_group_id),
  UNIQUE KEY uq_user_group_name (user_group_name),
  KEY idx_user_group_manager (user_group_manager_id),

  CONSTRAINT chk_group_rotation_pair CHECK (
    (user_group_rotation_position IS NULL AND user_group_rotation_start IS NULL)
    OR (user_group_rotation_position IS NOT NULL AND user_group_rotation_start IS NOT NULL)
  ),

  CONSTRAINT fk_group_area
    FOREIGN KEY (user_group_area_id) REFERENCES Areas(area_id)
    ON DELETE RESTRICT,

  CONSTRAINT fk_group_department_in_area
    FOREIGN KEY (user_group_department_id, user_group_area_id)
    REFERENCES Departments(department_id, department_area_id)
    ON DELETE RESTRICT,

  CONSTRAINT fk_group_shift_in_department
    FOREIGN KEY (user_group_shift_id, user_group_department_id)
    REFERENCES Shifts(shift_id, shift_department_id)
    ON DELETE RESTRICT,

  CONSTRAINT fk_group_cost_center
    FOREIGN KEY (user_group_cost_center_id) REFERENCES CostCenters(cost_center_id)
    ON DELETE RESTRICT,
  CONSTRAINT fk_group_work_schedule
    FOREIGN KEY (user_group_work_schedule_id) REFERENCES WorkSchedules(work_schedule_id)
    ON DELETE RESTRICT,
  CONSTRAINT fk_group_working_hour
    FOREIGN KEY (user_group_working_hour_id) REFERENCES WorkingHours(working_hour_id)
    ON DELETE RESTRICT,
  CONSTRAINT fk_group_core_hour
    FOREIGN KEY (user_group_core_hour_id) REFERENCES CoreHours(core_hour_id)
    ON DELETE RESTRICT,

  CONSTRAINT chk_group_tree CHECK (
    user_group_shift_id IS NULL OR user_group_department_id IS NOT NULL
  )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
