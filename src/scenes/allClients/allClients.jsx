import {
  Box,
  Typography,
  useTheme,
  Chip,
  IconButton,
  Collapse,
  Tooltip,
  TextField,
  Button,
  Stack,
  Snackbar,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from "@mui/material";
import { tokens } from "../../theme";
import DeleteOutlineOutlinedIcon from "@mui/icons-material/DeleteOutlineOutlined";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import SearchOutlinedIcon from "@mui/icons-material/SearchOutlined";
import FileDownloadOutlinedIcon from "@mui/icons-material/FileDownloadOutlined";
import UnfoldMoreOutlinedIcon from "@mui/icons-material/UnfoldMoreOutlined";
import UnfoldLessOutlinedIcon from "@mui/icons-material/UnfoldLessOutlined";
import BusinessOutlinedIcon from "@mui/icons-material/BusinessOutlined";
import PrecisionManufacturingOutlinedIcon from "@mui/icons-material/PrecisionManufacturingOutlined";
import WarningAmberOutlinedIcon from "@mui/icons-material/WarningAmberOutlined";
import BuildOutlinedIcon from "@mui/icons-material/BuildOutlined";
import ContentCopyOutlinedIcon from "@mui/icons-material/ContentCopyOutlined";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import Header from "../../components/Header";
import ConfirmDialog from "../../components/ConfirmDialog";

import {
  statusColor,
  isMaintenanceDue,
  useAllClientsLogic,
} from "./allClients.logic";

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
    minWidth="160px"
  >
    <Box color={accent} display="flex" alignItems="center">{icon}</Box>
    <Box>
      <Typography fontSize="20px" fontWeight="700" color={colors.grey[100]} lineHeight={1}>
        {value}
      </Typography>
      <Typography fontSize="11px" color={colors.grey[400]} mt="2px">{label}</Typography>
    </Box>
  </Box>
);

// ════════════════════════════════════════════════════════════════════════════
// MACHINE SUB-ROW
// ════════════════════════════════════════════════════════════════════════════
const MachineSubRow = ({ machines, colors, canDelete, onDeleteMachine, onCopySerial }) => (
  <Box
    sx={{
      backgroundColor: colors.primary[500],
      borderTop: `1px solid ${colors.primary[300]}`,
      px: "20px",
      py: "12px",
    }}
  >
    <Typography variant="h6" color={colors.grey[300]} fontWeight="600" mb="10px">
      Machines ({machines.length})
    </Typography>

    {machines.length === 0 ? (
      <Box py="16px" textAlign="center">
        <PrecisionManufacturingOutlinedIcon sx={{ fontSize: 32, color: colors.grey[600] }} />
        <Typography color={colors.grey[500]} fontSize="13px" mt="6px">
          No machines registered for this client
        </Typography>
      </Box>
    ) : (
      machines.map((m) => {
        const sc = statusColor(m.usageStatus, colors);
        const maintDue = isMaintenanceDue(m.lastMaintenanceDate);
        return (
          <Box
            key={m.id}
            display="flex" alignItems="center" flexWrap="wrap" gap="12px"
            p="10px 14px" mb="6px"
            backgroundColor={colors.primary[400]}
            borderRadius="6px"
            borderLeft={maintDue ? `3px solid ${colors.redAccent[500]}` : `3px solid transparent`}
            sx={{ transition: "border-color 0.2s" }}
          >
            {/* Serial */}
            <Box display="flex" alignItems="center" gap="4px" minWidth="130px">
              <Typography color={colors.greenAccent[400]} fontWeight="700" fontSize="13px">
                {m.serialNumber}
              </Typography>
              <Tooltip title="Copy serial">
                <IconButton size="small" onClick={() => onCopySerial(m.serialNumber)}
                  sx={{ color: colors.grey[600], "&:hover": { color: colors.blueAccent[300] }, p: "2px" }}>
                  <ContentCopyOutlinedIcon sx={{ fontSize: "13px" }} />
                </IconButton>
              </Tooltip>
            </Box>

            <Typography color={colors.grey[200]} minWidth="120px" fontSize="13px">{m.machine}</Typography>
            <Typography color={colors.grey[400]} fontSize="12px" minWidth="70px">Line {m.lineInstalled}</Typography>

            <Box display="flex" alignItems="center" gap="4px" minWidth="155px">
              {maintDue && (
                <Tooltip title="Maintenance due soon or overdue">
                  <WarningAmberOutlinedIcon sx={{ fontSize: "14px", color: colors.redAccent[400] }} />
                </Tooltip>
              )}
              <Typography
                color={maintDue ? colors.redAccent[300] : colors.grey[400]}
                fontSize="12px" fontWeight={maintDue ? 600 : 400}
              >
                Maint: {m.lastMaintenanceDate || "N/A"}
              </Typography>
            </Box>

            <Chip
              label={m.usageStatus} size="small"
              sx={{ backgroundColor: sc.bg, color: sc.text, fontSize: "11px", textTransform: "capitalize", fontWeight: 600 }}
            />

            <Box flex={1} />

            {/* Delete is rendered only for superadmins; for others the slot is empty */}
            {canDelete ? (
              <Tooltip title="Delete machine">
                <IconButton size="small" onClick={() => onDeleteMachine(m.id)} sx={{ color: colors.redAccent[400] }}>
                  <DeleteOutlineOutlinedIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            ) : (
              <Box width="30px" />
            )}
          </Box>
        );
      })
    )}
  </Box>
);

