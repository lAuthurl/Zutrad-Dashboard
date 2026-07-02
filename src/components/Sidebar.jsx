import { useState } from "react";
import {
  ProSidebar,
  Menu,
  MenuItem,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
} from "react-pro-sidebar";
import {
  Box,
  IconButton,
  Typography,
  useTheme,
  Tooltip,
  Divider,
} from "@mui/material";
import { Link, useLocation } from "react-router-dom";
import "react-pro-sidebar/dist/css/styles.css";
import { tokens } from "../theme";
import HomeOutlinedIcon from "@mui/icons-material/HomeOutlined";
import PeopleOutlinedIcon from "@mui/icons-material/PeopleOutlined";
import BusinessOutlinedIcon from "@mui/icons-material/BusinessOutlined";
import PrecisionManufacturingOutlinedIcon from "@mui/icons-material/PrecisionManufacturingOutlined";
import AssignmentOutlinedIcon from "@mui/icons-material/AssignmentOutlined";
import BuildOutlinedIcon from "@mui/icons-material/BuildOutlined";
import LocalShippingOutlinedIcon from "@mui/icons-material/LocalShippingOutlined";
import InventoryOutlinedIcon from "@mui/icons-material/InventoryOutlined";
import CalendarTodayOutlinedIcon from "@mui/icons-material/CalendarTodayOutlined";
import AdminPanelSettingsOutlinedIcon from "@mui/icons-material/AdminPanelSettingsOutlined";
import MenuOutlinedIcon from "@mui/icons-material/MenuOutlined";
import LogoutOutlinedIcon from "@mui/icons-material/LogoutOutlined";

// Nav structure declared as data so sections can be filtered/hidden cleanly
// (e.g. when collapsed, or by role) without repeating JSX per item.
const NAV_SECTIONS = [
  {
    label: null, // no section header — Dashboard sits on its own
    items: [{ title: "Dashboard", to: "/", icon: <HomeOutlinedIcon /> }],
  },
  {
    label: "Admin",
    adminOnly: true,
    items: [
      { title: "Admin Panel", to: "/admin", icon: <AdminPanelSettingsOutlinedIcon /> },
      { title: "All Users", to: "/users", icon: <PeopleOutlinedIcon /> },
      { title: "All Clients", to: "/clients-list", icon: <BusinessOutlinedIcon /> },
    ],
  },
  {
    label: "Operations",
    items: [
      { title: "Client Machines", to: "/machines", icon: <PrecisionManufacturingOutlinedIcon /> },
      { title: "Reports", to: "/reports", icon: <AssignmentOutlinedIcon /> },
      { title: "Maintenance", to: "/maintenance", icon: <BuildOutlinedIcon /> },
      { title: "Supply", to: "/supply", icon: <LocalShippingOutlinedIcon /> },
      { title: "Store", to: "/store", icon: <InventoryOutlinedIcon /> },
    ],
  },
  {
    label: "Tools",
    items: [{ title: "Calendar", to: "/calendar", icon: <CalendarTodayOutlinedIcon /> }],
  },
];

const Item = ({ title, to, icon, isActive, isCollapsed, colors }) => {
  const menuItem = (
    <MenuItem
      active={isActive}
      style={{
        color: isActive ? colors.greenAccent[400] : colors.grey[100],
        borderLeft: isActive ? `3px solid ${colors.greenAccent[400]}` : "3px solid transparent",
        backgroundColor: isActive ? colors.primary[500] : "transparent",
        borderRadius: "4px",
        transition: "background-color 0.15s ease, color 0.15s ease",
      }}
      icon={icon}
    >
      <Typography fontWeight={isActive ? "600" : "400"}>{title}</Typography>
      <Link to={to} />
    </MenuItem>
  );

  // Tooltips only matter once the label text disappears at collapsed width —
  // showing them while expanded would just be redundant noise next to the label.
  if (!isCollapsed) return menuItem;

  return (
    <Tooltip title={title} placement="right" arrow>
      <Box>{menuItem}</Box>
    </Tooltip>
  );
};

