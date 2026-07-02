import { useDateFormat } from "../settings/dateFormat.logic";
import {
  Box,
  Typography,
  useTheme,
  Button,
  Snackbar,
  Alert,
  Stack,
  Divider,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Select,
  FormControl,
  InputLabel,
  MenuItem,
  TextField,
  LinearProgress,
} from "@mui/material";
import { tokens } from "../../theme";
import Header from "../../components/Header";
import { Link } from "react-router-dom";
import BusinessOutlinedIcon from "@mui/icons-material/BusinessOutlined";
import AdminPanelSettingsOutlinedIcon from "@mui/icons-material/AdminPanelSettingsOutlined";
import UploadFileOutlinedIcon from "@mui/icons-material/UploadFileOutlined";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import CancelOutlinedIcon from "@mui/icons-material/CancelOutlined";
import WarningAmberOutlinedIcon from "@mui/icons-material/WarningAmberOutlined";
import CloseOutlinedIcon from "@mui/icons-material/CloseOutlined";
import SupportAgentOutlinedIcon from "@mui/icons-material/SupportAgentOutlined";
import EngineeringOutlinedIcon from "@mui/icons-material/EngineeringOutlined";
import GroupOutlinedIcon from "@mui/icons-material/GroupOutlined";
import HowToRegOutlinedIcon from "@mui/icons-material/HowToRegOutlined";
import BlockOutlinedIcon from "@mui/icons-material/BlockOutlined";
import AccessTimeOutlinedIcon from "@mui/icons-material/AccessTimeOutlined";
import InboxOutlinedIcon from "@mui/icons-material/InboxOutlined";

