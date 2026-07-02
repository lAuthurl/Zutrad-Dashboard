import { useState, useEffect, useMemo } from "react";

const API_BASE = "http://localhost:5000";

// ════════════════════════════════════════════════════════════════════════════
// PURE HELPERS
// ════════════════════════════════════════════════════════════════════════════
export const roleBg = (role, colors) => {
  if (role === "administrator") return colors.greenAccent[600];
  if (role === "engineer")      return colors.blueAccent[600];
  return colors.greenAccent[700];
};

// Private — not exported. The UI must go through handleExportCSV /
// handleExportJSON so the permission check always runs.
const _stamp = () => new Date().toISOString().slice(0, 10);

const _download = (content, filename, type) => {
  const blob = new Blob([content], { type });
  const url  = URL.createObjectURL(blob);
  const a    = Object.assign(document.createElement("a"), { href: url, download: filename });
  a.click();
  URL.revokeObjectURL(url);
};

const _exportToCSV = (rows) => {
  const headers = ["ID", "First Name", "Surname", "Email", "Role", "Permissions", "Status"];
  const csvRows = rows.map((r) => [
    r.id,
    r.firstName,
    r.surname,
    r.email,
    r.role,
    r.role === "administrator" || r.role === "superadmin"
      ? "All"
      : (r.permissions || []).join("; "),
    r.isFirstLogin ? "Pending Setup" : "Active",
  ]);
  const content = [headers, ...csvRows]
    .map((row) => row.map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(","))
    .join("\n");
  _download(content, `zutrad_users_${_stamp()}.csv`, "text/csv;charset=utf-8;");
};

const _exportToJSON = (rows) => {
  _download(
    JSON.stringify(rows, null, 2),
    `zutrad_users_${_stamp()}.json`,
    "application/json"
  );
};

// ════════════════════════════════════════════════════════════════════════════
// API HELPERS
// ════════════════════════════════════════════════════════════════════════════
const authHeaders = (extra = {}) => {
  const token = localStorage.getItem("token");
  return { ...extra, ...(token ? { Authorization: `Bearer ${token}` } : {}) };
};

const apiFetch = async (path, options = {}) => {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...authHeaders() },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.message || `HTTP ${res.status}`);
  }
  return res.status === 204 ? null : res.json();
};

const normalizeUser = (u) => ({
  id:           u._id  ?? u.id,
  firstName:    u.firstName,
  surname:      u.surname,
  email:        u.email,
  role:         u.role,
  permissions:  u.permissions  || [],
  isFirstLogin: !!u.isFirstLogin,
});

// ════════════════════════════════════════════════════════════════════════════
// PERMISSION HELPERS
// ════════════════════════════════════════════════════════════════════════════

// Never cached at module level — always reads the latest login state.
const readUserFromStorage = () => {
  try {
    return JSON.parse(localStorage.getItem("user")) ?? null;
  } catch {
    return null;
  }
};

const isSuperAdmin   = (role) => role === "superadmin";
const isAdminOrAbove = (role) => role === "administrator" || role === "superadmin";

