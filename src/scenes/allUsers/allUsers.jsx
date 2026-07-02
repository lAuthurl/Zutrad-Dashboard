import {
  Box,
  Typography,
  useTheme,
  Chip,
  IconButton,
  Tooltip,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Button,
  Snackbar,
  Alert,
  Stack,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from "@mui/material";
import { DataGrid, GridToolbarColumnsButton, GridToolbarDensitySelector } from "@mui/x-data-grid";
import { tokens } from "../../theme";
import AdminPanelSettingsOutlinedIcon from "@mui/icons-material/AdminPanelSettingsOutlined";
import LockOpenOutlinedIcon from "@mui/icons-material/LockOpenOutlined";
import EngineeringOutlinedIcon from "@mui/icons-material/EngineeringOutlined";
import DeleteOutlineOutlinedIcon from "@mui/icons-material/DeleteOutlineOutlined";
import FileDownloadOutlinedIcon from "@mui/icons-material/FileDownloadOutlined";
import ContentCopyOutlinedIcon from "@mui/icons-material/ContentCopyOutlined";
import SearchOutlinedIcon from "@mui/icons-material/SearchOutlined";
import DeleteSweepOutlinedIcon from "@mui/icons-material/DeleteSweepOutlined";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import WarningAmberOutlinedIcon from "@mui/icons-material/WarningAmberOutlined";
import Header from "../../components/Header";

// NOTE: exportToCSV and exportToJSON are intentionally NOT imported.
// Always use the guarded handleExportCSV / handleExportJSON from the hook.
import { roleBg, useAllUsersLogic } from "./allUsers.logic";

// ════════════════════════════════════════════════════════════════════════════
// ROLE ICON (JSX stays in the UI file)
// ════════════════════════════════════════════════════════════════════════════
const roleIcon = (role) => {
  if (role === "administrator") return <AdminPanelSettingsOutlinedIcon sx={{ fontSize: "16px" }} />;
  if (role === "engineer")      return <EngineeringOutlinedIcon sx={{ fontSize: "16px" }} />;
  return <LockOpenOutlinedIcon sx={{ fontSize: "16px" }} />;
};

// ════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ════════════════════════════════════════════════════════════════════════════
const AllUsers = () => {
  const theme  = useTheme();
  const colors = tokens(theme.palette.mode);

  const {
    // data
    rows,
    filteredRows,
    currentUserId,

    // permissions
    canDelete,
    canExport,

    // search / filters
    search,
    setSearch,
    roleFilter,
    setRoleFilter,
    statusFilter,
    setStatusFilter,
    clearFilters,

    // selection
    selectedIds,
    setSelectedIds,

    // confirm dialog
    confirmDialog,
    confirmAction,
    closeConfirmDialog,

    // error / info popup
    errorDialog,
    closeErrorDialog,

    // actions — call only the guarded handlers, never raw helpers
    handleDelete,
    handleBulkDelete,
    handleCopyEmail,
    handleExportCSV,
    handleExportJSON,

    // toast
    toast,
    setToast,
  } = useAllUsersLogic();

  // ── columns ────────────────────────────────────────────────────────────────
  const columns = [
    { field: "id", headerName: "ID", width: 60 },
    {
      field: "name",
      headerName: "Name",
      flex: 1,
      cellClassName: "name-column--cell",
      valueGetter: (params) => `${params.row.firstName} ${params.row.surname}`,
    },
    {
      field: "email",
      headerName: "Email",
      flex: 1.2,
      renderCell: ({ row: { email } }) => (
        <Box display="flex" alignItems="center" gap="4px">
          <Typography fontSize="13px" color={colors.grey[200]}>{email}</Typography>
          <Tooltip title="Copy email">
            <IconButton size="small" onClick={() => handleCopyEmail(email)}
              sx={{ color: colors.grey[500], "&:hover": { color: colors.blueAccent[300] } }}>
              <ContentCopyOutlinedIcon sx={{ fontSize: "14px" }} />
            </IconButton>
          </Tooltip>
        </Box>
      ),
    },
    {
      field: "role",
      headerName: "Role",
      flex: 1,
      renderCell: ({ row: { role } }) => (
        <Box px="10px" py="4px" display="flex" alignItems="center" gap="6px"
          backgroundColor={roleBg(role, colors)} borderRadius="4px">
          {roleIcon(role)}
          <Typography color={colors.grey[100]} fontSize="12px" sx={{ textTransform: "capitalize" }}>
            {role}
          </Typography>
        </Box>
      ),
    },
    {
      field: "permissions",
      headerName: "Special Permissions",
      flex: 1.5,
      renderCell: ({ row: { permissions, role } }) => (
        <Box display="flex" gap="4px" flexWrap="wrap" alignItems="center">
          {role === "administrator" || role === "superadmin" ? (
            <Chip label="All" size="small"
              sx={{ backgroundColor: colors.greenAccent[800], color: colors.greenAccent[200], fontSize: "11px", height: "20px", fontWeight: 700 }} />
          ) : permissions.length === 0 ? (
            <Typography color={colors.grey[600]} fontSize="12px">None</Typography>
          ) : (
            permissions.map((p) => (
              <Chip key={p} label={p} size="small"
                sx={{ backgroundColor: colors.blueAccent[800], color: colors.blueAccent[200], fontSize: "11px", height: "20px", textTransform: "capitalize" }} />
            ))
          )}
        </Box>
      ),
    },
    {
      field: "isFirstLogin",
      headerName: "Status",
      width: 130,
      renderCell: ({ row: { isFirstLogin } }) => (
        <Box display="flex" alignItems="center" gap="6px">
          {isFirstLogin && (
            <Box sx={{
              width: 7, height: 7, borderRadius: "50%",
              backgroundColor: colors.redAccent[400],
              animation: "pulse 1.5s infinite",
              "@keyframes pulse": { "0%, 100%": { opacity: 1 }, "50%": { opacity: 0.3 } },
            }} />
          )}
          <Chip
            label={isFirstLogin ? "Pending Setup" : "Active"} size="small"
            sx={{
              backgroundColor: isFirstLogin ? colors.redAccent[800] : colors.greenAccent[800],
              color: isFirstLogin ? colors.redAccent[300] : colors.greenAccent[300],
              fontSize: "11px",
            }}
          />
        </Box>
      ),
    },
    {
      field: "actions",
      headerName: "",
      width: 60,
      sortable: false,
      renderCell: ({ row: { id } }) => {
        const isSelf = id === currentUserId;
        return (
          <Tooltip title={
            isSelf      ? "Cannot delete yourself" :
            !canDelete  ? "Superadmin access required to delete" :
                          "Delete user"
          }>
            <span>
              <IconButton
                onClick={() => handleDelete(id)}
                // Visually disabled for self; still clickable for non-superadmins
                // so they get the error dialog explaining why.
                disabled={isSelf}
                sx={{ color: isSelf ? colors.grey[700] : colors.redAccent[400] }}
              >
                <DeleteOutlineOutlinedIcon />
              </IconButton>
            </span>
          </Tooltip>
        );
      },
    },
  ];

  // ── render ─────────────────────────────────────────────────────────────────
  return (
    <Box m="20px">
      <Header title="ALL USERS" subtitle="Managing System Users & Permissions" />

      {/* ── toolbar ── */}
      <Box display="flex" flexWrap="wrap" gap="12px" alignItems="center"
        justifyContent="space-between" mt="24px" mb="12px">

        {/* left: search + filters */}
        <Stack direction="row" spacing={1.5} flexWrap="wrap" alignItems="center">
          <TextField
            variant="outlined" size="small" placeholder="Search name or email…"
            value={search} onChange={(e) => setSearch(e.target.value)}
            InputProps={{
              startAdornment: <SearchOutlinedIcon sx={{ color: colors.grey[400], mr: "6px", fontSize: "18px" }} />,
            }}
            sx={{ width: 220, "& .MuiOutlinedInput-root": { backgroundColor: colors.primary[400], fontSize: "13px" } }}
          />

          <FormControl size="small" sx={{ minWidth: 130 }}>
            <InputLabel sx={{ fontSize: "13px" }}>Role</InputLabel>
            <Select value={roleFilter} label="Role" onChange={(e) => setRoleFilter(e.target.value)}
              sx={{ backgroundColor: colors.primary[400], fontSize: "13px" }}>
              <MenuItem value="all">All Roles</MenuItem>
              <MenuItem value="administrator">Administrator</MenuItem>
              <MenuItem value="engineer">Engineer</MenuItem>
              <MenuItem value="user">User</MenuItem>
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 130 }}>
            <InputLabel sx={{ fontSize: "13px" }}>Status</InputLabel>
            <Select value={statusFilter} label="Status" onChange={(e) => setStatusFilter(e.target.value)}
              sx={{ backgroundColor: colors.primary[400], fontSize: "13px" }}>
              <MenuItem value="all">All Statuses</MenuItem>
              <MenuItem value="active">Active</MenuItem>
              <MenuItem value="pending">Pending Setup</MenuItem>
            </Select>
          </FormControl>

          <Typography color={colors.grey[400]} fontSize="12px" sx={{ whiteSpace: "nowrap" }}>
            {filteredRows.length} / {rows.length} users
          </Typography>
        </Stack>

        {/* right: bulk delete + export */}
        <Stack direction="row" spacing={1} alignItems="center">
          {selectedIds.length > 0 && (
            <>
              <Tooltip title={!canDelete ? "Superadmin access required to delete" : ""}>
                <span>
                  <Button
                    variant="contained" size="small"
                    startIcon={canDelete ? <DeleteSweepOutlinedIcon /> : <LockOutlinedIcon />}
                    onClick={handleBulkDelete}
                    sx={{
                      backgroundColor: canDelete ? colors.redAccent[700] : colors.grey[700],
                      "&:hover": { backgroundColor: canDelete ? colors.redAccent[600] : colors.grey[700] },
                      fontSize: "12px", textTransform: "none",
                    }}
                  >
                    Delete {selectedIds.length} selected
                  </Button>
                </span>
              </Tooltip>
              <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
            </>
          )}

          {/* Export CSV */}
          <Tooltip title={canExport ? "Export users to CSV" : "Admin access required to export"}>
            <span>
              <Button
                variant="outlined" size="small"
                startIcon={canExport ? <FileDownloadOutlinedIcon /> : <LockOutlinedIcon />}
                onClick={handleExportCSV}
                sx={{
                  borderColor: canExport ? colors.blueAccent[500] : colors.grey[700],
                  color:       canExport ? colors.blueAccent[300] : colors.grey[600],
                  fontSize: "12px", textTransform: "none",
                  "&:hover": {
                    borderColor:     canExport ? colors.blueAccent[300] : colors.grey[600],
                    backgroundColor: canExport ? colors.blueAccent[900] : "transparent",
                  },
                }}
              >
                Export CSV
              </Button>
            </span>
          </Tooltip>

          {/* Export JSON */}
          <Tooltip title={canExport ? "Export users to JSON" : "Admin access required to export"}>
            <span>
              <Button
                variant="outlined" size="small"
                startIcon={canExport ? <FileDownloadOutlinedIcon /> : <LockOutlinedIcon />}
                onClick={handleExportJSON}
                sx={{
                  borderColor: canExport ? colors.greenAccent[600] : colors.grey[700],
                  color:       canExport ? colors.greenAccent[400] : colors.grey[600],
                  fontSize: "12px", textTransform: "none",
                  "&:hover": {
                    borderColor:     canExport ? colors.greenAccent[400] : colors.grey[600],
                    backgroundColor: canExport ? colors.greenAccent[900] : "transparent",
                  },
                }}
              >
                Export JSON
              </Button>
            </span>
          </Tooltip>
        </Stack>
      </Box>

      {/* ── data grid ── */}
      <Box height="70vh" sx={{
        "& .MuiDataGrid-root": { border: "none" },
        "& .MuiDataGrid-cell": { borderBottom: "none" },
        "& .name-column--cell": { color: colors.greenAccent[300], fontWeight: 600 },
        "& .MuiDataGrid-columnHeaders": { backgroundColor: colors.blueAccent[700], borderBottom: "none", fontSize: "13px" },
        "& .MuiDataGrid-virtualScroller": { backgroundColor: colors.primary[400] },
        "& .MuiDataGrid-footerContainer": { borderTop: "none", backgroundColor: colors.blueAccent[700] },
        "& .MuiCheckbox-root": { color: `${colors.greenAccent[200]} !important` },
        "& .MuiDataGrid-row:hover": { backgroundColor: `${colors.primary[300]}55`, cursor: "default" },
        "& .MuiDataGrid-overlay": { backgroundColor: colors.primary[400] },
      }}>
        <DataGrid
          checkboxSelection
          disableRowSelectionOnClick
          rows={filteredRows}
          columns={columns}
          rowHeight={52}
          onRowSelectionModelChange={(ids) => setSelectedIds(ids)}
          rowSelectionModel={selectedIds}
          slots={{
            toolbar: () => (
              <Box px="8px" pt="6px" display="flex" gap="4px">
                <GridToolbarColumnsButton />
                <GridToolbarDensitySelector />
              </Box>
            ),
            noRowsOverlay: () => (
              <Box display="flex" flexDirection="column" alignItems="center"
                justifyContent="center" height="100%" gap="8px">
                <SearchOutlinedIcon sx={{ fontSize: "40px", color: colors.grey[600] }} />
                <Typography color={colors.grey[500]} fontSize="14px">No users match your filters</Typography>
                <Button size="small" onClick={clearFilters}
                  sx={{ color: colors.blueAccent[300], fontSize: "12px", textTransform: "none" }}>
                  Clear filters
                </Button>
              </Box>
            ),
          }}
        />
      </Box>

      {/* ── confirm dialog (replaces window.confirm) ── */}
      <Dialog open={confirmDialog.open} onClose={closeConfirmDialog} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <WarningAmberOutlinedIcon sx={{ color: colors.redAccent[400] }} />
          {confirmDialog.title}
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ color: colors.grey[300] }}>
            {confirmDialog.message}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeConfirmDialog} sx={{ color: colors.grey[300] }} size="small">
            Cancel
          </Button>
          <Button onClick={confirmAction} variant="contained" color="error" size="small">
            Delete
          </Button>
        </DialogActions>
      </Dialog>

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

      {/* ── toast ── */}
      <Snackbar
        open={toast.open} autoHideDuration={3000}
        onClose={() => setToast((t) => ({ ...t, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity={toast.severity} onClose={() => setToast((t) => ({ ...t, open: false }))} sx={{ fontSize: "13px" }}>
          {toast.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default AllUsers;