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
  ToggleButton,
  ToggleButtonGroup,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import { tokens } from "../../theme";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import DeleteOutlineOutlinedIcon from "@mui/icons-material/DeleteOutlineOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import SaveOutlinedIcon from "@mui/icons-material/SaveOutlined";
import CloseOutlinedIcon from "@mui/icons-material/CloseOutlined";
import SearchOutlinedIcon from "@mui/icons-material/SearchOutlined";
import AddOutlinedIcon from "@mui/icons-material/AddOutlined";
import ContentCopyOutlinedIcon from "@mui/icons-material/ContentCopyOutlined";
import WarningAmberOutlinedIcon from "@mui/icons-material/WarningAmberOutlined";
import PrecisionManufacturingOutlinedIcon from "@mui/icons-material/PrecisionManufacturingOutlined";
import BusinessOutlinedIcon from "@mui/icons-material/BusinessOutlined";
import BuildOutlinedIcon from "@mui/icons-material/BuildOutlined";
import ViewModuleOutlinedIcon from "@mui/icons-material/ViewModuleOutlined";
import ViewListOutlinedIcon from "@mui/icons-material/ViewListOutlined";
import FileDownloadOutlinedIcon from "@mui/icons-material/FileDownloadOutlined";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import Header from "../../components/Header";
import ConfirmDialog from "../../components/ConfirmDialog";

import {
  MACHINE_TYPES,
  USAGE_STATUS,
  statusColor,
  isMaintenanceDue,
  formatDate,
  useMachineCardLogic,
  useClientMachinesLogic,
} from "./clientMachine.logic";

// ════════════════════════════════════════════════════════════════════════════
// STAT CARD
// ════════════════════════════════════════════════════════════════════════════
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
      <Typography fontSize="20px" fontWeight="700" color={colors.grey[100]} lineHeight={1}>{value}</Typography>
      <Typography fontSize="11px" color={colors.grey[400]} mt="2px">{label}</Typography>
    </Box>
  </Box>
);

