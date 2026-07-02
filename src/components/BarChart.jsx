import { useTheme, Box, Typography } from "@mui/material";
import { ResponsiveBar } from "@nivo/bar";
import { tokens } from "../theme";
import { getLogStatus } from "../scenes/maintenance/maintenance.logic";

const DUE_SOON_WINDOW_DAYS = 30;

const daysUntil = (dateStr) => {
  const due = new Date(dateStr);
  due.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((due - today) / (1000 * 60 * 60 * 24));
};

const getMachineMaintenanceStatus = (machine, maintenanceLogs = [], clientId) => {
  const machineName = machine.machine || machine.serialNumber || "";
  const matchingLogs = (maintenanceLogs || []).filter((log) => {
    const logClientId = log.client?._id || log.client?.id || log.clientId;
    return String(logClientId) === String(clientId) && log.machine === machineName;
  });

  if (matchingLogs.length === 0) {
    if (!machine.lastMaintenanceDate || !machine.maintenanceCycle) return "ok";
    const last = new Date(machine.lastMaintenanceDate);
    const due = new Date(last);
    due.setMonth(due.getMonth() + machine.maintenanceCycle);
    const daysUntilDue = Math.ceil((due - new Date()) / (1000 * 60 * 60 * 24));
    if (daysUntilDue < 0) return "overdue";
    if (daysUntilDue <= DUE_SOON_WINDOW_DAYS) return "due_soon";
    return "ok";
  }

  const openLogs = matchingLogs.filter((log) => !log.isDone);
  if (openLogs.length === 0) return "ok";

  const statuses = openLogs.map((log) => getLogStatus(log));
  if (statuses.includes("overdue")) return "overdue";

  const soonestDays = Math.min(...openLogs.map((log) => daysUntil(log.maintenanceDay)));
  if (soonestDays >= 0 && soonestDays <= DUE_SOON_WINDOW_DAYS) return "due_soon";
  return "ok";
};

export const computeClientFleetData = (clients = [], maintenanceLogs = []) =>
  clients
    .map((client) => {
      const counts = { main: 0, spare: 0, not_in_use: 0 };
      let overdue = 0;
      let dueSoon = 0;

      (client.machines || []).forEach((machine) => {
        const key =
          machine.usageStatus === "main" ? "main" : machine.usageStatus === "spare" ? "spare" : "not_in_use";
        counts[key] += 1;

        const maintStatus = getMachineMaintenanceStatus(machine, maintenanceLogs, client._id || client.id);
        if (maintStatus === "overdue") overdue += 1;
        if (maintStatus === "due_soon") dueSoon += 1;
      });

      return {
        company: client.companyName,
        clientId: client._id || client.id,
        main: counts.main,
        spare: counts.spare,
        not_in_use: counts.not_in_use,
        total: (client.machines || []).length,
        overdue,
        dueSoon,
      };
    })
    // Clients with zero machines clutter the axis without adding signal —
    // drop them, and put at-risk clients first so the worst cases aren't
    // scrolled off-screen on a long client list.
    .filter((c) => c.total > 0)
    .sort((a, b) => b.overdue - a.overdue || b.dueSoon - a.dueSoon || b.total - a.total);

const EmptyState = ({ colors, message }) => (
  <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" height="100%" gap="6px">
    <Typography color={colors.grey[300]} fontWeight="600">
      No machine data to show
    </Typography>
    <Typography color={colors.grey[500]} fontSize="13px">
      {message}
    </Typography>
  </Box>
);

