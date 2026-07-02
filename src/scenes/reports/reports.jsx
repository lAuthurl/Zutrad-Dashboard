import {
  Box,
  Typography,
  useTheme,
  Button,
  TextField,
  MenuItem,
  Collapse,
  IconButton,
  Chip,
  Snackbar,
  Alert,
  Stack,
  Tooltip,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from "@mui/material";
import { tokens } from "../../theme";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import CancelOutlinedIcon from "@mui/icons-material/CancelOutlined";
import SearchOutlinedIcon from "@mui/icons-material/SearchOutlined";
import FileDownloadOutlinedIcon from "@mui/icons-material/FileDownloadOutlined";
import AddOutlinedIcon from "@mui/icons-material/AddOutlined";
import AssignmentOutlinedIcon from "@mui/icons-material/AssignmentOutlined";
import PendingOutlinedIcon from "@mui/icons-material/PendingOutlined";
import TaskAltOutlinedIcon from "@mui/icons-material/TaskAltOutlined";
import DoNotDisturbOutlinedIcon from "@mui/icons-material/DoNotDisturbOutlined";
import DeleteOutlineOutlinedIcon from "@mui/icons-material/DeleteOutlineOutlined";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import Header from "../../components/Header";
import {
  STATUS_TABS,
  statusStyles,
  getStatusIcon,
  getTabColor,
  useReportsPage,
} from "./reports.logic";
import { useDateFormat } from "../settings/dateFormat.logic";

/* =========================================================================
   STAT CARD — small presentational sub-component for the 4 stat tiles
   ========================================================================= */

const StatCard = ({ icon, label, value, accent, colors }) => (
  <Box
    display="flex" alignItems="center" gap="12px"
    px="18px" py="12px"
    backgroundColor={colors.primary[400]}
    borderRadius="6px"
    borderLeft={`3px solid ${accent}`}
    minWidth="150px"
  >
    <Box color={accent} display="flex">{icon}</Box>
    <Box>
      <Typography fontSize="20px" fontWeight="700" color={colors.grey[100]} lineHeight={1}>
        {value}
      </Typography>
      <Typography fontSize="11px" color={colors.grey[400]} mt="2px">{label}</Typography>
    </Box>
  </Box>
);

/* =========================================================================
   MAIN COMPONENT
   ========================================================================= */

const ReportsPage = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);

  // status icons live here (UI file) and get resolved per-report via
  // getStatusIcon, so reports.logic.js never needs to import JSX/icons
  const statusIconMap = {
    approved: <TaskAltOutlinedIcon sx={{ fontSize: 14 }} />,
    rejected: <DoNotDisturbOutlinedIcon sx={{ fontSize: 14 }} />,
    pending: <PendingOutlinedIcon sx={{ fontSize: 14 }} />,
  };

  const {
    reports,
    filtered,
    counts,
    clients,
    search,
    setSearch,
    activeTab,
    setActiveTab,
    clearFilters,
    formOpen,
    setFormOpen,
    openFormIfAuthorised,
    form,
    formError,
    handleChange,
    handleSubmit,
    handleCancelForm,
    handleApprove,
    handleDelete,
    handleExport,
    confirmDialog,
    closeConfirmDialog,
    submitConfirmDialog,
    rejectDialog,
    openRejectDialog,
    closeRejectDialog,
    setRejectReason,
    handleReject,
    toast,
    closeToast,
    errorDialog,
    closeErrorDialog,
    canCreateReport,
    canModerate,
    canExport,
    canDelete,
  } = useReportsPage();
  const { formatDate } = useDateFormat();

  return (
    <Box m="20px">
      <Header title="REPORTS" subtitle="Incident & Field Reports" />

      {/* ----------------------------------------------------------------
          STATS BAR
          ---------------------------------------------------------------- */}
      <Stack direction="row" spacing={2} mt="24px" flexWrap="wrap" gap="12px">
        <StatCard icon={<AssignmentOutlinedIcon />} label="Total Reports" value={counts.all} accent={colors.grey[400]} colors={colors} />
        <StatCard icon={<PendingOutlinedIcon />} label="Pending" value={counts.pending} accent={colors.blueAccent[400]} colors={colors} />
        <StatCard icon={<TaskAltOutlinedIcon />} label="Approved" value={counts.approved} accent={colors.greenAccent[400]} colors={colors} />
        <StatCard icon={<DoNotDisturbOutlinedIcon />} label="Rejected" value={counts.rejected} accent={counts.rejected > 0 ? colors.redAccent[400] : colors.grey[500]} colors={colors} />
      </Stack>

      {/* ----------------------------------------------------------------
          CREATE REPORT FORM (collapsible) — always visible to everyone.
          Header click uses openFormIfAuthorised so users without "reports"
          permission get the access-denied dialog rather than the form
          opening silently.
          ---------------------------------------------------------------- */}
      <Box mt="24px" mb="16px" backgroundColor={colors.primary[400]} borderRadius="6px" overflow="hidden">
        <Box
          display="flex" justifyContent="space-between" alignItems="center"
          p="12px 16px" sx={{ cursor: "pointer" }}
          onClick={() => (formOpen ? setFormOpen(false) : openFormIfAuthorised())}
        >
          <Box display="flex" alignItems="center" gap="8px">
            <AddOutlinedIcon sx={{ color: canCreateReport ? colors.greenAccent[400] : colors.grey[600], fontSize: "18px" }} />
            <Typography color={canCreateReport ? colors.grey[100] : colors.grey[500]} fontWeight="600" fontSize="14px">
              Create New Report
              {!canCreateReport && (
                <Typography component="span" fontSize="11px" color={colors.grey[600]} ml="8px">
                  (reports access required)
                </Typography>
              )}
            </Typography>
          </Box>
          <IconButton size="small" sx={{ color: canCreateReport ? colors.greenAccent[400] : colors.grey[600] }}>
            {formOpen ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
          </IconButton>
        </Box>

        <Collapse in={formOpen}>
          <Box p="16px" display="grid" gridTemplateColumns="repeat(2, 1fr)" gap="16px"
            borderTop={`1px solid ${colors.primary[300]}`}>
            <TextField
              variant="filled" label="Report Details" name="reportDetails"
              value={form.reportDetails} onChange={handleChange}
              multiline rows={3} fullWidth sx={{ gridColumn: "span 2" }}
              error={!!formError && !form.reportDetails}
            />
            <TextField
              select variant="filled" label="Client" name="clientId"
              value={form.clientId} onChange={handleChange} fullWidth
              error={!!formError && !form.clientId}
            >
              {clients.map((c) => (
                <MenuItem key={c.id} value={c.id}>{c.companyName}</MenuItem>
              ))}
            </TextField>
            <TextField
              variant="filled" label="Line Number" name="lineNumber"
              type="number" value={form.lineNumber} onChange={handleChange} fullWidth
              error={!!formError && !form.lineNumber}
            />
            {formError && (
              <Box sx={{ gridColumn: "span 2" }}>
                <Alert severity="error" sx={{ fontSize: "12px", py: "2px" }}>{formError}</Alert>
              </Box>
            )}
            <Box sx={{ gridColumn: "span 2" }} display="flex" justifyContent="flex-end" gap="10px">
              <Button
                size="small" variant="outlined"
                onClick={handleCancelForm}
                sx={{ borderColor: colors.grey[600], color: colors.grey[300], textTransform: "none" }}
              >
                Cancel
              </Button>
              <Button
                variant="contained" color="secondary" onClick={handleSubmit}
                sx={{ px: "28px", textTransform: "none" }}
              >
                Submit Report
              </Button>
            </Box>
          </Box>
        </Collapse>
      </Box>

      {/* ----------------------------------------------------------------
          TOOLBAR: status tabs + search + export
          Export button always visible; gated inside handleExport.
          ---------------------------------------------------------------- */}
      <Box display="flex" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap="12px" mb="16px">
        {/* status tabs */}
        <Stack direction="row" spacing={0.5}>
          {STATUS_TABS.map((tab) => {
            const active = activeTab === tab;
            return (
              <Button
                key={tab}
                size="small"
                onClick={() => setActiveTab(tab)}
                sx={{
                  textTransform: "capitalize",
                  fontSize: "12px",
                  px: "12px",
                  borderRadius: "4px",
                  backgroundColor: active ? colors.primary[300] : "transparent",
                  color: active ? getTabColor(tab, colors) : colors.grey[500],
                  borderBottom: active ? `2px solid ${getTabColor(tab, colors)}` : "2px solid transparent",
                  "&:hover": { backgroundColor: colors.primary[300] },
                }}
              >
                {tab} {tab !== "all" && `(${counts[tab]})`}
              </Button>
            );
          })}
        </Stack>

        <Stack direction="row" spacing={1.5} alignItems="center">
          <TextField
            variant="outlined" size="small"
            placeholder="Search client, details, engineer…"
            value={search} onChange={(e) => setSearch(e.target.value)}
            InputProps={{
              startAdornment: <SearchOutlinedIcon sx={{ color: colors.grey[400], mr: "6px", fontSize: "18px" }} />,
            }}
            sx={{
              width: 250,
              "& .MuiOutlinedInput-root": { backgroundColor: colors.primary[400], fontSize: "13px" },
            }}
          />
          <Typography color={colors.grey[500]} fontSize="12px" sx={{ whiteSpace: "nowrap" }}>
            {filtered.length} / {reports.length}
          </Typography>

          {/* Export — always visible; access-denied dialog fires for non-admins */}
          <Tooltip title={canExport ? "Export to CSV" : "Admin access required to export"}>
            <span>
              <Button
                size="small" variant="outlined"
                startIcon={<FileDownloadOutlinedIcon />}
                onClick={handleExport}
                sx={{
                  borderColor: canExport ? colors.blueAccent[500] : colors.grey[700],
                  color: canExport ? colors.blueAccent[300] : colors.grey[600],
                  fontSize: "12px", textTransform: "none",
                  "&:hover": {
                    borderColor: canExport ? colors.blueAccent[300] : colors.grey[600],
                    backgroundColor: canExport ? colors.blueAccent[900] : "transparent",
                  },
                }}
              >
                Export CSV
              </Button>
            </span>
          </Tooltip>
        </Stack>
      </Box>

      {/* ----------------------------------------------------------------
          REPORT CARDS
          ---------------------------------------------------------------- */}
      <Box display="flex" flexDirection="column" gap="10px">
        {filtered.length === 0 ? (
          <Box py="60px" display="flex" flexDirection="column" alignItems="center"
            backgroundColor={colors.primary[400]} borderRadius="6px">
            <AssignmentOutlinedIcon sx={{ fontSize: 40, color: colors.grey[600] }} />
            <Typography color={colors.grey[500]} fontSize="14px" mt="10px">
              No reports match your filters
            </Typography>
            <Button size="small" onClick={clearFilters}
              sx={{ mt: "8px", color: colors.blueAccent[300], fontSize: "12px", textTransform: "none" }}>
              Clear filters
            </Button>
          </Box>
        ) : (
          filtered.map((report) => {
            const ss = statusStyles(report.status, colors);
            return (
              <Box
                key={report.id}
                backgroundColor={colors.primary[400]}
                borderRadius="6px"
                borderLeft={`4px solid ${ss.border}`}
                overflow="hidden"
                sx={{ transition: "box-shadow 0.15s", "&:hover": { boxShadow: `0 2px 12px ${colors.primary[200]}22` } }}
              >
                <Box p="16px 20px">
                  {/* header row */}
                  <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb="10px">
                    <Box>
                      <Typography color={colors.greenAccent[400]} fontWeight="700" fontSize="15px">
                        {report.client?.companyName} — Line {report.lineNumber}
                      </Typography>
                      <Typography color={colors.grey[500]} fontSize="12px" mt="2px">
                        #{report.id} · Filed by {report.user?.firstName} {report.user?.surname} · {formatDate(report.createdAt)}
                      </Typography>
                    </Box>
                    <Box display="flex" alignItems="center" gap="8px">
                      <Chip
                        icon={getStatusIcon(report.status, statusIconMap)}
                        label={report.status}
                        size="small"
                        sx={{
                          backgroundColor: ss.bg,
                          color: ss.text,
                          fontWeight: "600",
                          textTransform: "capitalize",
                          fontSize: "11px",
                          "& .MuiChip-icon": { color: ss.text },
                        }}
                      />
                      {/* Delete — always visible; lock icon for non-superadmins */}
                      {canDelete ? (
                        <Tooltip title="Delete report">
                          <IconButton size="small" onClick={() => handleDelete(report.id)}
                            sx={{ color: colors.redAccent[400] }}>
                            <DeleteOutlineOutlinedIcon sx={{ fontSize: "16px" }} />
                          </IconButton>
                        </Tooltip>
                      ) : (
                        <Tooltip title="Superadmin access required to delete">
                          <span>
                            <IconButton size="small" disabled sx={{ color: colors.grey[700] }}>
                              <LockOutlinedIcon sx={{ fontSize: "16px" }} />
                            </IconButton>
                          </span>
                        </Tooltip>
                      )}
                    </Box>
                  </Box>

                  <Divider sx={{ borderColor: colors.primary[300], mb: "10px" }} />

                  {/* body */}
                  <Typography color={colors.grey[200]} fontSize="13px" lineHeight={1.7} mb="12px">
                    {report.reportDetails}
                  </Typography>

                  {/* rejection reason */}
                  {report.status === "rejected" && report.rejectionReason && (
                    <Box
                      p="8px 12px" mb="10px"
                      backgroundColor={colors.redAccent[900]}
                      borderRadius="4px"
                      borderLeft={`3px solid ${colors.redAccent[500]}`}
                    >
                      <Typography color={colors.redAccent[300]} fontSize="12px" fontWeight={600}>
                        Rejection reason:
                      </Typography>
                      <Typography color={colors.redAccent[200]} fontSize="12px">
                        {report.rejectionReason}
                      </Typography>
                    </Box>
                  )}

                  {/* Approve/Reject — always visible on pending reports;
                      openRejectDialog and handleApprove are gated via the
                      access-denied dialog for non-admins */}
                  {report.status === "pending" && (
                    <Box display="flex" gap="10px">
                      <Button
                        size="small" variant="contained"
                        startIcon={canModerate ? <CheckCircleOutlineIcon /> : <LockOutlinedIcon />}
                        onClick={() => handleApprove(report.id)}
                        sx={{
                          backgroundColor: canModerate ? colors.greenAccent[700] : colors.grey[700],
                          color: canModerate ? colors.greenAccent[100] : colors.grey[500],
                          textTransform: "none", fontSize: "12px",
                          "&:hover": { backgroundColor: canModerate ? colors.greenAccent[600] : colors.grey[700] },
                        }}
                      >
                        Approve
                      </Button>
                      <Button
                        size="small" variant="contained"
                        startIcon={canModerate ? <CancelOutlinedIcon /> : <LockOutlinedIcon />}
                        onClick={() => openRejectDialog(report.id)}
                        sx={{
                          backgroundColor: canModerate ? colors.redAccent[700] : colors.grey[700],
                          color: canModerate ? colors.redAccent[100] : colors.grey[500],
                          textTransform: "none", fontSize: "12px",
                          "&:hover": { backgroundColor: canModerate ? colors.redAccent[600] : colors.grey[700] },
                        }}
                      >
                        Reject
                      </Button>
                    </Box>
                  )}
                </Box>
              </Box>
            );
          })
        )}
      </Box>

      {/* ----------------------------------------------------------------
          REJECTION REASON DIALOG
          ---------------------------------------------------------------- */}
      <Dialog
        open={rejectDialog.open}
        onClose={closeRejectDialog}
        PaperProps={{ sx: { backgroundColor: colors.primary[400], minWidth: 360 } }}
      >
        <DialogTitle sx={{ color: colors.grey[100], fontSize: "15px", fontWeight: 700 }}>
          Reject Report
        </DialogTitle>
        <DialogContent>
          <Typography color={colors.grey[400]} fontSize="13px" mb="12px">
            Optionally provide a reason for rejection. This will be visible on the report.
          </Typography>
          <TextField
            fullWidth variant="filled" label="Reason (optional)"
            multiline rows={3}
            value={rejectDialog.reason}
            onChange={(e) => setRejectReason(e.target.value)}
          />
        </DialogContent>
        <DialogActions sx={{ px: "24px", pb: "16px" }}>
          <Button
            size="small" onClick={closeRejectDialog}
            sx={{ color: colors.grey[400], textTransform: "none" }}
          >
            Cancel
          </Button>
          <Button
            size="small" variant="contained"
            onClick={handleReject}
            sx={{ backgroundColor: colors.redAccent[700], color: colors.redAccent[100], textTransform: "none", "&:hover": { backgroundColor: colors.redAccent[600] } }}
          >
            Confirm Reject
          </Button>
        </DialogActions>
      </Dialog>

      {/* ----------------------------------------------------------------
          ACCESS DENIED / ERROR DIALOG
          ---------------------------------------------------------------- */}
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

      <Dialog open={confirmDialog.open} onClose={closeConfirmDialog} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <DeleteOutlineOutlinedIcon sx={{ color: colors.redAccent[400] }} />
          {confirmDialog.title}
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ color: colors.grey[300] }}>
            {confirmDialog.message}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeConfirmDialog} size="small">
            Cancel
          </Button>
          <Button onClick={submitConfirmDialog} variant="contained" color="error" size="small">
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* ----------------------------------------------------------------
          TOAST
          ---------------------------------------------------------------- */}
      <Snackbar
        open={toast.open} autoHideDuration={3000}
        onClose={closeToast}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity={toast.severity} onClose={closeToast} sx={{ fontSize: "13px" }}>
          {toast.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default ReportsPage;