// ════════════════════════════════════════════════════════════════════════════
// MACHINE CARD — edit state from useMachineCardLogic
// canEdit / canDelete passed down from parent so the card doesn't need to
// re-read localStorage itself.
// ════════════════════════════════════════════════════════════════════════════
const MachineCard = ({
  machine, clientId, clientName, colors,
  canEdit, canDelete,
  onDelete, onSave, onCopySerial,
}) => {
  const { isEditing, setIsEditing, editValues, setEditValues, handleSave } =
    useMachineCardLogic(machine, clientId, onSave);

  const sc = statusColor(machine.usageStatus, colors);
  const maintDue = isMaintenanceDue(machine.lastMaintenanceDate, machine.maintenanceCycle);

  return (
    <Box
      backgroundColor={colors.primary[400]}
      borderRadius="6px"
      borderTop={`3px solid ${maintDue ? colors.redAccent[500] : colors.greenAccent[600]}`}
      overflow="hidden"
      sx={{ transition: "box-shadow 0.15s", "&:hover": { boxShadow: `0 2px 12px ${colors.primary[200]}22` } }}
    >
      {/* card header */}
      <Box p="14px 16px" display="flex" justifyContent="space-between" alignItems="flex-start">
        <Box>
          <Box display="flex" alignItems="center" gap="6px">
            <Typography color={colors.greenAccent[400]} fontWeight="700" fontSize="14px">
              {machine.serialNumber}
            </Typography>
            <Tooltip title="Copy serial">
              <IconButton size="small" onClick={() => onCopySerial(machine.serialNumber)}
                sx={{ color: colors.grey[600], "&:hover": { color: colors.blueAccent[300] }, p: "2px" }}>
                <ContentCopyOutlinedIcon sx={{ fontSize: "13px" }} />
              </IconButton>
            </Tooltip>
            {maintDue && (
              <Tooltip title="Maintenance due soon or overdue">
                <WarningAmberOutlinedIcon sx={{ fontSize: "15px", color: colors.redAccent[400] }} />
              </Tooltip>
            )}
          </Box>
          <Typography color={colors.grey[500]} fontSize="11px" mt="2px">{clientName}</Typography>
        </Box>
        <Chip label={machine.machine} size="small"
          sx={{ backgroundColor: colors.blueAccent[800], color: colors.blueAccent[200], fontSize: "11px" }} />
      </Box>

      <Divider sx={{ borderColor: colors.primary[300] }} />

      {/* card body */}
      <Box p="12px 16px" display="flex" flexDirection="column" gap="5px">
        <Typography color={colors.grey[300]} fontSize="12px">
          Line {machine.lineInstalled} · Installed {formatDate(machine.installedDate)}
        </Typography>
        <Typography color={colors.grey[400]} fontSize="12px">
          Cycle: every {machine.maintenanceCycle} month{machine.maintenanceCycle !== 1 ? "s" : ""}
        </Typography>

        {isEditing ? (
          <Box mt="8px" display="flex" flexDirection="column" gap="10px">
            <TextField
              variant="filled" label="Last Maintenance Date" type="date" size="small"
              InputLabelProps={{ shrink: true }} fullWidth
              value={editValues.lastMaintenanceDate}
              onChange={(e) => setEditValues((v) => ({ ...v, lastMaintenanceDate: e.target.value }))}
            />
            <TextField
              select variant="filled" label="Usage Status" size="small" fullWidth
              value={editValues.usageStatus}
              onChange={(e) => setEditValues((v) => ({ ...v, usageStatus: e.target.value }))}
            >
              {USAGE_STATUS.map((s) => (
                <MenuItem key={s} value={s} sx={{ textTransform: "capitalize" }}>{s}</MenuItem>
              ))}
            </TextField>
          </Box>
        ) : (
          <Box mt="4px">
            <Typography
              color={maintDue ? colors.redAccent[300] : colors.grey[400]}
              fontSize="12px" fontWeight={maintDue ? 600 : 400}
            >
              Last maint: {formatDate(machine.lastMaintenanceDate)}{maintDue && " ⚠"}
            </Typography>
            <Chip label={machine.usageStatus} size="small"
              sx={{ mt: "6px", alignSelf: "flex-start", backgroundColor: sc.bg, color: sc.text, textTransform: "capitalize", fontSize: "11px" }} />
          </Box>
        )}
      </Box>

      {/* card actions */}
      <Box px="12px" pb="10px" display="flex" justifyContent="flex-end" gap="6px">
        {isEditing ? (
          <>
            <Tooltip title="Save changes">
              <IconButton size="small" onClick={handleSave} sx={{ color: colors.greenAccent[400] }}>
                <SaveOutlinedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Cancel">
              <IconButton size="small" onClick={() => setIsEditing(false)} sx={{ color: colors.grey[400] }}>
                <CloseOutlinedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </>
        ) : (
          // Edit button: shown to all but calls onSave which is guarded in the logic
          <Tooltip title={canEdit ? "Edit maintenance & status" : "Store access required to edit"}>
            <span>
              <IconButton size="small" onClick={() => setIsEditing(true)}
                disabled={!canEdit}
                sx={{ color: canEdit ? colors.blueAccent[400] : colors.grey[700] }}>
                <EditOutlinedIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
        )}

        {/* Delete: only rendered for superadmins */}
        {canDelete ? (
          <Tooltip title="Delete machine">
            <IconButton size="small" onClick={() => onDelete(clientId, machine.id)} sx={{ color: colors.redAccent[400] }}>
              <DeleteOutlineOutlinedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        ) : (
          <Tooltip title="Superadmin access required to delete">
            <span>
              <IconButton size="small" disabled sx={{ color: colors.grey[700] }}>
                <LockOutlinedIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
        )}
      </Box>
    </Box>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ════════════════════════════════════════════════════════════════════════════
const ClientMachinesPage = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);

  const {
    // data
    clients,
    allMachines,
    maintenanceDueCount,
    filteredClients,
    filteredFlat,

    // permissions
    userCanRegisterMachine,
    userCanEditMachine,
    userCanDeleteMachine,
    userCanExportCSV,

    // search / filters / view
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    clientFilter,
    setClientFilter,
    viewMode,
    setViewMode,
    clearFilters,

    // register form
    formOpen,
    setFormOpen,
    openFormIfAuthorised,  // ← use this instead of setFormOpen(true) directly
    form,
    formError,
    setFormError,
    handleFormChange,
    handleAddMachine,

    // confirm dialog
    confirmDialog,
    confirmAction,
    closeConfirmDialog,

    // error / info popup
    errorDialog,
    closeErrorDialog,

    // actions
    handleDelete,
    handleSave,
    handleCopySerial,
    handleExportCSV,       // ← permission-guarded; never call exportCSV() directly

    // toast
    toast,
    setToast,
  } = useClientMachinesLogic();

  // ── table columns ──────────────────────────────────────────────────────────
  const tableColumns = [
    {
      field: "serialNumber", headerName: "Serial", flex: 1,
      renderCell: ({ value }) => (
        <Box display="flex" alignItems="center" gap="4px">
          <Typography color={colors.greenAccent[300]} fontWeight={700} fontSize="13px">{value}</Typography>
          <Tooltip title="Copy serial">
            <IconButton size="small" onClick={() => handleCopySerial(value)}
              sx={{ color: colors.grey[600], "&:hover": { color: colors.blueAccent[300] }, p: "2px" }}>
              <ContentCopyOutlinedIcon sx={{ fontSize: "13px" }} />
            </IconButton>
          </Tooltip>
        </Box>
      ),
    },
    {
      field: "machine", headerName: "Type", flex: 0.9,
      renderCell: ({ value }) => (
        <Chip label={value} size="small"
          sx={{ backgroundColor: colors.blueAccent[800], color: colors.blueAccent[200], fontSize: "11px" }} />
      ),
    },
    { field: "clientName", headerName: "Client", flex: 1 },
    { field: "lineInstalled", headerName: "Line", width: 70, type: "number", headerAlign: "left", align: "left" },
    {
      field: "lastMaintenanceDate", headerName: "Last Maint.", flex: 0.9,
      renderCell: ({ row }) => {
        const due = isMaintenanceDue(row.lastMaintenanceDate, row.maintenanceCycle);
        return (
          <Box display="flex" alignItems="center" gap="4px">
            {due && <WarningAmberOutlinedIcon sx={{ fontSize: "14px", color: colors.redAccent[400] }} />}
            <Typography fontSize="12px" color={due ? colors.redAccent[300] : colors.grey[300]} fontWeight={due ? 600 : 400}>
              {formatDate(row.lastMaintenanceDate)}
            </Typography>
          </Box>
        );
      },
    },
    {
      field: "usageStatus", headerName: "Status", width: 110,
      renderCell: ({ value }) => {
        const sc = statusColor(value, colors);
        return (
          <Chip label={value} size="small"
            sx={{ backgroundColor: sc.bg, color: sc.text, textTransform: "capitalize", fontSize: "11px" }} />
        );
      },
    },
    {
      field: "actions", headerName: "", width: 80, sortable: false,
      renderCell: ({ row }) =>
        userCanDeleteMachine ? (
          <Tooltip title="Delete machine">
            <IconButton size="small" onClick={() => handleDelete(row.clientId, row.id)}
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
        ),
    },
  ];

  // ── render ─────────────────────────────────────────────────────────────────
  return (
    <Box m="20px">
      <Header title="CLIENT MACHINES" subtitle="Equipment Tracking by Client" />

      {/* stats */}
      <Stack direction="row" spacing={2} mt="24px" flexWrap="wrap" gap="12px">
        <StatCard icon={<PrecisionManufacturingOutlinedIcon />} label="Total Machines" value={allMachines.length} accent={colors.greenAccent[500]} colors={colors} />
        <StatCard icon={<BusinessOutlinedIcon />} label="Clients Tracked" value={clients.length} accent={colors.blueAccent[400]} colors={colors} />
        <StatCard icon={<BuildOutlinedIcon />} label="Maintenance Due" value={maintenanceDueCount}
          accent={maintenanceDueCount > 0 ? colors.redAccent[400] : colors.grey[500]} colors={colors} />
      </Stack>

      {/* ── register form ── */}
      <Box mt="24px" mb="16px" backgroundColor={colors.primary[400]} borderRadius="6px" overflow="hidden">
        <Box
          display="flex" justifyContent="space-between" alignItems="center"
          p="12px 16px"
          // Header click uses openFormIfAuthorised so non-store users get the
          // error dialog instead of the form opening silently.
          sx={{ cursor: "pointer" }}
          onClick={() => formOpen ? setFormOpen(false) : openFormIfAuthorised()}
        >
          <Box display="flex" alignItems="center" gap="8px">
            <AddOutlinedIcon sx={{ color: userCanRegisterMachine ? colors.greenAccent[400] : colors.grey[600], fontSize: "18px" }} />
            <Typography color={userCanRegisterMachine ? colors.grey[100] : colors.grey[500]} fontWeight="600" fontSize="14px">
              Register New Machine
              {!userCanRegisterMachine && (
                <Typography component="span" fontSize="11px" color={colors.grey[600]} ml="8px">
                  (store access required)
                </Typography>
              )}
            </Typography>
          </Box>
          <IconButton size="small" sx={{ color: userCanRegisterMachine ? colors.greenAccent[400] : colors.grey[600] }}>
            {formOpen ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
          </IconButton>
        </Box>

        <Collapse in={formOpen}>
          <Box p="16px" display="grid" gridTemplateColumns="repeat(4, 1fr)" gap="14px"
            borderTop={`1px solid ${colors.primary[300]}`}>
            <TextField variant="filled" label="Serial Number" name="serialNumber"
              value={form.serialNumber} onChange={handleFormChange} fullWidth
              error={!!formError && !form.serialNumber} />
            <TextField select variant="filled" label="Client" name="clientId"
              value={form.clientId} onChange={handleFormChange} fullWidth
              error={!!formError && !form.clientId}>
              {clients.map((c) => <MenuItem key={c.id} value={c.id}>{c.companyName}</MenuItem>)}
            </TextField>
            <TextField select variant="filled" label="Machine Type" name="machine"
              value={form.machine} onChange={handleFormChange} fullWidth
              error={!!formError && !form.machine}>
              {MACHINE_TYPES.map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
            </TextField>
            <TextField variant="filled" label="Line Number" name="lineInstalled" type="number"
              value={form.lineInstalled} onChange={handleFormChange} fullWidth
              error={!!formError && !form.lineInstalled} />
            <TextField variant="filled" label="Installation Date" name="installedDate" type="date"
              InputLabelProps={{ shrink: true }} value={form.installedDate} onChange={handleFormChange}
              fullWidth error={!!formError && !form.installedDate} />
            <TextField variant="filled" label="Maintenance Cycle (months)" name="maintenanceCycle"
              type="number" value={form.maintenanceCycle} onChange={handleFormChange} fullWidth
              error={!!formError && !form.maintenanceCycle} />
            <TextField select variant="filled" label="Usage Status" name="usageStatus"
              value={form.usageStatus} onChange={handleFormChange} fullWidth>
              {USAGE_STATUS.map((s) => (
                <MenuItem key={s} value={s} sx={{ textTransform: "capitalize" }}>{s}</MenuItem>
              ))}
            </TextField>
            <Box display="flex" alignItems="center" gap="10px" justifyContent="flex-end">
              <Button size="small" variant="outlined"
                onClick={() => { setFormOpen(false); setFormError(""); }}
                sx={{ borderColor: colors.grey[600], color: colors.grey[300], textTransform: "none" }}>
                Cancel
              </Button>
              <Button variant="contained" color="secondary" onClick={handleAddMachine}
                sx={{ height: "40px", px: "20px", textTransform: "none" }}>
                Register
              </Button>
            </Box>

            {formError && (
              <Box sx={{ gridColumn: "span 4" }}>
                <Alert severity="error" sx={{ fontSize: "12px", py: "2px" }}>{formError}</Alert>
              </Box>
            )}
          </Box>
        </Collapse>
      </Box>

      {/* ── toolbar ── */}
      <Box display="flex" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap="12px" mb="16px">
        <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap">
          <TextField
            variant="outlined" size="small"
            placeholder="Search serial, machine type, client…"
            value={search} onChange={(e) => setSearch(e.target.value)}
            InputProps={{
              startAdornment: <SearchOutlinedIcon sx={{ color: colors.grey[400], mr: "6px", fontSize: "18px" }} />,
            }}
            sx={{ width: 260, "& .MuiOutlinedInput-root": { backgroundColor: colors.primary[400], fontSize: "13px" } }}
          />
          <TextField select variant="outlined" size="small" label="Status"
            value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
            sx={{ minWidth: 130, "& .MuiOutlinedInput-root": { backgroundColor: colors.primary[400], fontSize: "13px" } }}>
            <MenuItem value="all">All Statuses</MenuItem>
            {USAGE_STATUS.map((s) => (
              <MenuItem key={s} value={s} sx={{ textTransform: "capitalize" }}>{s}</MenuItem>
            ))}
          </TextField>
          <TextField select variant="outlined" size="small" label="Client"
            value={clientFilter} onChange={(e) => setClientFilter(e.target.value)}
            sx={{ minWidth: 160, "& .MuiOutlinedInput-root": { backgroundColor: colors.primary[400], fontSize: "13px" } }}>
            <MenuItem value="all">All Clients</MenuItem>
            {clients.map((c) => <MenuItem key={c.id} value={String(c.id)}>{c.companyName}</MenuItem>)}
          </TextField>
          <Typography color={colors.grey[500]} fontSize="12px" sx={{ whiteSpace: "nowrap" }}>
            {filteredFlat.length} / {allMachines.length} machines
          </Typography>
        </Stack>

        <Stack direction="row" spacing={1} alignItems="center">
          <ToggleButtonGroup
            value={viewMode} exclusive size="small"
            onChange={(_, v) => v && setViewMode(v)}
            sx={{
              "& .MuiToggleButton-root": { border: `1px solid ${colors.grey[700]}`, color: colors.grey[400], px: "10px" },
              "& .Mui-selected": { backgroundColor: `${colors.blueAccent[800]} !important`, color: `${colors.blueAccent[200]} !important` },
            }}
          >
            <ToggleButton value="cards"><ViewModuleOutlinedIcon sx={{ fontSize: "18px" }} /></ToggleButton>
            <ToggleButton value="table"><ViewListOutlinedIcon sx={{ fontSize: "18px" }} /></ToggleButton>
          </ToggleButtonGroup>

          <Tooltip title={userCanExportCSV ? "Export to CSV" : "Admin access required to export"}>
            <span>
              <Button
                size="small" variant="outlined"
                startIcon={<FileDownloadOutlinedIcon />}
                onClick={handleExportCSV}
                sx={{
                  borderColor: userCanExportCSV ? colors.blueAccent[500] : colors.grey[700],
                  color: userCanExportCSV ? colors.blueAccent[300] : colors.grey[600],
                  fontSize: "12px", textTransform: "none",
                  "&:hover": {
                    borderColor: userCanExportCSV ? colors.blueAccent[300] : colors.grey[600],
                    backgroundColor: userCanExportCSV ? colors.blueAccent[900] : "transparent",
                  },
                }}
              >
                Export CSV
              </Button>
            </span>
          </Tooltip>
        </Stack>
      </Box>

      {/* empty state */}
      {filteredFlat.length === 0 && (
        <Box py="60px" display="flex" flexDirection="column" alignItems="center"
          backgroundColor={colors.primary[400]} borderRadius="6px">
          <PrecisionManufacturingOutlinedIcon sx={{ fontSize: 40, color: colors.grey[600] }} />
          <Typography color={colors.grey[500]} fontSize="14px" mt="10px">No machines match your filters</Typography>
          <Button size="small" onClick={clearFilters}
            sx={{ mt: "8px", color: colors.blueAccent[300], fontSize: "12px", textTransform: "none" }}>
            Clear filters
          </Button>
        </Box>
      )}

      {/* ── CARD VIEW ── */}
      {viewMode === "cards" && filteredFlat.length > 0 &&
        filteredClients.map((client) => (
          <Box key={client.id} mb="28px">
            <Box display="flex" alignItems="center" gap="10px" mb="10px"
              borderBottom={`2px solid ${colors.greenAccent[700]}`} pb="6px">
              <Typography color={colors.grey[100]} fontWeight="700" fontSize="15px">
                {client.companyName}
              </Typography>
              <Chip
                label={`${client.machines.length} machine${client.machines.length !== 1 ? "s" : ""}`}
                size="small"
                sx={{ backgroundColor: colors.blueAccent[800], color: colors.blueAccent[200], fontSize: "11px" }} />
            </Box>
            <Box display="grid" gridTemplateColumns="repeat(auto-fill, minmax(290px, 1fr))" gap="12px">
              {client.machines.map((machine) => (
                <MachineCard
                  key={machine.id}
                  machine={machine}
                  clientId={client.id}
                  clientName={client.companyName}
                  colors={colors}
                  canEdit={userCanEditMachine}
                  canDelete={userCanDeleteMachine}
                  onDelete={handleDelete}
                  onSave={handleSave}
                  onCopySerial={handleCopySerial}
                />
              ))}
            </Box>
          </Box>
        ))
      }

      {/* ── TABLE VIEW ── */}
      {viewMode === "table" && filteredFlat.length > 0 && (
        <Box height="60vh" sx={{
          "& .MuiDataGrid-root": { border: "none" },
          "& .MuiDataGrid-cell": { borderBottom: "none" },
          "& .MuiDataGrid-columnHeaders": { backgroundColor: colors.blueAccent[700], borderBottom: "none", fontSize: "13px" },
          "& .MuiDataGrid-virtualScroller": { backgroundColor: colors.primary[400] },
          "& .MuiDataGrid-footerContainer": { borderTop: "none", backgroundColor: colors.blueAccent[700] },
          "& .MuiDataGrid-row:hover": { backgroundColor: `${colors.primary[300]}55` },
        }}>
          <DataGrid rows={filteredFlat} columns={tableColumns} rowHeight={52} />
        </Box>
      )}

      {/* ── confirm dialog ── */}
      <ConfirmDialog
        open={confirmDialog.open}
        title={confirmDialog.title}
        message={confirmDialog.message}
        onConfirm={confirmAction}
        onClose={closeConfirmDialog}
      />

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

export default ClientMachinesPage;