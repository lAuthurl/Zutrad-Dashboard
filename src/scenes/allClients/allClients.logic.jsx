import { useState, useEffect, useMemo, useCallback } from "react";

const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:5000";

// ════════════════════════════════════════════════════════════════════════════
// PURE HELPERS
// ════════════════════════════════════════════════════════════════════════════
export const statusColor = (status, colors) => {
  if (status === "main") return { bg: colors.greenAccent[700], text: colors.greenAccent[300] };
  if (status === "spare") return { bg: colors.blueAccent[700], text: colors.blueAccent[300] };
  return { bg: colors.grey[700], text: colors.grey[300] };
};

// Returns true if a maintenance date is within 30 days or in the past
export const isMaintenanceDue = (dateStr) => {
  if (!dateStr) return false;
  const date = new Date(dateStr);
  const diff = (date - new Date()) / (1000 * 60 * 60 * 24);
  return diff <= 30;
};

export const exportClientsCSV = (clients) => {
  const headers = ["Client ID", "Company", "Address", "Total Machines", "Serial", "Machine", "Line", "Last Maintenance", "Usage Status"];
  const rows = clients.flatMap((c) =>
    c.machines.length > 0
      ? c.machines.map((m) => [c.id, c.companyName, c.address, c.machines.length, m.serialNumber, m.machine, m.lineInstalled, m.lastMaintenanceDate, m.usageStatus])
      : [[c.id, c.companyName, c.address, 0, "", "", "", "", ""]]
  );
  const content = [headers, ...rows].map((r) => r.map((v) => `"${v ?? ""}"`).join(",")).join("\n");
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `zutrad_clients_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};

// Mongo gives us `_id`; the rest of the app expects `id`. Normalize once,
// here, so nothing downstream has to know the data came from an API.
const normalizeClient = (c) => ({
  ...c,
  id: c._id ?? c.id,
  machines: (c.machines || []).map((m) => ({ ...m, id: m._id ?? m.id })),
});

const apiFetch = async (path, options = {}) => {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || `Request failed (${res.status})`);
  }
  return res.status === 204 ? null : res.json();
};

// Attaches the stored JWT for protected routes.
const authFetch = async (path, options = {}) => {
  const token = localStorage.getItem("token");
  return apiFetch(path, {
    ...options,
    headers: {
      ...(options.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
};

// ════════════════════════════════════════════════════════════════════════════
// PERMISSION HELPERS
// ════════════════════════════════════════════════════════════════════════════

// Reads the current user out of localStorage fresh every call.
// Never cached at module level — always reflects the latest login state.
const readUserFromStorage = () => {
  try {
    return JSON.parse(localStorage.getItem("user")) ?? null;
  } catch {
    return null;
  }
};

const isSuperAdmin  = (role) => role === "superadmin";
const isAdminOrAbove = (role) => role === "administrator" || role === "superadmin";

// ════════════════════════════════════════════════════════════════════════════
// ALL CLIENTS LOGIC
// ════════════════════════════════════════════════════════════════════════════
export const useAllClientsLogic = () => {
  // ── current user — read from localStorage into state so permission flags
  //    are reactive. Re-read on every storage event (login / logout in
  //    another tab) and on mount.
  const [currentUser, setCurrentUser] = useState(() => readUserFromStorage());

  useEffect(() => {
    const onStorage = () => setCurrentUser(readUserFromStorage());
    window.addEventListener("storage", onStorage);
    // Also re-read immediately in case localStorage was written before this
    // component mounted (same-tab login).
    setCurrentUser(readUserFromStorage());
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // ── permission flags — always derived from the live currentUser state ──────
  const role = currentUser?.role ?? null;

  // Delete: superadmin only
  const canDeleteClients  = isSuperAdmin(role);
  // Export CSV: administrator or superadmin only
  const canExportCSV      = isAdminOrAbove(role);

  // ── data state ─────────────────────────────────────────────────────────────
  const [clients, setClients]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error,   setError]     = useState(null);
  const [expanded, setExpanded] = useState({});
  const [search,   setSearch]   = useState("");
  const [toast,    setToast]    = useState({ open: false, message: "", severity: "success" });

  // ── confirm dialog ─────────────────────────────────────────────────────────
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

  // ── toast helper ───────────────────────────────────────────────────────────
  const showToast = (message, severity = "success") =>
    setToast({ open: true, message, severity });

  // ── fetch ──────────────────────────────────────────────────────────────────
  const fetchClients = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch("/clients");
      setClients(data.map(normalizeClient));
      setError(null);
    } catch (err) {
      setError(err.message);
      showErrorDialog("Failed to Load Clients", err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchClients(); }, [fetchClients]);

  // ── derived stats ──────────────────────────────────────────────────────────
  const totalMachines = clients.reduce((acc, c) => acc + c.machines.length, 0);
  const maintenanceDueCount = clients.reduce(
    (acc, c) => acc + c.machines.filter((m) => isMaintenanceDue(m.lastMaintenanceDate)).length,
    0
  );

  // ── filtered list ──────────────────────────────────────────────────────────
  const filteredClients = useMemo(() => {
    if (!search.trim()) return clients;
    const q = search.toLowerCase();
    return clients.filter(
      (c) =>
        c.companyName.toLowerCase().includes(q) ||
        c.address.toLowerCase().includes(q) ||
        c.machines.some(
          (m) =>
            m.serialNumber.toLowerCase().includes(q) ||
            m.machine.toLowerCase().includes(q)
        )
    );
  }, [clients, search]);

  // ── expand / collapse ──────────────────────────────────────────────────────
  const allExpanded = filteredClients.length > 0 && filteredClients.every((c) => expanded[c.id]);

  const toggleAll = () => {
    if (allExpanded) {
      setExpanded({});
    } else {
      const next = {};
      filteredClients.forEach((c) => { next[c.id] = true; });
      setExpanded(next);
    }
  };

  const toggleExpand = (id) =>
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

  // ── delete client — superadmin only ───────────────────────────────────────
  const handleDeleteClient = (id) => {
    if (!canDeleteClients) {
      showErrorDialog(
        "Access Denied",
        "Only superadmins can delete clients. Contact your superadmin if you need this action performed."
      );
      return;
    }
    setConfirmDialog({
      open: true,
      title: "Delete client?",
      message: "This will permanently delete this client and ALL their machines. This cannot be undone.",
    });
    setPendingAction(() => async () => {
      try {
        await authFetch(`/clients/${id}`, { method: "DELETE" });
        setClients((prev) => prev.filter((c) => c.id !== id));
        showToast("Client deleted.");
      } catch (err) {
        showErrorDialog("Delete Failed", err.message);
      }
    });
  };

  // ── delete machine — superadmin only ──────────────────────────────────────
  const handleDeleteMachine = (clientId, machineId) => {
    if (!canDeleteClients) {
      showErrorDialog(
        "Access Denied",
        "Only superadmins can delete machines. Contact your superadmin if you need this action performed."
      );
      return;
    }
    setConfirmDialog({
      open: true,
      title: "Delete machine?",
      message: "This will permanently remove the machine from this client's record. This cannot be undone.",
    });
    setPendingAction(() => async () => {
      try {
        await authFetch(`/clients/${clientId}/machines/${machineId}`, { method: "DELETE" });
        setClients((prev) =>
          prev.map((c) =>
            c.id === clientId
              ? { ...c, machines: c.machines.filter((m) => m.id !== machineId) }
              : c
          )
        );
        showToast("Machine removed.");
      } catch (err) {
        showErrorDialog("Delete Failed", err.message);
      }
    });
  };

  const handleCopySerial = (serial) => {
    navigator.clipboard.writeText(serial);
    showToast(`Copied: ${serial}`);
  };

  // ── export — admin / superadmin only ──────────────────────────────────────
  const handleExportCSV = () => {
    if (!canExportCSV) {
      showErrorDialog(
        "Access Denied",
        "Only administrators and superadmins can export data."
      );
      return;
    }
    exportClientsCSV(filteredClients.length ? filteredClients : clients);
    showToast("CSV exported.");
  };

  return {
    // stats
    totalClients: clients.length,
    totalMachines,
    maintenanceDueCount,

    // request state
    loading,
    error,
    refetchClients: fetchClients,

    // permissions (expose so UI can conditionally render buttons)
    canDeleteClients,
    canExportCSV,

    // confirm dialog
    confirmDialog,
    confirmAction,
    closeConfirmDialog,

    // error / info popup
    errorDialog,
    closeErrorDialog,

    // search / filter
    search,
    setSearch,
    filteredClients,

    // expand / collapse
    expanded,
    allExpanded,
    toggleAll,
    toggleExpand,

    // actions
    handleDeleteClient,
    handleDeleteMachine,
    handleCopySerial,
    handleExportCSV,

    // toast
    toast,
    setToast,
  };
};