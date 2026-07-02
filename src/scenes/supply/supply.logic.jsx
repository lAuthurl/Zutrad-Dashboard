// ─────────────────────────────────────────────────────────────────────────────
// useSupply.js  –  All state, derived values, handlers, and export utilities
//                  for the SupplyPage. No JSX lives here.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useMemo, useEffect, useRef } from "react";
import { mockDataClients } from "../../data/mockData";
import { hasPermission, isAdminOrSuper, isSuperAdmin } from "../../utils/auth";
import { notifySupplyChanged } from "../../utils/eventbus";
import PictureAsPdfOutlinedIcon from "@mui/icons-material/PictureAsPdfOutlined";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import TableChartOutlinedIcon from "@mui/icons-material/TableChartOutlined";
import InsertDriveFileOutlinedIcon from "@mui/icons-material/InsertDriveFileOutlined";

const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:5000";

// ── auth headers ──────────────────────────────────────────────────────────────
// IMPORTANT: never include Content-Type when sending FormData — the browser
// must set the multipart boundary itself or multer will reject the request.
const authBearer = () => ({
  Authorization: `Bearer ${localStorage.getItem("token")}`,
});

const authJson = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${localStorage.getItem("token")}`,
});

// ── safeJson ──────────────────────────────────────────────────────────────────
// Safely parses a fetch Response as JSON.  If the server returns HTML (e.g. a
// crash page, a 502 from a proxy, or multer not yet installed) `.json()` would
// normally throw "JSON.parse: unexpected character at line 1 column 1".
// This helper swallows that and returns a plain object instead so callers can
// always do `data.message` without crashing.
const safeJson = async (res) => {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    // Server returned non-JSON (HTML error page, plain-text, etc.)
    // Surface the raw text in development so it's easy to diagnose.
    console.error("[supply] Non-JSON response from server:", text.slice(0, 300));
    return { message: "Server returned an unexpected response. Check the backend console." };
  }
};

// ── export helpers ────────────────────────────────────────────────────────────

export const exportCSV = (rows) => {
  const headers = [
    "ID", "Goods Supplied", "Part Number", "Qty",
    "Client", "Supply Date", "Logged By", "Attachments",
  ];
  const data = rows.map((r) => [
    r.id ?? r._id,
    r.goodsSupplied,
    r.partNumber,
    r.quantity,
    r.client?.companyName ?? "",
    r.supplyDate,
    r.user ? `${r.user.firstName} ${r.user.surname}` : "",
    (r.attachments || []).map((f) => f.name).join("; "),
  ]);
  const content = [headers, ...data]
    .map((row) => row.map((v) => `"${v}"`).join(","))
    .join("\n");
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `zutrad_supply_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};

