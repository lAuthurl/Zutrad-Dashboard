import { Box, Button, Typography, useTheme, CircularProgress, Alert, Tooltip, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions } from "@mui/material";
import { tokens } from "../../theme";
import DownloadOutlinedIcon from "@mui/icons-material/DownloadOutlined";
import PrecisionManufacturingOutlinedIcon from "@mui/icons-material/PrecisionManufacturingOutlined";
import AssignmentOutlinedIcon from "@mui/icons-material/AssignmentOutlined";
import BuildOutlinedIcon from "@mui/icons-material/BuildOutlined";
import BusinessOutlinedIcon from "@mui/icons-material/BusinessOutlined";
import WarningAmberOutlinedIcon from "@mui/icons-material/WarningAmberOutlined";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import Header from "../../components/Header";
import StatBox from "../../components/StatBox";

import { statusColor, statusTextColor, useDashboardLogic } from "./dashboard.logic";

// ════════════════════════════════════════════════════════════════════════════
// MAIN PAGE (UI) — derived data/handlers come from useDashboardLogic
// ════════════════════════════════════════════════════════════════════════════
const Dashboard = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);

  const {
    stats,
    recentActivity,
    upcomingMaintenance,
    exportReport,
    loading,
    error,
    userCanExportReport,
    errorDialog,
    closeErrorDialog,
  } = useDashboardLogic();

  if (loading) {
    return (
      <Box m="20px" display="flex" justifyContent="center" alignItems="center" height="50vh">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box m="20px">
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  return (
    <Box m="20px">
      {/* HEADER */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb="20px">
        <Header title="DASHBOARD" subtitle="Zutrad Ventures System Overview" />
        <Tooltip title={userCanExportReport ? "" : "Admin access required to export"}>
          <span>
            <Button
              onClick={exportReport}
              disabled={!userCanExportReport}
              sx={{
                backgroundColor: userCanExportReport ? colors.blueAccent[700] : colors.primary[300],
                color: userCanExportReport ? colors.grey[100] : colors.grey[600],
                fontSize: "13px",
                fontWeight: 700,
                padding: "10px 20px",
                letterSpacing: "0.05em",
                borderRadius: "6px",
                "&:hover": {
                  backgroundColor: userCanExportReport ? colors.blueAccent[600] : colors.primary[300],
                },
                "&.Mui-disabled": {
                  color: colors.grey[600],
                },
              }}
            >
              <DownloadOutlinedIcon sx={{ mr: "8px", fontSize: "18px" }} />
              Export Report
            </Button>
          </span>
        </Tooltip>
      </Box>

      {/* GRID */}
      <Box
        display="grid"
        gridTemplateColumns="repeat(12, 1fr)"
        gridAutoRows="140px"
        gap="20px"
      >
        {/* STAT BOXES */}
        {[
          {
            title: String(stats.totalClients),
            subtitle: "Active Clients",
            progress: "0.60",
            increase: "+1 this month",
            icon: <BusinessOutlinedIcon sx={{ color: colors.greenAccent[600], fontSize: "26px" }} />,
          },
          {
            title: String(stats.totalMachines),
            subtitle: "Machines Tracked",
            progress: "0.75",
            increase: "Across all clients",
            icon: <PrecisionManufacturingOutlinedIcon sx={{ color: colors.greenAccent[600], fontSize: "26px" }} />,
          },
          {
            title: String(stats.pendingReports),
            subtitle: "Pending Reports",
            progress: "0.30",
            increase: "Awaiting approval",
            icon: <AssignmentOutlinedIcon sx={{ color: colors.greenAccent[600], fontSize: "26px" }} />,
          },
          {
            title: String(stats.pendingMaintenance),
            subtitle: "Upcoming Maintenance",
            progress: "0.45",
            increase: "Scheduled tasks",
            icon: <BuildOutlinedIcon sx={{ color: colors.greenAccent[600], fontSize: "26px" }} />,
          },
        ].map((stat, i) => (
          <Box
            key={i}
            gridColumn="span 3"
            backgroundColor={colors.primary[400]}
            display="flex"
            alignItems="center"
            justifyContent="center"
            borderRadius="8px"
            sx={{
              transition: "transform 0.15s, box-shadow 0.15s",
              "&:hover": {
                transform: "translateY(-2px)",
                boxShadow: `0 6px 20px rgba(0,0,0,0.25)`,
              },
            }}
          >
            <StatBox
              title={stat.title}
              subtitle={stat.subtitle}
              progress={stat.progress}
              increase={stat.increase}
              icon={stat.icon}
            />
          </Box>
        ))}

        {/* RECENT ACTIVITY */}
        <Box
          gridColumn="span 8"
          gridRow="span 3"
          backgroundColor={colors.primary[400]}
          overflow="auto"
          borderRadius="8px"
        >
          <Box
            display="flex"
            justifyContent="space-between"
            alignItems="center"
            borderBottom={`2px solid ${colors.primary[500]}`}
            p="15px 18px"
          >
            <Typography color={colors.grey[100]} variant="h5" fontWeight="600">
              Recent Activity
            </Typography>
            <Typography color={colors.grey[400]} variant="body2">
              {recentActivity.length} entries
            </Typography>
          </Box>

          {recentActivity.map((item, i) => (
            <Box
              key={`${item.id}-${i}`}
              display="flex"
              justifyContent="space-between"
              alignItems="center"
              borderBottom={`1px solid ${colors.primary[500]}`}
              p="12px 18px"
              sx={{
                "&:hover": { backgroundColor: colors.primary[300] },
                transition: "background 0.12s",
              }}
            >
              <Box minWidth="40%">
                <Typography color={colors.greenAccent[500]} variant="h6" fontWeight="600">
                  {item.id}
                </Typography>
                <Typography color={colors.grey[100]} variant="h6">
                  {item.description}
                </Typography>
                <Typography color={colors.grey[400]} variant="body2">
                  {item.client}
                </Typography>
              </Box>
              <Box color={colors.grey[300]} fontSize="13px" minWidth="80px" textAlign="center">
                {item.date}
              </Box>
              <Box
                backgroundColor={statusColor(item.status, colors)}
                p="4px 12px"
                borderRadius="20px"
                minWidth="80px"
                textAlign="center"
              >
                <Typography
                  variant="body2"
                  color={statusTextColor(item.status, colors)}
                  fontWeight="700"
                  fontSize="12px"
                  textTransform="capitalize"
                >
                  {item.status}
                </Typography>
              </Box>
            </Box>
          ))}
        </Box>

        {/* UPCOMING MAINTENANCE */}
        <Box
          gridColumn="span 4"
          gridRow="span 3"
          backgroundColor={colors.primary[400]}
          overflow="auto"
          borderRadius="8px"
          display="flex"
          flexDirection="column"
        >
          <Box
            borderBottom={`2px solid ${colors.primary[500]}`}
            p="15px 18px"
            display="flex"
            justifyContent="space-between"
            alignItems="center"
          >
            <Typography color={colors.grey[100]} variant="h5" fontWeight="600">
              Upcoming Maintenance
            </Typography>
            {upcomingMaintenance.length > 0 && (
              <Box
                sx={{
                  background: colors.redAccent[700],
                  color: "#fff",
                  fontSize: "11px",
                  fontWeight: 700,
                  padding: "2px 8px",
                  borderRadius: "12px",
                }}
              >
                {upcomingMaintenance.length}
              </Box>
            )}
          </Box>

          <Box flex={1} overflow="auto">
            {upcomingMaintenance.length === 0 ? (
              <Box p="20px">
                <Typography color={colors.greenAccent[400]}>
                  All maintenance tasks are up to date.
                </Typography>
              </Box>
            ) : (
              upcomingMaintenance.map((task) => (
                <Box
                  key={task.id}
                  borderBottom={`1px solid ${colors.primary[500]}`}
                  p="12px 18px"
                  sx={{
                    "&:hover": { backgroundColor: colors.primary[300] },
                    transition: "background 0.12s",
                  }}
                >
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb="4px">
                    <Typography color={colors.greenAccent[400]} fontWeight="600" variant="h6">
                      {task.machine}
                    </Typography>
                    <Typography color={colors.grey[400]} fontSize="12px">
                      {task.maintenanceDay}
                    </Typography>
                  </Box>
                  <Typography color={colors.grey[200]} variant="body2">
                    {task.message}
                  </Typography>
                  <Typography color={colors.grey[400]} variant="body2" mt="2px">
                    {task.clientName}
                  </Typography>
                </Box>
              ))
            )}
          </Box>

          {/* LOW STOCK ALERT */}
          {stats.storeItemsLow > 0 && (
            <Box
              m="12px"
              p="12px 14px"
              backgroundColor={colors.redAccent[900]}
              borderRadius="6px"
              borderLeft={`4px solid ${colors.redAccent[500]}`}
              display="flex"
              alignItems="flex-start"
              gap="10px"
              flexShrink={0}
            >
              <WarningAmberOutlinedIcon
                sx={{ color: colors.redAccent[400], fontSize: "18px", mt: "1px", flexShrink: 0 }}
              />
              <Box>
                <Typography color={colors.redAccent[300]} fontWeight="700" variant="h6">
                  Low Stock Alert
                </Typography>
                <Typography color={colors.grey[300]} variant="body2" mt="2px">
                  {stats.storeItemsLow} item(s) at quantity ≤ 2. Check the Store.
                </Typography>
              </Box>
            </Box>
          )}
        </Box>
      </Box>

      {/* ── error / info dialog (e.g. export access denied) ── */}
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
    </Box>
  );
};

export default Dashboard;