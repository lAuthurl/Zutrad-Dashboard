// ─────────────────────────────────────────────────────────────────────────────
// SupplyPage.jsx  –  Pure UI. All logic and state lives in useSupply.
// ─────────────────────────────────────────────────────────────────────────────

import {
  Box, Typography, useTheme, Button, TextField, MenuItem,
  Collapse, IconButton, Snackbar, Alert, Stack, Tooltip, Chip,
  Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions,
} from "@mui/material";
import {
  DataGrid,
  GridToolbarColumnsButton,
  GridToolbarDensitySelector,
} from "@mui/x-data-grid";
import { tokens } from "../../theme";
import { mockDataClients } from "../../data/mockData";

// ── icons ─────────────────────────────────────────────────────────────────────
import KeyboardArrowDownIcon      from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowUpIcon        from "@mui/icons-material/KeyboardArrowUp";
import AddOutlinedIcon            from "@mui/icons-material/AddOutlined";
import SearchOutlinedIcon         from "@mui/icons-material/SearchOutlined";
import FileDownloadOutlinedIcon   from "@mui/icons-material/FileDownloadOutlined";
import DeleteSweepOutlinedIcon    from "@mui/icons-material/DeleteSweepOutlined";
import DeleteOutlineOutlinedIcon  from "@mui/icons-material/DeleteOutlineOutlined";
import Inventory2OutlinedIcon     from "@mui/icons-material/Inventory2Outlined";
import AttachFileOutlinedIcon     from "@mui/icons-material/AttachFileOutlined";
import LocalShippingOutlinedIcon  from "@mui/icons-material/LocalShippingOutlined";
import NumbersOutlinedIcon        from "@mui/icons-material/NumbersOutlined";
import LockOutlinedIcon           from "@mui/icons-material/LockOutlined";
import ErrorOutlineIcon           from "@mui/icons-material/ErrorOutline";
import DownloadOutlinedIcon       from "@mui/icons-material/DownloadOutlined";

// ── logic ─────────────────────────────────────────────────────────────────────
import { useSupply, fileIcon } from "./supply.logic";
import Header from "../../components/Header";
import { useDateFormat } from "../settings/dateFormat.logic";


