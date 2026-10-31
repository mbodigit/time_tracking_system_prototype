USE time_tracking_db_prototype;

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS GlobalCalendar (
  gl_cal_id       INT          NOT NULL AUTO_INCREMENT,
  gl_cal_date     DATE         NOT NULL,
  gl_cal_day_type VARCHAR(50)  NOT NULL,
  gl_cal_note     VARCHAR(255) NULL,
  PRIMARY KEY (gl_cal_id),
  UNIQUE KEY uq_gl_cal_date (gl_cal_date),
  KEY idx_gl_cal_day_type (gl_cal_day_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
