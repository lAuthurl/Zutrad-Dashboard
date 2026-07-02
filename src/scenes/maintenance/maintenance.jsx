import { useState } from "react";
import {
  Box,
  Typography,
  useTheme,
  Button,
  TextField,
  MenuItem,
  Alert,
  Collapse,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Tooltip,
} from "@mui/material";
import { tokens } from "../../theme";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import ScheduleIcon from "@mui/icons-material/Schedule";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import BuildIcon from "@mui/icons-material/Build";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import Header from "../../components/Header";
import {
  MACHINE_TYPES,
  SORT_OPTIONS,
  buildStatusMeta,
  useMaintenancePage,
} from "./maintenance.logic";

// ════════════════════════════════════════════════════════════════════════════
// SUMMARY CARD
// ════════════════════════════════════════════════════════════════════════════
const SummaryCard = ({ icon, label, value, accent, colors }) => (
  <Box
    backgroundColor={colors.primary[400]}
    borderRadius="4px"
    p="16px 20px"
    display="flex" alignItems="center" gap="14px"
    borderLeft={`4px solid ${accent}`}
    flex="1" minWidth="180px"
  >
    <Box sx={{ color: accent, display: "flex", alignItems: "center", fontSize: "28px" }}>
      {icon}
    </Box>
    <Box>
      <Typography variant="h4" fontWeight="700" color={colors.grey[100]}>{value}</Typography>
      <Typography color={colors.grey[400]} fontSize="12px">{label}</Typography>
    </Box>
  </Box>
);

