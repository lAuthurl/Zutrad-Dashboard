import FullCalendar, { formatDate } from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import listPlugin from "@fullcalendar/list";
import {
  Box,
  List,
  IconButton,
  Typography,
  useTheme,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  TextField,
  Button,
  Divider,
  Tooltip,
} from "@mui/material";
import FiberManualRecordIcon from "@mui/icons-material/FiberManualRecord";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import Header from "../../components/Header";
import { tokens } from "../../theme";

import { statusColors, useCalendarLogic } from "./calendar.logic";

// ════════════════════════════════════════════════════════════════════════════
// MAIN PAGE (UI) — state/handlers come from useCalendarLogic
// ════════════════════════════════════════════════════════════════════════════
const Calendar = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const palette = statusColors(colors);

  const {
    // events
    events,
    upcoming,
    past,
    loading,

    // permissions
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
  } = useCalendarLogic(palette);

  // ── sidebar section (JSX, so it lives here rather than in the logic file) ──
  const renderSidebarSection = (title, list, emptyText) => (
    <Box mb="20px">
      <Typography
        variant="subtitle2"
        fontWeight="700"
        color={colors.grey[300]}
        mb="8px"
        sx={{ textTransform: "uppercase", letterSpacing: "0.5px", fontSize: "11px" }}
      >
        {title}
      </Typography>
      <List disablePadding>
        {list.map((event) => {
          const dotColor = event.color || palette.custom;
          const dateVal = event.start || event.date;
          return (
            <Box
              key={event.id}
              sx={{
                backgroundColor: colors.primary[500],
                margin: "8px 0",
                borderRadius: "4px",
                p: "10px 12px",
              }}
            >
              <Box display="flex" alignItems="flex-start" gap="8px" mb="8px">
                <FiberManualRecordIcon
                  sx={{ color: dotColor, fontSize: "11px", mt: "4px", flexShrink: 0 }}
                />
                <Box flex="1" minWidth={0}>
                  <Typography
                    fontSize="13px"
                    fontWeight="600"
                    color={colors.grey[100]}
                    sx={{
                      wordBreak: "break-word",
                      lineHeight: 1.4,
                    }}
                  >
                    {event.title}
                  </Typography>
                  <Typography fontSize="11px" color={colors.grey[400]} mt="2px">
                    {dateVal
                      ? formatDate(dateVal, { year: "numeric", month: "short", day: "numeric" })
                      : ""}
                  </Typography>
                </Box>
              </Box>
              <Box display="flex" justifyContent="flex-end" gap="4px">
                {/* Edit: shown to all, disabled with a lock for non admin/superadmin */}
                <Tooltip title={userCanEditEvent ? "Edit title" : "Admin access required to edit"}>
                  <span>
                    <IconButton
                      size="small"
                      onClick={() => openEditFromSidebar(event)}
                      disabled={!userCanEditEvent}
                      sx={{ color: userCanEditEvent ? colors.grey[300] : colors.grey[700], p: "4px" }}
                    >
                      {userCanEditEvent ? (
                        <EditOutlinedIcon fontSize="inherit" />
                      ) : (
                        <LockOutlinedIcon fontSize="inherit" />
                      )}
                    </IconButton>
                  </span>
                </Tooltip>
                {/* Delete: shown to all, disabled with a lock for non superadmins */}
                <Tooltip title={userCanDeleteEvent ? "Delete event" : "Superadmin access required to delete"}>
                  <span>
                    <IconButton
                      size="small"
                      onClick={() => requestDelete(event)}
                      disabled={!userCanDeleteEvent}
                      sx={{ color: userCanDeleteEvent ? colors.redAccent[400] : colors.grey[700], p: "4px" }}
                    >
                      {userCanDeleteEvent ? (
                        <DeleteOutlineIcon fontSize="inherit" />
                      ) : (
                        <LockOutlinedIcon fontSize="inherit" />
                      )}
                    </IconButton>
                  </span>
                </Tooltip>
              </Box>
            </Box>
          );
        })}
        {list.length === 0 && (
          <Typography color={colors.grey[500]} fontSize="12px" pl="4px">
            {emptyText}
          </Typography>
        )}
      </List>
    </Box>
  );

  // ── render ───────────────────────────────────────────────────────────────────
  return (
    <Box m="20px">
      <Header title="CALENDAR" subtitle="Maintenance Schedule & Events" />

      {!userCanAddEvent && (
        <Typography color={colors.grey[500]} fontSize="12px" mt="4px" mb="10px">
          You have read-only access to the calendar. Ask an administrator or superadmin to add or edit events.
        </Typography>
      )}

      {loading && (
        <Typography color={colors.grey[500]} fontSize="12px" mt="4px" mb="10px">
          Loading calendar…
        </Typography>
      )}

      <Box display="flex" justifyContent="space-between" gap="15px">
        {/* SIDEBAR */}
        <Box
          flex="1 1 24%"
          backgroundColor={colors.primary[400]}
          p="15px"
          borderRadius="4px"
          maxHeight="78vh"
          overflow="auto"
        >
          <Typography variant="h5" fontWeight="600" mb="14px">
            Events
          </Typography>
          {renderSidebarSection(
            "Upcoming",
            upcoming,
            userCanAddEvent
              ? "Nothing scheduled. Click a date on the calendar to add an event."
              : "Nothing scheduled."
          )}
          <Divider sx={{ borderColor: colors.primary[300], mb: "16px" }} />
          {renderSidebarSection("Past & Completed", past, "Nothing here yet.")}
        </Box>

        {/* CALENDAR */}
        <Box
          flex="1 1 100%"
          sx={{
            // Day cells default to a fixed height that clips long event
            // titles — give them room to wrap onto a second line instead
            // of running off the edge of the pill. Scoped to month view
            // only — week/day views reuse this same day-grid markup for
            // their "all-day" row, and that row should stay auto-sized
            // (small by default, growing only as events are added) rather
            // than being forced to the same height as a month cell.
            "& .fc-dayGridMonth-view .fc-daygrid-day-frame": {
              minHeight: "110px",
            },
            "& .fc-daygrid-day-events": {
              minHeight: "unset",
            },
            // Event pills: allow the title to wrap, but clamp to 2 lines
            // so one long title can't blow out the whole row's height.
            "& .fc-daygrid-event": {
              whiteSpace: "normal",
              alignItems: "flex-start",
              padding: "2px 4px",
            },
            "& .fc-event-title": {
              whiteSpace: "normal",
              wordBreak: "break-word",
              overflow: "hidden",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              lineHeight: 1.25,
              fontSize: "11px",
            },
            "& .fc-event-time": {
              fontSize: "11px",
              flexShrink: 0,
            },
            // List view day headers default to FullCalendar's light theme —
            // recolor to match the app's dark background instead of the
            // jarring white/gray bands.
            "& .fc-list-day-cushion": {
              backgroundColor: colors.primary[500],
              color: colors.grey[100],
            },
            "& .fc-list-day-text, & .fc-list-day-side-text": {
              color: colors.grey[100],
            },
            "& .fc-list-table td": {
              borderColor: colors.primary[300],
            },
            "& .fc-list-event:hover td": {
              backgroundColor: colors.primary[500],
            },
            // All-day row in week/day views — maintenance events render
            // here now (see buildMaintenanceEvent), since they represent a
            // day, not a specific time. Recolor to match the dark theme and
            // give it a touch more breathing room than the default sliver.
            "& .fc-timegrid-axis, & .fc-timegrid-slot-label": {
              color: colors.grey[400],
            },
            "& .fc-daygrid-day-top": {
              color: colors.grey[100],
            },
          }}
        >
          <FullCalendar
            height="78vh"
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
            headerToolbar={{
              left: "prev,next today",
              center: "title",
              right: "dayGridMonth,timeGridWeek,timeGridDay,listMonth",
            }}
            initialView="dayGridMonth"
            // Selecting/dragging stay enabled for everyone so FullCalendar's
            // interaction plugin keeps working — the actual add/edit/delete
            // permission check happens in the handlers themselves (see
            // calendar.logic.js), which show an access-denied dialog instead
            // of applying the change for non-admins.
            editable={true}
            selectable={true}
            selectMirror={true}
            dayMaxEvents={true}
            select={handleDateClick}
            eventClick={handleEventClick}
            eventDrop={handleEventDrop}
            events={events}
            // Titles wrap/clamp visually (see sx above), but the full text
            // is still one hover away via the browser's native tooltip.
            eventDidMount={(info) => {
              info.el.setAttribute("title", info.event.title);
            }}
          />
        </Box>
      </Box>

      {/* ADD EVENT DIALOG */}
      <Dialog open={addDialogOpen} onClose={closeAddDialog} fullWidth maxWidth="xs">
        <DialogTitle>Add Event</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            variant="filled"
            label="Event title"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") confirmAddEvent();
            }}
            sx={{ mt: "8px" }}
          />
          {pendingSelection && (
            <Typography fontSize="12px" color={colors.grey[400]} mt="8px">
              {formatDate(pendingSelection.startStr, {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={closeAddDialog} sx={{ color: colors.grey[300] }}>
            Cancel
          </Button>
          <Button
            onClick={confirmAddEvent}
            variant="contained"
            color="secondary"
            disabled={!newTitle.trim()}
          >
            Add
          </Button>
        </DialogActions>
      </Dialog>

      {/* EDIT EVENT DIALOG */}
      <Dialog open={editDialogOpen} onClose={closeEditDialog} fullWidth maxWidth="xs">
        <DialogTitle>Edit Event</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            variant="filled"
            label="Event title"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") confirmEditEvent();
            }}
            sx={{ mt: "8px" }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={closeEditDialog} sx={{ color: colors.grey[300] }}>
            Cancel
          </Button>
          <Button
            onClick={confirmEditEvent}
            variant="contained"
            color="secondary"
            disabled={!editTitle.trim()}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* DELETE CONFIRM DIALOG */}
      <Dialog open={deleteDialogOpen} onClose={closeDeleteDialog} fullWidth maxWidth="xs">
        <DialogTitle>Remove Event</DialogTitle>
        <DialogContent>
          <Typography>
            Remove "{eventToDelete?.title}" from the calendar? This cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDeleteDialog} sx={{ color: colors.grey[300] }}>
            Cancel
          </Button>
          <Button onClick={confirmDelete} variant="contained" color="error">
            Remove
          </Button>
        </DialogActions>
      </Dialog>

      {/* ACCESS DENIED / ERROR DIALOG — same pattern as ClientMachinesPage */}
      <Dialog open={errorDialog.open} onClose={closeErrorDialog} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <ErrorOutlineIcon sx={{ color: colors.redAccent[400] }} />
          {errorDialog.title}
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ color: colors.grey[300] }}>
            {errorDialog.message}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeErrorDialog} variant="contained" color="error" size="small">
            OK
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Calendar;