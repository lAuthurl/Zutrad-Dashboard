import {
  Box, Typography, Avatar, Chip, Divider, useTheme,
  Button, Dialog, DialogTitle, DialogContent,
  DialogContentText, DialogActions, Alert, CircularProgress,
} from "@mui/material";
import { tokens } from "../../theme";
import Header from "../../components/Header";
import EmailOutlinedIcon          from "@mui/icons-material/EmailOutlined";
import BadgeOutlinedIcon          from "@mui/icons-material/BadgeOutlined";
import ShieldOutlinedIcon         from "@mui/icons-material/ShieldOutlined";
import AssignmentOutlinedIcon     from "@mui/icons-material/AssignmentOutlined";
import LocalShippingOutlinedIcon  from "@mui/icons-material/LocalShippingOutlined";
import BuildOutlinedIcon          from "@mui/icons-material/BuildOutlined";
import LogoutOutlinedIcon         from "@mui/icons-material/LogoutOutlined";
import DeleteForeverOutlinedIcon  from "@mui/icons-material/DeleteForeverOutlined";
import FiberManualRecordIcon      from "@mui/icons-material/FiberManualRecord";
import { useProfilePage } from "./profile.logic";

/* =========================================================================
   INFO ROW
   ========================================================================= */
const InfoRow = ({ icon, label, value, colors, noBorder, valueNode }) => (
  <Box display="flex" alignItems="center" gap="14px" py="13px"
    sx={{ borderBottom: noBorder ? "none" : `1px solid ${colors.primary[300]}` }}>
    <Box sx={{
      width: 34, height: 34, borderRadius: "8px", flexShrink: 0,
      background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.07)",
      color: colors.greenAccent[500], display: "flex", alignItems: "center", justifyContent: "center",
    }}>{icon}</Box>
    <Box>
      <Typography variant="caption" color={colors.grey[500]} display="block">{label}</Typography>
      {valueNode ?? (
        <Typography variant="body2" color={colors.grey[100]} fontWeight={500} mt="1px">{value}</Typography>
      )}
    </Box>
  </Box>
);

/* =========================================================================
   STAT CARD
   ========================================================================= */
const StatCard = ({ icon, label, value, colors }) => (
  <Box sx={{
    background: "rgba(104,112,250,0.12)",
    border: "1px solid rgba(104,112,250,0.2)",
    borderRadius: "10px",
    p: "16px 14px", display: "flex", flexDirection: "column",
    alignItems: "center", gap: "6px", flex: 1,
  }}>
    <Box sx={{ color: colors.greenAccent[500], display: "flex" }}>{icon}</Box>
    <Typography variant="h3" fontWeight={700} color={colors.grey[100]}>{value}</Typography>
    <Typography variant="caption" color={colors.grey[300]} textAlign="center">{label}</Typography>
  </Box>
);

/* =========================================================================
   STATUS DOT — colour-coded inline indicator
   ========================================================================= */
const STATUS_COLOURS = {
  success: "#1d9e75",
  warning: "#ff9800",
  error:   "#e53935",
};

const StatusBadge = ({ label, color }) => (
  <Box display="flex" alignItems="center" gap="6px" mt="1px">
    <FiberManualRecordIcon sx={{ fontSize: 10, color: STATUS_COLOURS[color] }} />
    <Typography variant="body2" fontWeight={600} color={STATUS_COLOURS[color]}>{label}</Typography>
  </Box>
);

/* =========================================================================
   MAIN COMPONENT
   ========================================================================= */
