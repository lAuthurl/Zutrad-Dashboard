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
  Tabs,
  Tab,
  Chip,
  Tooltip,
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
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import Inventory2Icon from "@mui/icons-material/Inventory2";
import LayersIcon from "@mui/icons-material/Layers";
import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";
import DeleteOutlineOutlinedIcon from "@mui/icons-material/DeleteOutlineOutlined";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import Header from "../../components/Header";
import {
  MACHINE_TYPES,
  LOW_STOCK_THRESHOLD,
  useStorePage,
} from "./store.logic";

/* =========================================================================
   SUMMARY CARD — small presentational sub-component for the 3 stat tiles
   ========================================================================= */

const SummaryCard = ({ icon, label, value, accent, colors, onClick, active }) => (
  <Box
    onClick={onClick}
    backgroundColor={colors.primary[400]}
    borderRadius="4px"
    p="16px 20px"
    display="flex"
    alignItems="center"
    gap="14px"
    borderLeft={`4px solid ${accent}`}
    flex="1"
    minWidth="180px"
    sx={{
      cursor: onClick ? "pointer" : "default",
      outline: active ? `2px solid ${accent}` : "none",
      transition: "outline 0.15s ease",
    }}
  >
    <Box sx={{ color: accent, display: "flex", alignItems: "center", fontSize: "28px" }}>
      {icon}
    </Box>
    <Box>
      <Typography variant="h4" fontWeight="700" color={colors.grey[100]}>
        {value}
      </Typography>
      <Typography color={colors.grey[400]} fontSize="12px">
        {label}
      </Typography>
    </Box>
  </Box>
);

/* =========================================================================
   DATAGRID COLUMNS — built here (not in the logic file) because the
   quantity column needs JSX (+/- buttons with icons) and theme colors.
   The +/- buttons stay visible/enabled for everyone; adjustQuantity itself
   shows the access-denied dialog if the user lacks store permission.
   The delete column always renders; non-superadmins get a disabled lock
   icon instead of the action being hidden entirely.
   ========================================================================= */

const buildColumns = ({
  isAllTab,
  colors,
  adjustQuantity,
  canDelete,
  handleDelete,
}) => [
  { field: "id", headerName: "ID", width: 80 },
  {
    field: "serialNumber",
    headerName: "Serial Number",
    flex: 1,
    cellClassName: "name-column--cell",
  },
  { field: "partNumber", headerName: "Part Number", flex: 1 },
  { field: "machinePart", headerName: "Description", flex: 1.5 },
  ...(isAllTab
    ? [{ field: "machine", headerName: "Machine", flex: 1 }]
    : []),
  {
    field: "quantity",
    headerName: "Qty",
    width: 160,
    type: "number",
    headerAlign: "left",
    align: "left",
    sortComparator: (a, b) => a - b,
    renderCell: ({ row }) => {
      const low = row.quantity <= LOW_STOCK_THRESHOLD;
      return (
        <Box display="flex" alignItems="center" gap="6px">
          <IconButton
            size="small"
            onClick={() => adjustQuantity(row.id, -1)}
            disabled={row.quantity <= 0}
            sx={{ color: colors.redAccent[400], p: "2px" }}
          >
            <RemoveIcon fontSize="small" />
          </IconButton>
          <Typography
            color={low ? colors.redAccent[400] : colors.grey[100]}
            fontWeight={low ? "700" : "400"}
            minWidth="28px"
            textAlign="center"
          >
            {row.quantity}
            {low && " ⚠"}
          </Typography>
          <IconButton
            size="small"
            onClick={() => adjustQuantity(row.id, 1)}
            sx={{ color: colors.greenAccent[400], p: "2px" }}
          >
            <AddIcon fontSize="small" />
          </IconButton>
        </Box>
      );
    },
  },
  {
    field: "updatedAtDisplay",
    headerName: "Last Updated",
    flex: 1,
  },
  // ── delete column — always visible; disabled lock icon for non-superadmins ──
  {
    field: "actions",
    headerName: "",
    width: 60,
    sortable: false,
    renderCell: ({ row }) =>
      canDelete ? (
        <Tooltip title="Delete part">
          <IconButton
            size="small"
            onClick={() => handleDelete(row.id)}
            sx={{ color: colors.redAccent[400] }}
          >
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
      ),
  },
];

