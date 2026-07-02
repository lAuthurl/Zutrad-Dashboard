import { useState, useMemo, useEffect, useRef } from "react";
import { formatDate } from "../../utils/dateFormat";
import { getCurrentUser, getToken, hasPermission, isAdminOrSuper, isSuperAdmin } from "../../utils/auth";
import { notifyReportsChanged } from "../../utils/eventbus";

const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:5000";

const authHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${getToken()}`,
});

/* =========================================================================
   CONFIG
   ========================================================================= */

// Real logged-in user/role, read from localStorage (set by useLogin.js on
// successful login).
export const CURRENT_USER = getCurrentUser();
export const CURRENT_ROLE = CURRENT_USER?.role ?? null;

export const STATUS_TABS = ["all", "pending", "approved", "rejected"];

/* =========================================================================
   STATUS STYLING HELPERS — colors/icons keyed by report status.
   ========================================================================= */

export const statusStyles = (status, colors) => {
  if (status === "approved") return { bg: colors.greenAccent[700], text: colors.greenAccent[300], border: colors.greenAccent[600] };
  if (status === "rejected") return { bg: colors.redAccent[700], text: colors.redAccent[300], border: colors.redAccent[500] };
  return { bg: colors.blueAccent[700], text: colors.blueAccent[200], border: colors.blueAccent[500] };
};

export const getStatusIcon = (status, iconMap) => {
  if (status === "approved") return iconMap.approved;
  if (status === "rejected") return iconMap.rejected;
  return iconMap.pending;
};

export const getTabColor = (tab, colors) => {
  if (tab === "pending") return colors.blueAccent[400];
  if (tab === "approved") return colors.greenAccent[400];
  if (tab === "rejected") return colors.redAccent[400];
  return colors.grey[300];
};

/* =========================================================================
   NORMALIZATION — Mongo gives us `_id`; the UI (and CSV export) expect
   `id`. Without this, every report.id reference in ReportsPage.jsx
   (card key, delete/approve/reject handlers) is undefined.
   ========================================================================= */

const normalizeReport = (r) => ({ ...r, id: r._id ?? r.id });

// Same normalization for clients, so the create-report form's clientId
// dropdown submits a real Mongo _id instead of an array index — sending
// a numeric index caused "Cast to ObjectId failed" errors on the backend
// (see resolveClientReference in reports.js), since mock data used
// small numeric ids (1, 2, 3…) that don't correspond to real documents.
const normalizeClient = (c) => ({ ...c, id: c._id ?? c.id });

/* =========================================================================
   CSV EXPORT
   ========================================================================= */

export const exportReportsCSV = (reports) => {
  const headers = ["ID", "Client", "Line", "Filed By", "Date", "Status", "Details"];
  const rows = reports.map((r) => [
    r.id ?? r._id,
    r.client?.companyName ?? "",
    r.lineNumber,
    r.user ? `${r.user.firstName} ${r.user.surname}` : "",
    formatDate(r.createdAt),
    r.status,
    r.reportDetails.replace(/"/g, '""'),
  ]);
  const content = [headers, ...rows].map((r) => r.map((v) => `"${v}"`).join(",")).join("\n");
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `zutrad_reports_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};

/* =========================================================================
   MAIN HOOK
   ========================================================================= */

