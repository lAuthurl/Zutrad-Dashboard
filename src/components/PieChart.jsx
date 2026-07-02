import { ResponsivePie } from "@nivo/pie";
import { tokens } from "../theme";
import { useTheme, Box, Typography } from "@mui/material";

const STATUS_COLORS = {
  approved: { base: "#2e7d32", light: "#4caf50" },
  pending: { base: "#1565c0", light: "#42a5f5" },
  rejected: { base: "#a93226", light: "#e74c3c" },
};

export const computeReportStatusData = (reports = []) => {
  const statusCounts = reports.reduce((acc, report) => {
    acc[report.status] = (acc[report.status] || 0) + 1;
    return acc;
  }, {});
  const total = reports.length;
  return Object.entries(statusCounts).map(([status, value]) => ({
    id: status,
    label: status[0].toUpperCase() + status.slice(1),
    value,
    // Computed once here instead of being re-derived from `data` inside
    // every tooltip/label callback, so it can't drift between them.
    percent: total === 0 ? 0 : Math.round((value / total) * 100),
  }));
};

const EmptyState = ({ colors }) => (
  <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" height="100%" gap="6px">
    <Typography color={colors.grey[300]} fontWeight="600">
      No reports yet
    </Typography>
    <Typography color={colors.grey[500]} fontSize="13px">
      Submitted reports will appear here once filed.
    </Typography>
  </Box>
);

// Custom layer rendered at the pie's center — nivo has no built-in prop for
// this, but exposes layout metrics (centerX/centerY) to any function passed
// in the `layers` array, which is the documented way to add a center label.
const CenterTotalLabel = ({ centerX, centerY, dataWithArc }) => {
  const total = dataWithArc.reduce((sum, d) => sum + d.value, 0);
  return (
    <g>
      <text
        x={centerX}
        y={centerY - 8}
        textAnchor="middle"
        dominantBaseline="central"
        style={{ fontSize: "28px", fontWeight: 700, fill: "currentColor" }}
      >
        {total}
      </text>
      <text
        x={centerX}
        y={centerY + 16}
        textAnchor="middle"
        dominantBaseline="central"
        style={{ fontSize: "11px", fill: "currentColor", opacity: 0.6 }}
      >
        Total Reports
      </text>
    </g>
  );
};

const PieChart = ({ onStatusSelect, selectedStatus, reports = [] }) => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const data = computeReportStatusData(reports);

  if (data.length === 0) {
    return <EmptyState colors={colors} />;
  }

  return (
    <ResponsivePie
      data={data}
      theme={{
        axis: {
          domain: { line: { stroke: colors.grey[100] } },
          legend: { text: { fill: colors.grey[100] } },
          ticks: {
            line: { stroke: colors.grey[100], strokeWidth: 1 },
            text: { fill: colors.grey[100] },
          },
        },
        legends: { text: { fill: colors.grey[100] } },
        labels: { text: { fill: colors.grey[900] ?? "#141414" } },
        text: { fill: colors.grey[100] },
      }}
      margin={{ top: 40, right: 80, bottom: 80, left: 80 }}
      innerRadius={0.55}
      padAngle={0.7}
      cornerRadius={3}
      activeOuterRadiusOffset={8}
      colors={({ id }) => {
        const isSelected = !selectedStatus || selectedStatus === id;
        const palette = STATUS_COLORS[id] ?? { base: colors.grey[500], light: colors.grey[400] };
        // Faded slices stayed almost as saturated as selected ones at "55"
        // alpha against a dark background — drop to "33" so the selected
        // slice reads as clearly emphasized rather than just slightly bolder.
        return isSelected ? palette.base : `${palette.base}33`;
      }}
      borderColor={{ from: "color", modifiers: [["darker", 0.4]] }}
      arcLinkLabel={(d) => `${d.label} (${d.data.percent}%)`}
      arcLinkLabelsSkipAngle={10}
      arcLinkLabelsTextColor={colors.grey[100]}
      arcLinkLabelsThickness={2}
      arcLinkLabelsColor={{ from: "color" }}
      enableArcLabels={true}
      arcLabel={(d) => d.value}
      // Skip painting the numeric label on slices too thin to hold it
      // legibly — it was overlapping the arc link label on small slivers.
      arcLabelsRadiusOffset={0.55}
      arcLabelsSkipAngle={18}
      arcLabelsTextColor="#ffffff"
      layers={["arcs", "arcLabels", "arcLinkLabels", "legends", CenterTotalLabel]}
      onClick={(slice) => {
        if (onStatusSelect) {
          onStatusSelect(selectedStatus === slice.id ? null : slice.id);
        }
      }}
      tooltip={({ datum }) => (
        <div
          style={{
            padding: "8px 12px",
            background: colors.primary[400],
            color: colors.grey[100],
            borderRadius: "4px",
            fontSize: "13px",
            border: `1px solid ${colors.primary[300]}`,
          }}
        >
          <strong>{datum.label}</strong>: {datum.value} report{datum.value !== 1 ? "s" : ""} ({datum.data.percent}%)
        </div>
      )}
      legends={[
        {
          anchor: "bottom",
          direction: "row",
          justify: false,
          translateX: 0,
          translateY: 56,
          itemsSpacing: 12,
          itemWidth: 90,
          itemHeight: 18,
          itemTextColor: colors.grey[100],
          itemDirection: "left-to-right",
          itemOpacity: 1,
          symbolSize: 14,
          symbolShape: "circle",
          effects: [{ on: "hover", style: { itemOpacity: 0.7 } }],
        },
      ]}
    />
  );
};

export default PieChart;