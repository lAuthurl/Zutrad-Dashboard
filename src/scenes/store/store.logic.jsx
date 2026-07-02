import { useState, useMemo, useEffect, useRef } from "react";
import { hasPermission, isAdminOrSuper, isSuperAdmin } from "../../utils/auth";
import { formatDate } from "../../utils/dateFormat";
import { notifyStoreChanged } from "../../utils/eventbus";

const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:5000";

const authHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${localStorage.getItem("token")}`,
});

/* =========================================================================
   CONSTANTS
   ========================================================================= */

export const MACHINE_TYPES = ["Macsa ID", "Savema", "Sojet", "BestCode"];
export const ALL_TAB_INDEX = MACHINE_TYPES.length; // "All" tab sits after the machine tabs
export const LOW_STOCK_THRESHOLD = 2;

/* =========================================================================
   CSV EXPORT HELPERS
   ========================================================================= */

const escapeCsvCell = (val) => {
  const s = String(val ?? "");
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
};

const downloadCsv = (rows, filename) => {
  const headers = [
    "ID",
    "Serial Number",
    "Part Number",
    "Description",
    "Machine",
    "Quantity",
    "Last Updated",
  ];
  const lines = [
    headers.join(","),
    ...rows.map((r) =>
      [
        r.id ?? r._id,
        r.serialNumber,
        r.partNumber,
        r.machinePart,
        r.machine,
        r.quantity,
        formatDate(r.updatedAt),
      ]
        .map(escapeCsvCell)
        .join(",")
    ),
  ];
  const csvContent = lines.join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/* =========================================================================
   MAIN HOOK — all state, derived data, and event handlers for the page.
   The UI file just calls this and renders whatever it returns.
   ========================================================================= */

export const useStorePage = () => {
  // ---- permission flags ------------------------------------------------------
  // canAddPart / canAdjustQuantity: requires "store" permission (or superadmin)
  // canDelete: superadmin only
  // canExport: administrator or superadmin only
  const canAddPart = hasPermission("store");
  const canAdjustQuantity = hasPermission("store");
  const canDelete = isSuperAdmin();
  const canExport = isAdminOrSuper();

  // ---- raw state ----------------------------------------------------------
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [activeTab, setActiveTab] = useState(0);
  const [formOpen, setFormOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState({ open: false, title: "", message: "" });
  const confirmDialogAction = useRef(null);

  const [form, setForm] = useState({
    serialNumber: "",
    partNumber: "",
    machinePart: "",
    machine: MACHINE_TYPES[0],
    quantity: "",
  });

  // ---- error / access-denied dialog ------------------------------------------
  // Mirrors the pattern used on the Client Machines page: forms/buttons stay
  // visible to everyone, but opening/submitting them when unauthorized pops
  // this dialog instead of silently hiding the control.
  const [errorDialog, setErrorDialog] = useState({ open: false, title: "", message: "" });
  const closeErrorDialog = () => setErrorDialog({ open: false, title: "", message: "" });
  const showErrorDialog = (title, message) => setErrorDialog({ open: true, title, message });

  // Opens the Add Part form — guard runs against live permission state.
  const openFormIfAuthorised = () => {
    if (!canAddPart) {
      showErrorDialog(
        "Access Denied",
        "You don't have permission to add parts. Ask an administrator to grant you store access."
      );
      return;
    }
    setFormOpen(true);
  };

  // ---- fetch inventory on mount ---------------------------------------------
  const fetchItems = async () => {
    setLoading(true);
    setLoadError("");
    try {
      const res = await fetch(`${API_BASE}/store`, { headers: authHeaders() });
      if (!res.ok) throw new Error("Failed to load inventory.");
      const data = await res.json();
      setItems(data);
    } catch (err) {
      setLoadError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- tab state -----------------------------------------------------------
  const isAllTab = activeTab === ALL_TAB_INDEX;
  const currentMachineType = isAllTab ? null : MACHINE_TYPES[activeTab];

  const handleTabChange = (_, newTab) => {
    setActiveTab(newTab);
    if (newTab !== ALL_TAB_INDEX) {
      setForm((prev) => ({ ...prev, machine: MACHINE_TYPES[newTab] }));
    }
    setSearch("");
  };

  // ---- add-part form handlers -----------------------------------------------
  const handleFormChange = (e) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleAdd = async () => {
    if (!canAddPart) {
      showErrorDialog(
        "Access Denied",
        "You don't have permission to add parts. Ask an administrator to grant you store access."
      );
      return;
    }

    const { serialNumber, partNumber, machinePart, machine, quantity } = form;
    if (!serialNumber || !partNumber || !machinePart || !machine || quantity === "") {
      setFormErrorOrAlert("All fields are required.");
      return;
    }
    const qtyNum = Number(quantity);
    if (Number.isNaN(qtyNum) || qtyNum < 0) {
      setFormErrorOrAlert("Quantity must be a number that is 0 or greater.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/store`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          serialNumber,
          partNumber,
          machinePart,
          machine,
          quantity: qtyNum,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to add part.");

      setItems((prev) => [data, ...prev]);
      notifyStoreChanged();
      setForm({
        serialNumber: "",
        partNumber: "",
        machinePart: "",
        machine: MACHINE_TYPES[activeTab] ?? MACHINE_TYPES[0],
        quantity: "",
      });
      setFormOpen(false);
      setSuccessMsg("Part added to inventory.");
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err) {
      setFormErrorOrAlert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // small helper so validation/server errors still surface even though the
  // form has no dedicated inline error UI in this page (kept as alert() to
  // match original behavior; swap for setFormError state if you add one)
  const setFormErrorOrAlert = (msg) => alert(msg);

  // ---- quantity adjustment ---------------------------------------------------
  const adjustQuantity = async (id, delta) => {
    if (!canAdjustQuantity) {
      showErrorDialog(
        "Access Denied",
        "You don't have permission to adjust quantity. Ask an administrator to grant you store access."
      );
      return;
    }

    // optimistic update so the UI feels instant; rolled back on failure
    const prevItems = items;
    setItems((prev) =>
      prev.map((item) =>
        item._id === id
          ? { ...item, quantity: Math.max(0, item.quantity + delta) }
          : item
      )
    );

    try {
      const res = await fetch(`${API_BASE}/store/${id}/quantity`, {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify({ delta }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to update quantity.");
      setItems((prev) => prev.map((item) => (item._id === id ? data : item)));
      notifyStoreChanged();
    } catch (err) {
      setItems(prevItems); // rollback
      alert(err.message);
    }
  };

  // ---- delete --------------------------------------------------------------
  const handleDelete = (id) => {
    if (!canDelete) {
      showErrorDialog(
        "Access Denied",
        "Only superadmins can delete parts. Contact your superadmin if you need this action performed."
      );
      return;
    }

    setConfirmDialog({
      open: true,
      title: "Delete part?",
      message: "Delete this part from inventory?",
    });
    confirmDialogAction.current = async () => {
      try {
        const res = await fetch(`${API_BASE}/store/${id}`, {
          method: "DELETE",
          headers: authHeaders(),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Failed to delete part.");
        setItems((prev) => prev.filter((item) => item._id !== id));
        notifyStoreChanged();
        setSuccessMsg("Part deleted.");
        setTimeout(() => setSuccessMsg(""), 3000);
      } catch (err) {
        alert(err.message);
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

  // ---- derived data: summary counts (always across ALL items) ----------------
  const summary = useMemo(() => {
    const totalParts = items.length;
    const totalQuantity = items.reduce((sum, i) => sum + i.quantity, 0);
    const lowStockCount = items.filter((i) => i.quantity <= LOW_STOCK_THRESHOLD).length;
    return { totalParts, totalQuantity, lowStockCount };
  }, [items]);

  // ---- derived data: filtering by tab + search + low-stock toggle ------------
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return items.filter((item) => {
      const matchesMachine = isAllTab || item.machine === currentMachineType;
      const matchesSearch =
        !q ||
        item.machinePart.toLowerCase().includes(q) ||
        item.partNumber.toLowerCase().includes(q) ||
        item.serialNumber.toLowerCase().includes(q) ||
        item.machine.toLowerCase().includes(q);
      const matchesLowStock = !lowStockOnly || item.quantity <= LOW_STOCK_THRESHOLD;
      return matchesMachine && matchesSearch && matchesLowStock;
    });
  }, [items, isAllTab, currentMachineType, search, lowStockOnly]);

  // pre-format the date on the row itself, and give DataGrid an `id` field
  // since Mongo documents use `_id`
  const rows = useMemo(
    () =>
      filtered.map((item) => ({
        ...item,
        id: item._id,
        updatedAtDisplay: formatDate(item.updatedAt),
      })),
    [filtered]
  );

  // ---- export ----------------------------------------------------------------
  const handleExport = () => {
    if (!canExport) {
      showErrorDialog(
        "Access Denied",
        "Only administrators and superadmins can export data."
      );
      return;
    }
    if (filtered.length === 0) {
      alert("There's nothing to export with the current filters.");
      return;
    }
    const stamp = new Date().toISOString().slice(0, 10);
    const scope = isAllTab ? "all-machines" : currentMachineType.toLowerCase().replace(/\s+/g, "-");
    downloadCsv(filtered, `store-inventory-${scope}-${stamp}.csv`);
  };

  // ---- low-stock filter toggle -------------------------------------------------
  const toggleLowStockOnly = () => setLowStockOnly((v) => !v);
  const clearLowStockOnly = () => setLowStockOnly(false);

  // ---- public API returned to the UI component --------------------------------
  return {
    // data
    rows,
    filtered,
    summary,
    isAllTab,
    currentMachineType,
    loading,
    loadError,

    // tabs
    activeTab,
    handleTabChange,

    // form state + handlers
    formOpen,
    setFormOpen,
    openFormIfAuthorised,
    form,
    submitting,
    handleFormChange,
    handleAdd,

    // row actions
    adjustQuantity,
    handleDelete,

    // search
    search,
    setSearch,

    // low stock filter
    lowStockOnly,
    toggleLowStockOnly,
    clearLowStockOnly,

    // confirm dialog
    confirmDialog,
    closeConfirmDialog,
    submitConfirmDialog,

    // export
    handleExport,

    // feedback
    successMsg,

    // error / access-denied dialog
    errorDialog,
    closeErrorDialog,

    // permissions
    canAddPart,
    canAdjustQuantity,
    canDelete,
    canExport,
  };
};