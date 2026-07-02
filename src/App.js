import { useState, useEffect, useCallback } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { CssBaseline, ThemeProvider } from "@mui/material";
import { ColorModeContext, useMode } from "./theme";
import Topbar from "./scenes/global/Topbar";
import Sidebar from "./scenes/global/Sidebar";

// Auth
import LoginPage from "./authentication/login/login";
import SignupPage from "./authentication/signup/signup";

// Core
import Dashboard from "./scenes/dashboard/dashboard";
import Calendar from "./scenes/calendar/calendar";
// Data
import AllUsers from "./scenes/allUsers/allUsers";
import AllClients from "./scenes/allClients/allClients";
import SupplyPage from "./scenes/supply/supply";
// Operations
import AdminPage from "./scenes/admin/admin";
import SuperAdminPage from "./scenes/superAdmin/superAdmin";
import ClientMachinesPage from "./scenes/clientMachine/clientMachine";
import ReportsPage from "./scenes/reports/reports";
import MaintenancePage from "./scenes/maintenance/maintenance";
import StorePage from "./scenes/store/store";
// Charts
import Bar from "./scenes/bar/bar";
import Pie from "./scenes/pie/pie";
import Line from "./scenes/line/line";
// User
import SettingsPage from "./scenes/settings/settings";
import ProfilePage from "./scenes/profile/profile";
import NotificationsPage from "./scenes/notifications/notifications";

// Session
import { useSessionTimeout } from "./utils/sessionTimeout";
import { SETTINGS_UPDATED_EVENT } from "./scenes/settings/settings.logic";


// ── JWT helpers ───────────────────────────────────────────────────────────────

const decodeToken = (token) => {
  try {
    const payload = token.split(".")[1];
    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(json);
  } catch {
    return null;
  }
};

const getUserFromStorage = () => {
  try {
    const token = localStorage.getItem("token");
    const user  = JSON.parse(localStorage.getItem("user") || "null");
    if (!token || !user) return null;

    const payload = decodeToken(token);
    if (!payload) return null;

    if (payload.exp && payload.exp * 1000 < Date.now()) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      return null;
    }

    return user;
  } catch {
    return null;
  }
};


// ── Protected layout (Sidebar + Topbar + content) ─────────────────────────────
const AppLayout = ({ children, currentUser }) => (
  <div className="app">
    <Sidebar currentUser={currentUser} />
    <main className="content">
      <Topbar currentUser={currentUser} />
      <div className="content-body">
        {children}
      </div>
    </main>
  </div>
);

// ── Route guards ──────────────────────────────────────────────────────────────

// Any logged-in user.
const ProtectedRoute = ({ isAuthenticated, children }) => {
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return children;
};


// ── App ───────────────────────────────────────────────────────────────────────
function App() {
  const [theme, colorMode] = useMode();

  const [currentUser, setCurrentUser] = useState(() => getUserFromStorage());

  const isAuthenticated = !!currentUser;
  const isSuperAdmin    = currentUser?.role === "superadmin";
  const isAdmin         = currentUser?.role === "administrator" || isSuperAdmin;

  const handleLogin = (user) => {
    localStorage.setItem("user", JSON.stringify(user));
    setCurrentUser(user);
  };

  const handleLogout = useCallback(() => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setCurrentUser(null);
  }, []);

  // ── keep currentUser.settings fresh ──────────────────────────────────────
  // The Settings page dispatches SETTINGS_UPDATED_EVENT after a successful
  // save (see useSettings.logic.js). Without this, App would only see the
  // new sessionTimeout value after a full logout/login, since currentUser
  // here is just whatever was in localStorage at mount time.
  useEffect(() => {
    const onSettingsUpdated = (e) => {
      setCurrentUser((prev) => (prev ? { ...prev, settings: e.detail } : prev));
    };
    window.addEventListener(SETTINGS_UPDATED_EVENT, onSettingsUpdated);
    return () => window.removeEventListener(SETTINGS_UPDATED_EVENT, onSettingsUpdated);
  }, []);

  // ── auto-logout on inactivity ────────────────────────────────────────────
  // sessionTimeout lives in minutes (as a string, e.g. "30") on
  // currentUser.settings — see the `settings` sub-document on the User
  // model and toSafeObject(), which includes it in both the /auth/login
  // response and the cached "user" localStorage object.
  useSessionTimeout(isAuthenticated ? currentUser?.settings?.sessionTimeout : null, handleLogout);

  // Any logged-in user.
  const protect = (element) => (
    <ProtectedRoute isAuthenticated={isAuthenticated}>
      <AppLayout currentUser={currentUser}>
        {element}
      </AppLayout>
    </ProtectedRoute>
  );

  // Administrators and superadmins only.
  const protectAdmin = (element) => (
    <ProtectedRoute isAuthenticated={isAuthenticated}>
      <AppLayout currentUser={currentUser}>
        {isAdmin ? element : <Navigate to="/" replace />}
      </AppLayout>
    </ProtectedRoute>
  );

  // Permission-protected admin route only. Every other screen is available
  // to any authenticated user.

  return (
    <ColorModeContext.Provider value={colorMode}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Routes>
          {/* ── Public routes ── */}
          <Route
            path="/login"
            element={
              isAuthenticated
                ? <Navigate to="/" replace />
                : <LoginPage onLogin={handleLogin} />
            }
          />
          <Route
            path="/signup"
            element={
              isAuthenticated
                ? <Navigate to="/" replace />
                : <SignupPage />
            }
          />

          {/* ── Protected routes ── */}
          <Route path="/"             element={protect(<Dashboard />)} />
          <Route path="/calendar"     element={protect(<Calendar />)} />

          <Route
            path="/admin"
            element={protectAdmin(isSuperAdmin ? <SuperAdminPage /> : <AdminPage />)}
          />

          {/* Admin-only — engineers/receptionists have no business here */}
          <Route path="/users"        element={protect(<AllUsers />)} />

          {/* Available to all logged-in users */}
          <Route path="/clients-list" element={protect(<AllClients />)} />
          <Route path="/machines"     element={protect(<ClientMachinesPage />)} />

          {/* Permission-gated — admins always through; others need the page granted */}
          <Route path="/reports"      element={protect(<ReportsPage />)} />
          <Route path="/maintenance"  element={protect(<MaintenancePage />)} />
          <Route path="/supply"       element={protect(<SupplyPage />)} />
          <Route path="/store"        element={protect(<StorePage />)} />

          <Route path="/bar"          element={protect(<Bar />)} />
          <Route path="/pie"          element={protect(<Pie />)} />
          <Route path="/line"         element={protect(<Line />)} />

          <Route path="/profile"      element={protect(<ProfilePage currentUser={currentUser} onLogout={handleLogout} />)} />
          <Route path="/notifications" element={protect(<NotificationsPage />)} />
          <Route path="/settings"     element={protect(<SettingsPage />)} />

          {/* ── Fallback ── */}
          <Route path="*" element={<Navigate to={isAuthenticated ? "/" : "/login"} replace />} />
        </Routes>
      </ThemeProvider>
    </ColorModeContext.Provider>
  );
}

export default App;