import {
  CLIENT_DB_FIELDS,
  fieldLabel,
  useImportDialog as useImportDialogLogic,
  useAdminPage as useAdminPageLogic,
} from "../global/management.logic";

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
// IMPORT DIALOG (UI) — state/handlers come from useImportDialogLogic
// ════════════════════════════════════════════════════════════════════════════
const ImportDialog = ({ open, onClose, onImport, dbFields, entityLabel, colors }) => {
  const {
    fileRef,
    step,
    fileData,
    mapping,
    setMapping,
    results,
    loading,
    reset,
    handleFile,
    handleDrop,
    mappingComplete,
    goToUpload,
    goToMap,
    goToPreview,
    handleImport,
  } = useImportDialogLogic({ onImport, dbFields });

  const handleClose = () => {
    reset();
    onClose();
  };

  const handlePreview = () => goToPreview();

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth
      PaperProps={{ sx: { backgroundColor: colors.primary[400], borderRadius: "8px" } }}>
      <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Typography fontWeight={700} color={colors.grey[100]} fontSize="15px">
          Import {entityLabel}s
        </Typography>
        <IconButton size="small" onClick={handleClose} sx={{ color: colors.grey[400] }}>
          <CloseOutlinedIcon />
        </IconButton>
      </DialogTitle>

      <Divider sx={{ borderColor: colors.primary[300] }} />

      <DialogContent sx={{ pt: "20px" }}>
        {step === "upload" && (
          <Box
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            display="flex" flexDirection="column" alignItems="center" justifyContent="center"
            gap="12px" py="48px"
            border={`2px dashed ${colors.grey[600]}`}
            borderRadius="8px"
            sx={{ cursor: "pointer", "&:hover": { borderColor: colors.greenAccent[500], backgroundColor: `${colors.greenAccent[900]}22` } }}
            onClick={() => fileRef.current?.click()}
          >
            <UploadFileOutlinedIcon sx={{ fontSize: 44, color: colors.grey[500] }} />
            <Typography color={colors.grey[300]} fontWeight={600}>
              Drop a CSV or JSON file here, or click to browse
            </Typography>
            <Typography color={colors.grey[500]} fontSize="12px">
              Supports .csv and .json
            </Typography>
            <input ref={fileRef} type="file" accept=".csv,.json" hidden onChange={handleFile} />
          </Box>
        )}

        {step === "map" && (
          <Box>
            <Alert severity="info" sx={{ mb: "16px", fontSize: "12px" }}>
              {fileData.rows.length} rows detected. Map each database field to the matching column from your file. Fields highlighted in green were auto-matched.
            </Alert>
            <Box display="grid" gridTemplateColumns="1fr 1fr" gap="14px">
              {dbFields.map((field) => (
                <Box key={field} display="flex" alignItems="center" gap="10px">
                  <Box
                    px="10px" py="6px" borderRadius="4px"
                    backgroundColor={mapping[field] ? `${colors.greenAccent[800]}` : colors.primary[300]}
                    border={`1px solid ${mapping[field] ? colors.greenAccent[600] : colors.grey[600]}`}
                    minWidth="130px"
                  >
                    <Typography fontSize="12px" color={mapping[field] ? colors.greenAccent[300] : colors.grey[400]} fontWeight={600}>
                      {fieldLabel(field)}
                      <Typography component="span" color={colors.redAccent[400]} ml="2px">*</Typography>
                    </Typography>
                  </Box>
                  <Typography color={colors.grey[500]} fontSize="13px">→</Typography>
                  <FormControl size="small" fullWidth variant="outlined">
                    <InputLabel sx={{ fontSize: "12px" }}>File column</InputLabel>
                    <Select
                      value={mapping[field] || ""}
                      label="File column"
                      onChange={(e) => setMapping((m) => ({ ...m, [field]: e.target.value }))}
                      sx={{ backgroundColor: colors.primary[300], fontSize: "12px" }}
                    >
                      <MenuItem value=""><em>— not mapped —</em></MenuItem>
                      {fileData.headers.map((h) => (
                        <MenuItem key={h} value={h}>{h}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Box>
              ))}
            </Box>
            {!mappingComplete && (
              <Typography color={colors.redAccent[300]} fontSize="12px" mt="12px">
                All fields must be mapped before continuing.
              </Typography>
            )}
          </Box>
        )}

        {step === "preview" && (
          <Box>
            <Alert severity="info" sx={{ mb: "12px", fontSize: "12px" }}>
              Preview of first 5 rows. {fileData.rows.length} total rows will be processed.
            </Alert>
            <Box sx={{ overflowX: "auto" }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ backgroundColor: colors.blueAccent[700] }}>
                    {dbFields.map((f) => (
                      <TableCell key={f} sx={{ color: colors.grey[200], fontSize: "12px", fontWeight: 700, border: "none" }}>
                        {fieldLabel(f)}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {fileData.rows.slice(0, 5).map((row, i) => {
                    const missing = dbFields.some((f) => !row[mapping[f]]?.trim());
                    return (
                      <TableRow key={i} sx={{ backgroundColor: missing ? `${colors.redAccent[900]}55` : colors.primary[400] }}>
                        {dbFields.map((f) => (
                          <TableCell key={f} sx={{ color: row[mapping[f]] ? colors.grey[200] : colors.redAccent[400], fontSize: "12px", border: "none" }}>
                            {row[mapping[f]] || <em>missing</em>}
                          </TableCell>
                        ))}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Box>
            {fileData.rows.length > 5 && (
              <Typography color={colors.grey[500]} fontSize="12px" mt="8px">
                + {fileData.rows.length - 5} more rows not shown
              </Typography>
            )}
          </Box>
        )}

        {step === "done" && (
          <Box>
            {loading && <LinearProgress color="secondary" sx={{ mb: "16px" }} />}
            <Stack spacing={1.5}>
              <Box display="flex" alignItems="center" gap="10px" p="12px 16px"
                backgroundColor={`${colors.greenAccent[800]}55`} borderRadius="6px"
                borderLeft={`3px solid ${colors.greenAccent[500]}`}>
                <CheckCircleOutlineIcon sx={{ color: colors.greenAccent[400] }} />
                <Typography color={colors.greenAccent[300]} fontWeight={600}>
                  {results.imported.length} {entityLabel}(s) imported successfully
                </Typography>
              </Box>
              {results.skipped.length > 0 && (
                <Box p="12px 16px" backgroundColor={`${colors.redAccent[900]}55`} borderRadius="6px"
                  borderLeft={`3px solid ${colors.redAccent[500]}`}>
                  <Box display="flex" alignItems="center" gap="10px" mb="8px">
                    <WarningAmberOutlinedIcon sx={{ color: colors.redAccent[400] }} />
                    <Typography color={colors.redAccent[300]} fontWeight={600}>
                      {results.skipped.length} row(s) skipped — missing required fields
                    </Typography>
                  </Box>
                  {results.skipped.map((s) => (
                    <Typography key={s.row} color={colors.redAccent[200]} fontSize="12px">
                      Row {s.row}: {Object.entries(s.data).map(([k, v]) => `${k}=${v || "empty"}`).join(", ")}
                    </Typography>
                  ))}
                </Box>
              )}
            </Stack>
          </Box>
        )}
      </DialogContent>

      <Divider sx={{ borderColor: colors.primary[300] }} />

      <DialogActions sx={{ px: "24px", py: "14px", gap: "8px" }}>
        {step === "upload" && (
          <Button onClick={handleClose} size="small" sx={{ color: colors.grey[400], textTransform: "none" }}>Cancel</Button>
        )}
        {step === "map" && (
          <>
            <Button onClick={goToUpload} size="small" sx={{ color: colors.grey[400], textTransform: "none" }}>Back</Button>
            <Button variant="contained" color="secondary" size="small" disabled={!mappingComplete}
              onClick={handlePreview} sx={{ textTransform: "none" }}>
              Preview →
            </Button>
          </>
        )}
        {step === "preview" && (
          <>
            <Button onClick={goToMap} size="small" sx={{ color: colors.grey[400], textTransform: "none" }}>Back</Button>
            <Button variant="contained" color="secondary" size="small"
              onClick={handleImport} sx={{ textTransform: "none" }}>
              Import {fileData.rows.length} Rows
            </Button>
          </>
        )}
        {step === "done" && (
          <>
            <Button onClick={reset} size="small" sx={{ color: colors.grey[400], textTransform: "none" }}>Import Another</Button>
            <Button variant="contained" color="secondary" size="small" onClick={handleClose} sx={{ textTransform: "none" }}>Done</Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// SECTION WRAPPERS
// ════════════════════════════════════════════════════════════════════════════
const SectionBox = ({ children, colors, accentColor }) => (
  <Box
    backgroundColor={colors.primary[400]}
    borderRadius="6px"
    p="20px 24px"
    mb="20px"
    borderLeft={`4px solid ${accentColor}`}
  >
    {children}
  </Box>
);

const SectionTitle = ({ title, subtitle, linkTo, linkLabel, colors, action }) => (
  <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb="16px">
    <Box>
      <Typography color={colors.grey[100]} fontWeight="700" fontSize="15px">{title}</Typography>
      {subtitle && <Typography color={colors.grey[400]} fontSize="12px" mt="2px">{subtitle}</Typography>}
    </Box>
    <Box display="flex" alignItems="center" gap="12px">
      {action}
      {linkTo && (
        <Typography component={Link} to={linkTo} color={colors.greenAccent[400]} fontSize="13px"
          sx={{ textDecoration: "none", "&:hover": { textDecoration: "underline" } }}>
          {linkLabel} →
        </Typography>
      )}
    </Box>
  </Box>
);

// ════════════════════════════════════════════════════════════════════════════
// MAIN PAGE (UI) — state/handlers come from useAdminPageLogic
// ════════════════════════════════════════════════════════════════════════════
const AdminPage = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);

  const { formatDate } = useDateFormat();

  const {
    // signups
    pendingSignups,
    handleApproveSignup,
    handleRejectSignup,

    // permissions - assign
    nonAdminUsers,
    assignUserId,
    setAssignUserId,
    assignPage,
    setAssignPage,
    assignablePages,
    handleAssignRole,

    // permissions - revoke
    removeUserId,
    setRemoveUserId,
    removePage,
    setRemovePage,
    removablePages,
    handleRemoveRole,

    // client form
    clientForm,
    setClientForm,
    clientError,
    setClientError,
    handleAddClient,
    clientImportOpen,
    setClientImportOpen,
    handleClientImport,

    // stats
    totalUsers,
    adminCount,
    engineerCount,
    otherCount,

    // toast
    toast,
    setToast,
  } = useAdminPageLogic();

  // ── render ─────────────────────────────────────────────────────────────────
  return (
    <Box m="20px">
      <Header title="ADMIN PANEL" subtitle="User Management, Clients & Permissions" />

      {/* stats */}
      <Stack direction="row" spacing={2} mt="24px" mb="28px" flexWrap="wrap" gap="12px">
        <StatCard icon={<GroupOutlinedIcon />} label="Total Users" value={totalUsers} accent={colors.grey[400]} colors={colors} />
        <StatCard icon={<AdminPanelSettingsOutlinedIcon />} label="Administrators" value={adminCount} accent={colors.greenAccent[500]} colors={colors} />
        <StatCard icon={<EngineeringOutlinedIcon />} label="Engineers" value={engineerCount} accent={colors.blueAccent[400]} colors={colors} />
        <StatCard icon={<SupportAgentOutlinedIcon />} label="Receptionists" value={otherCount} accent={colors.greenAccent[400]} colors={colors} />
      </Stack>

      {/* ── SIGNUP REQUESTS ── */}
      <SectionBox colors={colors} accentColor={colors.greenAccent[600]}>
        <SectionTitle
          title="Signup Requests"
          subtitle="Review and approve or reject new account requests"
          linkTo="/users"
          linkLabel="View all users"
          colors={colors}
          action={
            pendingSignups.length > 0 ? (
              <Box
                px="10px" py="3px" borderRadius="20px"
                backgroundColor={`${colors.blueAccent[800]}`}
                border={`1px solid ${colors.blueAccent[600]}`}
              >
                <Typography fontSize="11px" fontWeight={700} color={colors.blueAccent[200]}>
                  {pendingSignups.length} pending
                </Typography>
              </Box>
            ) : null
          }
        />

        {pendingSignups.length === 0 ? (
          <Box
            display="flex" flexDirection="column" alignItems="center" justifyContent="center"
            py="36px" gap="10px"
            border={`1px dashed ${colors.grey[700]}`}
            borderRadius="6px"
          >
            <InboxOutlinedIcon sx={{ fontSize: 36, color: colors.grey[600] }} />
            <Typography color={colors.grey[500]} fontSize="13px">No pending requests</Typography>
          </Box>
        ) : (
          <Stack spacing="10px">
            {pendingSignups.map((req) => (
              <Box
                key={req.id}
                display="flex" alignItems="center" gap="14px"
                px="16px" py="12px"
                backgroundColor={`${colors.greenAccent[900]}33`}
                borderRadius="6px"
                border={`2px solid ${colors.greenAccent[600]}`}
                transition="all 0.2s ease"
                sx={{ "&:hover": { backgroundColor: `${colors.greenAccent[900]}55`, borderColor: colors.greenAccent[500] } }}
              >
                {/* Avatar */}
                <Box
                  width="38px" height="38px" borderRadius="50%" flexShrink={0}
                  display="flex" alignItems="center" justifyContent="center"
                  backgroundColor={colors.greenAccent[800]}
                >
                  <Typography fontSize="13px" fontWeight={700} color={colors.greenAccent[200]}>
                    {req.firstName[0]}{req.surname[0]}
                  </Typography>
                </Box>

                {/* Info */}
                <Box flex={1} minWidth={0}>
                  <Box display="flex" alignItems="center" gap="8px" flexWrap="wrap">
                    <Typography fontSize="14px" fontWeight={600} color={colors.grey[100]}>
                      {req.firstName} {req.surname}
                    </Typography>
                    <Chip
                      label={req.requestedRole}
                      size="small"
                      sx={{
                        fontSize: "10px", height: "18px", textTransform: "capitalize",
                        backgroundColor: colors.greenAccent[800],
                        color: colors.greenAccent[200],
                        fontWeight: 600,
                      }}
                    />
                  </Box>
                  <Typography fontSize="12px" color={colors.grey[500]} noWrap>
                    {req.email}
                  </Typography>
                </Box>

                {/* Date */}
                <Box display="flex" alignItems="center" gap="4px" flexShrink={0}>
                  <AccessTimeOutlinedIcon sx={{ fontSize: 13, color: colors.grey[500] }} />
                    <Typography fontSize="11px" color={colors.grey[500]}>
                      {formatDate(req.requestedAt)}
                  </Typography>
                </Box>

                {/* Actions */}
                <Box display="flex" gap="8px" flexShrink={0}>
                  <Button
                    size="small"
                    variant="contained"
                    color="secondary"
                    startIcon={<HowToRegOutlinedIcon />}
                    onClick={() => handleApproveSignup(req)}
                    sx={{ textTransform: "none", fontSize: "12px", py: "5px" }}
                  >
                    Approve
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<BlockOutlinedIcon />}
                    onClick={() => handleRejectSignup(req)}
                    sx={{
                      textTransform: "none", fontSize: "12px", py: "5px",
                      borderColor: colors.redAccent[500],
                      color: colors.redAccent[400],
                      "&:hover": { backgroundColor: `${colors.redAccent[900]}55`, borderColor: colors.redAccent[400] },
                    }}
                  >
                    Reject
                  </Button>
                </Box>
              </Box>
            ))}
          </Stack>
        )}
      </SectionBox>

      {/* ── SPECIAL ROLES ── */}
      <SectionBox colors={colors} accentColor={colors.blueAccent[500]}>
        <SectionTitle
          title="Special Page Access"
          subtitle="Grant or revoke page permissions for Engineers & Receptionists"
          colors={colors}
        />

        <Box display="grid" gridTemplateColumns="1fr 1fr" gap="24px">
          {/* assign */}
          <Box
            p="18px" borderRadius="8px"
            backgroundColor={`${colors.greenAccent[900]}22`}
            border={`1.5px solid ${colors.greenAccent[700]}`}
          >
            <Box display="flex" alignItems="center" gap="8px" mb="14px">
              <CheckCircleOutlineIcon sx={{ fontSize: 18, color: colors.greenAccent[400] }} />
              <Typography color={colors.greenAccent[300]} fontWeight="700" fontSize="13px">
                Grant Permission
              </Typography>
            </Box>
            <Stack spacing={1.5}>
              <TextField select variant="outlined" label="User" value={assignUserId}
                onChange={(e) => { setAssignUserId(e.target.value); setAssignPage(""); }} fullWidth size="small"
                sx={{
                  "& .MuiOutlinedInput-root": {
                    backgroundColor: colors.greenAccent[900],
                    color: colors.greenAccent[100],
                    borderColor: colors.greenAccent[600],
                    "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: colors.greenAccent[500] },
                    "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: colors.greenAccent[400] },
                  },
                  "& .MuiInputLabel-root": { color: colors.greenAccent[300] },
                  "& .MuiInputBase-input": { color: colors.grey[100] },
                }}>
                {nonAdminUsers.map((u) => (
                  <MenuItem key={u.id} value={u.id}>
                    {u.firstName} {u.surname}
                    <Chip label={u.role} size="small" sx={{ ml: 1, fontSize: "10px", height: "18px", textTransform: "capitalize", backgroundColor: colors.greenAccent[900], color: colors.greenAccent[300] }} />
                  </MenuItem>
                ))}
              </TextField>
              <TextField select variant="outlined" label="Page" value={assignPage}
                onChange={(e) => setAssignPage(e.target.value)} fullWidth size="small"
                disabled={!assignUserId}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    backgroundColor: colors.greenAccent[900],
                    color: colors.greenAccent[100],
                    borderColor: colors.greenAccent[600],
                    "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: colors.greenAccent[500] },
                    "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: colors.greenAccent[400] },
                  },
                  "& .MuiInputLabel-root": { color: colors.greenAccent[300] },
                  "& .MuiInputBase-input": { color: colors.grey[100] },
                }}>
                {assignablePages.map((p) => (
                  <MenuItem key={p} value={p} sx={{ textTransform: "capitalize" }}>{p}</MenuItem>
                ))}
              </TextField>
              <Button variant="contained" color="secondary" onClick={handleAssignRole}
                disabled={!assignUserId || !assignPage}
                startIcon={<CheckCircleOutlineIcon />}
                sx={{ textTransform: "none", fontSize: "13px", fontWeight: 600, py: "8px" }}>
                Grant Access
              </Button>
            </Stack>
          </Box>

          {/* revoke */}
          <Box
            p="18px" borderRadius="8px"
            backgroundColor={`${colors.redAccent[900]}22`}
            border={`1.5px solid ${colors.redAccent[700]}`}
          >
            <Box display="flex" alignItems="center" gap="8px" mb="14px">
              <BlockOutlinedIcon sx={{ fontSize: 18, color: colors.redAccent[400] }} />
              <Typography color={colors.redAccent[300]} fontWeight="700" fontSize="13px">
                Revoke Permission
              </Typography>
            </Box>
            <Stack spacing={1.5}>
              <TextField select variant="outlined" label="User" value={removeUserId}
                onChange={(e) => { setRemoveUserId(e.target.value); setRemovePage(""); }} fullWidth size="small"
                sx={{
                  "& .MuiOutlinedInput-root": {
                    backgroundColor: colors.redAccent[900],
                    color: colors.redAccent[100],
                    borderColor: colors.redAccent[600],
                    "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: colors.redAccent[500] },
                    "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: colors.redAccent[400] },
                  },
                  "& .MuiInputLabel-root": { color: colors.redAccent[300] },
                  "& .MuiInputBase-input": { color: colors.grey[100] },
                }}>
                {nonAdminUsers.filter((u) => u.permissions?.length > 0).map((u) => (
                  <MenuItem key={u.id} value={u.id}>
                    {u.firstName} {u.surname}
                    <Chip label={u.role} size="small" sx={{ ml: 1, fontSize: "10px", height: "18px", textTransform: "capitalize", backgroundColor: colors.redAccent[900], color: colors.redAccent[300] }} />
                  </MenuItem>
                ))}
              </TextField>
              <TextField select variant="outlined" label="Page to Revoke" value={removePage}
                onChange={(e) => setRemovePage(e.target.value)} fullWidth size="small"
                disabled={!removeUserId}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    backgroundColor: colors.redAccent[900],
                    color: colors.redAccent[100],
                    borderColor: colors.redAccent[600],
                    "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: colors.redAccent[500] },
                    "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: colors.redAccent[400] },
                  },
                  "& .MuiInputLabel-root": { color: colors.redAccent[300] },
                  "& .MuiInputBase-input": { color: colors.grey[100] },
                }}>
                {removablePages.map((p) => (
                  <MenuItem key={p} value={p} sx={{ textTransform: "capitalize" }}>{p}</MenuItem>
                ))}
              </TextField>
              <Button variant="outlined" onClick={handleRemoveRole}
                disabled={!removeUserId || !removePage}
                startIcon={<CancelOutlinedIcon />}
                sx={{
                  borderColor: colors.redAccent[500], color: colors.redAccent[300],
                  textTransform: "none", fontSize: "13px", fontWeight: 600,
                  "&:hover": { backgroundColor: `${colors.redAccent[900]}55`, borderColor: colors.redAccent[400] },
                }}>
                Revoke Access
              </Button>
            </Stack>
          </Box>
        </Box>
      </SectionBox>

      {/* ── ADD CLIENT ── */}
      <SectionBox colors={colors} accentColor={colors.grey[500]}>
        <SectionTitle
          title="Add Client"
          subtitle="Register a new client company manually or import from a file"
          linkTo="/clients-list"
          linkLabel="View all clients"
          colors={colors}
          action={
            <Button
              size="small" variant="outlined"
              startIcon={<UploadFileOutlinedIcon />}
              onClick={() => setClientImportOpen(true)}
              sx={{
                borderColor: colors.blueAccent[500], color: colors.blueAccent[300],
                fontSize: "12px", textTransform: "none",
                "&:hover": { borderColor: colors.blueAccent[300], backgroundColor: colors.blueAccent[900] },
              }}
            >
              Import CSV / JSON
            </Button>
          }
        />

        <Box
          p="18px" borderRadius="8px"
          backgroundColor={`${colors.blueAccent[900]}22`}
          border={`1.5px solid ${colors.blueAccent[700]}`}
        >
          <Box display="grid" gridTemplateColumns="repeat(2, 1fr)" gap="14px" mb="14px">
            <TextField variant="outlined" label="Company Name" value={clientForm.companyName}
              onChange={(e) => { setClientError(""); setClientForm((p) => ({ ...p, companyName: e.target.value })); }}
              fullWidth error={!!clientError && !clientForm.companyName}
              sx={{
                "& .MuiOutlinedInput-root": {
                  backgroundColor: colors.blueAccent[900],
                  color: colors.blueAccent[100],
                  borderColor: colors.blueAccent[600],
                  "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: colors.blueAccent[500] },
                  "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: colors.blueAccent[400] },
                },
                "& .MuiInputLabel-root": { color: colors.blueAccent[300] },
                "& .MuiInputBase-input": { color: colors.grey[100] },
              }} />
            <TextField variant="outlined" label="Address" value={clientForm.address}
              onChange={(e) => { setClientError(""); setClientForm((p) => ({ ...p, address: e.target.value })); }}
              fullWidth error={!!clientError && !clientForm.address}
              sx={{
                "& .MuiOutlinedInput-root": {
                  backgroundColor: colors.blueAccent[900],
                  color: colors.blueAccent[100],
                  borderColor: colors.blueAccent[600],
                  "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: colors.blueAccent[500] },
                  "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: colors.blueAccent[400] },
                },
                "& .MuiInputLabel-root": { color: colors.blueAccent[300] },
                "& .MuiInputBase-input": { color: colors.grey[100] },
              }} />
          </Box>

          {clientError && (
            <Alert severity="error" sx={{ mb: "14px", fontSize: "12px", py: "6px" }}>{clientError}</Alert>
          )}

          <Box display="flex" justifyContent="flex-end">
            <Button variant="contained" color="secondary" onClick={handleAddClient}
              startIcon={<BusinessOutlinedIcon />} sx={{ px: "24px", textTransform: "none", fontWeight: 600, py: "8px" }}>
              Add Client
            </Button>
          </Box>
        </Box>
      </SectionBox>

      {/* import dialog — clients only */}
      <ImportDialog
        open={clientImportOpen}
        onClose={() => setClientImportOpen(false)}
        onImport={handleClientImport}
        dbFields={CLIENT_DB_FIELDS}
        entityLabel="Client"
        colors={colors}
      />

      {/* toast */}
      <Snackbar
        open={toast.open} autoHideDuration={3500}
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

export default AdminPage;