/* =========================================================================
   MAIN COMPONENT
   ========================================================================= */

const StorePage = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);

  const {
    rows,
    filtered,
    summary,
    isAllTab,
    currentMachineType,
    activeTab,
    handleTabChange,
    formOpen,
    setFormOpen,
    openFormIfAuthorised,
    form,
    handleFormChange,
    handleAdd,
    adjustQuantity,
    handleDelete,
    search,
    setSearch,
    lowStockOnly,
    toggleLowStockOnly,
    clearLowStockOnly,
    handleExport,
    confirmDialog,
    closeConfirmDialog,
    submitConfirmDialog,
    successMsg,
    errorDialog,
    closeErrorDialog,
    canAddPart,
    canDelete,
    canExport,
  } = useStorePage();

  const columns = buildColumns({
    isAllTab,
    colors,
    adjustQuantity,
    canDelete,
    handleDelete,
  });

  return (
    <Box m="20px">
      {/* ----------------------------------------------------------------
          HEADER + EXPORT BUTTON — always visible; gated inside handleExport
          ---------------------------------------------------------------- */}
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="flex-start"
        flexWrap="wrap"
        gap="12px"
      >
        <Header title="STORE" subtitle="Parts Inventory by Machine Type" />
        <Tooltip title={canExport ? "Export to CSV" : "Admin access required to export"}>
          <span>
            <Button
              variant="outlined"
              startIcon={<FileDownloadIcon />}
              onClick={handleExport}
              sx={{
                borderColor: canExport ? colors.greenAccent[600] : colors.grey[700],
                color: canExport ? colors.greenAccent[400] : colors.grey[600],
                height: "40px",
                "&:hover": {
                  borderColor: canExport ? colors.greenAccent[400] : colors.grey[600],
                  backgroundColor: canExport ? colors.greenAccent[900] : "transparent",
                },
              }}
            >
              Export CSV ({filtered.length})
            </Button>
          </span>
        </Tooltip>
      </Box>

      {successMsg && (
        <Alert severity="success" sx={{ mb: "16px", mt: "8px" }}>
          {successMsg}
        </Alert>
      )}

      {/* ----------------------------------------------------------------
          SUMMARY CARDS
          ---------------------------------------------------------------- */}
      <Box display="flex" gap="14px" flexWrap="wrap" mb="20px" mt="16px">
        <SummaryCard
          icon={<Inventory2Icon fontSize="inherit" />}
          label="Total Parts"
          value={summary.totalParts}
          accent={colors.grey[300]}
          colors={colors}
        />
        <SummaryCard
          icon={<LayersIcon fontSize="inherit" />}
          label="Total Quantity on Hand"
          value={summary.totalQuantity}
          accent={colors.blueAccent[400]}
          colors={colors}
        />
        <SummaryCard
          icon={<WarningAmberIcon fontSize="inherit" />}
          label={`Low Stock (≤ ${LOW_STOCK_THRESHOLD})`}
          value={summary.lowStockCount}
          accent="#c0392b"
          colors={colors}
          onClick={toggleLowStockOnly}
          active={lowStockOnly}
        />
      </Box>

      {lowStockOnly && (
        <Chip
          label="Showing low-stock items only — click again to clear"
          onDelete={clearLowStockOnly}
          sx={{
            mb: "16px",
            backgroundColor: "#7a1f1f",
            color: "#ff8a8a",
            fontWeight: "600",
          }}
        />
      )}

      {/* ----------------------------------------------------------------
          MACHINE TYPE TABS (+ All)
          ---------------------------------------------------------------- */}
      <Tabs
        value={activeTab}
        onChange={handleTabChange}
        sx={{
          mb: "20px",
          "& .MuiTab-root": { color: colors.grey[300], fontWeight: "600" },
          "& .Mui-selected": { color: `${colors.greenAccent[400]} !important` },
          "& .MuiTabs-indicator": { backgroundColor: colors.greenAccent[500] },
        }}
      >
        {MACHINE_TYPES.map((t) => (
          <Tab key={t} label={t} />
        ))}
        <Tab label="All" />
      </Tabs>

      {/* ----------------------------------------------------------------
          COLLAPSIBLE "ADD PART" FORM — always visible to everyone.
          Clicking the header uses openFormIfAuthorised so non-store users
          get the access-denied dialog instead of the form opening silently.
          ---------------------------------------------------------------- */}
      <Box mb="16px" backgroundColor={colors.primary[400]} borderRadius="4px" overflow="hidden">
        <Box
          display="flex"
          justifyContent="space-between"
          alignItems="center"
          p="12px 16px"
          sx={{ cursor: "pointer" }}
          onClick={() => (formOpen ? setFormOpen(false) : openFormIfAuthorised())}
        >
          <Typography color={canAddPart ? colors.grey[100] : colors.grey[500]} fontWeight="600">
            + Add Part
            {!canAddPart && (
              <Typography component="span" fontSize="11px" color={colors.grey[600]} ml="8px">
                (store access required)
              </Typography>
            )}
          </Typography>
          <IconButton size="small" sx={{ color: canAddPart ? colors.greenAccent[400] : colors.grey[600] }}>
            {formOpen ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
          </IconButton>
        </Box>
        <Collapse in={formOpen}>
          <Box
            p="16px"
            display="grid"
            gridTemplateColumns="repeat(3, 1fr)"
            gap="14px"
            borderTop={`1px solid ${colors.primary[300]}`}
          >
            <TextField variant="filled" label="Serial Number" name="serialNumber" value={form.serialNumber} onChange={handleFormChange} fullWidth />
            <TextField variant="filled" label="Part Number" name="partNumber" value={form.partNumber} onChange={handleFormChange} fullWidth />
            <TextField variant="filled" label="Description" name="machinePart" value={form.machinePart} onChange={handleFormChange} fullWidth />
            <TextField
              variant="filled"
              label="Quantity"
              name="quantity"
              type="number"
              inputProps={{ min: 0 }}
              value={form.quantity}
              onChange={handleFormChange}
              fullWidth
            />
            <TextField
              select
              variant="filled"
              label="Machine Type"
              name="machine"
              value={form.machine}
              onChange={handleFormChange}
              fullWidth
            >
              {MACHINE_TYPES.map((t) => (
                <MenuItem key={t} value={t}>{t}</MenuItem>
              ))}
            </TextField>
            <Box display="flex" alignItems="center" justifyContent="flex-end">
              <Button variant="contained" color="secondary" onClick={handleAdd} sx={{ height: "48px", px: "24px" }}>
                Add Part
              </Button>
            </Box>
          </Box>
        </Collapse>
      </Box>

      {/* ----------------------------------------------------------------
          SEARCH
          ---------------------------------------------------------------- */}
      <TextField
        variant="filled"
        label={isAllTab ? "Search all parts…" : `Search ${currentMachineType} parts…`}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        fullWidth
        sx={{ mb: "20px" }}
      />

      {/* ----------------------------------------------------------------
          TABLE
          ---------------------------------------------------------------- */}
      <Box
        height="55vh"
        sx={{
          "& .MuiDataGrid-root": { border: "none" },
          "& .MuiDataGrid-cell": { borderBottom: "none" },
          "& .name-column--cell": { color: colors.greenAccent[300] },
          "& .MuiDataGrid-columnHeaders": {
            backgroundColor: colors.blueAccent[700],
            borderBottom: "none",
          },
          "& .MuiDataGrid-virtualScroller": {
            backgroundColor: colors.primary[400],
          },
          "& .MuiDataGrid-footerContainer": {
            borderTop: "none",
            backgroundColor: colors.blueAccent[700],
          },
        }}
      >
        <DataGrid
          rows={rows}
          columns={columns}
          initialState={{
            pagination: { paginationModel: { pageSize: 10 } },
          }}
          pageSizeOptions={[10, 25, 50]}
        />
      </Box>

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
    </Box>
  );
};

export default StorePage;