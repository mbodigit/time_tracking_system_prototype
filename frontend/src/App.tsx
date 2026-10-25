import { BrowserRouter, Routes, Route } from "react-router-dom";
import { LoginPage } from "./pages/login-page/login-page";
import { DashboardPage } from "./pages/dashboard-page/dashboard-page";
import { ChangePasswordPage } from "./pages/change-password-page/change-password-page";
import { ProtectedRoute } from "./components/protected-route/protected-route";
import { Layout } from "./components/layout/layout";
import { TimeLogPage } from "./pages/time-log-page/time-log-page";
import { RequestsPage } from "./pages/requests-page/requests-page";
import { ReportsPage } from "./pages/reports-page/reports-page";
import { CalendarPage } from "./pages/calendar-page/calendar-page";
import { RequireRole } from "./components/require-role/require-role";
import { GroupsPage } from "./pages/groups-page/groups-page";
import { OrgPage } from "./pages/org-page/org-page";
import { EmployeesPage } from "./pages/employees-page/employees-page";

const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/change-password" element={<ChangePasswordPage />} />

        <Route
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/time-log" element={<TimeLogPage />} />
          <Route path="/requests" element={<RequestsPage />} />
          <Route
            path="/reports"
            element={
              <RequireRole roles={["Vezető", "HR-Bér"]}>
                <ReportsPage />
              </RequireRole>
            }
          />
          <Route
            path="/admin-calendar"
            element={
              <RequireRole roles={["HR-Bér"]}>
                <CalendarPage />
              </RequireRole>
            }
          />
          <Route
            path="/admin-groups"
            element={
              <RequireRole roles={["Admin"]}>
                <GroupsPage />
              </RequireRole>
            }
          />
          <Route
            path="/admin-org-structure"
            element={
              <RequireRole roles={["Admin"]}>
                <OrgPage />
              </RequireRole>
            }
          />
          <Route
            path="/admin-employees"
            element={
              <RequireRole roles={["HR-Bér"]}>
                <EmployeesPage />
              </RequireRole>
            }
          />
        </Route>
      </Routes>
    </BrowserRouter>
  );
};

export default App;
