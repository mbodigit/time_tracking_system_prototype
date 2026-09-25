import { BrowserRouter, Routes, Route } from "react-router-dom";
import { LoginPage } from "./pages/login-page/login-page";
import { DashboardPage } from "./pages/dashboard-page/dashboard-page";
import { ChangePasswordPage } from "./pages/change-password-page/change-password-page";
import { ProtectedRoute } from "./components/protected-route/protected-route";

const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/change-password" element={<ChangePasswordPage />} />
        <Route path="/dashboard" element={<ProtectedRoute> <DashboardPage /> </ProtectedRoute>} />
      </Routes>
    </BrowserRouter>
  );
};
export default App;
