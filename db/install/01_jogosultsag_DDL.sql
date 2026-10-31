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
