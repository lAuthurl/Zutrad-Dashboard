import { useState, useEffect, useMemo } from "react";

const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:5000";

// ════════════════════════════════════════════════════════════════════════════
// STATUS HELPERS (mirrors Maintenance page logic)
// ════════════════════════════════════════════════════════════════════════════
export const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

export const getMaintenanceStatus = (isDone, dateStr) => {
  if (isDone) return "completed";
  const due = new Date(dateStr);
  due.setHours(0, 0, 0, 0);
  return due.getTime() < startOfToday().getTime() ? "overdue" : "pending";
};

export const statusColors = (colors) => ({
  completed: colors.greenAccent[600],
  overdue: "#c0392b",
  pending: colors.blueAccent[500],
  custom: colors.grey[600] ?? "#6b7280",
});

// Shape a raw /maintenance record into the same event object the calendar
// already knows how to render. Maintenance records are read-only here —
// they're managed from the Maintenance page, not the calendar — so this is
// one-way (backend → calendar), never the reverse.
//
// `maintenanceDay` is a date, not a specific time of day — but Mongo stores
// it as a full Date, and it usually carries whatever incidental time the
// record happened to be created at (e.g. 4:30pm). Passing that straight to
// FullCalendar as a timed event made week/day views try to slot it into a
// specific hour it doesn't actually belong to, so it never lined up with
// the grid. Marking it allDay instead makes FullCalendar treat it purely as
// a day-level event — it renders in the all-day banner in week/day views,
// with no misleading time label, and month view is unaffected.
const buildMaintenanceEvent = (m, palette) => {
  const status = getMaintenanceStatus(m.isDone, m.maintenanceDay);
  return {
    id: `maint-${m._id ?? m.id}`,
    title: `${m.machine} — ${m.client?.companyName ?? m.clientName ?? "Unknown client"}`,
    start: m.maintenanceDay,
    allDay: true,
    color: palette[status],
    extendedProps: {
      source: "maintenance",
      status,
    },
  };
};

// ════════════════════════════════════════════════════════════════════════════
// PERMISSION HELPERS (same pattern as clientMachine.logic.js)
// ════════════════════════════════════════════════════════════════════════════

// Never cached at module level — always reads the latest login state.
const readUserFromStorage = () => {
  try {
    return JSON.parse(localStorage.getItem("user")) ?? null;
  } catch {
    return null;
  }
};

const readToken = () => localStorage.getItem("token");

const isSuperAdmin   = (role) => role === "superadmin";
const isAdminOrAbove = (role) => role === "administrator" || role === "superadmin";

