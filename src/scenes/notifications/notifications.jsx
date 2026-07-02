import { Box, Typography, IconButton, Divider, useTheme } from "@mui/material";
import { tokens } from "../../theme";
import Header from "../../components/Header";
import BuildOutlinedIcon from "@mui/icons-material/BuildOutlined";
import AssignmentOutlinedIcon from "@mui/icons-material/AssignmentOutlined";
import LocalShippingOutlinedIcon from "@mui/icons-material/LocalShippingOutlined";
import WarningAmberOutlinedIcon from "@mui/icons-material/WarningAmberOutlined";
import CheckCircleOutlineOutlinedIcon from "@mui/icons-material/CheckCircleOutlineOutlined";
import DoneAllOutlinedIcon from "@mui/icons-material/DoneAllOutlined";
import DeleteOutlineOutlinedIcon from "@mui/icons-material/DeleteOutlineOutlined";
import PersonAddOutlinedIcon from "@mui/icons-material/PersonAddOutlined";
import { buildTypeConfig, useNotificationsPage } from "./notifications.logic";

/* =========================================================================
   NOTIF ITEM — single notification row (icon, title, message, time, actions)
   ========================================================================= */

const NotifItem = ({ n, isUnread, typeConfig, colors, onMarkRead, onDismiss }) => {
  const cfg = typeConfig[n.type];
  return (
    <Box
      display="flex" alignItems="flex-start" gap="14px" p="14px 18px"
      sx={{
        background: isUnread ? "rgba(104,112,250,0.03)" : "transparent",
        opacity: isUnread ? 1 : 0.6,
        "&:hover": { background: colors.primary[300], opacity: 1 },
        transition: "all 0.12s",
      }}
    >
      <Box sx={{
        width: 38, height: 38, flexShrink: 0, borderRadius: "10px",
        background: cfg.bg, color: cfg.color,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        {cfg.icon}
      </Box>
      <Box flex={1} minWidth={0}>
        <Box display="flex" alignItems="center" gap="8px" mb="2px">
          <Typography variant="body2" fontWeight={600} color={colors.grey[100]}>
            {n.title}
          </Typography>
          {isUnread && (
            <Box sx={{ width: 6, height: 6, borderRadius: "50%", background: "#6870fa", flexShrink: 0 }} />
          )}
        </Box>
        <Typography variant="body2" color={colors.grey[400]} sx={{ lineHeight: 1.5, fontSize: "12.5px" }}>
          {n.message}
        </Typography>
        <Typography variant="caption" color={colors.grey[600]} mt="4px" display="block">
          {n.time}
        </Typography>
      </Box>
      <Box display="flex" gap="2px" flexShrink={0} alignItems="center">
        {isUnread && (
          <IconButton size="small" onClick={() => onMarkRead(n.id)}
            sx={{ color: colors.greenAccent[500], borderRadius: "6px", p: "5px",
              "&:hover": { background: "rgba(76,206,172,0.1)" } }}>
            <CheckCircleOutlineOutlinedIcon sx={{ fontSize: 17 }} />
          </IconButton>
        )}
        <IconButton size="small" onClick={() => onDismiss(n.id)}
          sx={{ color: colors.grey[600], borderRadius: "6px", p: "5px",
            "&:hover": { background: "rgba(226,75,74,0.1)", color: "#e24b4a" } }}>
          <DeleteOutlineOutlinedIcon sx={{ fontSize: 17 }} />
        </IconButton>
      </Box>
    </Box>
  );
};

/* =========================================================================
   MAIN COMPONENT
   ========================================================================= */

const NotificationsPage = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);

  // type icons live here (UI file) and get passed into the logic file,
  // so useNotificationsPage.js never needs to import JSX/icons
  const typeConfig = buildTypeConfig({
    maintenance: <BuildOutlinedIcon fontSize="small" />,
    report: <AssignmentOutlinedIcon fontSize="small" />,
    supply: <LocalShippingOutlinedIcon fontSize="small" />,
    alert: <WarningAmberOutlinedIcon fontSize="small" />,
    signup: <PersonAddOutlinedIcon fontSize="small" />,
  });

  const { unreadCount, unread, read, loading, error, markAllRead, markRead, dismiss } =
    useNotificationsPage();

  return (
    <Box m="20px" display="flex" flexDirection="column" height="calc(100vh - 112px)">
      {/* ----------------------------------------------------------------
          HEADER ROW
          ---------------------------------------------------------------- */}
      <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb="16px">
        <Header
          title="NOTIFICATIONS"
          subtitle={unreadCount > 0 ? `${unreadCount} unread notification${unreadCount > 1 ? "s" : ""}` : "All caught up"}
        />
        {unreadCount > 0 && (
          <Box
            display="flex" alignItems="center" gap="6px"
            onClick={markAllRead}
            sx={{
              cursor: "pointer", color: colors.greenAccent[400],
              px: "12px", py: "6px", borderRadius: "8px",
              "&:hover": { background: colors.primary[300] },
              mt: "6px", flexShrink: 0,
            }}
          >
            <DoneAllOutlinedIcon sx={{ fontSize: 17 }} />
            <Typography variant="body2" fontWeight={600} color={colors.greenAccent[400]}>
              Mark all read
            </Typography>
          </Box>
        )}
      </Box>

      {/* ----------------------------------------------------------------
          TWO-COLUMN LAYOUT: UNREAD (left) / READ (right)
          ---------------------------------------------------------------- */}
      {error && (
        <Box mb="12px" p="12px 14px" borderRadius="8px" sx={{ background: "rgba(226,75,74,0.12)", color: "#f28b82" }}>
          {error}
        </Box>
      )}

      <Box display="grid" gridTemplateColumns="1fr 1fr" gap="20px" flex={1} minHeight={0}>

        {/* ---- Left: Unread ---- */}
        <Box display="flex" flexDirection="column" minHeight={0}>
          <Box display="flex" alignItems="center" gap="8px" mb="10px">
            <Typography variant="h6" color={colors.grey[200]} fontWeight={600}>New</Typography>
            {unread.length > 0 && (
              <Box sx={{
                background: "#6870fa", color: "#fff",
                fontSize: "11px", fontWeight: 700,
                px: "7px", py: "1px", borderRadius: "10px", lineHeight: "18px",
              }}>{unread.length}</Box>
            )}
          </Box>
          <Box backgroundColor={colors.primary[400]} borderRadius="12px" overflow="auto" flex={1}>
            {loading ? (
              <Box p="32px" textAlign="center">
                <Typography variant="body2" color={colors.grey[400]}>Loading notifications…</Typography>
              </Box>
            ) : unread.length === 0 ? (
              <Box p="32px" textAlign="center">
                <DoneAllOutlinedIcon sx={{ fontSize: 36, color: colors.greenAccent[500], mb: "8px" }} />
                <Typography variant="body2" color={colors.grey[400]}>No new notifications</Typography>
              </Box>
            ) : (
              unread.map((n, i) => (
                <Box key={n.id}>
                  <NotifItem
                    n={n}
                    isUnread
                    typeConfig={typeConfig}
                    colors={colors}
                    onMarkRead={markRead}
                    onDismiss={dismiss}
                  />
                  {i < unread.length - 1 && <Divider sx={{ borderColor: colors.primary[300] }} />}
                </Box>
              ))
            )}
          </Box>
        </Box>

        {/* ---- Right: Read ---- */}
        <Box display="flex" flexDirection="column" minHeight={0}>
          <Typography variant="h6" color={colors.grey[500]} fontWeight={600} mb="10px">Earlier</Typography>
          <Box backgroundColor={colors.primary[400]} borderRadius="12px" overflow="auto" flex={1}>
            {loading ? (
              <Box p="32px" textAlign="center">
                <Typography variant="body2" color={colors.grey[500]}>Loading notifications…</Typography>
              </Box>
            ) : read.length === 0 ? (
              <Box p="32px" textAlign="center">
                <Typography variant="body2" color={colors.grey[500]}>Nothing here</Typography>
              </Box>
            ) : (
              read.map((n, i) => (
                <Box key={n.id}>
                  <NotifItem
                    n={n}
                    isUnread={false}
                    typeConfig={typeConfig}
                    colors={colors}
                    onMarkRead={markRead}
                    onDismiss={dismiss}
                  />
                  {i < read.length - 1 && <Divider sx={{ borderColor: colors.primary[300] }} />}
                </Box>
              ))
            )}
          </Box>
        </Box>

      </Box>
    </Box>
  );
};

export default NotificationsPage;