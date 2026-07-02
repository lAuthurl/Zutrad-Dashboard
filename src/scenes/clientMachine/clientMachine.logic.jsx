import { useState, useEffect, useMemo, useCallback } from "react";
import { formatDate as formatDateUtil } from "../../utils/dateFormat";
import { getCurrentUser, getToken, isAdminOrSuper, isSuperAdmin, hasPermission } from "../../utils/auth";

const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:5000";

// ════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ════════════════════════════════════════════════════════════════════════════
export const MACHINE_TYPES = ["Macsa ID", "Savema", "Sojet", "BestCode"];
export const USAGE_STATUS  = ["main", "spare", "not in use"];

// ════════════════════════════════════════════════════════════════════════════
// PURE HELPERS
// ════════════════════════════════════════════════════════════════════════════
export const statusColor = (status, colors) => {
  if (status === "main")  return { bg: colors.greenAccent[700], text: colors.greenAccent[300] };
  if (status === "spare") return { bg: colors.blueAccent[700],  text: colors.blueAccent[200]  };
  return { bg: colors.grey[700], text: colors.grey[300] };
};

export const isMaintenanceDue = (dateStr, cycleMonths) => {
  if (!dateStr || !cycleMonths) return false;
  const dueDate = new Date(dateStr);
  dueDate.setMonth(dueDate.getMonth() + Number(cycleMonths));
  return (dueDate - new Date()) / (1000 * 60 * 60 * 24) <= 30;
};

export const formatDate = (str) => {
  if (!str) return "—";
  return formatDateUtil(str) || "—";
};