const ProfilePage = ({ currentUser, onLogout }) => {
  const theme  = useTheme();
  const colors = tokens(theme.palette.mode);

  const {
    user, roleLabel, displayName, initials,
    permissions, activityStats,
    accountStatusLabel, accountStatusColor,
    handleLogout,
    deleteDialog, deleteLoading, deleteError,
    openDeleteDialog, closeDeleteDialog, handleDeleteAccount,
  } = useProfilePage(currentUser, onLogout);

  return (
    <Box m="20px" display="flex" flexDirection="column" height="calc(100vh - 112px)">
      <Box mb="16px">
        <Header title="PROFILE" subtitle="Your account details" />
      </Box>

      <Box display="grid" gridTemplateColumns="260px 1fr" gap="16px" flex={1} minHeight={0}>

        {/* ── LEFT CARD ───────────────────────────────────────────────────── */}
        <Box
          backgroundColor={colors.primary[400]} borderRadius="12px"
          p="24px 20px" display="flex" flexDirection="column"
          alignItems="center" gap="0" overflow="auto"
        >
          {/* Avatar */}
          <Box sx={{ position: "relative", mb: "12px" }}>
            <Avatar sx={{
              width: 80, height: 80, fontSize: "26px", fontWeight: 700,
              background: "linear-gradient(135deg, #6870fa, #a78bfa)",
            }}>{initials}</Avatar>
            {/* online dot */}
            <Box sx={{
              width: 13, height: 13, borderRadius: "50%",
              background: STATUS_COLOURS[accountStatusColor],
              border: `2px solid ${colors.primary[400]}`,
              position: "absolute", bottom: 3, right: 3,
            }} />
          </Box>

          <Typography variant="h4" fontWeight={700} color={colors.grey[100]}>{displayName}</Typography>
          <Typography variant="body2" sx={{ color: "#6870fa", mt: "3px", mb: "10px" }}>{roleLabel}</Typography>

          <Chip label={roleLabel} size="small" sx={{
            backgroundColor: "rgba(104,112,250,0.15)", color: "#868dfb",
            fontWeight: 600, fontSize: "11px", border: "1px solid rgba(104,112,250,0.3)",
          }} />

          <Divider sx={{ width: "100%", borderColor: colors.primary[300], my: "18px" }} />

          {/* Permissions */}
          <Box width="100%">
            <Typography variant="caption" color={colors.grey[500]} display="block"
              mb="10px" fontWeight={600} letterSpacing="0.06em" textTransform="uppercase">
              Permissions
            </Typography>
            <Box display="flex" flexWrap="wrap" gap="6px">
              {permissions.map((p) => (
                <Chip key={p} label={p} size="small" sx={{
                  backgroundColor: "rgba(76,206,172,0.1)",
                  color: colors.greenAccent[400], fontSize: "11px", fontWeight: 500,
                  border: "1px solid rgba(76,206,172,0.2)",
                }} />
              ))}
            </Box>
          </Box>

          <Divider sx={{ width: "100%", borderColor: colors.primary[300], my: "18px" }} />

          {/* ── Action buttons ──────────────────────────────────────────── */}
          <Box width="100%" display="flex" flexDirection="column" gap="8px">
            <Button
              fullWidth
              variant="outlined"
              startIcon={<LogoutOutlinedIcon />}
              onClick={handleLogout}
              sx={{
                borderColor: colors.grey[600],
                color: colors.grey[300],
                textTransform: "none",
                fontWeight: 600,
                borderRadius: "8px",
                "&:hover": { borderColor: colors.grey[400], color: colors.grey[100], background: "rgba(255,255,255,0.04)" },
              }}
            >
              Sign out
            </Button>

            <Button
              fullWidth
              variant="outlined"
              startIcon={<DeleteForeverOutlinedIcon />}
              onClick={openDeleteDialog}
              sx={{
                borderColor: "rgba(229,57,53,0.4)",
                color: "#e57373",
                textTransform: "none",
                fontWeight: 600,
                borderRadius: "8px",
                "&:hover": { borderColor: "#e53935", color: "#ef9a9a", background: "rgba(229,57,53,0.06)" },
              }}
            >
              Delete account
            </Button>
          </Box>
        </Box>

        {/* ── RIGHT PANEL ─────────────────────────────────────────────────── */}
        <Box display="flex" flexDirection="column" gap="16px" minHeight={0}>

          {/* Account info */}
          <Box backgroundColor={colors.primary[400]} borderRadius="12px" p="20px 24px" flex={1} overflow="auto">
            <Typography variant="h5" fontWeight={700} color={colors.grey[100]} mb="2px">
              Account Information
            </Typography>
            <Typography variant="caption" color={colors.grey[500]} display="block" mb="8px">
              Personal and role details for your account.
            </Typography>

            <InfoRow icon={<EmailOutlinedIcon sx={{ fontSize: 17 }} />}
              label="Email Address" value={user.email || "Not available"} colors={colors} />
            <InfoRow icon={<BadgeOutlinedIcon sx={{ fontSize: 17 }} />}
              label="Full Name" value={displayName} colors={colors} />
            <InfoRow icon={<ShieldOutlinedIcon sx={{ fontSize: 17 }} />}
              label="Role" value={roleLabel} colors={colors} />

            {/* Account Status — replaces "Member Since" */}
            <InfoRow
              icon={<FiberManualRecordIcon sx={{ fontSize: 17 }} />}
              label="Account Status"
              colors={colors}
              noBorder
              valueNode={<StatusBadge label={accountStatusLabel} color={accountStatusColor} />}
            />
          </Box>

          {/* Activity summary */}
          <Box backgroundColor={colors.primary[400]} borderRadius="12px" p="20px 24px">
            <Typography variant="h5" fontWeight={700} color={colors.grey[100]} mb="2px">
              Activity Summary
            </Typography>
            <Typography variant="caption" color={colors.grey[500]} display="block" mb="14px">
              All contributions across the system.
            </Typography>
            <Box display="flex" gap="12px">
              <StatCard icon={<AssignmentOutlinedIcon fontSize="small" />}
                label="Reports Filed" value={activityStats.reportsFiled} colors={colors} />
              <StatCard icon={<LocalShippingOutlinedIcon fontSize="small" />}
                label="Supply Logs" value={activityStats.supplyLogs} colors={colors} />
              <StatCard icon={<BuildOutlinedIcon fontSize="small" />}
                label="Maintenance Jobs" value={activityStats.maintenanceJobs} colors={colors} />
            </Box>
          </Box>
        </Box>
      </Box>

      {/* ── Delete Account Confirmation Dialog ──────────────────────────────── */}
      <Dialog
        open={deleteDialog}
        onClose={closeDeleteDialog}
        PaperProps={{
          sx: {
            backgroundColor: colors.primary[400],
            backgroundImage: "none",
            borderRadius: "12px",
            border: "1px solid rgba(229,57,53,0.3)",
            minWidth: "360px",
          },
        }}
      >
        <DialogTitle sx={{ color: "#ef9a9a", fontWeight: 700, pb: "8px" }}>
          Delete Account
        </DialogTitle>

        <DialogContent>
          <DialogContentText sx={{ color: colors.grey[300], fontSize: "14px", mb: "4px" }}>
            This action is <strong style={{ color: "#e57373" }}>permanent and cannot be undone</strong>.
            Your account, permissions, and all associated data will be removed.
          </DialogContentText>
          <DialogContentText sx={{ color: colors.grey[400], fontSize: "13px" }}>
            Are you sure you want to delete <strong style={{ color: colors.grey[200] }}>{displayName}</strong>'s account?
          </DialogContentText>

          {deleteError && (
            <Alert severity="error" sx={{ mt: "14px", fontSize: "13px" }}>
              {deleteError}
            </Alert>
          )}
        </DialogContent>

        <DialogActions sx={{ px: "24px", pb: "20px", gap: "8px" }}>
          <Button
            onClick={closeDeleteDialog}
            disabled={deleteLoading}
            sx={{
              color: colors.grey[300], textTransform: "none", fontWeight: 600,
              "&:hover": { color: colors.grey[100] },
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleDeleteAccount}
            disabled={deleteLoading}
            variant="contained"
            startIcon={deleteLoading ? <CircularProgress size={14} color="inherit" /> : <DeleteForeverOutlinedIcon />}
            sx={{
              background: "#c62828", color: "#fff",
              textTransform: "none", fontWeight: 700, borderRadius: "8px",
              "&:hover": { background: "#e53935" },
              "&:disabled": { background: "#7f1010", color: "#ccc" },
            }}
          >
            {deleteLoading ? "Deleting…" : "Yes, delete my account"}
          </Button>
        </DialogActions>
      </Dialog>

    </Box>
  );
};

export default ProfilePage;