export const useReportsPage = () => {
  // ── permission flags ───────────────────────────────────────────────────────
  // canCreateReport: requires "reports" permission (or superadmin)
  // canModerate: administrator or superadmin only (approve / reject)
  // canExport: administrator or superadmin only
  // canDelete: superadmin only
  const canCreateReport = hasPermission("reports");
  const canModerate = isAdminOrSuper();
  const canExport = isAdminOrSuper();
  const canDelete = isSuperAdmin();

  // ---- raw state ----------------------------------------------------------
  const [reports, setReports] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [formOpen, setFormOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [toast, setToast] = useState({ open: false, message: "", severity: "success" });

  // ── error / access-denied dialog ──────────────────────────────────────────
  // Same pattern as Client Machines: controls stay visible to everyone,
  // opening/submitting when unauthorized pops this dialog.
  const [errorDialog, setErrorDialog] = useState({ open: false, title: "", message: "" });
  const closeErrorDialog = () => setErrorDialog({ open: false, title: "", message: "" });
  const showErrorDialog = (title, message) => setErrorDialog({ open: true, title, message });

  const openFormIfAuthorised = () => {
    if (!canCreateReport) {
      showErrorDialog(
        "Access Denied",
        "You don't have permission to create reports. Ask an administrator to grant you reports access."
      );
      return;
    }
    setFormOpen(true);
  };

  // rejection dialog
  const [rejectDialog, setRejectDialog] = useState({ open: false, reportId: null, reason: "" });
  const [confirmDialog, setConfirmDialog] = useState({ open: false, title: "", message: "" });
  const confirmDialogAction = useRef(null);

  const [form, setForm] = useState({ reportDetails: "", lineNumber: "", clientId: "" });
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // ---- toast helpers -------------------------------------------------------
  const showToast = (message, severity = "success") =>
    setToast({ open: true, message, severity });

  const closeToast = () => setToast((t) => ({ ...t, open: false }));

  // ---- fetch reports + clients on mount --------------------------------------
  // Both requests run in parallel. Clients now come from the real API
  // instead of mockDataClients, so the create-report form's dropdown
  // always submits a genuine Mongo _id.
  const fetchReports = async () => {
    setLoading(true);
    setLoadError("");
    try {
      const [reportsRes, clientsRes] = await Promise.all([
        fetch(`${API_BASE}/reports`, { headers: authHeaders() }),
        fetch(`${API_BASE}/clients`, { headers: authHeaders() }),
      ]);

      if (!reportsRes.ok) throw new Error("Failed to load reports.");
      const reportsData = await reportsRes.json();
      setReports(reportsData.map(normalizeReport));

      if (clientsRes.ok) {
        const clientsData = await clientsRes.json();
        setClients(clientsData.map(normalizeClient));
      } else {
        setClients([]);
      }
    } catch (err) {
      setLoadError(err.message);
      showToast(err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- derived data: status counts -----------------------------------------
  const counts = useMemo(() => ({
    all: reports.length,
    pending: reports.filter((r) => r.status === "pending").length,
    approved: reports.filter((r) => r.status === "approved").length,
    rejected: reports.filter((r) => r.status === "rejected").length,
  }), [reports]);

  // ---- derived data: search + tab filtering --------------------------------
  const filtered = useMemo(() => {
    return reports.filter((r) => {
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        r.client?.companyName?.toLowerCase().includes(q) ||
        r.reportDetails?.toLowerCase().includes(q) ||
        (r.user ? `${r.user.firstName} ${r.user.surname}` : "").toLowerCase().includes(q);
      const matchTab = activeTab === "all" || r.status === activeTab;
      return matchSearch && matchTab;
    });
  }, [reports, search, activeTab]);

  const clearFilters = () => {
    setSearch("");
    setActiveTab("all");
  };

  // ---- create-report form handlers -----------------------------------------
  const handleChange = (e) => {
    setFormError("");
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const resetForm = () => {
    setForm({ reportDetails: "", lineNumber: "", clientId: "" });
    setFormError("");
  };

  const handleCancelForm = () => {
    setFormOpen(false);
    resetForm();
  };

  const handleSubmit = async () => {
    if (!canCreateReport) {
      showErrorDialog(
        "Access Denied",
        "You don't have permission to create reports. Ask an administrator to grant you reports access."
      );
      return;
    }

    const { reportDetails, lineNumber, clientId } = form;
    if (!reportDetails.trim()) { setFormError("Report details are required."); return; }
    if (!clientId) { setFormError("Please select a client."); return; }
    if (!lineNumber) { setFormError("Line number is required."); return; }

    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/reports`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          reportDetails,
          lineNumber: Number(lineNumber),
          clientId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to submit report.");

      setReports((prev) => [normalizeReport(data), ...prev]);
      // A new report always starts "pending", so this always affects the
      // sidebar's pending-report badge — broadcast so it stays in sync.
      notifyReportsChanged();
      resetForm();
      setFormOpen(false);
      showToast("Report submitted successfully.");
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // ---- status action handlers ----------------------------------------------
  const handleApprove = async (id) => {
    if (!canModerate) {
      showErrorDialog(
        "Access Denied",
        "Only administrators and superadmins can approve reports."
      );
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/reports/${id}/approve`, {
        method: "PATCH",
        headers: authHeaders(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to approve report.");
      const normalized = normalizeReport(data);
      setReports((prev) => prev.map((r) => (r.id === id ? normalized : r)));
      // Status changed away from "pending" — sidebar badge needs to shrink.
      notifyReportsChanged();
      showToast("Report approved.");
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  const openRejectDialog = (id) => {
    if (!canModerate) {
      showErrorDialog(
        "Access Denied",
        "Only administrators and superadmins can reject reports."
      );
      return;
    }
    setRejectDialog({ open: true, reportId: id, reason: "" });
  };

  const closeRejectDialog = () =>
    setRejectDialog({ open: false, reportId: null, reason: "" });

  const setRejectReason = (reason) =>
    setRejectDialog((d) => ({ ...d, reason }));

  const handleReject = async () => {
    if (!canModerate) {
      showErrorDialog(
        "Access Denied",
        "Only administrators and superadmins can reject reports."
      );
      closeRejectDialog();
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/reports/${rejectDialog.reportId}/reject`, {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify({ reason: rejectDialog.reason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to reject report.");
      const normalized = normalizeReport(data);
      setReports((prev) => prev.map((r) => (r.id === rejectDialog.reportId ? normalized : r)));
      // Status changed away from "pending" — sidebar badge needs to shrink.
      notifyReportsChanged();
      closeRejectDialog();
      showToast("Report rejected.", "warning");
    } catch (err) {
      closeRejectDialog();
      showToast(err.message, "error");
    }
  };

  const handleDelete = (id) => {
    if (!canDelete) {
      showErrorDialog(
        "Access Denied",
        "Only superadmins can delete reports. Contact your superadmin if you need this action performed."
      );
      return;
    }

    setConfirmDialog({
      open: true,
      title: "Delete report?",
      message: "Delete this report? This cannot be undone.",
    });
    confirmDialogAction.current = async () => {
      try {
        const res = await fetch(`${API_BASE}/reports/${id}`, {
          method: "DELETE",
          headers: authHeaders(),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Failed to delete report.");
        setReports((prev) => prev.filter((r) => r.id !== id));
        // Deleting a pending report also needs to shrink the sidebar badge.
        notifyReportsChanged();
        showToast("Report deleted.");
      } catch (err) {
        showToast(err.message, "error");
      }
    };
  };

  const closeConfirmDialog = () => {
    setConfirmDialog({ open: false, title: "", message: "" });
    confirmDialogAction.current = null;
  };

  const submitConfirmDialog = async () => {
    if (confirmDialogAction.current) {
      await confirmDialogAction.current();
    }
    closeConfirmDialog();
  };

  // ---- gated export handler — admin/superadmin only -------------------------
  const handleExport = () => {
    if (!canExport) {
      showErrorDialog(
        "Access Denied",
        "Only administrators and superadmins can export data."
      );
      return;
    }
    exportReportsCSV(filtered);
  };

  // ---- public API returned to the UI component -----------------------------
  return {
    // data
    reports,
    filtered,
    counts,
    clients,
    loading,
    loadError,

    // search/tab filter state
    search,
    setSearch,
    activeTab,
    setActiveTab,
    clearFilters,

    // create-report form
    formOpen,
    setFormOpen,
    openFormIfAuthorised,
    form,
    formError,
    submitting,
    handleChange,
    handleSubmit,
    handleCancelForm,

    // status actions
    handleApprove,
    handleDelete,

    // confirm dialog
    confirmDialog,
    closeConfirmDialog,
    submitConfirmDialog,

    // reject dialog
    rejectDialog,
    openRejectDialog,
    closeRejectDialog,
    setRejectReason,
    handleReject,

    // export
    handleExport,

    // toast
    toast,
    closeToast,

    // error / access-denied dialog
    errorDialog,
    closeErrorDialog,

    // permissions
    canCreateReport,
    canModerate,
    canExport,
    canDelete,
  };
};