USE time_tracking_db_prototype;

SET NAMES utf8mb4;

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
