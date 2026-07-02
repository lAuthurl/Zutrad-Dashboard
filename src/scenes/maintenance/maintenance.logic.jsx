import { useState, useEffect, useMemo } from "react";
import { notifyMaintenanceChanged } from "../../utils/eventbus";

const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:5000";

/* =========================================================================
   CONSTANTS
   ========================================================================= */

export const MACHINE_TYPES = ["Macsa ID", "Savema", "Sojet", "BestCode"];

export const SORT_OPTIONS = [
  { value: "dateAsc",            label: "Date (soonest first)"  },
  { value: "dateDesc",           label: "Date (latest first)"   },
  { value: "statusOverdueFirst", label: "Status (overdue first)"},
  { value: "client",             label: "Client (A–Z)"          },
];

/* =========================================================================
   API HELPERS
   ========================================================================= */

// Reads the JWT the same way useLogin.js writes it: localStorage.setItem("token", ...).
// Read fresh on every call (not cached at module level) so a logout/login
// in this tab or another always picks up the current token.
const getAuthToken = () => localStorage.getItem("token");

const apiFetch = async (path, options = {}) => {
  const token = getAuthToken();

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || `Request failed (${res.status})`);
  }
  return res.status === 204 ? null : res.json();
};

// Normalize Mongo's nested `_id` fields to `id` on logs and their populated
// sub-documents so nothing downstream needs to know the data came from an API.
const normalizeLog = (l) => ({
  ...l,
  id:     l._id ?? l.id,
  client: l.client ? { ...l.client, id: l.client._id ?? l.client.id } : null,
  user:   l.user   ? { ...l.user,   id: l.user._id   ?? l.user.id   } : null,
});

const normalizeClient = (c) => ({ ...c, id: c._id ?? c.id });

/* =========================================================================
   PERMISSION HELPERS
   ========================================================================= */

// Never cached at module level — always reads the latest login state.
const readUserFromStorage = () => {
  try {
    return JSON.parse(localStorage.getItem("user")) ?? null;
  } catch {
    return null;
  }
};

const isAdminOrAbove  = (role) => role === "administrator" || role === "superadmin";
const isSuperAdminRole = (role) => role === "superadmin";
const hasPermission   = (permissions, key) => Array.isArray(permissions) && permissions.includes(key);

/* =========================================================================
   DATE / STATUS HELPERS
   ========================================================================= */

const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

export const getLogStatus = (log) => {
  if (log.isDone) return "completed";
  const due = new Date(log.maintenanceDay);
  due.setHours(0, 0, 0, 0);
  return due.getTime() < startOfToday().getTime() ? "overdue" : "pending";
};

// Visual metadata (colors/icons) for each status, keyed off the theme's
// `colors` token object. Icons are injected from the UI file via `iconMap`
// so this logic file stays free of component/JSX imports.
export const buildStatusMeta = (colors, iconMap) => ({
  completed: {
    label:  "Completed",
    bg:     colors.greenAccent[700],
    color:  colors.greenAccent[300],
    icon:   iconMap.completed,
    border: colors.greenAccent[600],
  },
  overdue: {
    label:  "Overdue",
    bg:     "#7a1f1f",
    color:  "#ff8a8a",
    icon:   iconMap.overdue,
    border: "#c0392b",
  },
  pending: {
    label:  "Pending",
    bg:     colors.blueAccent[700],
    color:  colors.blueAccent[200],
    icon:   iconMap.pending,
    border: colors.blueAccent[500],
  },
});

/* =========================================================================
   CSV EXPORT HELPERS
   ========================================================================= */

const escapeCsvCell = (val) => {
  const s = String(val ?? "");
  return s.includes(",") || s.includes('"') || s.includes("\n")
    ? `"${s.replace(/"/g, '""')}"`
    : s;
};

