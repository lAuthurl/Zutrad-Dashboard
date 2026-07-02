import { useEffect, useState } from "react";
import { Box, IconButton, Typography, useTheme, Tooltip, Badge } from "@mui/material";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ProSidebar, Menu, MenuItem } from "react-pro-sidebar";
import "react-pro-sidebar/dist/css/styles.css";
import HomeOutlinedIcon from "@mui/icons-material/HomeOutlined";
import PeopleOutlinedIcon from "@mui/icons-material/PeopleOutlined";
import ContactsOutlinedIcon from "@mui/icons-material/ContactsOutlined";
import ReceiptOutlinedIcon from "@mui/icons-material/ReceiptOutlined";
import CalendarTodayOutlinedIcon from "@mui/icons-material/CalendarTodayOutlined";
import BarChartOutlinedIcon from "@mui/icons-material/BarChartOutlined";
import PieChartOutlineOutlinedIcon from "@mui/icons-material/PieChartOutlineOutlined";
import TimelineOutlinedIcon from "@mui/icons-material/TimelineOutlined";
import MenuOutlinedIcon from "@mui/icons-material/MenuOutlined";
import BuildOutlinedIcon from "@mui/icons-material/BuildOutlined";
import StorefrontOutlinedIcon from "@mui/icons-material/StorefrontOutlined";
import LocalShippingOutlinedIcon from "@mui/icons-material/LocalShippingOutlined";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import ExpandLessOutlinedIcon from "@mui/icons-material/ExpandLessOutlined";
import VerifiedUserOutlinedIcon from "@mui/icons-material/VerifiedUserOutlined";
import { tokens } from "../../theme";
import { EVENTS, subscribe } from "../../utils/eventbus";

const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:5000";

const authHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${localStorage.getItem("token")}`,
});

const getMenuKeyFromPath = (pathname) => {
  if (pathname === "/") return "Dashboard";
  if (pathname === "/calendar") return "Calendar";
  if (pathname === "/users") return "Manage Team";
  if (pathname === "/clients-list") return "Clients";
  if (pathname === "/reports") return "Reports";
  if (pathname === "/supply") return "Supply / Invoices";
  if (pathname === "/store") return "Store";
  if (pathname === "/machines") return "Client Machines";
  if (pathname === "/maintenance") return "Maintenance";
  if (pathname === "/bar") return "Bar Chart";
  if (pathname === "/pie") return "Pie Chart";
  if (pathname === "/line") return "Line Chart";
  if (pathname === "/admin") return "Admin Panel";
  if (pathname === "/super-admin") return "Super Admin Panel";
  return "Dashboard";
};

// ─── Section Label ────────────────────────────────────────────────────────────
const SectionLabel = ({ label, isCollapsed, colors }) => (
  <Typography
    variant="caption"
    sx={{
      display: "block",
      color: colors.grey[500],
      fontWeight: 700,
      letterSpacing: "0.08em",
      textTransform: "uppercase",
      padding: isCollapsed ? "14px 0 4px" : "14px 16px 4px",
      opacity: isCollapsed ? 0 : 1,
      height: "30px",
      overflow: "hidden",
      transition: "opacity 0.2s",
      userSelect: "none",
    }}
  >
    {label}
  </Typography>
);

// ─── Nav Item ─────────────────────────────────────────────────────────────────
const Item = ({ title, to, icon, selected, setSelected, badgeCount, badgeColor, isCollapsed }) => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const isActive = selected === title;

  const badgeStyles = {
    "& .MuiBadge-badge": {
      backgroundColor: badgeColor === "warn" ? "#EF9F27" : "#e24b4a",
      color: badgeColor === "warn" ? "#1a1d2e" : "white",
      fontSize: "10px",
      fontWeight: 700,
      minWidth: "18px",
      height: "16px",
      borderRadius: "10px",
    },
  };

  return (
    <Tooltip title={isCollapsed ? title : ""} placement="right" arrow>
      <MenuItem
        active={isActive}
        onClick={() => setSelected(title)}
        icon={
          badgeCount ? (
            <Badge badgeContent={badgeCount} sx={badgeStyles}>
              {icon}
            </Badge>
          ) : (
            icon
          )
        }
        style={{
          color: isActive ? "#868dfb" : colors.grey[300],
          margin: "1px 8px",
          borderRadius: "8px",
          position: "relative",
        }}
        sx={{
          "&.pro-menu-item.active": {
            backgroundColor: "rgba(104,112,250,0.15) !important",
            "&::before": {
              content: '""',
              position: "absolute",
              left: 0,
              top: "20%",
              bottom: "20%",
              width: "3px",
              backgroundColor: "#6870fa",
              borderRadius: "0 3px 3px 0",
            },
          },
        }}
      >
        <Typography fontSize="13.5px">{title}</Typography>
        <Link to={to} />
      </MenuItem>
    </Tooltip>
  );
};

// ─── Sidebar ──────────────────────────────────────────────────────────────────
const Sidebar = ({ currentUser }) => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const location = useLocation();
  const navigate = useNavigate();
  const [isCollapsed, setIsCollapsed] = useState(() => localStorage.getItem("sidebarCollapsed") === "true");
  const [selected, setSelected] = useState(() => getMenuKeyFromPath(window.location.pathname));
  const [pendingReportCount, setPendingReportCount] = useState(0);
  const [upcomingMaintenanceCount, setUpcomingMaintenanceCount] = useState(0);

  const isSuperAdmin = currentUser?.role === "superadmin";
  const isAdmin = currentUser?.role === "administrator" || isSuperAdmin;

  // Derive display name and role label from currentUser, with fallback
  const displayName = currentUser
    ? `${currentUser.firstName} ${currentUser.surname}`
    : "Guest";
  const displayInitials = currentUser
    ? `${currentUser.firstName?.[0] ?? ""}${currentUser.surname?.[0] ?? ""}`
    : "?";
  const roleLabel = currentUser?.role
    ? currentUser.role.charAt(0).toUpperCase() + currentUser.role.slice(1)
    : "";

  useEffect(() => {
    setSelected(getMenuKeyFromPath(location.pathname));
  }, [location.pathname]);

  useEffect(() => {
    localStorage.setItem("sidebarCollapsed", String(isCollapsed));
  }, [isCollapsed]);

  // ── badge counts ────────────────────────────────────────────────────────────
  // Fetched on mount AND re-fetched whenever ReportsPage or MaintenancePage
  // broadcast a change (create/approve/reject/delete/mark-done), so the
  // sidebar badges never drift out of sync with the real data — no matter
  // which page the user is currently on.
  useEffect(() => {
    let active = true;

    const loadCounts = async () => {
      try {
        const [reportsRes, maintenanceRes] = await Promise.all([
          fetch(`${API_BASE}/reports`, { headers: authHeaders() }),
          fetch(`${API_BASE}/maintenance`, { headers: authHeaders() }),
        ]);

        if (!active) return;

        const reports = reportsRes.ok ? await reportsRes.json() : [];
        const maintenance = maintenanceRes.ok ? await maintenanceRes.json() : [];

        setPendingReportCount(reports.filter((r) => r.status === "pending").length);
        setUpcomingMaintenanceCount(maintenance.filter((m) => !m.isDone).length);
      } catch {
        if (active) {
          setPendingReportCount(0);
          setUpcomingMaintenanceCount(0);
        }
      }
    };

    loadCounts();

    // Re-run whenever a report or maintenance log is created/updated/deleted
    // anywhere in the app, so the badges never go stale.
    const unsubReports = subscribe(EVENTS.REPORTS_CHANGED, loadCounts);
    const unsubMaintenance = subscribe(EVENTS.MAINTENANCE_CHANGED, loadCounts);

    return () => {
      active = false;
      unsubReports();
      unsubMaintenance();
    };
  }, []);

  const sidebarBg = theme.palette.mode === "dark" ? "#1a1d2e" : colors.primary[400];

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        "& .pro-sidebar-inner": {
          background: `${sidebarBg} !important`,
          display: "flex",
          flexDirection: "column",
          height: "100vh",
        },
        "& .pro-sidebar": {
          height: "100vh",
        },
        "& .pro-sidebar > .pro-sidebar-inner > .pro-sidebar-layout": {
          display: "flex",
          flexDirection: "column",
          height: "100%",
        },
        "& .pro-menu": {
          flex: 1,
          overflowY: "auto",
        },
        "& .pro-icon-wrapper": {
          backgroundColor: "transparent !important",
        },
        "& .pro-inner-item": {
          padding: "5px 12px 5px 12px !important",
          borderRadius: "8px",
        },
        "& .pro-inner-item:hover": {
          color: "#c5c7dc !important",
          backgroundColor: "rgba(255,255,255,0.05) !important",
        },
        "& .pro-menu-item.active": {
          color: "#868dfb !important",
          backgroundColor: "rgba(104,112,250,0.15) !important",
        },
      }}
    >
      <ProSidebar collapsed={isCollapsed}>
        <Menu iconShape="square">

          {/* ── Header ── */}
          <MenuItem
            onClick={() => setIsCollapsed(!isCollapsed)}
            icon={isCollapsed ? <MenuOutlinedIcon /> : undefined}
            style={{
              margin: "10px 0 8px 0",
              color: colors.grey[100],
              borderBottom: "0.5px solid rgba(255,255,255,0.08)",
              paddingBottom: "8px",
            }}
          >
            {!isCollapsed && (
              <Box display="flex" justifyContent="space-between" alignItems="center" ml="8px">
                <Typography variant="h4" color={colors.grey[100]} fontWeight={700} letterSpacing="0.05em">
                  ZUTRAD
                </Typography>
                <IconButton
                  onClick={() => setIsCollapsed(!isCollapsed)}
                  size="small"
                  sx={{
                    background: "rgba(255,255,255,0.07)",
                    borderRadius: "6px",
                    "&:hover": { background: "rgba(255,255,255,0.12)" },
                  }}
                >
                  <MenuOutlinedIcon fontSize="small" sx={{ color: colors.grey[400] }} />
                </IconButton>
              </Box>
            )}
          </MenuItem>

          {/* ── Overview ── */}
          <SectionLabel label="Overview" isCollapsed={isCollapsed} colors={colors} />
          <Item title="Dashboard" to="/" icon={<HomeOutlinedIcon />} selected={selected} setSelected={setSelected} isCollapsed={isCollapsed} />
          <Item title="Calendar" to="/calendar" icon={<CalendarTodayOutlinedIcon />} selected={selected} setSelected={setSelected} isCollapsed={isCollapsed} />

          {/* ── Operations ── */}
          <SectionLabel label="Operations" isCollapsed={isCollapsed} colors={colors} />
          <Item title="Manage Team" to="/users" icon={<PeopleOutlinedIcon />} selected={selected} setSelected={setSelected} isCollapsed={isCollapsed} />
          <Item title="Clients" to="/clients-list" icon={<ContactsOutlinedIcon />} selected={selected} setSelected={setSelected} isCollapsed={isCollapsed} />
          <Item title="Reports" to="/reports" icon={<ReceiptOutlinedIcon />} selected={selected} setSelected={setSelected} isCollapsed={isCollapsed} badgeCount={pendingReportCount} badgeColor="warn" />
          <Item title="Supply / Invoices" to="/supply" icon={<LocalShippingOutlinedIcon />} selected={selected} setSelected={setSelected} isCollapsed={isCollapsed} />
          <Item title="Store" to="/store" icon={<StorefrontOutlinedIcon />} selected={selected} setSelected={setSelected} isCollapsed={isCollapsed} />

          {/* ── Machines ── */}
          <SectionLabel label="Machines" isCollapsed={isCollapsed} colors={colors} />
          <Item title="Client Machines" to="/machines" icon={<SettingsOutlinedIcon />} selected={selected} setSelected={setSelected} isCollapsed={isCollapsed} />
          <Item title="Maintenance" to="/maintenance" icon={<BuildOutlinedIcon />} selected={selected} setSelected={setSelected} isCollapsed={isCollapsed} badgeCount={upcomingMaintenanceCount} badgeColor="danger" />

          {/* ── Analytics ── */}
          <SectionLabel label="Analytics" isCollapsed={isCollapsed} colors={colors} />
          <Item title="Bar Chart" to="/bar" icon={<BarChartOutlinedIcon />} selected={selected} setSelected={setSelected} isCollapsed={isCollapsed} />
          <Item title="Pie Chart" to="/pie" icon={<PieChartOutlineOutlinedIcon />} selected={selected} setSelected={setSelected} isCollapsed={isCollapsed} />
          <Item title="Line Chart" to="/line" icon={<TimelineOutlinedIcon />} selected={selected} setSelected={setSelected} isCollapsed={isCollapsed} />

          {/* ── Admin panel — visible to admins and superadmins ── */}
          {isAdmin && (
            <>
              <SectionLabel label="Admin" isCollapsed={isCollapsed} colors={colors} />
              <Item
                title={isSuperAdmin ? "Super Admin Panel" : "Admin Panel"}
                to="/admin"
                icon={<VerifiedUserOutlinedIcon />}
                selected={selected}
                setSelected={setSelected}
                isCollapsed={isCollapsed}
              />
            </>
          )}

        </Menu>

        {/* ── Profile — pinned to the bottom ── */}
        <Box
          sx={{
            borderTop: "0.5px solid rgba(255,255,255,0.08)",
            padding: "10px 12px",
            flexShrink: 0,
          }}
        >
          <Box
            onClick={() => navigate("/profile")}
            sx={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              padding: "8px 10px",
              borderRadius: "8px",
              cursor: "pointer",
              "&:hover": { background: "rgba(255,255,255,0.06)" },
              overflow: "hidden",
            }}
          >
            {/* Avatar with status dot */}
            <Box sx={{ position: "relative", flexShrink: 0 }}>
              <Box
                sx={{
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, #6870fa, #a78bfa)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "13px",
                  fontWeight: 600,
                  color: "white",
                }}
              >
                {displayInitials}
              </Box>
              <Box
                sx={{
                  width: 9,
                  height: 9,
                  borderRadius: "50%",
                  background: "#1d9e75",
                  border: "1.5px solid #1a1d2e",
                  position: "absolute",
                  bottom: 0,
                  right: 0,
                }}
              />
            </Box>

            {/* Name + role — hidden when collapsed */}
            {!isCollapsed && (
              <>
                <Box flex={1} overflow="hidden">
                  <Typography fontSize="13px" fontWeight={500} color={colors.grey[100]} noWrap>
                    {displayName}
                  </Typography>
                  <Typography fontSize="11px" sx={{ color: "#6870fa" }} noWrap>
                    {roleLabel}
                  </Typography>
                </Box>
                <ExpandLessOutlinedIcon sx={{ color: colors.grey[500], fontSize: 16, flexShrink: 0 }} />
              </>
            )}
          </Box>
        </Box>
      </ProSidebar>
    </Box>
  );
};

export default Sidebar;