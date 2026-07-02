import {
  Box, Typography, Switch, Select, MenuItem,
  FormControl, Button, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, InputAdornment,
  IconButton, useTheme,
} from "@mui/material";
import { tokens } from "../../theme";
import Header from "../../components/Header";
import NotificationsOutlinedIcon from "@mui/icons-material/NotificationsOutlined";
import SecurityOutlinedIcon from "@mui/icons-material/SecurityOutlined";
import LanguageOutlinedIcon from "@mui/icons-material/LanguageOutlined";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import VisibilityOffOutlinedIcon from "@mui/icons-material/VisibilityOffOutlined";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import {
  buildSwitchSx,
  buildSelectSx,
  buildCardSx,
  buildPasswordFieldSx,
  usePasswordDialog,
  useSettingsPage,
} from "./settings.logic";

/* =========================================================================
   SECTION TITLE — header row for each settings card (icon + label)
   ========================================================================= */

const SectionTitle = ({ icon, label, colors }) => (
  <Box display="flex" alignItems="center" gap="8px" mb="18px"
    pb="12px" sx={{ borderBottom: `1px solid ${colors.primary[300]}` }}>
    <Box sx={{ color: colors.greenAccent[500], display: "flex" }}>{icon}</Box>
    <Typography variant="h5" fontWeight={700} color={colors.grey[100]}>{label}</Typography>
  </Box>
);

/* =========================================================================
   SETTING ROW — label/description on the left, control on the right
   ========================================================================= */

const SettingRow = ({ label, description, control, colors, noBorder }) => (
  <Box display="flex" justifyContent="space-between" alignItems="center"
    py="13px" sx={{ borderBottom: noBorder ? "none" : `1px solid ${colors.primary[300]}` }}>
    <Box>
      <Typography variant="body2" color={colors.grey[100]} fontWeight={500}>{label}</Typography>
      {description && (
        <Typography variant="caption" color={colors.grey[500]} display="block" mt="2px">{description}</Typography>
      )}
    </Box>
    <Box flexShrink={0} ml="20px">{control}</Box>
  </Box>
);

/* =========================================================================
   CHANGE PASSWORD DIALOG
   ========================================================================= */

const ChangePasswordDialog = ({ open, onClose, colors }) => {
  const { fields, error, success, handleSubmit, handleClose } = usePasswordDialog(onClose);
  const passwordFieldSx = buildPasswordFieldSx(colors);

  const renderPasswordField = (field) => (
    <TextField
      key={field.label}
      fullWidth
      label={field.label}
      type={field.show ? "text" : "password"}
      value={field.value}
      onChange={(e) => field.setValue(e.target.value)}
      size="small"
      InputProps={{
        endAdornment: (
          <InputAdornment position="end">
            <IconButton size="small" onClick={() => field.setShow(!field.show)}
              sx={{ color: colors.grey[400] }}>
              {field.show ? <VisibilityOffOutlinedIcon fontSize="small" /> : <VisibilityOutlinedIcon fontSize="small" />}
            </IconButton>
          </InputAdornment>
        ),
      }}
      sx={passwordFieldSx}
    />
  );

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth
      PaperProps={{
        sx: {
          backgroundColor: colors.primary[400],
          borderRadius: "14px",
          border: `1px solid ${colors.primary[300]}`,
          boxShadow: "0 24px 60px rgba(0,0,0,0.5)",
        },
      }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Box display="flex" alignItems="center" gap="10px">
          <Box sx={{
            width: 36, height: 36, borderRadius: "8px",
            background: "rgba(104,112,250,0.15)",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "#868dfb",
          }}>
            <LockOutlinedIcon fontSize="small" />
          </Box>
          <Box>
            <Typography variant="h5" fontWeight={700} color={colors.grey[100]}>Change Password</Typography>
            <Typography variant="caption" color={colors.grey[500]}>Update your login credentials</Typography>
          </Box>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ display: "flex", flexDirection: "column", gap: "14px", pt: "12px !important" }}>
        {renderPasswordField(fields.current)}
        {renderPasswordField(fields.next)}
        {renderPasswordField(fields.confirm)}

        {error && (
          <Box sx={{ background: "rgba(226,75,74,0.1)", border: "1px solid rgba(226,75,74,0.3)",
            borderRadius: "8px", p: "8px 12px" }}>
            <Typography variant="caption" color="#e24b4a">{error}</Typography>
          </Box>
        )}
        {success && (
          <Box sx={{ background: "rgba(76,206,172,0.1)", border: "1px solid rgba(76,206,172,0.3)",
            borderRadius: "8px", p: "8px 12px" }}>
            <Typography variant="caption" color={colors.greenAccent[400]}>Password updated successfully.</Typography>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: "24px", pb: "20px", gap: "8px" }}>
        <Button onClick={handleClose} sx={{
          color: colors.grey[400], borderRadius: "8px", px: "16px",
          "&:hover": { background: colors.primary[300] },
        }}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} sx={{
          backgroundColor: colors.blueAccent[700], color: colors.grey[100],
          fontWeight: 700, borderRadius: "8px", px: "20px",
          "&:hover": { backgroundColor: colors.blueAccent[600] },
        }}>
          Update Password
        </Button>
      </DialogActions>
    </Dialog>
  );
};

