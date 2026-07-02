import { useState, useEffect } from "react";
// Reuse the same maintenance status rules used by the maintenance page so
// the dashboard cannot drift from the source-of-truth data.
import { getLogStatus } from "../maintenance/maintenance.logic";
import { formatDate, formatDateTime } from "../../utils/dateFormat";

// ════════════════════════════════════════════════════════════════════════════
// API CONSTANTS
// ════════════════════════════════════════════════════════════════════════════
const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:5000";

const authHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${localStorage.getItem("token")}`,
});

// ════════════════════════════════════════════════════════════════════════════
// PERMISSION HELPERS — same pattern as clientMachine.logic.js /
// userManagement.logic.js. Never cached at module level, so this always
// reflects the latest login state.
// ════════════════════════════════════════════════════════════════════════════
const readUserFromStorage = () => {
  try {
    return JSON.parse(localStorage.getItem("user")) ?? null;
  } catch {
    return null;
  }
};

const isAdminOrAbove = (role) => role === "administrator" || role === "superadmin";

// ════════════════════════════════════════════════════════════════════════════
// STATUS COLOR HELPERS
// ════════════════════════════════════════════════════════════════════════════
export const statusColor = (status, colors) => {
  if (status === "approved" || status === "logged") return colors.greenAccent[500];
  if (status === "pending") return colors.blueAccent[400];
  if (status === "rejected") return colors.redAccent[400];
  return colors.grey[400];
};

export const statusTextColor = (status, colors) => {
  if (status === "approved" || status === "logged") return colors.primary[900];
  if (status === "pending") return colors.primary[900];
  if (status === "rejected") return "#fff";
  return colors.primary[900];
};

// ════════════════════════════════════════════════════════════════════════════
// CSV EXPORT
// ════════════════════════════════════════════════════════════════════════════
const escapeCSV = (val) => {
  const str = String(val ?? "");
  return str.includes(",") || str.includes('"') || str.includes("\n")
    ? `"${str.replace(/"/g, '""')}"`
    : str;
};

const toCSVRow = (cols) => cols.map(escapeCSV).join(",");

