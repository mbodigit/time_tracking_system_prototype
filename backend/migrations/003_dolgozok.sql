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
  user_id                   INT          NOT NULL AUTO_INCREMENT,
  user_username             VARCHAR(30)  NOT NULL,
  user_password_hash        VARCHAR(100) NOT NULL,
  user_employee_id          INT          NOT NULL,
  user_role_id              INT          NOT NULL,
  user_status               BOOLEAN      NOT NULL DEFAULT 1,
  user_must_change_password BOOLEAN      NOT NULL DEFAULT 1,
  PRIMARY KEY (user_id),
  UNIQUE KEY uq_user_username (user_username),
  UNIQUE KEY uq_user_employee (user_employee_id),
  CONSTRAINT fk_user_employee
    FOREIGN KEY (user_employee_id) REFERENCES Employees(employee_id)
    ON DELETE CASCADE,
  CONSTRAINT fk_user_role
    FOREIGN KEY (user_role_id) REFERENCES UserRoles(user_role_id)
    ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

SET @van_fk := (
  SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'UserGroups'
    AND CONSTRAINT_NAME = 'fk_group_manager'
);

SET @sql := IF(@van_fk = 0, '
  ALTER TABLE UserGroups
    ADD CONSTRAINT fk_group_manager
    FOREIGN KEY (user_group_manager_id) REFERENCES Users(user_id)
    ON DELETE SET NULL',
  'SELECT ''A megszorítás már létezik'' AS allapot');

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

INSERT INTO UserRoles (user_role_name)
SELECT v.nev FROM (
            SELECT 'Admin'    AS nev
  UNION ALL SELECT 'Vezető'
  UNION ALL SELECT 'HR-Bér'
  UNION ALL SELECT 'Dolgozó'
) v
WHERE NOT EXISTS (
  SELECT 1 FROM UserRoles r WHERE r.user_role_name = v.nev
);

INSERT INTO EmployeeStatus (employee_status_name, employee_status_is_active)
SELECT 'Aktív', 1
WHERE NOT EXISTS (
  SELECT 1 FROM EmployeeStatus WHERE employee_status_name = 'Aktív'
);

INSERT INTO EmployeeCategories (employee_category_name)
SELECT 'Szellemi'
WHERE NOT EXISTS (
  SELECT 1 FROM EmployeeCategories WHERE employee_category_name = 'Szellemi'
);

INSERT INTO CostCenters (cost_center_name, cost_center_code)
SELECT 'Központ', 'KP'
WHERE NOT EXISTS (
  SELECT 1 FROM CostCenters WHERE cost_center_code = 'KP'
);

INSERT INTO Employees (
  employee_code, employee_first_name, employee_last_name,
  employee_cost_center_id, employee_category_id, employee_status_id
)
SELECT 'KP-001', 'Rendszer', 'Adminisztrátor',
       (SELECT cost_center_id FROM CostCenters WHERE cost_center_code = 'KP'),
       (SELECT employee_category_id FROM EmployeeCategories
         WHERE employee_category_name = 'Szellemi'),
       (SELECT employee_status_id FROM EmployeeStatus
         WHERE employee_status_name = 'Aktív')
WHERE NOT EXISTS (
  SELECT 1 FROM Employees WHERE employee_code = 'KP-001'
);

UPDATE CostCenters
SET cost_center_next_employee_seq = 2
WHERE cost_center_code = 'KP' AND cost_center_next_employee_seq < 2;

INSERT INTO Users (
  user_username, user_password_hash, user_employee_id, user_role_id,
  user_status, user_must_change_password
)
SELECT 'admin',
       '$2b$10$aj/VW7Rk8673XqH2aWFth.4DqhjXqtoiZOyMENQ7ey9LVj2Va9YWu',
       (SELECT employee_id FROM Employees WHERE employee_code = 'KP-001'),
       (SELECT user_role_id FROM UserRoles WHERE user_role_name = 'Admin'),
       1, 1
WHERE NOT EXISTS (
  SELECT 1 FROM Users WHERE user_username = 'admin'
);

SELECT TABLE_NAME AS tabla, CONSTRAINT_NAME AS megszoritas,
       COLUMN_NAME AS oszlop, REFERENCED_TABLE_NAME AS hivatkozott_tabla
FROM information_schema.KEY_COLUMN_USAGE
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME IN ('Employees', 'Users', 'UserGroups')
  AND REFERENCED_TABLE_NAME IS NOT NULL
ORDER BY TABLE_NAME, CONSTRAINT_NAME, ORDINAL_POSITION;

SELECT u.user_username        AS felhasznalonev,
       r.user_role_name       AS szerepkor,
       e.employee_code        AS dolgozoi_kod,
       CONCAT(e.employee_last_name, ' ', e.employee_first_name) AS nev,
       u.user_must_change_password AS jelszocsere_kotelezo,
       LEFT(u.user_password_hash, 7) AS hash_eleje
FROM Users u
JOIN UserRoles r ON r.user_role_id = u.user_role_id
JOIN Employees e ON e.employee_id = u.user_employee_id;