const Sidebar = ({ user, onLogout }) => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Falls back to a placeholder if no user/auth context is wired up yet —
  // swap the default prop value out once real auth is in place.
  const currentUser = user ?? {
    firstName: "Adebayo",
    surname: "Okafor",
    role: "administrator",
  };

  const isItemActive = (to) => {
    if (to === "/") return location.pathname === "/";
    return (
      location.pathname === to || location.pathname.startsWith(`${to}/`)
    );
  };

  const handleLogoutClick = () => {
    if (onLogout) {
      onLogout();
    } else {
      // No handler wired up yet — fail loudly in dev rather than silently
      // doing nothing, so it's obvious this still needs to be connected.
      console.warn("Sidebar: onLogout prop not provided — logout button is a no-op.");
    }
  };

  const logoutButton = (
    <MenuItem
      onClick={handleLogoutClick}
      icon={<LogoutOutlinedIcon />}
      style={{
        color: colors.redAccent[400],
        borderRadius: "4px",
      }}
    >
      {!isCollapsed && <Typography fontWeight="600">Logout</Typography>}
    </MenuItem>
  );

  return (
    <Box
      sx={{
        height: "100%",
        flexShrink: 0,
        "& .pro-sidebar": { height: "100%" },
        "& .pro-sidebar-inner": {
          background: `${colors.primary[400]} !important`,
        },
        "& .pro-sidebar-header, & .pro-sidebar-footer": {
          borderColor: `${colors.primary[300]} !important`,
        },
        "& .pro-icon-wrapper": { backgroundColor: "transparent !important" },
        "& .pro-inner-item": {
          padding: "8px 35px 8px 20px !important",
        },
        "& .pro-inner-item:hover": {
          color: `${colors.greenAccent[300]} !important`,
          backgroundColor: `${colors.primary[500]} !important`,
        },
        "& .pro-menu-item.active": {
          color: `${colors.greenAccent[400]} !important`,
        },
      }}
    >
      <ProSidebar collapsed={isCollapsed}>
        {/* SidebarHeader / SidebarContent / SidebarFooter are the library's
            built-in layout primitives: header pinned top, content scrolls
            and fills remaining space (flex-grow:1 baked into its CSS), footer
            pinned bottom with a divider border — no manual flex wiring needed. */}
        <SidebarHeader>
          {isCollapsed ? (
            <Tooltip title="Expand sidebar" placement="right" arrow>
              <Box>
                <Menu iconShape="square">
                  <MenuItem
                    onClick={() => setIsCollapsed(false)}
                    icon={<MenuOutlinedIcon />}
                    style={{ margin: "10px 0", color: colors.grey[100] }}
                  />
                </Menu>
              </Box>
            </Tooltip>
          ) : (
            <Box
              sx={{
                position: "relative",
                p: "14px 20px 14px 24px",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Typography
                variant="h3"
                color={colors.grey[100]}
                fontWeight="bold"
                sx={{ position: "absolute", left: "50%", transform: "translateX(-50%)" }}
              >
                ZUTRAD
              </Typography>
              <Tooltip title="Collapse sidebar" placement="right" arrow>
                <IconButton
                  onClick={() => setIsCollapsed(true)}
                  size="small"
                  sx={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", zIndex: 2 }}
                >
                  <MenuOutlinedIcon />
                </IconButton>
              </Tooltip>
            </Box>
          )}

          {/* USER PROFILE lives in the header so it sits above the divider,
              clearly separated from the scrollable nav below it */}
          {!isCollapsed && (
            <Box pb="20px">
              <Box display="flex" justifyContent="center" alignItems="center">
                <Box
                  width="80px"
                  height="80px"
                  borderRadius="50%"
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  backgroundColor={colors.greenAccent[700]}
                  sx={{
                    fontSize: "28px",
                    fontWeight: "bold",
                    color: colors.grey[100],
                    border: `2px solid ${colors.greenAccent[400]}`,
                  }}
                >
                  {currentUser.firstName[0]}
                  {currentUser.surname[0]}
                </Box>
              </Box>
              <Box textAlign="center" mt="10px">
                <Typography variant="h4" color={colors.grey[100]} fontWeight="bold">
                  {currentUser.firstName} {currentUser.surname}
                </Typography>
                <Typography
                  variant="h6"
                  color={colors.greenAccent[500]}
                  sx={{ textTransform: "capitalize" }}
                >
                  {currentUser.role}
                </Typography>
              </Box>
            </Box>
          )}
        </SidebarHeader>

        <SidebarContent>
          <Menu iconShape="square">
            <Box paddingLeft={isCollapsed ? undefined : "10%"} pt="10px">
              {NAV_SECTIONS.map((section, idx) => {
                if (section.adminOnly && currentUser.role !== "administrator") {
                  return null;
                }
                return (
                  <Box key={section.label ?? `section-${idx}`}>
                    {/* section header is skipped entirely when collapsed, rather
                        than rendering cramped/clipped text at the narrow width */}
                    {section.label && !isCollapsed && (
                      <Typography
                        variant="h6"
                        color={colors.grey[300]}
                        sx={{
                          m: "18px 0 6px 20px",
                          textTransform: "uppercase",
                          letterSpacing: "0.5px",
                          fontSize: "11px",
                          fontWeight: "700",
                        }}
                      >
                        {section.label}
                      </Typography>
                    )}
                    {section.label && isCollapsed && idx > 0 && (
                      <Divider
                        sx={{ borderColor: colors.primary[300], my: "10px", mx: "8px" }}
                      />
                    )}
                    {section.items.map((item) => (
                      <Item
                        key={item.title}
                        title={item.title}
                        to={item.to}
                        icon={item.icon}
                        isActive={isItemActive(item.to)}
                        isCollapsed={isCollapsed}
                        colors={colors}
                      />
                    ))}
                  </Box>
                );
              })}
            </Box>
          </Menu>
        </SidebarContent>

        <SidebarFooter>
          <Menu iconShape="square">
            <Box paddingLeft={isCollapsed ? undefined : "10%"} py="6px">
              {isCollapsed ? (
                <Tooltip title="Logout" placement="right" arrow>
                  <Box>{logoutButton}</Box>
                </Tooltip>
              ) : (
                logoutButton
              )}
            </Box>
          </Menu>
        </SidebarFooter>
      </ProSidebar>
    </Box>
  );
};

export default Sidebar;