export const handleExport = (recentActivity, upcomingMaintenance, dashboardStats) => {
  const now = new Date();
  const dateStr = formatDate(now);
  const timeStr = formatDateTime(now).split(" ").pop();

  const sections = [
    // Meta
    toCSVRow(["ZUTRAD VENTURES DASHBOARD REPORT"]),
    toCSVRow([`Generated: ${dateStr} at ${timeStr}`]),
    "",
    // Summary
    toCSVRow(["SUMMARY"]),
    toCSVRow(["Metric", "Value"]),
    toCSVRow(["Active Clients", dashboardStats.totalClients]),
    toCSVRow(["Machines Tracked", dashboardStats.totalMachines]),
    toCSVRow(["Pending Reports", dashboardStats.pendingReports]),
    toCSVRow(["Upcoming Maintenance", dashboardStats.pendingMaintenance]),
    toCSVRow(["Low Stock Items", dashboardStats.storeItemsLow]),
    "",
    // Recent Activity
    toCSVRow(["RECENT ACTIVITY"]),
    toCSVRow(["ID", "Description", "Client", "Date", "Status"]),
    ...recentActivity.map((item) =>
      toCSVRow([item.id, item.description, item.client, item.date, item.status])
    ),
    "",
    // Upcoming Maintenance
    toCSVRow(["UPCOMING MAINTENANCE"]),
    toCSVRow(["Machine", "Due Date", "Client", "Notes"]),
    ...upcomingMaintenance.map((task) =>
      toCSVRow([task.machine, task.maintenanceDay, task.client?.companyName || "", task.message])
    ),
  ];

  const blob = new Blob([sections.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `dashboard-report-${now.toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};

export const getUpcomingMaintenanceItems = (maintenanceLogs = [], clients = [], today = new Date()) => {
  const enrichedLogs = maintenanceLogs.map((log) => ({
    ...log,
    status: getLogStatus(log),
  }));

  return enrichedLogs
    .filter((log) => log.status === "pending" || log.status === "overdue")
    .sort((a, b) => new Date(a.maintenanceDay) - new Date(b.maintenanceDay))
    .slice(0, 5)
    .map((log) => {
      const client = clients.find((candidate) => String(candidate.id) === String(log.client?.id));
      return {
        id: log.id,
        machine: log.machine || "Unknown",
        maintenanceDay: formatDate(log.maintenanceDay),
        client: log.client || null,
        clientName: client?.companyName || log.client?.companyName || "Unknown Client",
        message: log.message || (log.status === "overdue" ? "Maintenance overdue" : "Maintenance due"),
        status: log.status,
      };
    });
};

// ════════════════════════════════════════════════════════════════════════════
// DASHBOARD LOGIC
// Fetches dashboard data from the backend and provides stats, activity,
// and maintenance data for the dashboard view.
//
// IMPORTANT: "upcoming maintenance" here is now derived from the SAME
// /maintenance log collection and the SAME getLogStatus() logic that
// MaintenancePage uses. Previously this hook recalculated due dates itself
// from each machine's lastMaintenanceDate + maintenanceCycle, which is a
// different (and easily out-of-sync) source of truth — e.g. marking a task
// done on MaintenancePage updates the log, not the machine record, so the
// dashboard never found out. That's almost certainly why the two screens
// disagreed.
//
// EXPORT ACCESS: gated to administrators/superadmins, same rule as CSV
// export on the Client Machines page. Everyone can still view the
// dashboard; only the "Export Report" action is restricted.
// ════════════════════════════════════════════════════════════════════════════
export const useDashboardLogic = () => {
  // ── current user — held in state so permission flags stay reactive.
  //    Re-read on mount and on any storage event (login/logout in another
  //    tab), same pattern as clientMachine.logic.js.
  const [currentUser, setCurrentUser] = useState(() => readUserFromStorage());

  useEffect(() => {
    const onStorage = () => setCurrentUser(readUserFromStorage());
    window.addEventListener("storage", onStorage);
    setCurrentUser(readUserFromStorage());
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const role = currentUser?.role ?? null;
  const userCanExportReport = isAdminOrAbove(role);

  const [stats, setStats] = useState({
    totalClients: 0,
    totalMachines: 0,
    pendingReports: 0,
    pendingMaintenance: 0,
    storeItemsLow: 0,
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const [upcomingMaintenance, setUpcomingMaintenance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // ── error / info popup — same shape as clientMachine.logic.js, used
  //    here for the "Access Denied" export message ──────────────────────────
  const [errorDialog, setErrorDialog] = useState({ open: false, title: "", message: "" });
  const closeErrorDialog = () => setErrorDialog({ open: false, title: "", message: "" });
  const showErrorDialog = (title, message) => setErrorDialog({ open: true, title, message });

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // Fetch clients (includes embedded machines, used only for counts now)
      const clientRes = await fetch(`${API_BASE}/clients`, { headers: authHeaders() });
      const clients = clientRes.ok ? await clientRes.json() : [];

      // Fetch reports
      const reportRes = await fetch(`${API_BASE}/reports`, { headers: authHeaders() });
      const reports = reportRes.ok ? await reportRes.json() : [];

      // Fetch supply
      const supplyRes = await fetch(`${API_BASE}/supply`, { headers: authHeaders() });
      const supply = supplyRes.ok ? await supplyRes.json() : [];

      // Fetch maintenance logs — same endpoint MaintenancePage uses, so
      // counts and status here can never drift from what's shown there.
      const maintenanceRes = await fetch(`${API_BASE}/maintenance`, { headers: authHeaders() });
      const maintenanceLogs = maintenanceRes.ok ? await maintenanceRes.json() : [];

      // Total machines is still derived from clients' embedded machines —
      // that's just a count, no status logic involved.
      const totalMachines = clients.reduce(
        (sum, client) => sum + (client.machines?.length || 0),
        0
      );

      const pendingReports = reports.filter((r) => r.status === "pending").length;
      const dueLogs = getUpcomingMaintenanceItems(maintenanceLogs, clients);

      setStats({
        totalClients: clients.length,
        totalMachines,
        pendingReports,
        pendingMaintenance: dueLogs.length,
        storeItemsLow: 0, // This would require inventory data from backend
      });

      // Build recent activity from reports and supply logs
      const activities = [
        ...reports.slice(0, 3).map((r) => ({
          id: r.id,
          description: `Report: ${r.reportDetails.substring(0, 50)}...`,
          client: r.client?.companyName || "Unknown",
          date: formatDate(r.createdAt),
          status: r.status,
        })),
        ...supply.slice(0, 2).map((s) => ({
          id: `Supply: ${s.goodsSupplied}`,
          description: `${s.goodsSupplied} delivered to ${s.client?.companyName || "Unknown"}`,
          client: s.client?.companyName || "Unknown",
          date: formatDate(s.supplyDate),
          status: "logged",
        })),
      ].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5);

      setRecentActivity(activities);

      // Upcoming maintenance: pull straight from the logs, sorted soonest
      // first, overdue items naturally sort to the top since their due
      // date is in the past.
      setUpcomingMaintenance(dueLogs);

      setError("");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── export — admin / superadmin only ──────────────────────────────────────
  // Same guard pattern as handleExportCSV in clientMachine.logic.js: check
  // live permission state before doing anything, show the same-shaped
  // "Access Denied" dialog rather than exporting for unauthorized roles.
  const exportReport = () => {
    if (!userCanExportReport) {
      showErrorDialog(
        "Access Denied",
        "Only administrators and superadmins can export the dashboard report."
      );
      return;
    }
    handleExport(recentActivity, upcomingMaintenance, stats);
  };

  return {
    stats,
    recentActivity,
    upcomingMaintenance,
    exportReport,
    refetch: fetchDashboardData,
    loading,
    error,

    // permissions (expose so UI can grey out / tooltip the button correctly)
    userCanExportReport,

    // error / info popup
    errorDialog,
    closeErrorDialog,
  };
};