// ════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ════════════════════════════════════════════════════════════════════════════
const MaintenancePage = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);

  const meta = buildStatusMeta(colors, {
    completed: <CheckCircleOutlineIcon />,
    overdue:   <WarningAmberIcon />,
    pending:   <ScheduleIcon />,
  });

  const {
    filtered,
    summary,
    clients,

    // permissions
    userCanLogTask,
    userCanMarkDone,
    userCanExportCSV,
    userCanDelete,

    // form
    formOpen,
    setFormOpen,
    openFormIfAuthorised,  // ← use this instead of setFormOpen(true) directly
    form,
    handleChange,
    handleSubmit,

    // log actions
    handleMarkDone,
    handleDelete,

    // filters
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
    handleExport,          // ← permission-guarded; never call downloadCsv() directly

    // error / info popup
    errorDialog,
    closeErrorDialog,

    // feedback
    successMsg,
  } = useMaintenancePage(meta);

  // ── confirm "Mark as Done" — local UI-only state. Holds the id of the log
  //    awaiting confirmation, or null when no dialog is open. Kept here
  //    rather than in the logic hook since it's pure dialog state with no
  //    server interaction of its own — confirming just calls the existing
  //    handleMarkDone(id) from the hook. ─────────────────────────────────
  const [confirmDoneId, setConfirmDoneId] = useState(null);

  const closeConfirmDone = () => setConfirmDoneId(null);
  const confirmMarkDone = () => {
    if (confirmDoneId != null) handleMarkDone(confirmDoneId);
    setConfirmDoneId(null);
  };

  // ── confirm "Delete" — same pattern as confirmDoneId above, kept as a
  //    separate piece of state (rather than reusing confirmDoneId) so the
  //    two dialogs can never be conflated — accidentally wiring a delete
  //    confirm to fire handleMarkDone (or vice versa) is a real footgun
  //    the two actions have very different blast radii. ─────────────────
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const closeConfirmDelete = () => setConfirmDeleteId(null);
  const confirmDelete = () => {
    if (confirmDeleteId != null) handleDelete(confirmDeleteId);
    setConfirmDeleteId(null);
  };

  return (
    <Box m="20px">
      {/* ── header + export ── */}
      <Box display="flex" justifyContent="space-between" alignItems="flex-start" flexWrap="wrap" gap="12px">
        <Header title="MAINTENANCE" subtitle="Maintenance Logs & Schedules" />

        <Tooltip title={userCanExportCSV ? `Export ${filtered.length} log(s) to CSV` : "Admin access required to export"}>
          <span>
            <Button
              variant="outlined"
              startIcon={userCanExportCSV ? <FileDownloadIcon /> : <LockOutlinedIcon />}
              onClick={handleExport}
              sx={{
                borderColor: userCanExportCSV ? colors.greenAccent[600] : colors.grey[700],
                color: userCanExportCSV ? colors.greenAccent[400] : colors.grey[600],
                height: "40px",
                "&:hover": {
                  borderColor: userCanExportCSV ? colors.greenAccent[400] : colors.grey[600],
                  backgroundColor: userCanExportCSV ? colors.greenAccent[900] : "transparent",
                },
              }}
            >
              Export CSV ({filtered.length})
            </Button>
          </span>
        </Tooltip>
      </Box>

      {successMsg && (
        <Alert severity="success" sx={{ mb: "16px", mt: "8px" }}>{successMsg}</Alert>
      )}

      {/* ── summary cards ── */}
      <Box display="flex" gap="14px" flexWrap="wrap" mb="20px" mt="16px">
        <SummaryCard icon={<BuildIcon fontSize="inherit" />} label="Total Logs" value={summary.total} accent={colors.grey[300]} colors={colors} />
        <SummaryCard icon={<WarningAmberIcon fontSize="inherit" />} label="Overdue" value={summary.overdue} accent="#c0392b" colors={colors} />
        <SummaryCard icon={<ScheduleIcon fontSize="inherit" />} label="Pending" value={summary.pending} accent={colors.blueAccent[400]} colors={colors} />
        <SummaryCard icon={<CheckCircleOutlineIcon fontSize="inherit" />} label="Completed" value={summary.completed} accent={colors.greenAccent[500]} colors={colors} />
      </Box>

      {/* ── log task form ── */}
      <Box mb="16px" backgroundColor={colors.primary[400]} borderRadius="4px" overflow="hidden">
        <Box
          display="flex" justifyContent="space-between" alignItems="center"
          p="12px 16px"
          sx={{ cursor: "pointer" }}
          // Toggle: if open, just close. If closed, run the permission check first.
          onClick={() => formOpen ? setFormOpen(false) : openFormIfAuthorised()}
        >
          <Box display="flex" alignItems="center" gap="8px">
            <Typography color={userCanLogTask ? colors.grey[100] : colors.grey[500]} fontWeight="600">
              + Log Maintenance Task
            </Typography>
            {!userCanLogTask && (
              <Chip
                icon={<LockOutlinedIcon sx={{ fontSize: "13px !important" }} />}
                label="maintenance access required"
                size="small"
                sx={{ backgroundColor: colors.grey[800], color: colors.grey[500], fontSize: "11px" }}
              />
            )}
          </Box>
          <IconButton size="small" sx={{ color: userCanLogTask ? colors.greenAccent[400] : colors.grey[600] }}>
            {formOpen ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
          </IconButton>
        </Box>

        <Collapse in={formOpen}>
          <Box
            p="16px" display="grid" gridTemplateColumns="repeat(2, 1fr)" gap="16px"
            borderTop={`1px solid ${colors.primary[300]}`}
          >
            <TextField
              variant="filled" label="Notes / Description" name="message"
              value={form.message} onChange={handleChange}
              multiline rows={2} fullWidth sx={{ gridColumn: "span 2" }}
            />
            <TextField select variant="filled" label="Machine Type" name="machine"
              value={form.machine} onChange={handleChange} fullWidth>
              {MACHINE_TYPES.map((m) => <MenuItem key={m} value={m}>{m}</MenuItem>)}
            </TextField>
            <TextField select variant="filled" label="Client" name="clientId"
              value={form.clientId} onChange={handleChange} fullWidth>
              {clients.map((c) => <MenuItem key={c.id} value={c.id}>{c.companyName}</MenuItem>)}
            </TextField>
            <TextField
              variant="filled" label="Maintenance Date" name="maintenanceDay" type="date"
              InputLabelProps={{ shrink: true }} value={form.maintenanceDay} onChange={handleChange} fullWidth
            />
            <Box display="flex" alignItems="center" justifyContent="flex-end">
              <Button variant="contained" color="secondary" onClick={handleSubmit}
                sx={{ height: "48px", px: "28px" }}>
                Log Task
              </Button>
            </Box>
          </Box>
        </Collapse>
      </Box>

      {/* ── filter bar ── */}
      <Box
        backgroundColor={colors.primary[400]} borderRadius="4px"
        p="16px" mb="20px"
        display="grid" gap="12px" alignItems="center"
        sx={{ gridTemplateColumns: { xs: "1fr", md: "2fr 1fr 1fr 1fr 1fr auto" } }}
      >
        <TextField variant="filled" label="Search by machine, notes, or client…"
          value={search} onChange={(e) => setSearch(e.target.value)} fullWidth size="small" />
        <TextField select variant="filled" label="Machine" value={machineFilter}
          onChange={(e) => setMachineFilter(e.target.value)} fullWidth size="small">
          <MenuItem value="">All Machines</MenuItem>
          {MACHINE_TYPES.map((m) => <MenuItem key={m} value={m}>{m}</MenuItem>)}
        </TextField>
        <TextField select variant="filled" label="Client" value={clientFilter}
          onChange={(e) => setClientFilter(e.target.value)} fullWidth size="small">
          <MenuItem value="">All Clients</MenuItem>
          {clients.map((c) => <MenuItem key={c.id} value={c.id}>{c.companyName}</MenuItem>)}
        </TextField>
        <TextField select variant="filled" label="Status" value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)} fullWidth size="small">
          <MenuItem value="">All Statuses</MenuItem>
          <MenuItem value="overdue">Overdue</MenuItem>
          <MenuItem value="pending">Pending</MenuItem>
          <MenuItem value="completed">Completed</MenuItem>
        </TextField>
        <TextField select variant="filled" label="Sort by" value={sortBy}
          onChange={(e) => setSortBy(e.target.value)} fullWidth size="small">
          {SORT_OPTIONS.map((opt) => <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>)}
        </TextField>
        <Button variant="text" onClick={clearFilters} disabled={!hasActiveFilters}
          sx={{ color: colors.grey[300], whiteSpace: "nowrap" }}>
          Clear
        </Button>
      </Box>

      {/* ── log cards ── */}
      <Box display="flex" flexDirection="column" gap="12px">
        {filtered.map((log) => {
          const m = meta[log.status];
          return (
            <Box
              key={log.id}
              backgroundColor={colors.primary[400]}
              borderRadius="4px" p="16px 20px"
              borderLeft={`4px solid ${m.border}`}
            >
              <Box display="flex" justifyContent="space-between" alignItems="flex-start"
                mb="6px" flexWrap="wrap" gap="8px">
                <Box>
                  <Typography color={colors.greenAccent[400]} fontWeight="700" fontSize="15px">
                    {log.machine} — {log.client?.companyName}
                  </Typography>
                  <Typography color={colors.grey[400]} fontSize="12px">
                    Scheduled: {log.maintenanceDay} · Logged by {log.user?.firstName} {log.user?.surname}
                  </Typography>
                </Box>
                <Box display="flex" alignItems="center" gap="8px">
                  <Chip
                    label={m.label} size="small" icon={m.icon}
                    sx={{ backgroundColor: m.bg, color: m.color, fontWeight: "600", ".MuiChip-icon": { color: "inherit" } }}
                  />
                  {/* Delete — superadmin only. Red by default (not just on hover)
                      so the destructive action reads clearly at a glance. Shown
                      to everyone so the affordance is discoverable, but locked
                      (icon swap + disabled) for non-superadmins rather than
                      hidden — matches the "Mark as Done" pattern below and the
                      delete button in ClientMachinesPage. */}
                  <Tooltip title={userCanDelete ? "Delete this maintenance log" : "Superadmin access required to delete"}>
                    <span>
                      <IconButton
                        size="small"
                        disabled={!userCanDelete}
                        onClick={() => setConfirmDeleteId(log.id)}
                        sx={{
                          color: userCanDelete ? "#ff8a8a" : colors.grey[700],
                          "&:hover": userCanDelete
                            ? { color: "#ff8a8a", backgroundColor: "#7a1f1f" }
                            : {},
                        }}
                      >
                        {userCanDelete ? <DeleteOutlineIcon fontSize="small" /> : <LockOutlinedIcon fontSize="small" />}
                      </IconButton>
                    </span>
                  </Tooltip>
                </Box>
              </Box>

              <Typography color={colors.grey[200]} mb="12px">{log.message}</Typography>

              {/* Mark as Done — only shown to admins/superadmins; others see a locked hint.
                  Clicking opens a confirmation dialog instead of firing handleMarkDone
                  directly, so an accidental click can't silently complete a task. */}
              {log.status !== "completed" && (
                userCanMarkDone ? (
                  <Button
                    size="small" variant="outlined"
                    startIcon={<CheckCircleOutlineIcon />}
                    onClick={() => setConfirmDoneId(log.id)}
                    sx={{
                      borderColor: colors.greenAccent[600],
                      color: colors.greenAccent[400],
                      "&:hover": { borderColor: colors.greenAccent[400], backgroundColor: colors.greenAccent[900] },
                    }}
                  >
                    Mark as Done
                  </Button>
                ) : (
                  <Tooltip title="Only administrators and superadmins can mark tasks as done">
                    <span>
                      <Button
                        size="small" variant="outlined" disabled
                        startIcon={<LockOutlinedIcon />}
                        sx={{ borderColor: colors.grey[700], color: colors.grey[600] }}
                      >
                        Mark as Done
                      </Button>
                    </span>
                  </Tooltip>
                )
              )}
            </Box>
          );
        })}

        {filtered.length === 0 && (
          <Typography color={colors.grey[400]} p="20px">
            No maintenance logs match your filters.
          </Typography>
        )}
      </Box>

      {/* ── error / info dialog ── */}
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

      {/* ── confirm mark-as-done dialog ── */}
      <Dialog open={confirmDoneId !== null} onClose={closeConfirmDone} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <CheckCircleOutlineIcon sx={{ color: colors.greenAccent[400] }} />
          Mark task as done?
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ color: colors.grey[300] }}>
            This will mark the maintenance task as completed. This can't be easily undone from here.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeConfirmDone} size="small">
            Cancel
          </Button>
          <Button onClick={confirmMarkDone} variant="contained" color="success" size="small">
            Mark as Done
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── confirm delete dialog ── */}
      <Dialog open={confirmDeleteId !== null} onClose={closeConfirmDelete} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <DeleteOutlineIcon sx={{ color: "#ff8a8a" }} />
          Delete this maintenance task?
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ color: colors.grey[300] }}>
            This will permanently delete the maintenance log. This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeConfirmDelete} size="small">
            Cancel
          </Button>
          <Button onClick={confirmDelete} variant="contained" color="error" size="small">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default MaintenancePage;