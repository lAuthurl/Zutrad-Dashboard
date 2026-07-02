import { Box, IconButton, useTheme, Badge, Tooltip, Avatar, Typography } from "@mui/material";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { tokens } from "../../theme";
import NotificationsOutlinedIcon from "@mui/icons-material/NotificationsOutlined";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import DarkModeOutlinedIcon from "@mui/icons-material/DarkModeOutlined";
import { loadUserNotifications, NOTIFICATIONS_UPDATED_EVENT } from "../notifications/notifications.logic";
import { getSettings } from "../../utils/settings";
import { SETTINGS_UPDATED_EVENT } from "../settings/settings.logic";
import { EVENTS } from "../../utils/eventbus";

const Topbar = ({ currentUser }) => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const navigate = useNavigate();

  const userId = currentUser?.id ?? currentUser?._id ?? null;
  const [notificationCount, setNotificationCount] = useState(0);

  useEffect(() => {
    let active = true;

    // Uses the exact same fetch + generate + per-user read/dismissed logic
    // as the notifications page itself, so the badge never drifts out of
    // sync with what's actually shown there. Settings are fetched here too
    // (rather than reading currentUser.settings) so a save on the Settings
    // page — which updates the server and localStorage but not this
    // component's props — is picked up correctly on the next load.
    const loadCount = async () => {
      try {
        const settings = await getSettings().catch(() => null);
        const notifications = await loadUserNotifications(userId, settings);
        if (active) setNotificationCount(notifications.filter((n) => !n.read).length);
      } catch {
        if (active) setNotificationCount(0);
      }
    };

    loadCount();

    // The notifications page broadcasts this event after mark read / mark
    // all read / dismiss, with the freshly computed count already attached
    // — so the badge updates instantly without a full refetch. Only react
    // to events for the currently logged-in user.
    const onNotificationsUpdated = (e) => {
      if (e.detail?.userId !== userId) return;
      if (typeof e.detail?.unreadCount === "number") {
        setNotificationCount(e.detail.unreadCount);
      } else {
        loadCount();
      }
    };
    window.addEventListener(NOTIFICATIONS_UPDATED_EVENT, onNotificationsUpdated);

    const onReportsChanged = () => loadCount();
    const onMaintenanceChanged = () => loadCount();
    window.addEventListener(EVENTS.REPORTS_CHANGED, onReportsChanged);
    window.addEventListener(EVENTS.MAINTENANCE_CHANGED, onMaintenanceChanged);

    // Toggling a notification category (or changing any other setting) on
    // the Settings page fires this after a successful save. The event
    // doesn't carry an unread count — only the raw settings — so this
    // triggers a full recount rather than trying to derive it from
    // event.detail.
    const onSettingsUpdated = () => loadCount();
    window.addEventListener(SETTINGS_UPDATED_EVENT, onSettingsUpdated);

    return () => {
      active = false;
      window.removeEventListener(NOTIFICATIONS_UPDATED_EVENT, onNotificationsUpdated);
      window.removeEventListener(EVENTS.REPORTS_CHANGED, onReportsChanged);
      window.removeEventListener(EVENTS.MAINTENANCE_CHANGED, onMaintenanceChanged);
      window.removeEventListener(SETTINGS_UPDATED_EVENT, onSettingsUpdated);
    };
  }, [userId]);

  const displayName = currentUser
    ? `${currentUser.firstName || ""} ${currentUser.surname || ""}`.trim()
    : "Guest User";
  const initials = currentUser
    ? `${currentUser.firstName?.[0] ?? "G"}${currentUser.surname?.[0] ?? "U"}`.toUpperCase()
    : "GU";
  const roleLabel = currentUser?.role
    ? currentUser.role.charAt(0).toUpperCase() + currentUser.role.slice(1)
    : "User";

  return (
    <Box
      display="flex"
      justifyContent="space-between"
      alignItems="center"
      px={2.5}
      py={1.5}
      sx={{
        background: colors.primary[500],
        minHeight: "58px",
        position: "sticky",
        top: 0,
        zIndex: 100,
      }}
    >
      {/* Brand name */}
      <Typography
        fontWeight={900}
        fontSize="24px"
        letterSpacing="0.10em"
        sx={{
          background: `linear-gradient(90deg, ${colors.greenAccent[400]}, ${colors.blueAccent[300]})`,
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          userSelect: "none",
          lineHeight: 1,
        }}
      >
        ZUTRAD VENTURES LTD
      </Typography>

      {/* Right-side actions */}
      <Box display="flex" alignItems="center" gap="4px">
        <Tooltip title="Dark mode" placement="bottom" arrow>
          <IconButton
            disableRipple
            sx={{
              color: colors.grey[300],
              cursor: "default",
              "&:hover": { background: "transparent" },
            }}
          >
            <DarkModeOutlinedIcon />
          </IconButton>
        </Tooltip>

        <Tooltip title="Notifications" placement="bottom" arrow>
          <IconButton
            onClick={() => navigate("/notifications")}
            sx={{
              color: colors.grey[300],
              borderRadius: "8px",
              "&:hover": { background: colors.primary[300], color: colors.grey[100] },
            }}
          >
            <Badge
              badgeContent={notificationCount}
              sx={{
                "& .MuiBadge-badge": {
                  backgroundColor: "#e24b4a",
                  color: "white",
                  fontSize: "10px",
                  fontWeight: 700,
                  minWidth: "16px",
                  height: "16px",
                  borderRadius: "8px",
                },
              }}
            >
              <NotificationsOutlinedIcon />
            </Badge>
          </IconButton>
        </Tooltip>

        <Tooltip title="Settings" placement="bottom" arrow>
          <IconButton
            onClick={() => navigate("/settings")}
            sx={{
              color: colors.grey[300],
              borderRadius: "8px",
              "&:hover": { background: colors.primary[300], color: colors.grey[100] },
            }}
          >
            <SettingsOutlinedIcon />
          </IconButton>
        </Tooltip>

        <Tooltip title={`${displayName} — ${roleLabel}`} placement="bottom" arrow>
          <IconButton
            onClick={() => navigate("/profile")}
            sx={{
              p: 0.5,
              borderRadius: "8px",
              "&:hover": { background: colors.primary[300] },
            }}
          >
            <Avatar
              sx={{
                width: 32,
                height: 32,
                fontSize: "13px",
                fontWeight: 600,
                background: "linear-gradient(135deg, #6870fa, #a78bfa)",
              }}
            >
              {initials}
            </Avatar>
          </IconButton>
        </Tooltip>
      </Box>
    </Box>
  );
};

export default Topbar;