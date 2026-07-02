import { useState, useEffect, useMemo } from "react";
import { Box, Typography, useTheme, Chip, CircularProgress, Alert } from "@mui/material";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import ScheduleIcon from "@mui/icons-material/Schedule";
import PrecisionManufacturingIcon from "@mui/icons-material/PrecisionManufacturing";
import BusinessIcon from "@mui/icons-material/Business";
import Header from "../../components/Header";
import BarChart, { computeClientFleetData } from "../../components/BarChart";
import { tokens } from "../../theme";
import { useClientFleetData } from "../../hooks/useChartData";

const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:5000";

const authHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${localStorage.getItem("token")}`,
});

const SummaryCard = ({ icon, label, value, accent, colors }) => (
  <Box
    backgroundColor={colors.primary[400]}
    borderRadius="4px"
    p="16px 20px"
    display="flex"
    alignItems="center"
    gap="14px"
    borderLeft={`4px solid ${accent}`}
    flex="1"
    minWidth="180px"
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

const Bar = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const [selectedClientId, setSelectedClientId] = useState(null);
  const [maintenanceLogs, setMaintenanceLogs] = useState([]);
  const { data: clients, loading, error } = useClientFleetData();

  useEffect(() => {
    let active = true;
    const fetchMaintenanceLogs = async () => {
      try {
        const res = await fetch(`${API_BASE}/maintenance`, { headers: authHeaders() });
        if (!res.ok) throw new Error("Failed to load maintenance data");
        const data = await res.json();
        if (active) setMaintenanceLogs(data);
      } catch (err) {
        if (active) setMaintenanceLogs([]);
      }
    };

    fetchMaintenanceLogs();
    return () => {
      active = false;
    };
  }, []);

  const fleetData = useMemo(() => computeClientFleetData(clients, maintenanceLogs), [clients, maintenanceLogs]);

  const summary = useMemo(() => {
    const totalClients = fleetData.length;
    const totalMachines = fleetData.reduce((sum, c) => sum + c.total, 0);
    const totalOverdue = fleetData.reduce((sum, c) => sum + c.overdue, 0);
    const totalDueSoon = fleetData.reduce((sum, c) => sum + c.dueSoon, 0);
    return { totalClients, totalMachines, totalOverdue, totalDueSoon };
  }, [fleetData]);

  // Clients with any overdue or due-soon machines, worst first — this is
  // the actionable list: who do you need to call this week.
  const atRiskClients = useMemo(
    () =>
      fleetData
        .filter((c) => c.overdue > 0 || c.dueSoon > 0)
        .sort((a, b) => b.overdue - a.overdue || b.dueSoon - a.dueSoon),
    [fleetData]
  );

  const selectedClient = fleetData.find((c) => c.clientId === selectedClientId);

  return (
    <Box m="20px">
      <Header
        title="Machine Status by Client"
        subtitle="Client fleet status counts for main, spare, and inactive machines"
      />

      {/* SUMMARY CARDS */}
      <Box display="flex" gap="14px" flexWrap="wrap" mb="20px" mt="16px">
        <SummaryCard
          icon={<BusinessIcon fontSize="inherit" />}
          label="Total Clients"
          value={summary.totalClients}
          accent={colors.grey[300]}
          colors={colors}
        />
        <SummaryCard
          icon={<PrecisionManufacturingIcon fontSize="inherit" />}
          label="Total Machines"
          value={summary.totalMachines}
          accent={colors.blueAccent[400]}
          colors={colors}
        />
        <SummaryCard
          icon={<WarningAmberIcon fontSize="inherit" />}
          label="Overdue for Maintenance"
          value={summary.totalOverdue}
          accent="#c0392b"
          colors={colors}
        />
        <SummaryCard
          icon={<ScheduleIcon fontSize="inherit" />}
          label="Due Within 30 Days"
          value={summary.totalDueSoon}
          accent={colors.blueAccent[400]}
          colors={colors}
        />
      </Box>

      {/* AT-RISK CLIENT LIST */}
      {atRiskClients.length > 0 && (
        <Box
          backgroundColor={colors.primary[400]}
          borderRadius="4px"
          p="14px 18px"
          mb="20px"
        >
          <Typography
            variant="subtitle2"
            fontWeight="700"
            color={colors.grey[300]}
            mb="10px"
            sx={{ textTransform: "uppercase", letterSpacing: "0.5px", fontSize: "11px" }}
          >
            Clients Needing Attention
          </Typography>
          <Box display="flex" gap="10px" flexWrap="wrap">
            {atRiskClients.map((c) => (
              <Chip
                key={c.clientId}
                label={`${c.company} — ${c.overdue > 0 ? `${c.overdue} overdue` : `${c.dueSoon} due soon`}`}
                onClick={() => setSelectedClientId(c.clientId)}
                sx={{
                  backgroundColor: c.overdue > 0 ? "#7a1f1f" : colors.blueAccent[700],
                  color: c.overdue > 0 ? "#ff8a8a" : colors.blueAccent[200],
                  fontWeight: "600",
                  cursor: "pointer",
                  border: selectedClientId === c.clientId ? `2px solid ${colors.grey[100]}` : "none",
                }}
              />
            ))}
          </Box>
        </Box>
      )}

      {selectedClient && (
        <Box
          backgroundColor={colors.primary[400]}
          borderRadius="4px"
          p="12px 18px"
          mb="16px"
          display="flex"
          justifyContent="space-between"
          alignItems="center"
        >
          <Typography color={colors.grey[100]}>
            <strong>{selectedClient.company}</strong> — {selectedClient.total} machines (
            {selectedClient.main} main, {selectedClient.spare} spare, {selectedClient.not_in_use} not in use)
          </Typography>
          <Typography
            color={colors.greenAccent[400]}
            sx={{ cursor: "pointer", fontWeight: "600" }}
            onClick={() => setSelectedClientId(null)}
          >
            Clear
          </Typography>
        </Box>
      )}

      <Box height="65vh" backgroundColor={colors.primary[400]} borderRadius="4px" p="10px">
        {loading ? (
          <Box display="flex" justifyContent="center" alignItems="center" height="100%">
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert severity="error">{error}</Alert>
        ) : (
          <BarChart
            onClientSelect={(id) => setSelectedClientId(id)}
            selectedClientId={selectedClientId}
            clients={clients}
            maintenanceLogs={maintenanceLogs}
          />
        )}
      </Box>
    </Box>
  );
};

export default Bar;