// ════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ════════════════════════════════════════════════════════════════════════════
const AllClients = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);

  const {
    // stats
    totalClients,
    totalMachines,
    maintenanceDueCount,

    // permissions
    canDeleteClients,
    canExportCSV,

    // search / filter
    search,
    setSearch,
    filteredClients,

    // expand / collapse
    expanded,
    allExpanded,
    toggleAll,
    toggleExpand,

    // actions — always call the handler, never the raw helper directly
    handleDeleteClient,
    handleDeleteMachine,
    handleCopySerial,
    handleExportCSV,         // ← permission-guarded; never call exportClientsCSV() directly

    // confirm dialog
    confirmDialog,
    confirmAction,
    closeConfirmDialog,

    // error / info popup
    errorDialog,
    closeErrorDialog,

    // toast
    toast,
    setToast,
  } = useAllClientsLogic();

  return (
    <Box m="20px">
      <Header title="ALL CLIENTS" subtitle="Client Companies & Their Machines" />

      {/* ── stats bar ── */}
      <Stack direction="row" spacing={2} mt="24px" flexWrap="wrap" gap="12px">
        <StatCard icon={<BusinessOutlinedIcon />} label="Total Clients" value={totalClients} accent={colors.greenAccent[500]} colors={colors} />
        <StatCard icon={<PrecisionManufacturingOutlinedIcon />} label="Total Machines" value={totalMachines} accent={colors.blueAccent[400]} colors={colors} />
        <StatCard icon={<BuildOutlinedIcon />} label="Maintenance Due" value={maintenanceDueCount}
          accent={maintenanceDueCount > 0 ? colors.redAccent[400] : colors.grey[500]} colors={colors} />
      </Stack>

      {/* ── toolbar ── */}
      <Box display="flex" alignItems="center" justifyContent="space-between"
        flexWrap="wrap" gap="12px" mt="24px" mb="12px">
        <Stack direction="row" spacing={1.5} alignItems="center">
          <TextField
            variant="outlined" size="small"
            placeholder="Search client, address, serial, machine…"
            value={search} onChange={(e) => setSearch(e.target.value)}
            InputProps={{
              startAdornment: <SearchOutlinedIcon sx={{ color: colors.grey[400], mr: "6px", fontSize: "18px" }} />,
            }}
            sx={{ width: 280, "& .MuiOutlinedInput-root": { backgroundColor: colors.primary[400], fontSize: "13px" } }}
          />
          <Typography color={colors.grey[500]} fontSize="12px" sx={{ whiteSpace: "nowrap" }}>
            {filteredClients.length} / {totalClients} clients
          </Typography>
        </Stack>

        <Stack direction="row" spacing={1}>
          <Tooltip title={allExpanded ? "Collapse all" : "Expand all"}>
            <Button
              size="small" variant="outlined"
              startIcon={allExpanded ? <UnfoldLessOutlinedIcon /> : <UnfoldMoreOutlinedIcon />}
              onClick={toggleAll}
              sx={{ borderColor: colors.grey[600], color: colors.grey[300], fontSize: "12px", textTransform: "none", "&:hover": { borderColor: colors.grey[400] } }}
            >
              {allExpanded ? "Collapse All" : "Expand All"}
            </Button>
          </Tooltip>

          {/* Export — always rendered but visually dimmed for non-admins.
              The handler itself blocks and shows an error dialog. */}
          <Tooltip title={canExportCSV ? "Export to CSV" : "Admin access required to export"}>
            <span>
              <Button
                size="small" variant="outlined"
                startIcon={<FileDownloadOutlinedIcon />}
                onClick={handleExportCSV}
                sx={{
                  borderColor: canExportCSV ? colors.blueAccent[500] : colors.grey[700],
                  color: canExportCSV ? colors.blueAccent[300] : colors.grey[600],
                  fontSize: "12px", textTransform: "none",
                  "&:hover": { borderColor: canExportCSV ? colors.blueAccent[300] : colors.grey[600], backgroundColor: canExportCSV ? colors.blueAccent[900] : "transparent" },
                }}
              >
                Export CSV
              </Button>
            </span>
          </Tooltip>
        </Stack>
      </Box>

      {/* ── client list ── */}
      <Box>
        {filteredClients.length === 0 ? (
          <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center"
            py="60px" backgroundColor={colors.primary[400]} borderRadius="6px">
            <SearchOutlinedIcon sx={{ fontSize: 40, color: colors.grey[600] }} />
            <Typography color={colors.grey[500]} fontSize="14px" mt="10px">
              No clients match "{search}"
            </Typography>
            <Button size="small" onClick={() => setSearch("")}
              sx={{ mt: "8px", color: colors.blueAccent[300], fontSize: "12px", textTransform: "none" }}>
              Clear search
            </Button>
          </Box>
        ) : (
          filteredClients.map((client) => {
            const clientMaintDue = client.machines.filter((m) => isMaintenanceDue(m.lastMaintenanceDate)).length;
            return (
              <Box key={client.id} mb="6px" borderRadius="6px" overflow="hidden">
                {/* client row */}
                <Box
                  display="flex" alignItems="center" backgroundColor={colors.primary[400]}
                  p="12px 16px" gap="14px"
                  sx={{
                    borderLeft: `4px solid ${colors.greenAccent[600]}`,
                    cursor: "pointer",
                    "&:hover": { backgroundColor: colors.primary[300] },
                    transition: "background-color 0.15s",
                  }}
                  onClick={() => toggleExpand(client.id)}
                >
                  <Typography color={colors.grey[600]} minWidth="28px" fontSize="12px">#{client.id}</Typography>
                  <Typography color={colors.greenAccent[300]} fontWeight="700" flex={1.2} fontSize="14px">
                    {client.companyName}
                  </Typography>
                  <Typography color={colors.grey[400]} flex={1.5} fontSize="13px">{client.address}</Typography>

                  <Chip
                    icon={<PrecisionManufacturingOutlinedIcon sx={{ fontSize: "14px !important" }} />}
                    label={`${client.machines.length} machine${client.machines.length !== 1 ? "s" : ""}`}
                    size="small"
                    sx={{ backgroundColor: colors.blueAccent[800], color: colors.blueAccent[200], fontWeight: "bold", fontSize: "11px" }}
                  />

                  {clientMaintDue > 0 && (
                    <Tooltip title={`${clientMaintDue} machine(s) with maintenance due`}>
                      <Chip
                        icon={<WarningAmberOutlinedIcon sx={{ fontSize: "13px !important" }} />}
                        label={`${clientMaintDue} due`} size="small"
                        sx={{
                          backgroundColor: colors.redAccent[800], color: colors.redAccent[300],
                          fontSize: "11px", fontWeight: 600,
                          animation: "pulse 2s infinite",
                          "@keyframes pulse": { "0%, 100%": { opacity: 1 }, "50%": { opacity: 0.6 } },
                        }}
                      />
                    </Tooltip>
                  )}

                  <IconButton size="small"
                    onClick={(e) => { e.stopPropagation(); toggleExpand(client.id); }}
                    sx={{ color: colors.greenAccent[400] }}>
                    {expanded[client.id] ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
                  </IconButton>

                  {/* Delete client — only shown to superadmins */}
                  {canDeleteClients ? (
                    <Tooltip title="Delete client + all machines">
                      <IconButton
                        onClick={(e) => { e.stopPropagation(); handleDeleteClient(client.id); }}
                        sx={{ color: colors.redAccent[400] }} size="small"
                      >
                        <DeleteOutlineOutlinedIcon />
                      </IconButton>
                    </Tooltip>
                  ) : (
                    <Box width="30px" />
                  )}
                </Box>

                {/* expandable machines */}
                <Collapse in={!!expanded[client.id]} unmountOnExit>
                  <MachineSubRow
                    machines={client.machines}
                    colors={colors}
                    canDelete={canDeleteClients}
                    onDeleteMachine={(machineId) => handleDeleteMachine(client.id, machineId)}
                    onCopySerial={handleCopySerial}
                  />
                </Collapse>
              </Box>
            );
          })
        )}
      </Box>

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

export default AllClients;