const BarChart = ({ isDashboard = false, onClientSelect, selectedClientId, clients = [], maintenanceLogs = [] }) => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const data = computeClientFleetData(clients, maintenanceLogs);

  if (data.length === 0) {
    return (
      <EmptyState
        colors={colors}
        message={clients.length === 0 ? "No clients found." : "No clients currently have machines registered."}
      />
    );
  }

  return (
    <ResponsiveBar
      data={data}
      keys={["main", "spare", "not_in_use"]}
      indexBy="company"
      theme={{
        axis: {
          domain: { line: { stroke: colors.grey[100] } },
          legend: { text: { fill: colors.grey[100] } },
          ticks: {
            line: { stroke: colors.grey[100], strokeWidth: 1 },
            text: { fill: colors.grey[100], fontSize: 11 },
          },
        },
        legends: { text: { fill: colors.grey[100] } },
        tooltip: {
          container: {
            background: colors.primary[400],
            color: colors.grey[100],
          },
        },
      }}
      margin={{ top: 50, right: 130, bottom: 70, left: 80 }}
      padding={0.3}
      valueScale={{ type: "linear" }}
      indexScale={{ type: "band", round: true }}
      colors={({ id, data: rowData }) => {
        // Dim bars for clients with no overdue/due-soon machines so the
        // clients that actually need attention visually pop against a
        // muted backdrop, rather than every bar competing equally.
        const atRisk = rowData.overdue > 0 || rowData.dueSoon > 0;
        const isSelected = selectedClientId == null || selectedClientId === rowData.clientId;
        const palette = {
          main: atRisk ? colors.greenAccent[500] : colors.greenAccent[800],
          spare: atRisk ? colors.blueAccent[400] : colors.blueAccent[800],
          not_in_use: atRisk ? "#c0392b" : colors.grey[700],
        };
        const hex = palette[id];
        // Bars belonging to a non-selected client fade back, rather than the
        // selection only being indicated by a chip elsewhere on the page.
        return isSelected ? hex : `${hex}55`;
      }}
      borderColor={{ from: "color", modifiers: [["darker", 1.6]] }}
      axisTop={null}
      axisRight={null}
      axisBottom={{
        tickSize: 5,
        tickPadding: 5,
        tickRotation: isDashboard ? 0 : -25,
        legend: isDashboard ? undefined : "Client",
        legendPosition: "middle",
        legendOffset: 56,
      }}
      axisLeft={{
        tickSize: 5,
        tickPadding: 5,
        tickRotation: 0,
        legend: isDashboard ? undefined : "Machine status count",
        legendPosition: "middle",
        legendOffset: -50,
        // Force whole-number ticks — fractional machine counts ("2.5
        // machines") are meaningless and nivo's default linear scale will
        // produce them on small datasets.
        tickValues: Math.max(2, Math.min(8, Math.max(...data.map((d) => d.total)))),
      }}
      enableLabel={false}
      labelSkipWidth={12}
      labelSkipHeight={12}
      labelTextColor={{ from: "color", modifiers: [["darker", 1.6]] }}
      tooltip={({ id, value, indexValue, data: rowData }) => (
        <div
          style={{
            padding: "10px 14px",
            background: colors.primary[400],
            color: colors.grey[100],
            borderRadius: "4px",
            fontSize: "13px",
            border: `1px solid ${colors.primary[300]}`,
          }}
        >
          <strong>{indexValue}</strong>
          <div style={{ marginTop: "4px" }}>
            {id === "not_in_use" ? "Not in use" : id.charAt(0).toUpperCase() + id.slice(1)}: {value}
            <span style={{ color: colors.grey[500] }}> / {rowData.total} total</span>
          </div>
          <div style={{ marginTop: "6px", color: rowData.overdue > 0 ? "#ff8a8a" : colors.grey[300] }}>
            {rowData.overdue > 0
              ? `⚠ ${rowData.overdue} machine${rowData.overdue > 1 ? "s" : ""} overdue for maintenance`
              : rowData.dueSoon > 0
              ? `${rowData.dueSoon} machine${rowData.dueSoon > 1 ? "s" : ""} due soon`
              : "All machines on schedule"}
          </div>
        </div>
      )}
      onClick={(bar) => {
        if (onClientSelect) onClientSelect(bar.data.clientId, bar.data.company);
      }}
      legends={[
        {
          dataFrom: "keys",
          data: [
            { id: "main", label: "Main", color: colors.greenAccent[500] },
            { id: "spare", label: "Spare", color: colors.blueAccent[400] },
            { id: "not_in_use", label: "Not in use", color: "#c0392b" },
          ],
          anchor: "bottom-right",
          direction: "column",
          justify: false,
          translateX: 120,
          translateY: 0,
          itemsSpacing: 2,
          itemWidth: 100,
          itemHeight: 20,
          itemDirection: "left-to-right",
          itemOpacity: 0.85,
          symbolSize: 14,
          symbolShape: "circle",
          effects: [{ on: "hover", style: { itemOpacity: 1 } }],
        },
      ]}
      role="application"
      ariaLabel="Machine status by client"
      barAriaLabel={(e) => `${e.id}: ${e.formattedValue} for client: ${e.indexValue}`}
    />
  );
};

export default BarChart;