/* =========================================================================
   MAIN COMPONENT
   ========================================================================= */

const SettingsPage = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);

  const switchSx = buildSwitchSx(colors);
  const selectSx = buildSelectSx(colors);
  const card = buildCardSx(colors);

  const {
    notifMaintenance, setNotifMaintenance,
    notifReports, setNotifReports,
    notifSupply, setNotifSupply,
    notifLowStock, setNotifLowStock,
    sessionTimeout, setSessionTimeout,
    dateFormat, setDateFormat,
    pwDialogOpen, openPasswordDialog, closePasswordDialog,
    handleSaveChanges,
  } = useSettingsPage();

  return (
    <Box m="20px" display="flex" flexDirection="column" height="calc(100vh - 112px)">
      {/* ----------------------------------------------------------------
          HEADER + SAVE BUTTON
          ---------------------------------------------------------------- */}
      <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb="16px">
        <Header title="SETTINGS" subtitle="Manage your preferences" />
        <Button onClick={handleSaveChanges} sx={{
          backgroundColor: colors.blueAccent[700], color: colors.grey[100],
          fontWeight: 700, fontSize: "13px", px: "22px", py: "9px",
          borderRadius: "8px", mt: "6px", flexShrink: 0,
          "&:hover": { backgroundColor: colors.blueAccent[600] },
        }}>
          Save Changes
        </Button>
      </Box>

      <Box display="grid" gridTemplateColumns="1fr 1fr" gap="16px" flex={1} minHeight={0}>

        {/* ----------------------------------------------------------------
            NOTIFICATIONS CARD
            ---------------------------------------------------------------- */}
        <Box sx={card} overflow="auto">
          <SectionTitle icon={<NotificationsOutlinedIcon fontSize="small" />} label="Notifications" colors={colors} />
          <SettingRow label="Maintenance Alerts" description="Notify when maintenance is due or overdue"
            control={<Switch checked={notifMaintenance} onChange={(e) => setNotifMaintenance(e.target.checked)} sx={switchSx} size="small" />}
            colors={colors} />
          <SettingRow label="Report Updates" description="Notify on report approvals and rejections"
            control={<Switch checked={notifReports} onChange={(e) => setNotifReports(e.target.checked)} sx={switchSx} size="small" />}
            colors={colors} />
          <SettingRow label="Supply Logs" description="Notify when new supply entries are created"
            control={<Switch checked={notifSupply} onChange={(e) => setNotifSupply(e.target.checked)} sx={switchSx} size="small" />}
            colors={colors} />
          <SettingRow label="Low Stock Alerts" description="Notify when store items reach critical levels"
            control={<Switch checked={notifLowStock} onChange={(e) => setNotifLowStock(e.target.checked)} sx={switchSx} size="small" />}
            colors={colors} noBorder />
        </Box>

        {/* ----------------------------------------------------------------
            SECURITY CARD
            ---------------------------------------------------------------- */}
        <Box sx={card} overflow="auto">
          <SectionTitle icon={<SecurityOutlinedIcon fontSize="small" />} label="Security" colors={colors} />
          <SettingRow label="Session Timeout" description="Auto log out after inactivity"
            control={
              <FormControl size="small">
                <Select value={sessionTimeout} onChange={(e) => setSessionTimeout(e.target.value)} sx={selectSx}>
                  <MenuItem value="15">15 minutes</MenuItem>
                  <MenuItem value="30">30 minutes</MenuItem>
                  <MenuItem value="60">1 hour</MenuItem>
                  <MenuItem value="120">2 hours</MenuItem>
                </Select>
              </FormControl>
            }
            colors={colors} />
          <Box pt="16px">
            <Button fullWidth variant="outlined" onClick={openPasswordDialog} sx={{
              borderColor: colors.blueAccent[600], color: colors.blueAccent[400],
              borderRadius: "8px", fontWeight: 600, fontSize: "13px", py: "8px",
              "&:hover": { borderColor: colors.blueAccent[400], background: "rgba(104,112,250,0.08)" },
            }}>
              Change Password
            </Button>
          </Box>
        </Box>

        {/* ----------------------------------------------------------------
            REGIONAL CARD
            ---------------------------------------------------------------- */}
        <Box sx={{ ...card, gridColumn: "1 / -1" }} overflow="auto">
          <SectionTitle icon={<LanguageOutlinedIcon fontSize="small" />} label="Regional" colors={colors} />
          <SettingRow label="Date Format" description="How dates are displayed across the app"
            control={
              <FormControl size="small">
                <Select value={dateFormat} onChange={(e) => setDateFormat(e.target.value)} sx={selectSx}>
                  <MenuItem value="DD/MM/YYYY">DD/MM/YYYY</MenuItem>
                  <MenuItem value="MM/DD/YYYY">MM/DD/YYYY</MenuItem>
                  <MenuItem value="YYYY-MM-DD">YYYY-MM-DD</MenuItem>
                </Select>
              </FormControl>
            }
            colors={colors} noBorder />
        </Box>

      </Box>

      <ChangePasswordDialog open={pwDialogOpen} onClose={closePasswordDialog} colors={colors} />
    </Box>
  );
};

export default SettingsPage;