// ════════════════════════════════════════════════════════════════════════════
// MAIN HOOK
// ════════════════════════════════════════════════════════════════════════════
export const useAllUsersLogic = () => {
  // ── current user — held in state so all permission flags stay reactive.
  //    Re-reads on mount and on any storage event (e.g. login/logout in
  //    another tab). Same-tab login should dispatch a "storage" event or
  //    call setCurrentUser() directly after writing to localStorage.
  const [currentUser, setCurrentUser] = useState(() => readUserFromStorage());

  useEffect(() => {
    const onStorage = () => setCurrentUser(readUserFromStorage());
    window.addEventListener("storage", onStorage);
    setCurrentUser(readUserFromStorage());
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // ── permission flags — always derived from live currentUser state ──────────
  const role          = currentUser?.role ?? null;
  const currentUserId = currentUser?.id   ?? currentUser?._id ?? null;

  const canDelete = isSuperAdmin(role);   // only superadmin can delete users
  const canExport = isAdminOrAbove(role); // admin or superadmin can export

  // ── data state ─────────────────────────────────────────────────────────────
  const [rows,         setRows]         = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [search,       setSearch]       = useState("");
  const [roleFilter,   setRoleFilter]   = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedIds,  setSelectedIds]  = useState([]);
  const [toast,        setToast]        = useState({ open: false, message: "", severity: "success" });

  // ── confirm dialog (replaces window.confirm) ───────────────────────────────
  const [confirmDialog, setConfirmDialog] = useState({ open: false, title: "", message: "" });
  const [pendingAction, setPendingAction] = useState(null);

  const closeConfirmDialog = () => {
    setConfirmDialog({ open: false, title: "", message: "" });
    setPendingAction(null);
  };
  const confirmAction = () => {
    if (pendingAction) pendingAction();
    closeConfirmDialog();
  };

  // ── error / info popup ─────────────────────────────────────────────────────
  const [errorDialog, setErrorDialog] = useState({ open: false, title: "", message: "" });
  const closeErrorDialog = () => setErrorDialog({ open: false, title: "", message: "" });
  const showErrorDialog  = (title, message) => setErrorDialog({ open: true, title, message });

  const showToast = (message, severity = "success") =>
    setToast({ open: true, message, severity });

  // ── fetch ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const data = await apiFetch("/auth/users");
        setRows(data.map(normalizeUser));
      } catch (err) {
        const unauthorized = err.message.includes("401") || err.message.includes("403");
        showErrorDialog(
          unauthorized ? "Not Authorized" : "Failed to Load Users",
          unauthorized
            ? "You are not authorized to view the user list."
            : err.message
        );
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, []);

  // ── derived: filtered rows ─────────────────────────────────────────────────
  const filteredRows = useMemo(() => {
    const q = search.toLowerCase();
    return rows.filter((r) => {
      const matchSearch =
        !q ||
        `${r.firstName} ${r.surname}`.toLowerCase().includes(q) ||
        r.email.toLowerCase().includes(q);
      const matchRole =
        roleFilter === "all" || r.role === roleFilter;
      const matchStatus =
        statusFilter === "all" ||
        (statusFilter === "active"  && !r.isFirstLogin) ||
        (statusFilter === "pending" &&  r.isFirstLogin);
      return matchSearch && matchRole && matchStatus;
    });
  }, [rows, search, roleFilter, statusFilter]);

  // ── delete single user — superadmin only ──────────────────────────────────
  const handleDelete = (id) => {
    if (!canDelete) {
      showErrorDialog(
        "Access Denied",
        "Only superadmins can delete users. Contact your superadmin if you need this action performed."
      );
      return;
    }
    if (id === currentUserId) {
      showErrorDialog(
        "Cannot Delete Yourself",
        "You cannot delete your own account from this page."
      );
      return;
    }

    const target = rows.find((u) => u.id === id);
    const label  = target ? `${target.firstName} ${target.surname}` : `user #${id}`;

    setConfirmDialog({
      open:    true,
      title:   "Delete user?",
      message: `Delete ${label}? This action cannot be undone.`,
    });
    setPendingAction(() => async () => {
      try {
        await apiFetch(`/auth/users/${id}`, { method: "DELETE" });
        setRows((prev) => prev.filter((u) => u.id !== id));
        setSelectedIds((prev) => prev.filter((sid) => sid !== id));
        showToast(`${label} deleted.`);
      } catch (err) {
        showErrorDialog("Delete Failed", err.message || "Failed to delete user. Try again.");
      }
    });
  };

  // ── bulk delete — superadmin only ─────────────────────────────────────────
  const handleBulkDelete = () => {
    if (!canDelete) {
      showErrorDialog(
        "Access Denied",
        "Only superadmins can delete users. Contact your superadmin if you need this action performed."
      );
      return;
    }

    const toDelete   = selectedIds.filter((id) => id !== currentUserId);
    const blockedSelf = selectedIds.length !== toDelete.length;

    if (toDelete.length === 0) {
      showErrorDialog(
        "Nothing to Delete",
        blockedSelf
          ? "Your own account was the only selection — you cannot delete yourself from this page."
          : "No users selected."
      );
      return;
    }

    setConfirmDialog({
      open:    true,
      title:   `Delete ${toDelete.length} user${toDelete.length !== 1 ? "s" : ""}?`,
      message: `This will permanently delete ${toDelete.length} user${toDelete.length !== 1 ? "s" : ""}${blockedSelf ? " (your own account was skipped)" : ""}. This cannot be undone.`,
    });
    setPendingAction(() => async () => {
      const results = await Promise.allSettled(
        toDelete.map((id) => apiFetch(`/auth/users/${id}`, { method: "DELETE" }).then(() => id))
      );

      const succeeded  = results.filter((r) => r.status === "fulfilled").map((r) => r.value);
      const failedCount = results.length - succeeded.length;

      if (succeeded.length > 0) {
        setRows((prev) => prev.filter((u) => !succeeded.includes(u.id)));
        setSelectedIds([]);
      }

      if (failedCount > 0) {
        showErrorDialog(
          "Partial Delete",
          `${succeeded.length} user${succeeded.length !== 1 ? "s" : ""} deleted, but ${failedCount} failed. Refresh to check the current state.`
        );
      } else {
        showToast(`${succeeded.length} user${succeeded.length !== 1 ? "s" : ""} deleted.`);
      }
    });
  };

  const handleCopyEmail = (email) => {
    navigator.clipboard.writeText(email);
    showToast(`Copied: ${email}`);
  };

  // ── export — admin / superadmin only ──────────────────────────────────────
  const handleExportCSV = () => {
    if (!canExport) {
      showErrorDialog("Access Denied", "Only administrators and superadmins can export user data.");
      return;
    }
    _exportToCSV(filteredRows);
    showToast("CSV exported.");
  };

  const handleExportJSON = () => {
    if (!canExport) {
      showErrorDialog("Access Denied", "Only administrators and superadmins can export user data.");
      return;
    }
    _exportToJSON(filteredRows);
    showToast("JSON exported.");
  };

  const clearFilters = () => {
    setSearch("");
    setRoleFilter("all");
    setStatusFilter("all");
  };

  return {
    // data
    rows,
    filteredRows,
    loading,
    currentUserId,

    // permissions
    canDelete,
    canExport,

    // search / filters
    search,
    setSearch,
    roleFilter,
    setRoleFilter,
    statusFilter,
    setStatusFilter,
    clearFilters,

    // selection
    selectedIds,
    setSelectedIds,

    // confirm dialog
    confirmDialog,
    confirmAction,
    closeConfirmDialog,

    // error / info popup
    errorDialog,
    closeErrorDialog,

    // actions
    handleDelete,
    handleBulkDelete,
    handleCopyEmail,
    handleExportCSV,
    handleExportJSON,

    // toast
    toast,
    setToast,
  };
};