export const exportCSV = (allMachines) => {
  const headers = ["Serial", "Machine Type", "Client", "Line", "Installed", "Cycle (mo)", "Last Maintenance", "Status"];
  const rows = allMachines.map((m) => [
    m.serialNumber, m.machine, m.clientName, m.lineInstalled,
    m.installedDate, m.maintenanceCycle, m.lastMaintenanceDate, m.usageStatus,
  ]);
  const content = [headers, ...rows].map((r) => r.map((v) => `"${v ?? ""}"`).join(",")).join("\n");
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = `zutrad_machines_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};

// Mongo gives us `_id`; normalize to `id` so nothing downstream needs to
// know the data came from an API.
const normalizeClient = (c) => ({
  ...c,
  id: c._id ?? c.id,
  machines: (c.machines || []).map((m) => ({ ...m, id: m._id ?? m.id })),
});

// Attaches the JWT (if present) so protected routes on the backend
// (verifyToken / requireAdmin / requireSuperAdmin) actually see it.
const apiFetch = async (path, options = {}) => {
  const token = getToken();

  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || `Request failed (${res.status})`);
  }
  return res.status === 204 ? null : res.json();
};

// ════════════════════════════════════════════════════════════════════════════
// MACHINE CARD LOGIC
// Per-card edit state used by the card's inline edit form.
// ════════════════════════════════════════════════════════════════════════════
export const useMachineCardLogic = (machine, clientId, onSave) => {
  const [isEditing,   setIsEditing]   = useState(false);
  const [editValues,  setEditValues]  = useState({
    lastMaintenanceDate: machine.lastMaintenanceDate,
    usageStatus:         machine.usageStatus,
  });

  const handleSave = () => {
    onSave(clientId, machine.id, editValues);
    setIsEditing(false);
  };

  return { isEditing, setIsEditing, editValues, setEditValues, handleSave };
};

// ════════════════════════════════════════════════════════════════════════════
// CLIENT MACHINES PAGE LOGIC
// ════════════════════════════════════════════════════════════════════════════
export const useClientMachinesLogic = () => {
  // ── current user — held in state so permission flags stay reactive.
  //    Re-read on mount and on any storage event (login / logout in
  //    another tab). Same-tab login should call setCurrentUser() directly
  //    or dispatch a storage event after writing to localStorage.
  //    The value itself isn't read below — isAdminOrSuper/isSuperAdmin/
  //    hasPermission each read localStorage fresh via utils/auth — this
  //    state exists purely to force a re-render when the stored user
  //    changes, so those calls recompute with the latest data.
  const [, setCurrentUser] = useState(() => getCurrentUser());

  useEffect(() => {
    const onStorage = () => setCurrentUser(getCurrentUser());
    window.addEventListener("storage", onStorage);
    setCurrentUser(getCurrentUser());
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // ── permission flags ────────────────────────────────────────────────────
  // Register machine: "store" permission OR admin/superadmin
  const userCanRegisterMachine = isAdminOrSuper() || hasPermission("store");
  // Edit machine: "store" permission OR admin/superadmin
  const userCanEditMachine     = isAdminOrSuper() || hasPermission("store");
  // Delete machine: superadmin only
  const userCanDeleteMachine   = isSuperAdmin();
  // Export CSV: admin or superadmin only
  const userCanExportCSV       = isAdminOrSuper();

  // ── data state ─────────────────────────────────────────────────────────────
  const [clients,      setClients]      = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState(null);
  const [formOpen,     setFormOpen]     = useState(false);
  const [search,       setSearch]       = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [clientFilter, setClientFilter] = useState("all");
  const [viewMode,     setViewMode]     = useState("cards"); // "cards" | "table"
  const [toast,        setToast]        = useState({ open: false, message: "", severity: "success" });
  const [formError,    setFormError]    = useState("");

  const [form, setForm] = useState({
    serialNumber: "", clientId: "", lineInstalled: "", machine: "",
    installedDate: "", maintenanceCycle: "", usageStatus: "main",
  });

  const showToast = (message, severity = "success") =>
    setToast({ open: true, message, severity });

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

  // ── fetch ──────────────────────────────────────────────────────────────────
  const fetchClients = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch("/clients");
      setClients(data.map(normalizeClient));
      setError(null);
    } catch (err) {
      setError(err.message);
      showErrorDialog("Failed to Load Data", err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchClients(); }, [fetchClients]);

  // ── derived: flatten all machines ─────────────────────────────────────────
  const allMachines = useMemo(() =>
    clients.flatMap((c) =>
      c.machines.map((m) => ({ ...m, clientId: c.id, clientName: c.companyName }))
    ), [clients]);

  const maintenanceDueCount = allMachines.filter(
    (m) => isMaintenanceDue(m.lastMaintenanceDate, m.maintenanceCycle)
  ).length;

  // ── derived: filtered lists ────────────────────────────────────────────────
  const filteredClients = useMemo(() =>
    clients
      .map((c) => ({
        ...c,
        machines: c.machines.filter((m) => {
          const q = search.toLowerCase();
          const matchSearch =
            !q ||
            m.serialNumber.toLowerCase().includes(q) ||
            m.machine.toLowerCase().includes(q) ||
            c.companyName.toLowerCase().includes(q);
          const matchStatus = statusFilter === "all" || m.usageStatus === statusFilter;
          const matchClient = clientFilter === "all" || String(c.id) === clientFilter;
          return matchSearch && matchStatus && matchClient;
        }),
      }))
      .filter((c) => c.machines.length > 0),
    [clients, search, statusFilter, clientFilter]
  );

  const filteredFlat = useMemo(() =>
    filteredClients.flatMap((c) =>
      c.machines.map((m) => ({ ...m, clientId: c.id, clientName: c.companyName }))
    ), [filteredClients]);

  // ── form ───────────────────────────────────────────────────────────────────
  const handleFormChange = (e) => {
    setFormError("");
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const resetForm = () => {
    setForm({
      serialNumber: "", clientId: "", lineInstalled: "", machine: "",
      installedDate: "", maintenanceCycle: "", usageStatus: "main",
    });
    setFormError("");
  };

  // Opens the register form — guard runs against live state, not a stale flag.
  const openFormIfAuthorised = () => {
    if (!userCanRegisterMachine) {
      showErrorDialog(
        "Access Denied",
        "You don't have permission to register machines. Ask an administrator to grant you store access."
      );
      return;
    }
    setFormOpen(true);
  };

  // ── register machine — store permission or admin/superadmin ───────────────
  const handleAddMachine = async () => {
    if (!userCanRegisterMachine) {
      showErrorDialog(
        "Access Denied",
        "You don't have permission to register machines. Ask an administrator to grant you store access."
      );
      return;
    }

    const { serialNumber, clientId, lineInstalled, machine, installedDate, maintenanceCycle } = form;
    if (!serialNumber.trim())                          { setFormError("Serial number is required.");       return; }
    if (!clientId)                                     { setFormError("Please select a client.");          return; }
    if (!machine)                                      { setFormError("Please select a machine type.");    return; }
    if (!lineInstalled || Number(lineInstalled) < 1)   { setFormError("Enter a valid line number.");       return; }
    if (!installedDate)                                { setFormError("Installation date is required.");   return; }
    if (!maintenanceCycle || Number(maintenanceCycle) < 1) { setFormError("Enter a valid maintenance cycle."); return; }

    const newMachine = {
      serialNumber,
      machine,
      lineInstalled:       Number(lineInstalled),
      installedDate,
      maintenanceCycle:    Number(maintenanceCycle),
      lastMaintenanceDate: installedDate,
      usageStatus:         form.usageStatus,
    };

    try {
      const updatedClient = await apiFetch(`/clients/${clientId}/machines`, {
        method: "POST",
        body:   JSON.stringify(newMachine),
      });
      const normalized = normalizeClient(updatedClient);
      setClients((prev) => prev.map((c) => (c.id === normalized.id ? normalized : c)));
      resetForm();
      setFormOpen(false);
      showToast("Machine registered successfully.");
    } catch (err) {
      setFormError(err.message);
    }
  };

  // ── delete machine — superadmin only ──────────────────────────────────────
  const handleDelete = (clientId, machineId) => {
    if (!userCanDeleteMachine) {
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
        await apiFetch(`/clients/${clientId}/machines/${machineId}`, { method: "DELETE" });
        setClients((prev) =>
          prev.map((c) =>
            c.id === clientId
              ? { ...c, machines: c.machines.filter((m) => m.id !== machineId) }
              : c
          )
        );
        showToast("Machine deleted.");
      } catch (err) {
        showErrorDialog("Delete Failed", err.message);
      }
    });
  };

  // ── edit / save machine — store permission or admin/superadmin ────────────
  const handleSave = async (clientId, machineId, editValues) => {
    if (!userCanEditMachine) {
      showErrorDialog(
        "Access Denied",
        "You don't have permission to edit machines. Ask an administrator to grant you store access."
      );
      return;
    }
    try {
      const updatedClient = await apiFetch(`/clients/${clientId}/machines/${machineId}`, {
        method: "PUT",
        body:   JSON.stringify(editValues),
      });
      const normalized = normalizeClient(updatedClient);
      setClients((prev) => prev.map((c) => (c.id === normalized.id ? normalized : c)));
      showToast("Machine updated.");
    } catch (err) {
      showErrorDialog("Update Failed", err.message);
    }
  };

  const handleCopySerial = (serial) => {
    navigator.clipboard.writeText(serial);
    showToast(`Copied: ${serial}`);
  };

  // ── export — admin / superadmin only ──────────────────────────────────────
  const handleExportCSV = () => {
    if (!userCanExportCSV) {
      showErrorDialog(
        "Access Denied",
        "Only administrators and superadmins can export data."
      );
      return;
    }
    exportCSV(filteredFlat.length ? filteredFlat : allMachines);
    showToast("CSV exported.");
  };

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setClientFilter("all");
  };

  return {
    // data
    clients,
    allMachines,
    maintenanceDueCount,
    filteredClients,
    filteredFlat,

    // request state
    loading,
    error,
    refetchClients: fetchClients,

    // permissions (expose so UI can show/hide/disable buttons correctly)
    userCanRegisterMachine,
    userCanEditMachine,
    userCanDeleteMachine,
    userCanExportCSV,

    // search / filters / view
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    clientFilter,
    setClientFilter,
    viewMode,
    setViewMode,
    clearFilters,

    // register form
    formOpen,
    setFormOpen,
    openFormIfAuthorised,
    form,
    formError,
    setFormError,
    handleFormChange,
    handleAddMachine,

    // confirm dialog
    confirmDialog,
    confirmAction,
    closeConfirmDialog,

    // error / info popup
    errorDialog,
    closeErrorDialog,

    // actions
    handleDelete,
    handleSave,
    handleCopySerial,
    handleExportCSV,

    // toast
    toast,
    setToast,
  };
};