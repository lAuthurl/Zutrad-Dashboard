import { useMemo, useState, useEffect } from "react";

const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:5000";

/* =========================================================================
   DEFAULTS
   ========================================================================= */
const GUEST_USER = {
  firstName: "Guest",
  surname: "User",
  email: "guest@zutrad.com",
  role: "staff",
  permissions: [],
  isApproved: true,
  isFirstLogin: false,
};

/* =========================================================================
   ROLE HELPERS
   ========================================================================= */
const FULL_ACCESS_ROLES = ["administrator", "superadmin"];
const isFullAccessRole  = (role) => FULL_ACCESS_ROLES.includes(role);
const capitalize        = (str) => str ? str.charAt(0).toUpperCase() + str.slice(1) : "";

/* =========================================================================
   MAIN HOOK
   ========================================================================= */
export const useProfilePage = (currentUser, onLogout) => {
  // ── live user state — starts from what App passed in, then syncs from DB ──
  const [user, setUser] = useState(currentUser || GUEST_USER);
  const [activityStats, setActivityStats] = useState({ reportsFiled: 0, supplyLogs: 0, maintenanceJobs: 0 });

  const fullAccess = isFullAccessRole(user.role);

  // ── sync fresh user data from the server on mount ────────────────────────
  // This ensures isApproved, isFirstLogin, permissions, and role are always
  // current — not a stale snapshot from the login token.
  useEffect(() => {
    if (!currentUser) return; // guest — nothing to fetch

    const fetchMe = async () => {
      try {
        const token = localStorage.getItem("token");
        const [meRes, reportsRes, maintenanceRes, supplyRes] = await Promise.all([
          fetch(`${API_BASE}/auth/me`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${API_BASE}/reports`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${API_BASE}/maintenance`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${API_BASE}/supply`, { headers: { Authorization: `Bearer ${token}` } }),
        ]);

        if (meRes.ok) {
          const fresh = await meRes.json();
          setUser(fresh);
          localStorage.setItem("user", JSON.stringify(fresh));
        }

        const [reports, maintenance, supply] = await Promise.all([
          reportsRes.ok ? reportsRes.json() : [],
          maintenanceRes.ok ? maintenanceRes.json() : [],
          supplyRes.ok ? supplyRes.json() : [],
        ]);

        setActivityStats({
          reportsFiled: Array.isArray(reports) ? reports.length : 0,
          supplyLogs: Array.isArray(supply) ? supply.length : 0,
          maintenanceJobs: Array.isArray(maintenance) ? maintenance.length : 0,
        });
      } catch {
        // Network error — keep showing the cached user, no crash
      }
    };

    fetchMe();
  }, [currentUser]);

  // ── derived display values ────────────────────────────────────────────────
  const roleLabel   = user.role ? capitalize(user.role) : "Staff";
  const displayName = `${user.firstName || "Guest"} ${user.surname || "User"}`.trim();
  const initials    = `${user.firstName?.[0] ?? "G"}${user.surname?.[0] ?? "U"}`.toUpperCase();

  // ── account status ────────────────────────────────────────────────────────
  const isApproved    = user.isApproved !== false;
  const accountStatus = !isApproved ? "pending" : "active";

  const statusConfig = {
    active:  { label: "Active",            color: "success" },
    pending: { label: "Awaiting Approval", color: "error"   },
  };
  const accountStatusLabel = statusConfig[accountStatus].label;
  const accountStatusColor = statusConfig[accountStatus].color;

  const permissions = useMemo(() => {
    if (fullAccess) return ["All"];
    return (user.permissions || []).length > 0
      ? user.permissions.map((p) => capitalize(p))
      : ["None"];
  }, [fullAccess, user.permissions]);

  // ── logout ────────────────────────────────────────────────────────────────
  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    if (onLogout) onLogout();
  };

  // ── delete account ────────────────────────────────────────────────────────
  const [deleteDialog, setDeleteDialog]   = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError]     = useState("");

  const openDeleteDialog  = () => { setDeleteError(""); setDeleteDialog(true); };
  const closeDeleteDialog = () => { setDeleteError(""); setDeleteDialog(false); };

  const handleDeleteAccount = async () => {
    setDeleteLoading(true);
    setDeleteError("");
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/auth/delete-account`, {
        method:  "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization:  `Bearer ${token}`,
        },
      });
      if (!res.ok) {
        const data = await res.json();
        setDeleteError(data.message || "Failed to delete account. Try again.");
        return;
      }
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      if (onLogout) onLogout();
    } catch {
      setDeleteError("Unable to reach the server. Check your connection.");
    } finally {
      setDeleteLoading(false);
    }
  };

  return {
    user,
    roleLabel,
    displayName,
    initials,
    permissions,
    activityStats,
    accountStatus,
    accountStatusLabel,
    accountStatusColor,
    handleLogout,
    deleteDialog,
    deleteLoading,
    deleteError,
    openDeleteDialog,
    closeDeleteDialog,
    handleDeleteAccount,
  };
};