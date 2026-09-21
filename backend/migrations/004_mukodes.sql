USE time_tracking_db_prototype;

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS WorkingTimeTracking (
  wtt_id            INT          NOT NULL AUTO_INCREMENT,
  wtt_employee_id   INT          NOT NULL,
  wtt_working_date  DATE         NOT NULL,
  wtt_working_start DATETIME     NULL,
  wtt_working_end   DATETIME     NULL,
  wtt_brk_start     DATETIME     NULL,
  wtt_brk_end       DATETIME     NULL,
  wtt_absence_id    INT          NULL,
  wtt_note          VARCHAR(255) NULL,
  wtt_created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  wtt_updated_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
                                 ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (wtt_id),
  UNIQUE KEY uq_wtt_employee_date (wtt_employee_id, wtt_working_date),
  KEY idx_wtt_working_date (wtt_working_date),
  KEY idx_wtt_absence (wtt_absence_id),

  CONSTRAINT fk_wtt_employee
    FOREIGN KEY (wtt_employee_id) REFERENCES Employees(employee_id)
    ON DELETE CASCADE,
  CONSTRAINT fk_wtt_absence
    FOREIGN KEY (wtt_absence_id) REFERENCES Absences(absence_id)
    ON DELETE RESTRICT,

  CONSTRAINT chk_wtt_working_order CHECK (
    wtt_working_start IS NULL OR wtt_working_end IS NULL
    OR wtt_working_end >= wtt_working_start
  ),

  CONSTRAINT chk_wtt_break_order CHECK (
    wtt_brk_start IS NULL OR wtt_brk_end IS NULL
    OR wtt_brk_end >= wtt_brk_start
  )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS Requests (
  request_id              INT          NOT NULL AUTO_INCREMENT,
  request_employee_id     INT          NOT NULL,
  request_absence_id      INT          NOT NULL,
  request_start_date      DATE         NOT NULL,
  request_end_date        DATE         NOT NULL,
  request_message         VARCHAR(255) NULL,
  request_status          ENUM('Függőben','Jóváhagyva','Elutasítva','Visszavonva')
                          NOT NULL DEFAULT 'Függőben',
  request_decision_by     INT          NULL,
  request_decision_at     DATETIME     NULL,
  request_decision_reason VARCHAR(255) NULL,
  request_created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (request_id),
  KEY idx_request_employee (request_employee_id),
  KEY idx_request_status (request_status),
  KEY idx_request_dates (request_start_date, request_end_date),

  CONSTRAINT fk_request_employee
    FOREIGN KEY (request_employee_id) REFERENCES Employees(employee_id)
    ON DELETE CASCADE,
  CONSTRAINT fk_request_absence
    FOREIGN KEY (request_absence_id) REFERENCES Absences(absence_id)
    ON DELETE RESTRICT,
  CONSTRAINT fk_request_decision_by
    FOREIGN KEY (request_decision_by) REFERENCES Users(user_id)
    ON DELETE SET NULL,

  CONSTRAINT chk_request_dates CHECK (request_end_date >= request_start_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

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
