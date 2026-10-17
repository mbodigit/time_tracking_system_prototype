import { BrowserRouter, Routes, Route } from "react-router-dom";
import { LoginPage } from "./pages/login-page/login-page";
import { DashboardPage } from "./pages/dashboard-page/dashboard-page";
import { ChangePasswordPage } from "./pages/change-password-page/change-password-page";
import { ProtectedRoute } from "./components/protected-route/protected-route";
import { AppLayout } from "./components/app-layout/app-layout";
import { TimeLogPage } from "./pages/time-log-page/time-log-page";
import { RequestsPage } from "./pages/requests-page/requests-page";

const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/change-password" element={<ChangePasswordPage />} />

        <Route
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/time-log" element={<TimeLogPage />} />
          <Route path="/requests" element={<RequestsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
};

export default App;
