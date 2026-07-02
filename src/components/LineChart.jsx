import { ResponsiveLine } from "@nivo/line";
import { useTheme, Box, Typography } from "@mui/material";
import { tokens } from "../theme";

// Groups supply quantity by calendar month using the REAL year from each
// record's date, rather than forcing every entry onto a single hardcoded
// year — the previous version parsed all month labels as "<month> 1 2024",
// which silently breaks ordering the moment data spans more than one year
// (e.g. a December 2025 entry would sort before January 2026).
export const computeMonthlySupplyData = (supply = []) => {
  const byMonth = {};
  supply.forEach((item) => {
    const date = new Date(item.supplyDate);
    const key = `${date.getFullYear()}-${String(date.getMonth()).padStart(2, "0")}`;
    if (!byMonth[key]) {
      byMonth[key] = {
        key,
        sortDate: new Date(date.getFullYear(), date.getMonth(), 1),
        label: date.toLocaleString("default", { month: "short", year: "2-digit" }),
        quantity: 0,
      };
    }
    byMonth[key].quantity += item.quantity;
  });
  return Object.values(byMonth).sort((a, b) => a.sortDate - b.sortDate);
};

const EmptyState = ({ colors }) => (
  <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" height="100%" gap="6px">
    <Typography color={colors.grey[300]} fontWeight="600">
      No supply records yet
    </Typography>
    <Typography color={colors.grey[500]} fontSize="13px">
      Log a delivery to see monthly volume here.
    </Typography>
  </Box>
);

// Renders the "Average" series as a dashed reference line. nivo's
// ResponsiveLine only accepts a single numeric `lineWidth` for every series —
// passing a function (as the previous version did) is silently ignored, so
// the average line rendered with the same solid 3px stroke as the real data
// and was easy to mistake for a second data trend. A custom layer is the
// supported way to draw one series differently from the rest.
const DashedAverageLayer = ({ series, lineGenerator, xScale, yScale }) => {
  const averageSeries = series.find((s) => s.id === "Average");
  if (!averageSeries) return null;
  const points = averageSeries.data.map((d) => ({
    x: xScale(d.data.x),
    y: yScale(d.data.y),
  }));
  return (
    <path
      d={lineGenerator(points)}
      fill="none"
      stroke={averageSeries.color}
      strokeWidth={1.5}
      strokeDasharray="6,6"
      opacity={0.7}
    />
  );
};

const LineChart = ({ isCustomLineColors = false, isDashboard = false, supply = [] }) => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);

  const monthly = computeMonthlySupplyData(supply);

  if (monthly.length === 0) {
    return <EmptyState colors={colors} />;
  }

  // nivo's line renderer needs 2+ x-positions to draw a path — a single
  // month is a real, valid state (not an error), but ResponsiveLine just
  // shows an empty canvas for it. Render it explicitly instead so it reads
  // as "only one month logged so far" rather than "the chart is broken."
  if (monthly.length === 1) {
    const only = monthly[0];
    return (
      <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" height="100%" gap="4px">
        <Typography color={colors.grey[500]} fontSize="12px" sx={{ textTransform: "uppercase", letterSpacing: "0.5px" }}>
          {only.label}
        </Typography>
        <Typography color={colors.grey[100]} variant="h2" fontWeight="700">
          {only.quantity}
        </Typography>
        <Typography color={colors.grey[400]} fontSize="13px">
          units supplied
        </Typography>
        <Typography color={colors.grey[500]} fontSize="12px" mt="10px">
          Trend line appears once supply is logged in a second month.
        </Typography>
      </Box>
    );
  }

  const average = monthly.reduce((sum, m) => sum + m.quantity, 0) / monthly.length;
  const roundedAverage = Math.round(average * 100) / 100;

  const data = [
    {
      id: "Supply Quantity",
      color: colors.blueAccent[400],
      data: monthly.map((m) => ({ x: m.label, y: m.quantity })),
    },
    {
      id: "Average",
      color: colors.grey[500],
      data: monthly.map((m) => ({ x: m.label, y: roundedAverage })),
    },
  ];

  return (
    <ResponsiveLine
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
        grid: { line: { stroke: colors.primary[300], strokeWidth: 1 } },
        tooltip: { container: { color: colors.primary[500] } },
      }}
      colors={isDashboard ? { datum: "color" } : { scheme: "nivo" }}
      margin={{ top: 50, right: 150, bottom: 50, left: 60 }}
      xScale={{ type: "point" }}
      yScale={{ type: "linear", min: 0, max: "auto", stacked: false, reverse: false }}
      yFormat=" >-.2f"
      curve="catmullRom"
      axisTop={null}
      axisRight={null}
      axisBottom={{
        tickSize: 0,
        tickPadding: 5,
        tickRotation: monthly.length > 6 ? -30 : 0,
        legend: isDashboard ? undefined : "Month",
        legendOffset: 36,
        legendPosition: "middle",
      }}
      axisLeft={{
        tickValues: 5,
        tickSize: 3,
        tickPadding: 5,
        tickRotation: 0,
        legend: isDashboard ? undefined : "Quantity supplied",
        legendOffset: -40,
        legendPosition: "middle",
      }}
      // Light horizontal gridlines make it possible to actually read values
      // off the chart at a glance, rather than relying purely on tooltips.
      enableGridX={false}
      enableGridY={!isDashboard}
      lineWidth={3}
      // Hide nivo's default rendering of the Average series — it's drawn
      // separately, dashed, by the custom layer below.
      defs={[]}
      enablePoints={true}
      pointSize={(point) => (point.serieId === "Average" ? 0 : 8)}
      pointColor={{ theme: "background" }}
      pointBorderWidth={2}
      pointBorderColor={{ from: "serieColor" }}
      pointLabelYOffset={-12}
      useMesh={true}
      layers={[
        "grid",
        "markers",
        "axes",
        "areas",
        DashedAverageLayer,
        "lines",
        "slices",
        "points",
        "legends",
      ]}
      tooltip={({ point }) => {
        if (point.serieId === "Average") return null;
        return (
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
            <strong>{point.data.xFormatted}</strong>: {point.data.yFormatted} units
            <div style={{ color: colors.grey[400], fontSize: "11px", marginTop: "2px" }}>
              Avg: {roundedAverage.toFixed(1)} units/mo
            </div>
          </div>
        );
      }}
      legends={[
        {
          anchor: "bottom-right",
          direction: "column",
          justify: false,
          translateX: 140,
          translateY: 0,
          itemsSpacing: 4,
          itemDirection: "left-to-right",
          itemWidth: 130,
          itemHeight: 20,
          itemOpacity: 0.75,
          symbolSize: 12,
          symbolShape: "circle",
          symbolBorderColor: "rgba(0, 0, 0, .5)",
          effects: [{ on: "hover", style: { itemBackground: "rgba(0, 0, 0, .03)", itemOpacity: 1 } }],
        },
      ]}
    />
  );
};

export default LineChart;