const downloadCsv = (rows, filename) => {
  const headers = ["ID", "Machine", "Client", "Status", "Maintenance Date", "Logged By", "Created At", "Notes"];
  const lines = [
    headers.join(","),
    ...rows.map((r) =>
      [
        r.id,
        r.machine,
        r.client?.companyName ?? "",
        r.statusLabel,
        r.maintenanceDay,
        `${r.user?.firstName ?? ""} ${r.user?.surname ?? ""}`.trim(),
        r.createdAt,
        r.message,
      ].map(escapeCsvCell).join(",")
    ),
  ];
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url  = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href  = url;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/* =========================================================================
   MAIN HOOK
   ========================================================================= */

export const useMaintenancePage = (statusMeta) => {
  // ── current user — held in state so permission flags stay reactive.
  //    Re-read on mount and on any storage event (login / logout in
  //    another tab). Same-tab login should call setCurrentUser() directly
  //    or dispatch a storage event after writing to localStorage.
  const [currentUser, setCurrentUser] = useState(() => readUserFromStorage());

  useEffect(() => {
    const onStorage = () => setCurrentUser(readUserFromStorage());
    window.addEventListener("storage", onStorage);
    setCurrentUser(readUserFromStorage());
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // ── permission flags — always derived from live currentUser state ──────────
  const role        = currentUser?.role ?? null;
  const permissions = Array.isArray(currentUser?.permissions) ? currentUser.permissions : [];

  // Log task:    "maintenance" permission OR admin/superadmin
  const userCanLogTask   = isAdminOrAbove(role) || hasPermission(permissions, "maintenance");
  // Mark done:  admin or superadmin only
  const userCanMarkDone  = isAdminOrAbove(role);
  // Export CSV: admin or superadmin only
  const userCanExportCSV = isAdminOrAbove(role);
  // Delete log: superadmin only — same restriction level as machine
  // deletion in clientMachine.logic.js (userCanDeleteMachine).
  const userCanDelete    = isSuperAdminRole(role);

  // ── raw state ──────────────────────────────────────────────────────────────
  const [logs,         setLogs]         = useState([]);
  const [clients,      setClients]      = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState(null);
  const [formOpen,     setFormOpen]     = useState(false);
  const [search,       setSearch]       = useState("");
  const [successMsg,   setSuccessMsg]   = useState("");
  const [machineFilter,setMachineFilter]= useState("");
  const [clientFilter, setClientFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sortBy,       setSortBy]       = useState("dateAsc");

  const [form, setForm] = useState({
    message: "", machine: "", maintenanceDay: "", clientId: "",
  });

  // ── error / info popup ─────────────────────────────────────────────────────
  const [errorDialog, setErrorDialog] = useState({ open: false, title: "", message: "" });
  const closeErrorDialog = () => setErrorDialog({ open: false, title: "", message: "" });
  const showErrorDialog  = (title, message) => setErrorDialog({ open: true, title, message });

  // ── fetch ──────────────────────────────────────────────────────────────────
  const fetchAll = async () => {
    setLoading(true);
    try {
      const [logsData, clientsData] = await Promise.all([
        apiFetch("/maintenance"),
        apiFetch("/clients"),
      ]);
      setLogs(logsData.map(normalizeLog));
      setClients(clientsData.map(normalizeClient));
      setError(null);
    } catch (err) {
      setError(err.message);
      showErrorDialog("Failed to Load Data", err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── form handlers ──────────────────────────────────────────────────────────
  const handleChange = (e) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  // Opens the log form — guard runs against live state, not a stale flag.
  const openFormIfAuthorised = () => {
    if (!userCanLogTask) {
      showErrorDialog(
        "Access Denied",
        "You don't have permission to log maintenance tasks. Ask an administrator to grant you maintenance access."
      );
      return;
    }
    setFormOpen(true);
  };

  // ── log task — maintenance permission or admin/superadmin ─────────────────
  const handleSubmit = async () => {
    if (!userCanLogTask) {
      showErrorDialog(
        "Access Denied",
        "You don't have permission to log maintenance tasks. Ask an administrator to grant you maintenance access."
      );
      return;
    }

    const { message, machine, maintenanceDay, clientId } = form;
    if (!message || !machine || !maintenanceDay || !clientId) {
      showErrorDialog("Missing Fields", "All fields are required. Please fill in every field before submitting.");
      return;
    }

    try {
      const newLog = await apiFetch("/maintenance", {
        method: "POST",
        body:   JSON.stringify({
          message,
          machine,
          maintenanceDay,
          clientId,
          // userId deliberately omitted — the backend reads it from req.user (JWT).
        }),
      });
      setLogs((prev) => [normalizeLog(newLog), ...prev]);
      // A new log is always "pending" or "overdue" (never done on creation),
      // so it always affects the sidebar's maintenance badge.
      notifyMaintenanceChanged();
      setForm({ message: "", machine: "", maintenanceDay: "", clientId: "" });
      setFormOpen(false);
      setSuccessMsg("Maintenance task logged.");
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err) {
      showErrorDialog("Failed to Log Task", err.message);
    }
  };

  // ── mark done — admin / superadmin only ───────────────────────────────────
  // The button should not be rendered for other roles, but we guard here too
  // so the action is blocked even if someone calls it programmatically.
  const handleMarkDone = async (id) => {
    if (!userCanMarkDone) {
      showErrorDialog(
        "Access Denied",
        "Only administrators and superadmins can mark maintenance tasks as done."
      );
      return;
    }
    try {
      const updated   = await apiFetch(`/maintenance/${id}/done`, { method: "PATCH" });
      const normalized = normalizeLog(updated);
      setLogs((prev) => prev.map((l) => (l.id === id ? normalized : l)));
      // isDone flipped to true — sidebar badge (count of !isDone) needs to shrink.
      notifyMaintenanceChanged();
    } catch (err) {
      showErrorDialog("Failed to Update Task", err.message);
    }
  };

  // ── delete — superadmin only ───────────────────────────────────────────────
  // The button is hidden entirely for non-superadmins in the UI, but the
  // guard runs here too so the action is blocked even if called
  // programmatically. requireSuperAdmin on the backend is the actual
  // enforcement boundary — this is just a fast, friendly client-side check.
  const handleDelete = async (id) => {
    if (!userCanDelete) {
      showErrorDialog(
        "Access Denied",
        "Only superadmins can delete maintenance logs. Contact your superadmin if you need this action performed."
      );
      return;
    }
    try {
      await apiFetch(`/maintenance/${id}`, { method: "DELETE" });
      setLogs((prev) => prev.filter((l) => l.id !== id));
      // Deleting a not-yet-done log also needs to shrink the sidebar badge.
      notifyMaintenanceChanged();
      setSuccessMsg("Maintenance log deleted.");
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err) {
      showErrorDialog("Failed to Delete Log", err.message);
    }
  };

  // ── derived: enrich logs with computed status ──────────────────────────────
  const enrichedLogs = useMemo(() =>
    logs.map((l) => {
      const status = getLogStatus(l);
      return { ...l, status, statusLabel: statusMeta[status].label };
    }),
    [logs, statusMeta]
  );

  // ── derived: summary counts ────────────────────────────────────────────────
  const summary = useMemo(() => ({
    total:     enrichedLogs.length,
    pending:   enrichedLogs.filter((l) => l.status === "pending").length,
    overdue:   enrichedLogs.filter((l) => l.status === "overdue").length,
    completed: enrichedLogs.filter((l) => l.status === "completed").length,
  }), [enrichedLogs]);

  // ── derived: filtering + sorting ───────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    let result = enrichedLogs.filter((l) => {
      const matchesSearch  = !q || l.machine?.toLowerCase().includes(q) || l.message?.toLowerCase().includes(q) || l.client?.companyName?.toLowerCase().includes(q);
      const matchesMachine = !machineFilter || l.machine === machineFilter;
      const matchesClient  = !clientFilter  || String(l.client?.id) === String(clientFilter);
      const matchesStatus  = !statusFilter  || l.status === statusFilter;
      return matchesSearch && matchesMachine && matchesClient && matchesStatus;
    });

    result = [...result].sort((a, b) => {
      switch (sortBy) {
        case "dateAsc":
          return new Date(a.maintenanceDay) - new Date(b.maintenanceDay);
        case "dateDesc":
          return new Date(b.maintenanceDay) - new Date(a.maintenanceDay);
        case "statusOverdueFirst": {
          const order = { overdue: 0, pending: 1, completed: 2 };
          return order[a.status] - order[b.status];
        }
        case "client":
          return (a.client?.companyName ?? "").localeCompare(b.client?.companyName ?? "");
        default:
          return 0;
      }
    });

    return result;
  }, [enrichedLogs, search, machineFilter, clientFilter, statusFilter, sortBy]);

  // ── export — admin / superadmin only ──────────────────────────────────────
  const handleExport = () => {
    if (!userCanExportCSV) {
      showErrorDialog(
        "Access Denied",
        "Only administrators and superadmins can export data."
      );
      return;
    }
    if (filtered.length === 0) {
      showErrorDialog(
        "Nothing to Export",
        "There are no records matching the current filters. Try clearing your filters before exporting."
      );
      return;
    }
    downloadCsv(filtered, `maintenance-logs-${new Date().toISOString().slice(0, 10)}.csv`);
  };

  const clearFilters = () => {
    setSearch("");
    setMachineFilter("");
    setClientFilter("");
    setStatusFilter("");
  };

  const hasActiveFilters = Boolean(search || machineFilter || clientFilter || statusFilter);

  // ── public API ─────────────────────────────────────────────────────────────
  return {
    // data
    filtered,
    summary,
    clients,

    // request state
    loading,
    error,
    refetch: fetchAll,

    // permissions (expose so UI can show/hide/disable buttons correctly)
    userCanLogTask,
    userCanMarkDone,
    userCanExportCSV,
    userCanDelete,

    // form state + handlers
    formOpen,
    setFormOpen,
    openFormIfAuthorised,
    form,
    handleChange,
    handleSubmit,

    // log actions
    handleMarkDone,
    handleDelete,

    // filter/sort state + setters
    search,
    setSearch,
    machineFilter,
    setMachineFilter,
    clientFilter,
    setClientFilter,
    statusFilter,
    setStatusFilter,
    sortBy,
    setSortBy,
    clearFilters,
    hasActiveFilters,

    // export
    handleExport,

    // error / info popup
    errorDialog,
    closeErrorDialog,

    // feedback
    successMsg,
  };
};