import { useEffect, useState } from "react";
import { getSettings } from "../../utils/settings";
import { formatDate } from "../../utils/dateFormat";

const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:5000";

const authHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${localStorage.getItem("token")}`,
});

/* =========================================================================
   TIME HELPER
   ========================================================================= */

export const getTimeAgo = (dateString, dateFormat = "DD/MM/YYYY") => {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return formatDate(date, dateFormat);
};

/* =========================================================================
   CURRENT USER — same pattern used across the other logic files.
   ========================================================================= */

export const readUserFromStorage = () => {
  try {
    return JSON.parse(localStorage.getItem("user")) ?? null;
  } catch {
    return null;
  }
};

// Fired whenever this user's read/dismissed state changes (mark read, mark
// all read, dismiss). Anything else that shows a notification count for the
// same user — the Topbar badge, for instance — can listen for this instead
// of polling, and gets the freshly computed unread count in event.detail.
export const NOTIFICATIONS_UPDATED_EVENT = "ztrd:notifications-updated";

/* =========================================================================
   PER-USER READ/DISMISSED STATE
   Notifications themselves are synthesized fresh from shared data on every
   load (reports, maintenance, supply, etc.) — they aren't rows in a
   notifications table. So "marking as read" or "dismissing" can't live on
   the notification itself; instead we keep a small per-user set of IDs in
   localStorage, keyed to that user's id, and re-apply it whenever the feed
   is rebuilt. Two different users on the same browser (or the same user on
   two devices) never share this — each user only ever reads/writes their
   own key.
   ========================================================================= */

const notifStateKey = (userId) => `ztrd_notif_state_${userId}`;

const loadNotifState = (userId) => {
  if (!userId) return { readIds: [], dismissedIds: [] };
  try {
    const parsed = JSON.parse(localStorage.getItem(notifStateKey(userId)));
    return {
      readIds: Array.isArray(parsed?.readIds) ? parsed.readIds : [],
      dismissedIds: Array.isArray(parsed?.dismissedIds) ? parsed.dismissedIds : [],
    };
  } catch {
    return { readIds: [], dismissedIds: [] };
  }
};

const saveNotifState = (userId, state) => {
  if (!userId) return;
  try {
    localStorage.setItem(notifStateKey(userId), JSON.stringify(state));
  } catch {
    // Storage can fail (quota, private mode, etc.) — read/dismiss state is
    // a convenience, not critical, so fail silently rather than crash.
  }
};

/* =========================================================================
   SETTINGS-BASED TYPE FILTERING
   Maps each notification `type` to the toggle in useSettingsPage that
   controls it. A type with no entry here (e.g. "signup") is never gated —
   admin approval requests always show, since there's no toggle for them
   on the Settings page.
   ========================================================================= */

const TYPE_TO_SETTING = {
  maintenance: "notifMaintenance",
  report: "notifReports",
  supply: "notifSupply",
  alert: "notifLowStock", // low-stock alerts
};

// Exported so it can be unit tested / reused (e.g. by a Topbar badge that
// wants the same filtered count without duplicating this mapping).
export const applyNotificationSettings = (notifications, settings) => {
  if (!settings) return notifications;
  return notifications.filter((n) => {
    const settingKey = TYPE_TO_SETTING[n.type];
    if (!settingKey) return true; // not gated by any toggle
    return settings[settingKey] !== false;
  });
};

/* =========================================================================
   NOTIFICATION GENERATION — builds the flat notification feed from the
   various data sources (reports, maintenance, supply, stock, signups).
   Each notification gets a stable id derived from its source record, so
   the same underlying event always maps to the same id across reloads —
   which is what makes persisting read/dismissed state possible at all.
   ========================================================================= */

const buildReportNotifications = (notifications, reports = [], dateFormat) => {
  reports.forEach((report) => {
    const recordId = report._id ?? report.id;
    const isPending = report.status === "pending";
    const isApproved = report.status === "approved";
    const isRejected = report.status === "rejected";

    if (isPending) {
      notifications.push({
        id: `report-${recordId}`,
        type: "report",
        title: "Report Pending Approval",
        message: `${report.reportDetails} (${report.client.companyName})`,
        time: getTimeAgo(report.createdAt, dateFormat),
        read: false,
        createdAt: report.createdAt,
      });
    } else if (isApproved) {
      notifications.push({
        id: `report-${recordId}`,
        type: "report",
        title: "Report Approved",
        message: `Report approved: ${report.reportDetails.substring(0, 60)}... (${report.client.companyName})`,
        time: getTimeAgo(report.createdAt, dateFormat),
        read: true,
        createdAt: report.createdAt,
      });
    } else if (isRejected) {
      notifications.push({
        id: `report-${recordId}`,
        type: "report",
        title: "Report Rejected",
        message: `Report rejected: ${report.reportDetails.substring(0, 60)}... (${report.client.companyName})`,
        time: getTimeAgo(report.createdAt, dateFormat),
        read: true,
        createdAt: report.createdAt,
      });
    }
  });
};

const buildMaintenanceNotifications = (notifications, maintenances = [], dateFormat) => {
  maintenances.forEach((maint) => {
    const recordId = maint._id ?? maint.id;
    const maintDate = new Date(maint.maintenanceDay);
    const now = new Date();
    const daysUntil = Math.floor((maintDate - now) / (1000 * 60 * 60 * 24));

    if (maint.isDone) {
      notifications.push({
        id: `maintenance-${recordId}`,
        type: "maintenance",
        title: "Maintenance Completed",
        message: `${maint.message} on ${maint.machine} at ${maint.client.companyName}`,
        time: getTimeAgo(maint.createdAt, dateFormat),
        read: true,
        createdAt: maint.createdAt,
      });
    } else {
      notifications.push({
        id: `maintenance-${recordId}`,
        type: "maintenance",
        title: daysUntil <= 3 ? "Upcoming Maintenance (Soon)" : "Upcoming Maintenance",
        message: `${maint.message} scheduled for ${maint.maintenanceDay} at ${maint.machine} (${maint.client.companyName})`,
        time: getTimeAgo(maint.createdAt, dateFormat),
        read: false,
        createdAt: maint.createdAt,
      });
    }
  });
};

const buildSupplyNotifications = (notifications, supplies = [], dateFormat) => {
  supplies.forEach((supply) => {
    const recordId = supply._id ?? supply.id;
    notifications.push({
      id: `supply-${recordId}`,
      type: "supply",
      title: "Supply Log Created",
      message: `${supply.quantity}x ${supply.goodsSupplied} supplied to ${supply.client.companyName} by ${supply.user.firstName} ${supply.user.surname}`,
      time: getTimeAgo(supply.createdAt, dateFormat),
      read: false,
      createdAt: supply.createdAt,
    });
  });
};

const buildLowStockNotification = (notifications, storeItems = []) => {
  const lowStockItems = storeItems.filter((item) => item.quantity <= 2);
  if (lowStockItems.length > 0) {
    const itemList = lowStockItems.slice(0, 3).map((i) => `${i.machinePart}`).join(", ");
    const more = lowStockItems.length > 3 ? ` and ${lowStockItems.length - 3} more` : "";
    // One alert per day rather than per-item — stable within a day so
    // dismissing/reading it sticks, but naturally resurfaces the next day
    // if stock is still low.
    const todayKey = new Date().toISOString().slice(0, 10);
    notifications.push({
      id: `alert-lowstock-${todayKey}`,
      type: "alert",
      title: "Low Stock Alert",
      message: `${lowStockItems.length} item(s) at critical stock level: ${itemList}${more}`,
      time: "today",
      read: false,
      createdAt: new Date().toISOString(),
    });
  }
};

const buildSignupNotifications = (notifications, signups = [], dateFormat) => {
  signups.forEach((signup) => {
    const recordId = signup._id ?? signup.id;
    notifications.push({
      id: `signup-${recordId}`,
      type: "signup",
      title: "New Signup Request",
      message: `${signup.firstName} ${signup.surname} requested to join as ${signup.requestedRole}`,
      time: getTimeAgo(signup.requestedAt, dateFormat),
      read: false,
      createdAt: signup.requestedAt,
    });
  });
};

export const generateNotifications = ({ reports = [], maintenances = [], supplies = [], storeItems = [], signups = [] } = {}, dateFormat = "DD/MM/YYYY") => {
  const notifications = [];

  buildReportNotifications(notifications, reports, dateFormat);
  buildMaintenanceNotifications(notifications, maintenances, dateFormat);
  buildSupplyNotifications(notifications, supplies, dateFormat);
  buildLowStockNotification(notifications, storeItems);
  buildSignupNotifications(notifications, signups, dateFormat);

  notifications.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  return notifications;
};

/* =========================================================================
   TYPE CONFIG — color/background metadata per notification type.
   Icons are injected from the UI file via `iconMap` so this logic file
   stays free of JSX/component imports.
   ========================================================================= */

export const buildTypeConfig = (iconMap) => ({
  maintenance: { icon: iconMap.maintenance, color: "#6870fa", bg: "rgba(104,112,250,0.12)" },
  report:      { icon: iconMap.report, color: "#4cceac", bg: "rgba(76,206,172,0.12)" },
  supply:      { icon: iconMap.supply, color: "#868dfb", bg: "rgba(134,141,251,0.12)" },
  alert:       { icon: iconMap.alert, color: "#e24b4a", bg: "rgba(226,75,74,0.12)" },
  signup:      { icon: iconMap.signup, color: "#ffa500", bg: "rgba(255,165,0,0.12)" },
});

/* =========================================================================
   SHARED FETCH + APPLY-USER-STATE
   Single source of truth for "what does this user's notification feed look
   like right now" — used by the notifications page itself, and reusable by
   anything else (Topbar badge) that needs the same, consistent unread
   count rather than recomputing its own approximation.
   ========================================================================= */

const fetchNotificationSources = async () => {
  const [reportsRes, maintenanceRes, supplyRes, storeRes, signupsRes] = await Promise.all([
    fetch(`${API_BASE}/reports`, { headers: authHeaders() }),
    fetch(`${API_BASE}/maintenance`, { headers: authHeaders() }),
    fetch(`${API_BASE}/supply`, { headers: authHeaders() }),
    fetch(`${API_BASE}/store`, { headers: authHeaders() }),
    fetch(`${API_BASE}/users/signup-requests`, { headers: authHeaders() }),
  ]);

  const [reports, maintenances, supplies, storeItems, signups] = await Promise.all([
    reportsRes.ok ? reportsRes.json() : [],
    maintenanceRes.ok ? maintenanceRes.json() : [],
    supplyRes.ok ? supplyRes.json() : [],
    storeRes.ok ? storeRes.json() : [],
    signupsRes.ok ? signupsRes.json() : [],
  ]);

  return { reports, maintenances, supplies, storeItems, signups };
};

// Fetches everything, builds the feed, applies this user's notification
// toggles (mute maintenance/reports/supply/low-stock per their Settings),
// then applies this user's own read/dismissed state on top — dismissed
// ones dropped, read ones flagged.
export const loadUserNotifications = async (userId, settings) => {
  const sources = await fetchNotificationSources();
  const generated = generateNotifications(sources, settings?.dateFormat);
  const filtered = applyNotificationSettings(generated, settings);
  const { readIds, dismissedIds } = loadNotifState(userId);
  return filtered
    .filter((n) => !dismissedIds.includes(n.id))
    .map((n) => (readIds.includes(n.id) ? { ...n, read: true } : n));
};

/* =========================================================================
   MAIN HOOK — owns notification state and all the actions (mark read,
   mark all read, dismiss). Read/dismissed state is scoped to the current
   user via localStorage, so these actions never affect what any other
   user sees. Also loads the user's notification-toggle settings so the
   feed reflects what they've muted on the Settings page.
   ========================================================================= */

export const useNotificationsPage = () => {
  const currentUser = readUserFromStorage();
  const userId = currentUser?.id ?? currentUser?._id ?? null;

  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        // Settings and notification sources are independent — if settings
        // fail to load (e.g. offline), fall back to showing everything
        // rather than blocking the whole feed on it.
        const settings = await getSettings().catch(() => null);
        const withUserState = await loadUserNotifications(userId, settings);
        setNotifications(withUserState);
        setError("");
      } catch (err) {
        setError(err.message || "Unable to load notifications");
        setNotifications([]);
      } finally {
        setLoading(false);
      }
    };

    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  // Broadcasts the freshly computed unread count so the Topbar badge (or
  // anything else) can update instantly without doing its own refetch.
  const broadcastUpdate = (nextNotifications) => {
    const nextUnread = nextNotifications.filter((n) => !n.read).length;
    window.dispatchEvent(
      new CustomEvent(NOTIFICATIONS_UPDATED_EVENT, { detail: { userId, unreadCount: nextUnread } })
    );
  };

  // ── mark all read — persists every currently visible id as read for
  //    this user only ──────────────────────────────────────────────────────
  const markAllRead = () => {
    setNotifications((prev) => {
      const next = prev.map((n) => ({ ...n, read: true }));
      const { dismissedIds } = loadNotifState(userId);
      const readIds = Array.from(new Set(next.map((n) => n.id)));
      saveNotifState(userId, { readIds, dismissedIds });
      broadcastUpdate(next);
      return next;
    });
  };

  // ── mark one read — persists just that id for this user ────────────────
  const markRead = (id) => {
    setNotifications((prev) => {
      const next = prev.map((n) => (n.id === id ? { ...n, read: true } : n));
      const { readIds, dismissedIds } = loadNotifState(userId);
      const nextReadIds = readIds.includes(id) ? readIds : [...readIds, id];
      saveNotifState(userId, { readIds: nextReadIds, dismissedIds });
      broadcastUpdate(next);
      return next;
    });
  };

  // ── dismiss — removes locally and remembers it's dismissed for this
  //    user, so it won't resurface next time the feed is regenerated ─────
  const dismiss = (id) => {
    setNotifications((prev) => {
      const next = prev.filter((n) => n.id !== id);
      broadcastUpdate(next);
      return next;
    });
    const { readIds, dismissedIds } = loadNotifState(userId);
    const nextDismissedIds = dismissedIds.includes(id) ? dismissedIds : [...dismissedIds, id];
    saveNotifState(userId, { readIds, dismissedIds: nextDismissedIds });
  };

  const unread = notifications.filter((n) => !n.read);
  const read = notifications.filter((n) => n.read);

  return {
    notifications,
    loading,
    error,
    unreadCount,
    unread,
    read,
    markAllRead,
    markRead,
    dismiss,
  };
};