// ── StatCard ──────────────────────────────────────────────────────────────────
const StatCard = ({ icon, label, value, accent, colors }) => (
  <Box
    display="flex" alignItems="center" gap="12px"
    px="18px" py="12px"
    backgroundColor={colors.primary[400]}
    borderRadius="6px"
    borderLeft={`3px solid ${accent}`}
    minWidth="160px"
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


// ── SupplyPage ────────────────────────────────────────────────────────────────
const SupplyPage = () => {
  const theme  = useTheme();
  const colors = tokens(theme.palette.mode);

  const {
    rows, filteredRows, selectedIds, setSelectedIds,
    totalQty, uniqueClients,
    search, setSearch, clientFilter, setClientFilter, clearFilters,
    form, formOpen, setFormOpen, openFormIfAuthorised,
    formError, attachments, setAttachments,
    handleChange, handleFileChange, handleSubmit, handleCancelForm,
    handleDelete, handleBulkDelete,
    confirmDialog, closeConfirmDialog, submitConfirmDialog,
    handleExportCSV, handleExportJSON,
    handleFileClick, downloadDialog, closeDownloadDialog, handleDownloadConfirm,
    toast, closeToast,
    errorDialog, closeErrorDialog,
    canLogSupply, canDelete, canExport, canDownload,
  } = useSupply();

  const { formatDate } = useDateFormat();


  // ── column definitions ─────────────────────────────────────────────────────
  const columns = [
    { field: "_id", headerName: "ID", width: 60 },

    {
      field: "goodsSupplied",
      headerName: "Goods Supplied",
      flex: 1.2,
      renderCell: ({ value }) => (
        <Typography color={colors.greenAccent[300]} fontWeight={600} fontSize="13px">
          {value}
        </Typography>
      ),
    },

    {
      field: "partNumber",
      headerName: "Part Number",
      flex: 0.9,
      renderCell: ({ value }) => (
        <Chip
          label={value}
          size="small"
          sx={{
            backgroundColor: colors.blueAccent[800],
            color: colors.blueAccent[200],
            fontSize: "11px",
            fontFamily: "monospace",
            height: "22px",
          }}
        />
      ),
    },

    {
      field: "quantity",
      headerName: "Qty",
      width: 80,
      type: "number",
      headerAlign: "left",
      align: "left",
      renderCell: ({ value }) => (
        <Typography fontWeight={700} color={colors.grey[100]} fontSize="13px">
          {value}
        </Typography>
      ),
    },

    {
      field: "client",
      headerName: "Client",
      flex: 1,
      valueGetter: (params) => params.row.client?.companyName || "—",
    },

    {
      field: "supplyDate",
      headerName: "Supply Date",
      flex: 0.8,
      renderCell: ({ value }) => (
        <Typography color={colors.grey[300]} fontSize="12px">
          {value ? formatDate(value) : "—"}
        </Typography>
      ),
    },

    {
      field: "loggedBy",
      headerName: "Logged By",
      flex: 0.9,
      valueGetter: (params) =>
        params.row.user
          ? `${params.row.user.firstName} ${params.row.user.surname}`
          : "—",
    },

    // ── attachments column ──────────────────────────────────────────────────
    // Each file icon is clickable for admins/superadmins and triggers the
    // download confirmation dialog. Non-admins see a dimmed lock icon instead.
    {
      field: "attachments",
      headerName: "Files",
      flex: 1,
      sortable: false,
      renderCell: ({ row }) => {
        const atts = row.attachments || [];
        if (atts.length === 0)
          return <Typography color={colors.grey[600]} fontSize="12px">—</Typography>;

        return (
          <Box display="flex" gap="4px" alignItems="center" flexWrap="wrap">
            {atts.map((file, i) => {
              const Icon = fileIcon(file.name);
              return canDownload ? (
                <Tooltip key={i} title={`Download: ${file.name}`}>
                  <IconButton
                    size="small"
                    onClick={() => handleFileClick(file)}
                    sx={{
                      color: colors.blueAccent[300],
                      "&:hover": { color: colors.blueAccent[100] },
                    }}
                  >
                    <Icon sx={{ fontSize: "16px" }} />
                  </IconButton>
                </Tooltip>
              ) : (
                <Tooltip key={i} title={`${file.name} (admin access required to download)`}>
                  <span>
                    <IconButton size="small" disabled sx={{ color: colors.grey[600] }}>
                      <Icon sx={{ fontSize: "16px" }} />
                    </IconButton>
                  </span>
                </Tooltip>
              );
            })}
          </Box>
        );
      },
    },

    // ── row-level delete — lock icon for non-superadmins ───────────────────
    {
      field: "actions",
      headerName: "",
      width: 60,
      sortable: false,
      renderCell: ({ row }) =>
        canDelete ? (
          <Tooltip title="Delete entry">
            <IconButton
              size="small"
              onClick={() => handleDelete(row._id)}
              sx={{ color: colors.redAccent[400] }}
            >
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
      <Header title="SUPPLY" subtitle="Goods Supplied to Clients" />

      {/* ── stats bar ──────────────────────────────────────────────────────── */}
      <Stack direction="row" spacing={2} mt="24px" flexWrap="wrap" gap="12px">
        <StatCard
          icon={<Inventory2OutlinedIcon />}
          label="Total Entries"
          value={rows.length}
          accent={colors.greenAccent[500]}
          colors={colors}
        />
        <StatCard
          icon={<NumbersOutlinedIcon />}
          label="Total Units Supplied"
          value={totalQty.toLocaleString()}
          accent={colors.blueAccent[400]}
          colors={colors}
        />
        <StatCard
          icon={<LocalShippingOutlinedIcon />}
          label="Clients Served"
          value={uniqueClients}
          accent={colors.grey[400]}
          colors={colors}
        />
      </Stack>

      {/* ── log new supply form — always visible ───────────────────────────── */}
      <Box
        mt="24px" mb="16px"
        backgroundColor={colors.primary[400]}
        borderRadius="6px"
        overflow="hidden"
      >
        <Box
          display="flex" justifyContent="space-between" alignItems="center"
          p="12px 16px"
          sx={{ cursor: "pointer" }}
          onClick={() => (formOpen ? setFormOpen(false) : openFormIfAuthorised())}
        >
          <Box display="flex" alignItems="center" gap="8px">
            <AddOutlinedIcon sx={{ color: canLogSupply ? colors.greenAccent[400] : colors.grey[600], fontSize: "18px" }} />
            <Typography color={canLogSupply ? colors.grey[100] : colors.grey[500]} fontWeight="600" fontSize="14px">
              Log New Supply
              {!canLogSupply && (
                <Typography component="span" fontSize="11px" color={colors.grey[600]} ml="8px">
                  (supply access required)
                </Typography>
              )}
            </Typography>
          </Box>
          <IconButton size="small" sx={{ color: canLogSupply ? colors.greenAccent[400] : colors.grey[600] }}>
            {formOpen ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
          </IconButton>
        </Box>

        <Collapse in={formOpen}>
          <Box
            p="16px"
            display="grid"
            gridTemplateColumns="repeat(3, 1fr)"
            gap="16px"
            borderTop={`1px solid ${colors.primary[300]}`}
          >
            <TextField
              variant="filled" label="Goods Supplied" name="goodsSupplied"
              value={form.goodsSupplied} onChange={handleChange} fullWidth
              error={!!formError && !form.goodsSupplied}
            />
            <TextField
              variant="filled" label="Part Number" name="partNumber"
              value={form.partNumber} onChange={handleChange} fullWidth
              error={!!formError && !form.partNumber}
            />
            <TextField
              variant="filled" label="Quantity" name="quantity" type="number"
              value={form.quantity} onChange={handleChange} fullWidth
              error={!!formError && (!form.quantity || Number(form.quantity) <= 0)}
            />
            <TextField
              variant="filled" label="Supply Date" name="supplyDate" type="date"
              InputLabelProps={{ shrink: true }}
              value={form.supplyDate} onChange={handleChange}
              fullWidth error={!!formError && !form.supplyDate}
            />
            <TextField
              select variant="filled" label="Client" name="clientId"
              value={form.clientId} onChange={handleChange}
              fullWidth error={!!formError && !form.clientId}
            >
              {mockDataClients.map((c) => (
                <MenuItem key={c.id} value={c.id}>{c.companyName}</MenuItem>
              ))}
            </TextField>

            {/* ── file attachments — real file picker ──────────────────────── */}
            <Box display="flex" alignItems="center" gap="8px">
              <Button
                component="label"
                variant="outlined"
                startIcon={<AttachFileOutlinedIcon />}
                sx={{
                  height: "56px", flex: 1,
                  borderColor: colors.grey[600], color: colors.grey[300],
                  textTransform: "none", fontSize: "13px",
                  justifyContent: "flex-start", px: "14px",
                }}
              >
                {attachments.length > 0
                  ? `${attachments.length} file${attachments.length !== 1 ? "s" : ""} selected`
                  : "Attach Files (optional)"}
                <input type="file" multiple hidden onChange={handleFileChange} />
              </Button>
              {attachments.length > 0 && (
                <Tooltip title="Clear selected files">
                  <IconButton
                    size="small"
                    onClick={() => setAttachments([])}
                    sx={{ color: colors.redAccent[400] }}
                  >
                    <DeleteOutlineOutlinedIcon sx={{ fontSize: "18px" }} />
                  </IconButton>
                </Tooltip>
              )}
            </Box>

            {/* Show selected filenames so user can confirm before submitting */}
            {attachments.length > 0 && (
              <Box sx={{ gridColumn: "span 3", display: "flex", flexWrap: "wrap", gap: "6px" }}>
                {attachments.map((f, i) => (
                  <Chip
                    key={i}
                    label={f.name}
                    size="small"
                    onDelete={() => setAttachments((prev) => prev.filter((_, idx) => idx !== i))}
                    sx={{
                      backgroundColor: colors.blueAccent[800],
                      color: colors.blueAccent[200],
                      fontSize: "11px",
                    }}
                  />
                ))}
              </Box>
            )}

            <Box
              display="flex" alignItems="center" justifyContent="flex-end"
              gap="10px" sx={{ gridColumn: "span 3" }}
            >
              <Button
                size="small" variant="outlined"
                onClick={handleCancelForm}
                sx={{ borderColor: colors.grey[600], color: colors.grey[300], textTransform: "none" }}
              >
                Cancel
              </Button>
              <Button
                variant="contained" color="secondary"
                onClick={handleSubmit}
                disabled={false}
                sx={{ height: "40px", px: "24px", textTransform: "none" }}
              >
                Log Supply
              </Button>
            </Box>

            {formError && (
              <Box sx={{ gridColumn: "span 3" }}>
                <Alert severity="error" sx={{ fontSize: "12px", py: "2px" }}>
                  {formError}
                </Alert>
              </Box>
            )}
          </Box>
        </Collapse>
      </Box>

      {/* ── search / filter toolbar ────────────────────────────────────────── */}
      <Box
        display="flex" alignItems="center" justifyContent="space-between"
        flexWrap="wrap" gap="12px" mb="12px"
      >
        <Stack direction="row" spacing={1.5} alignItems="center">
          <TextField
            variant="outlined" size="small"
            placeholder="Search goods, part number, client…"
            value={search} onChange={(e) => setSearch(e.target.value)}
            InputProps={{
              startAdornment: (
                <SearchOutlinedIcon sx={{ color: colors.grey[400], mr: "6px", fontSize: "18px" }} />
              ),
            }}
            sx={{
              width: 260,
              "& .MuiOutlinedInput-root": { backgroundColor: colors.primary[400], fontSize: "13px" },
            }}
          />
          <TextField
            select variant="outlined" size="small" label="Client"
            value={clientFilter} onChange={(e) => setClientFilter(e.target.value)}
            sx={{
              minWidth: 160,
              "& .MuiOutlinedInput-root": { backgroundColor: colors.primary[400], fontSize: "13px" },
            }}
          >
            <MenuItem value="all">All Clients</MenuItem>
            {mockDataClients.map((c) => (
              <MenuItem key={c.id} value={String(c.id)}>{c.companyName}</MenuItem>
            ))}
          </TextField>
          <Typography color={colors.grey[500]} fontSize="12px" sx={{ whiteSpace: "nowrap" }}>
            {filteredRows.length} / {rows.length} entries
          </Typography>
        </Stack>

        <Stack direction="row" spacing={1} alignItems="center">
          {selectedIds.length > 0 && (
            <>
              <Tooltip title={canDelete ? "" : "Superadmin access required to delete"}>
                <span>
                  <Button
                    size="small" variant="contained"
                    startIcon={<DeleteSweepOutlinedIcon />}
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
              <Box sx={{ width: "1px", height: "24px", backgroundColor: colors.grey[600] }} />
            </>
          )}

          <Tooltip title={canExport ? "" : "Admin access required to export"}>
            <span>
              <Button
                size="small" variant="outlined"
                startIcon={<FileDownloadOutlinedIcon />}
                onClick={handleExportCSV}
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

          <Tooltip title={canExport ? "" : "Admin access required to export"}>
            <span>
              <Button
                size="small" variant="outlined"
                startIcon={<FileDownloadOutlinedIcon />}
                onClick={handleExportJSON}
                sx={{
                  borderColor: canExport ? colors.greenAccent[600] : colors.grey[700],
                  color: canExport ? colors.greenAccent[400] : colors.grey[600],
                  fontSize: "12px", textTransform: "none",
                  "&:hover": {
                    borderColor: canExport ? colors.greenAccent[400] : colors.grey[600],
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

      {/* ── data grid ─────────────────────────────────────────────────────── */}
      <Box
        height="60vh"
        sx={{
          "& .MuiDataGrid-root": { border: "none" },
          "& .MuiDataGrid-cell": { borderBottom: "none" },
          "& .MuiDataGrid-columnHeaders": {
            backgroundColor: colors.blueAccent[700],
            borderBottom: "none",
            fontSize: "13px",
          },
          "& .MuiDataGrid-virtualScroller": { backgroundColor: colors.primary[400] },
          "& .MuiDataGrid-footerContainer": {
            borderTop: "none",
            backgroundColor: colors.blueAccent[700],
          },
          "& .MuiCheckbox-root": { color: `${colors.greenAccent[200]} !important` },
          "& .MuiDataGrid-row:hover": { backgroundColor: `${colors.primary[300]}55` },
          "& .MuiDataGrid-overlay": { backgroundColor: colors.primary[400] },
        }}
      >
        <DataGrid
          checkboxSelection
          disableRowSelectionOnClick
          rows={filteredRows}
          columns={columns}
          rowHeight={52}
          getRowId={(row) => row._id}
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
              <Box
                display="flex" flexDirection="column" alignItems="center"
                justifyContent="center" height="100%" gap="8px"
              >
                <Inventory2OutlinedIcon sx={{ fontSize: 40, color: colors.grey[600] }} />
                <Typography color={colors.grey[500]} fontSize="14px">
                  No supply entries match your filters
                </Typography>
                <Button
                  size="small" onClick={clearFilters}
                  sx={{ color: colors.blueAccent[300], fontSize: "12px", textTransform: "none" }}
                >
                  Clear filters
                </Button>
              </Box>
            ),
          }}
        />
      </Box>

      {/* ── download confirmation dialog ─────────────────────────────────── */}
      <Dialog
        open={downloadDialog.open}
        onClose={closeDownloadDialog}
        PaperProps={{ sx: { backgroundColor: colors.primary[400], minWidth: 340 } }}
      >
        <DialogTitle sx={{ display: "flex", alignItems: "center", gap: "10px", color: colors.grey[100], fontSize: "15px", fontWeight: 700 }}>
          <DownloadOutlinedIcon sx={{ color: colors.blueAccent[300] }} />
          Download File
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ color: colors.grey[300], fontSize: "13px" }}>
            Download{" "}
            <Typography component="span" fontWeight={700} color={colors.greenAccent[300]}>
              {downloadDialog.file?.name}
            </Typography>
            ?
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: "24px", pb: "16px", gap: "8px" }}>
          <Button
            size="small" onClick={closeDownloadDialog}
            sx={{ color: colors.grey[400], textTransform: "none" }}
          >
            Cancel
          </Button>
          <Button
            size="small" variant="contained"
            startIcon={<DownloadOutlinedIcon />}
            onClick={handleDownloadConfirm}
            sx={{
              backgroundColor: colors.blueAccent[700],
              color: colors.blueAccent[100],
              textTransform: "none",
              "&:hover": { backgroundColor: colors.blueAccent[600] },
            }}
          >
            Download
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
        <DialogActions sx={{ px: "24px", pb: "16px", gap: "8px" }}>
          <Button
            size="small" onClick={closeConfirmDialog}
            sx={{ color: colors.grey[400], textTransform: "none" }}
          >
            Cancel
          </Button>
          <Button
            size="small" variant="contained" color="error"
            onClick={submitConfirmDialog}
            sx={{ textTransform: "none" }}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── access denied / error dialog ─────────────────────────────────── */}
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

      {/* ── toast ────────────────────────────────────────────────────────── */}
      <Snackbar
        open={toast.open}
        autoHideDuration={3000}
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

export default SupplyPage;