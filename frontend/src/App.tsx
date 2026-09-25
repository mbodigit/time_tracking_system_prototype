import { BrowserRouter, Routes, Route } from "react-router-dom";
import { LoginPage } from "./pages/login-page/login-page";
import { DashboardPage } from "./pages/dashboard-page/dashboard-page";
import { ChangePasswordPage } from "./pages/change-password-page/change-password-page";

const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/change-password" element={<ChangePasswordPage />} />
      </Routes>
    </BrowserRouter>
  );
};
export default App;
