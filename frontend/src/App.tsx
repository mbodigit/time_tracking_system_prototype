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
import { RequirePermission } from "./components/require-permission/require-permission";
import { RequireEmployee } from "./components/require-employee/require-employee";
import { OrgPage } from "./pages/org-page/org-page";
import { EmployeesPage } from "./pages/employees-page/employees-page";
import { ConnectionGuard } from "./components/connection-guard/connection-guard";
import { MasterDataPage } from "./pages/master-data-page/master-data-page";
import { CompanyPage } from "./pages/company-page/company-page";
import { PermissionsPage } from "./pages/permissions-page/permissions-page";

const App = () => {
  return (
    <ConnectionGuard>
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
            <Route
              path="/dashboard"
              element={
                <RequireEmployee>
                  <DashboardPage />
                </RequireEmployee>
              }
            />
            <Route
              path="/time-log"
              element={
                <RequireEmployee>
                  <TimeLogPage />
                </RequireEmployee>
              }
            />
            <Route
              path="/requests"
              element={
                <RequireEmployee>
                  <RequestsPage />
                </RequireEmployee>
              }
            />
            <Route
              path="/reports"
              element={
                <RequirePermission permission="reports">
                  <RequireEmployee>
                    <ReportsPage />
                  </RequireEmployee>
                </RequirePermission>
              }
            />
            <Route
              path="/admin-calendar"
              element={
                <RequirePermission permission="calendar">
                  <RequireEmployee>
                    <CalendarPage />
                  </RequireEmployee>
                </RequirePermission>
              }
            />
            <Route
              path="/admin-org-structure"
              element={
                <RequirePermission permission="organisation">
                  <OrgPage />
                </RequirePermission>
              }
            />
            <Route
              path="/admin-employees"
              element={
                <RequirePermission permission="employees">
                  <EmployeesPage />
                </RequirePermission>
              }
            />
            <Route
              path="/admin-master-data"
              element={
                <RequirePermission permission="master_data">
                  <MasterDataPage />
                </RequirePermission>
              }
            />
            <Route
              path="/admin-permissions"
              element={
                <RequirePermission permission="permissions">
                  <PermissionsPage />
                </RequirePermission>
              }
            />
            <Route
              path="/admin-company"
              element={
                <RequirePermission permission="company">
                  <CompanyPage />
                </RequirePermission>
              }
            />
          </Route>
        </Routes>
      </BrowserRouter>
    </ConnectionGuard>
  );
};

export default App;