const apiFetch = async (path, options = {}) => {
  const token = readToken();
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
// CALENDAR LOGIC
// Fetches events straight from the backend (maintenance records + custom
// calendar events) — no mock data. Add/edit dialog state, delete dialog
// state, drag handling, upcoming/past grouping, and role-based permission
// gating — only admins/superadmins can add or edit events, only superadmins
// can delete them. Maintenance-sourced events are read-only on this page
// regardless of role, since they're derived from real maintenance records
// managed on the Maintenance page.
// ════════════════════════════════════════════════════════════════════════════
export const useCalendarLogic = (palette) => {
  // ── current user — held in state so permission flags stay reactive.
  //    Re-read on mount and on any storage event (login / logout in
  //    another tab), same as useClientMachinesLogic.
  const [currentUser, setCurrentUser] = useState(() => readUserFromStorage());

  useEffect(() => {
    const onStorage = () => setCurrentUser(readUserFromStorage());
    window.addEventListener("storage", onStorage);
    setCurrentUser(readUserFromStorage());
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const role = currentUser?.role ?? null;

  // Add / edit events: administrator or superadmin
  const userCanAddEvent    = isAdminOrAbove(role);
  const userCanEditEvent   = isAdminOrAbove(role);
  // Delete events: superadmin only
  const userCanDeleteEvent = isSuperAdmin(role);

  // ── event state — fetched from the backend, no mock data ───────────────────
  const [events, setEvents]   = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const [maintenanceRecords, customEvents] = await Promise.all([
        apiFetch("/maintenance"),
        apiFetch("/calendar/events"),
      ]);
      const maintenanceEvents = (maintenanceRecords || []).map((m) =>
        buildMaintenanceEvent(m, palette)
      );
      setEvents([...maintenanceEvents, ...(customEvents || [])]);
    } catch (err) {
      showErrorDialog("Failed to Load Calendar", err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [pendingSelection, setPendingSelection] = useState(null);
  const [newTitle, setNewTitle] = useState("");

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [editTitle, setEditTitle] = useState("");

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [eventToDelete, setEventToDelete] = useState(null);

  // ── error / info popup — mirrors clientMachine.logic.js's errorDialog ──────
  const [errorDialog, setErrorDialog] = useState({ open: false, title: "", message: "" });
  const closeErrorDialog = () => setErrorDialog({ open: false, title: "", message: "" });
  const showErrorDialog  = (title, message) => setErrorDialog({ open: true, title, message });

  // ---- add event ----------------------------------------------------------

  // Opens the add dialog — guard runs against live state, not a stale flag.
  const handleDateClick = (selected) => {
    if (!userCanAddEvent) {
      selected?.view?.calendar?.unselect();
      showErrorDialog(
        "Access Denied",
        "You don't have permission to add calendar events. Ask an administrator or superadmin to add this for you."
      );
      return;
    }
    setPendingSelection(selected);
    setNewTitle("");
    setAddDialogOpen(true);
  };

  const closeAddDialog = () => {
    setAddDialogOpen(false);
    pendingSelection?.view?.calendar?.unselect();
    setPendingSelection(null);
  };

  const confirmAddEvent = async () => {
    if (!userCanAddEvent) {
      showErrorDialog("Access Denied", "You don't have permission to add calendar events.");
      closeAddDialog();
      return;
    }
    if (!newTitle.trim() || !pendingSelection) {
      closeAddDialog();
      return;
    }
    try {
      const created = await apiFetch("/calendar/events", {
        method: "POST",
        body: JSON.stringify({
          title: newTitle.trim(),
          start: pendingSelection.startStr,
          end: pendingSelection.endStr,
          allDay: pendingSelection.allDay,
          color: palette.custom,
        }),
      });
      setEvents((prev) => [...prev, created]);
      closeAddDialog();
    } catch (err) {
      showErrorDialog("Failed to Add Event", err.message);
    }
  };

  // ---- edit event -----------------------------------------------------------

  // Opens the edit dialog — guard runs against live state, not a stale flag.
  const openEditFromSidebar = (event) => {
    if (!userCanEditEvent) {
      showErrorDialog(
        "Access Denied",
        "You don't have permission to edit calendar events. Ask an administrator or superadmin to make this change."
      );
      return;
    }
    if (event.extendedProps?.source !== "custom") {
      showErrorDialog(
        "Read-only Event",
        "Maintenance events are generated from maintenance records and can only be changed from the Maintenance page."
      );
      return;
    }
    setEditingEvent(event);
    setEditTitle(event.title);
    setEditDialogOpen(true);
  };

  const closeEditDialog = () => {
    setEditDialogOpen(false);
    setEditingEvent(null);
    setEditTitle("");
  };

  const confirmEditEvent = async () => {
    if (!userCanEditEvent) {
      showErrorDialog("Access Denied", "You don't have permission to edit calendar events.");
      closeEditDialog();
      return;
    }
    if (!editingEvent || !editTitle.trim()) {
      closeEditDialog();
      return;
    }
    try {
      const updated = await apiFetch(`/calendar/events/${editingEvent.id.replace("custom-", "")}`, {
        method: "PATCH",
        body: JSON.stringify({ title: editTitle.trim() }),
      });
      setEvents((prev) => prev.map((ev) => (ev.id === editingEvent.id ? updated : ev)));
      closeEditDialog();
    } catch (err) {
      showErrorDialog("Failed to Update Event", err.message);
    }
  };

  // ---- delete event -----------------------------------------------------------

  // Opens the delete confirm dialog — guard runs against live state, not a
  // stale flag.
  const requestDelete = (event) => {
    if (!userCanDeleteEvent) {
      showErrorDialog(
        "Access Denied",
        "Only superadmins can delete calendar events. Contact your superadmin if you need this action performed."
      );
      return;
    }
    if (event.extendedProps?.source !== "custom") {
      showErrorDialog(
        "Read-only Event",
        "Maintenance events are generated from maintenance records and can only be removed from the Maintenance page."
      );
      return;
    }
    setEventToDelete(event);
    setDeleteDialogOpen(true);
  };

  const closeDeleteDialog = () => {
    setDeleteDialogOpen(false);
    setEventToDelete(null);
  };

  const confirmDelete = async () => {
    if (!userCanDeleteEvent) {
      showErrorDialog("Access Denied", "Only superadmins can delete calendar events.");
      closeDeleteDialog();
      return;
    }
    if (!eventToDelete) {
      closeDeleteDialog();
      return;
    }
    try {
      await apiFetch(`/calendar/events/${eventToDelete.id.replace("custom-", "")}`, {
        method: "DELETE",
      });
      setEvents((prev) => prev.filter((ev) => ev.id !== eventToDelete.id));
      closeDeleteDialog();
    } catch (err) {
      showErrorDialog("Failed to Delete Event", err.message);
      closeDeleteDialog();
    }
  };

  // FullCalendar's built-in eventClick — same permission + read-only guard
  // as the sidebar's delete button, since clicking an event on the grid is
  // the other entry point into requestDelete.
  const handleEventClick = (selected) => {
    requestDelete(selected.event);
  };

  // when a user drags an event to a new date, sync just that date change
  // back into the backend and local state. Dragging is a form of editing,
  // so it's gated the same way as the edit dialog, and maintenance events
  // stay pinned since they aren't stored in the calendar collection at all.
  const handleEventDrop = async (changeInfo) => {
    const { event } = changeInfo;
    const source = event.extendedProps?.source;

    if (source !== "custom") {
      changeInfo.revert();
      showErrorDialog(
        "Read-only Event",
        "Maintenance events are generated from maintenance records and can only be rescheduled from the Maintenance page."
      );
      return;
    }
    if (!userCanEditEvent) {
      changeInfo.revert();
      showErrorDialog(
        "Access Denied",
        "You don't have permission to move calendar events. Ask an administrator or superadmin to make this change."
      );
      return;
    }

    const nextDate = event.allDay && !event.endStr ? event.startStr : undefined;
    try {
      const updated = await apiFetch(`/calendar/events/${event.id.replace("custom-", "")}`, {
        method: "PATCH",
        body: JSON.stringify({
          start: event.startStr,
          end: event.endStr || undefined,
          date: nextDate,
        }),
      });
      setEvents((prev) => prev.map((ev) => (ev.id === event.id ? updated : ev)));
    } catch (err) {
      changeInfo.revert();
      showErrorDialog("Failed to Move Event", err.message);
    }
  };

  // ---- sidebar grouping ----------------------------------------------------

  const { upcoming, past } = useMemo(() => {
    const today = startOfToday().getTime();
    const sorted = [...events].sort((a, b) => {
      const aDate = new Date(a.start || a.date).getTime();
      const bDate = new Date(b.start || b.date).getTime();
      return aDate - bDate;
    });
    const upcomingList = [];
    const pastList = [];
    sorted.forEach((ev) => {
      const evDate = new Date(ev.start || ev.date).getTime();
      const status = ev.extendedProps?.status;
      if (status === "completed" || evDate < today) {
        pastList.push(ev);
      } else {
        upcomingList.push(ev);
      }
    });
    return { upcoming: upcomingList, past: pastList };
  }, [events]);

  return {
    // events
    events,
    upcoming,
    past,
    loading,
    refetchEvents: fetchEvents,

    // permissions (expose so UI can show/hide/disable buttons correctly)
    userCanAddEvent,
    userCanEditEvent,
    userCanDeleteEvent,

    // add dialog
    addDialogOpen,
    pendingSelection,
    newTitle,
    setNewTitle,
    handleDateClick,
    closeAddDialog,
    confirmAddEvent,

    // edit dialog
    editDialogOpen,
    editTitle,
    setEditTitle,
    openEditFromSidebar,
    closeEditDialog,
    confirmEditEvent,

    // delete dialog
    deleteDialogOpen,
    eventToDelete,
    requestDelete,
    closeDeleteDialog,
    confirmDelete,

    // error / info popup
    errorDialog,
    closeErrorDialog,

    // calendar callbacks
    handleEventClick,
    handleEventDrop,
  };
};