export const exportJSON = (rows) => {
  const serializable = rows.map((r) => ({
    ...r,
    attachments: (r.attachments || []).map((f) => f.name),
  }));
  const blob = new Blob([JSON.stringify(serializable, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `zutrad_supply_${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
};

// ── file-type icon resolver ───────────────────────────────────────────────────

export const fileIcon = (filename) => {
  const ext = (filename ?? "").split(".").pop()?.toLowerCase();
  if (ext === "pdf")                   return PictureAsPdfOutlinedIcon;
  if (ext === "doc" || ext === "docx") return DescriptionOutlinedIcon;
  if (ext === "xls" || ext === "xlsx") return TableChartOutlinedIcon;
  return InsertDriveFileOutlinedIcon;
};

// ── FORM INITIAL STATE ────────────────────────────────────────────────────────

const EMPTY_FORM = {
  goodsSupplied: "",
  partNumber: "",
  quantity: "",
  supplyDate: "",
  clientId: "",
};

// ── main hook ─────────────────────────────────────────────────────────────────

export const useSupply = () => {

  // ── permission flags ───────────────────────────────────────────────────────
  const canLogSupply = hasPermission("supply");
  const canDelete    = isSuperAdmin();
  const canExport    = isAdminOrSuper();
  const canDownload  = isAdminOrSuper(); // download attachments

  // ── core data ───────────────────────────────────────────────────────────────
  const [rows,        setRows]        = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [loadError,   setLoadError]   = useState("");
  const [selectedIds, setSelectedIds] = useState([]);

  // ── ui state ────────────────────────────────────────────────────────────────
  const [formOpen, setFormOpen] = useState(false);
  const [toast,    setToast]    = useState({ open: false, message: "", severity: "success" });

  // ── error / access-denied dialog ──────────────────────────────────────────
  const [errorDialog, setErrorDialog] = useState({ open: false, title: "", message: "" });
  const closeErrorDialog = () => setErrorDialog({ open: false, title: "", message: "" });
  const showErrorDialog  = (title, message) => setErrorDialog({ open: true, title, message });

  const [confirmDialog, setConfirmDialog] = useState({ open: false, title: "", message: "" });
  const confirmDialogAction = useRef(null);
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

  const openFormIfAuthorised = () => {
    if (!canLogSupply) {
      showErrorDialog(
        "Access Denied",
        "You don't have permission to log supply. Ask an administrator to grant you supply access."
      );
      return;
    }
    setFormOpen(true);
  };

  // ── download confirmation dialog ───────────────────────────────────────────
  const [downloadDialog, setDownloadDialog] = useState({ open: false, file: null });
  const closeDownloadDialog = () => setDownloadDialog({ open: false, file: null });

  const handleFileClick = (file) => {
    if (!canDownload) {
      showErrorDialog(
        "Access Denied",
        "Only administrators and superadmins can download attachments."
      );
      return;
    }
    setDownloadDialog({ open: true, file });
  };

  const handleDownloadConfirm = async () => {
    const { name, storedName } = downloadDialog.file ?? {};
    closeDownloadDialog();

    if (!storedName) {
      // Legacy entry saved before the file-upload feature was added —
      // it only has a display name, no stored file on disk.
      showErrorDialog(
        "File Not Available",
        "This attachment was logged before file uploads were enabled and has no stored file to download."
      );
      return;
    }

    try {
      const res = await fetch(
        `${API_BASE}/supply/files/${encodeURIComponent(storedName)}`,
        { headers: authBearer() }
      );

      if (!res.ok) {
        // Error responses from our API are JSON; guard with safeJson
        const body = await safeJson(res);
        throw new Error(body.message || `Download failed (${res.status}).`);
      }

      // Success — the response is the raw file binary, not JSON
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      a.download = name ?? storedName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      showErrorDialog("Download Failed", err.message);
    }
  };

  // ── filter state ────────────────────────────────────────────────────────────
  const [search,       setSearch]       = useState("");
  const [clientFilter, setClientFilter] = useState("all");

  // ── form state ──────────────────────────────────────────────────────────────
  const [form,        setForm]        = useState(EMPTY_FORM);
  const [formError,   setFormError]   = useState("");
  const [submitting,  setSubmitting]  = useState(false);
  const [attachments, setAttachments] = useState([]); // File[] from <input type="file">

  // ── toast helpers ──────────────────────────────────────────────────────────
  const showToast = (message, severity = "success") =>
    setToast({ open: true, message, severity });
  const closeToast = () => setToast((t) => ({ ...t, open: false }));

  // ── fetch supply rows on mount ──────────────────────────────────────────────
  const fetchRows = async () => {
    setLoading(true);
    setLoadError("");
    try {
      const res  = await fetch(`${API_BASE}/supply`, { headers: authBearer() });
      const data = await safeJson(res);
      if (!res.ok) throw new Error(data.message || "Failed to load supply log.");
      setRows(data);
    } catch (err) {
      setLoadError(err.message);
      showToast(err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRows();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── derived stats ─────────────────────────────────────────────────────────
  const totalQty      = rows.reduce((acc, r) => acc + (Number(r.quantity) || 0), 0);
  const uniqueClients = new Set(rows.map((r) => r.client?.id ?? r.client?._id)).size;

  // ── filtered rows ─────────────────────────────────────────────────────────
  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        r.goodsSupplied?.toLowerCase().includes(q) ||
        r.partNumber?.toLowerCase().includes(q) ||
        r.client?.companyName?.toLowerCase().includes(q) ||
        (r.user ? `${r.user.firstName} ${r.user.surname}` : "").toLowerCase().includes(q);
      const matchClient =
        clientFilter === "all" || String(r.client?.id ?? r.client?._id) === clientFilter;
      return matchSearch && matchClient;
    });
  }, [rows, search, clientFilter]);

  // ── form handlers ─────────────────────────────────────────────────────────

  const handleChange = (e) => {
    setFormError("");
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleFileChange = (e) => {
    setAttachments(Array.from(e.target.files || []));
  };

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setAttachments([]);
    setFormError("");
  };

  // ── submit — multipart/form-data so files are actually uploaded ────────────
  // DO NOT set Content-Type header — the browser sets it with the correct
  // multipart boundary automatically when the body is a FormData instance.
  // Setting it manually breaks multer's parser on the server.
  const handleSubmit = async () => {
    if (!canLogSupply) {
      showErrorDialog(
        "Access Denied",
        "You don't have permission to log supply. Ask an administrator to grant you supply access."
      );
      return;
    }

    const { goodsSupplied, partNumber, quantity, supplyDate, clientId } = form;
    if (!goodsSupplied.trim()) { setFormError("Goods Supplied is required."); return; }
    if (!partNumber.trim())    { setFormError("Part Number is required.");    return; }
    if (!quantity || Number(quantity) <= 0) { setFormError("Enter a valid quantity."); return; }
    if (!supplyDate)           { setFormError("Supply Date is required.");    return; }
    if (!clientId)             { setFormError("Please select a client.");     return; }

    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("goodsSupplied", goodsSupplied);
      fd.append("partNumber",    partNumber);
      fd.append("quantity",      quantity);
      fd.append("supplyDate",    supplyDate);
      fd.append("clientId",      clientId);
      // Append each File object under the key "files" — multer's
      // upload.array("files") picks them all up on the server side.
      attachments.forEach((file) => fd.append("files", file));

      const res  = await fetch(`${API_BASE}/supply`, {
        method:  "POST",
        headers: authBearer(), // no Content-Type — critical for multipart
        body:    fd,
      });
      const data = await safeJson(res);
      if (!res.ok) throw new Error(data.message || "Failed to add supply log.");

      setRows((prev) => [data, ...prev]);
      notifySupplyChanged();
      resetForm();
      setFormOpen(false);
      showToast("Supply log added successfully.");
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelForm = () => {
    setFormOpen(false);
    resetForm();
  };

  // ── delete handlers ───────────────────────────────────────────────────────

  const handleDelete = (id) => {
    if (!canDelete) {
      showErrorDialog(
        "Access Denied",
        "Only superadmins can delete entries. Contact your superadmin if you need this action performed."
      );
      return;
    }

    setConfirmDialog({
      open: true,
      title: "Delete supply entry?",
      message: "Delete this supply entry? This cannot be undone.",
    });
    confirmDialogAction.current = async () => {
      try {
        const res  = await fetch(`${API_BASE}/supply/${id}`, {
          method:  "DELETE",
          headers: authBearer(),
        });
        const data = await safeJson(res);
        if (!res.ok) throw new Error(data.message || "Failed to delete entry.");
        setRows((prev) => prev.filter((r) => r._id !== id));
        notifySupplyChanged();
        showToast("Entry deleted.");
      } catch (err) {
        showToast(err.message, "error");
      }
    };
  };

  const handleBulkDelete = () => {
    if (!canDelete) {
      showErrorDialog(
        "Access Denied",
        "Only superadmins can delete entries. Contact your superadmin if you need this action performed."
      );
      return;
    }

    setConfirmDialog({
      open: true,
      title: "Delete selected entries?",
      message: `Delete ${selectedIds.length} selected entries? This cannot be undone.`,
    });
    confirmDialogAction.current = async () => {
      try {
        const res  = await fetch(`${API_BASE}/supply/bulk-delete`, {
          method:  "POST",
          headers: authJson(),
          body:    JSON.stringify({ ids: selectedIds }),
        });
        const data = await safeJson(res);
        if (!res.ok) throw new Error(data.message || "Failed to delete entries.");
        setRows((prev) => prev.filter((r) => !selectedIds.includes(r._id)));
        notifySupplyChanged();
        showToast(data.message || `${selectedIds.length} entries deleted.`);
        setSelectedIds([]);
      } catch (err) {
        showToast(err.message, "error");
      }
    };
  };

  // ── clear filters ─────────────────────────────────────────────────────────
  const clearFilters = () => {
    setSearch("");
    setClientFilter("all");
  };

  // ── gated export handlers — admin/superadmin only ─────────────────────────
  const handleExportCSV = () => {
    if (!canExport) {
      showErrorDialog("Access Denied", "Only administrators and superadmins can export data.");
      return;
    }
    exportCSV(filteredRows);
  };

  const handleExportJSON = () => {
    if (!canExport) {
      showErrorDialog("Access Denied", "Only administrators and superadmins can export data.");
      return;
    }
    exportJSON(filteredRows);
  };

  // ── exposed API ───────────────────────────────────────────────────────────
  return {
    // data
    rows,
    filteredRows,
    selectedIds,
    setSelectedIds,
    loading,
    loadError,
    clients: mockDataClients,

    // stats
    totalQty,
    uniqueClients,

    // filters
    search,
    setSearch,
    clientFilter,
    setClientFilter,
    clearFilters,

    // form
    form,
    formOpen,
    setFormOpen,
    openFormIfAuthorised,
    formError,
    submitting,
    attachments,
    setAttachments,
    handleChange,
    handleFileChange,
    handleSubmit,
    handleCancelForm,

    // delete
    handleDelete,
    handleBulkDelete,
    confirmDialog,
    closeConfirmDialog,
    submitConfirmDialog,

    // export
    handleExportCSV,
    handleExportJSON,

    // file download
    handleFileClick,
    downloadDialog,
    closeDownloadDialog,
    handleDownloadConfirm,

    // toast
    toast,
    closeToast,

    // error / access-denied dialog
    errorDialog,
    closeErrorDialog,

    // permissions
    canLogSupply,
    canDelete,
    canExport,
    canDownload,
  };
};