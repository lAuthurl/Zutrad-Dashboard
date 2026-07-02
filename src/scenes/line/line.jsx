import { useMemo } from "react";
import { Box, Typography, useTheme, CircularProgress, Alert } from "@mui/material";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";
import TrendingFlatIcon from "@mui/icons-material/TrendingFlat";
import LocalShippingOutlinedIcon from "@mui/icons-material/LocalShippingOutlined";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import Header from "../../components/Header";
import LineChart, { computeMonthlySupplyData } from "../../components/LineChart";
import { tokens } from "../../theme";
import { useSupplyData } from "../../hooks/useChartData";

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

const Line = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const { data: supply, loading, error } = useSupplyData();

  const monthly = useMemo(() => computeMonthlySupplyData(supply), [supply]);

  const stats = useMemo(() => {
    if (monthly.length === 0) {
      return { total: 0, average: 0, highest: null, lowest: null, momChange: null };
    }
    const total = monthly.reduce((sum, m) => sum + m.quantity, 0);
    const average = total / monthly.length;
    const highest = monthly.reduce((max, m) => (m.quantity > max.quantity ? m : max), monthly[0]);
    const lowest = monthly.reduce((min, m) => (m.quantity < min.quantity ? m : min), monthly[0]);

    let momChange = null;
    if (monthly.length >= 2) {
      const last = monthly[monthly.length - 1];
      const prev = monthly[monthly.length - 2];
      momChange = {
        delta: last.quantity - prev.quantity,
        pct: prev.quantity === 0 ? null : Math.round(((last.quantity - prev.quantity) / prev.quantity) * 100),
        lastLabel: last.label,
        prevLabel: prev.label,
      };
    }

    return { total, average: Math.round(average * 10) / 10, highest, lowest, momChange };
  }, [monthly]);

  const topParts = useMemo(() => {
    const byPart = {};
    supply.forEach((item) => {
      if (!byPart[item.goodsSupplied]) {
        byPart[item.goodsSupplied] = { name: item.goodsSupplied, partNumber: item.partNumber, quantity: 0 };
      }
      byPart[item.goodsSupplied].quantity += item.quantity;
    });
    return Object.values(byPart)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);
  }, [supply]);

  const TrendIcon = !stats.momChange
    ? TrendingFlatIcon
    : stats.momChange.delta > 0
    ? TrendingUpIcon
    : stats.momChange.delta < 0
    ? TrendingDownIcon
    : TrendingFlatIcon;

  const trendColor = !stats.momChange
    ? colors.grey[400]
    : stats.momChange.delta > 0
    ? colors.greenAccent[400]
    : stats.momChange.delta < 0
    ? "#e74c3c"
    : colors.grey[400];

  return (
    <Box m="20px">
      <Header
        title="Monthly Supply Volume"
        subtitle="Supply quantity by month from logged deliveries"
      />

      {/* SUMMARY CARDS */}
      <Box display="flex" gap="14px" flexWrap="wrap" mb="20px" mt="16px">
        <SummaryCard
          icon={<LocalShippingOutlinedIcon fontSize="inherit" />}
          label="Total Units Supplied"
          value={stats.total}
          accent={colors.blueAccent[400]}
          colors={colors}
        />
        <SummaryCard
          icon={<TrendIcon fontSize="inherit" />}
          label={stats.momChange ? `${stats.momChange.prevLabel} → ${stats.momChange.lastLabel}` : "Month-over-Month"}
          value={
            stats.momChange
              ? `${stats.momChange.delta > 0 ? "+" : ""}${stats.momChange.delta}${
                  stats.momChange.pct !== null ? ` (${stats.momChange.pct > 0 ? "+" : ""}${stats.momChange.pct}%)` : ""
                }`
              : "—"
          }
          accent={trendColor}
          colors={colors}
        />
        <SummaryCard
          icon={<ArrowUpwardIcon fontSize="inherit" />}
          label={stats.highest ? `Highest — ${stats.highest.label}` : "Highest Month"}
          value={stats.highest ? stats.highest.quantity : "—"}
          accent={colors.greenAccent[400]}
          colors={colors}
        />
        <SummaryCard
          icon={<ArrowDownwardIcon fontSize="inherit" />}
          label={stats.lowest ? `Lowest — ${stats.lowest.label}` : "Lowest Month"}
          value={stats.lowest ? stats.lowest.quantity : "—"}
          accent="#e74c3c"
          colors={colors}
        />
      </Box>

      <Box display="flex" gap="20px" flexWrap="wrap">
        {/* CHART */}
        <Box
          flex="2 1 500px"
          minWidth="320px"
          height="55vh"
          backgroundColor={colors.primary[400]}
          borderRadius="4px"
          p="10px"
        >
          {loading ? (
            <Box display="flex" justifyContent="center" alignItems="center" height="100%">
              <CircularProgress />
            </Box>
          ) : error ? (
            <Alert severity="error">{error}</Alert>
          ) : (
            <LineChart supply={supply} />
          )}
        </Box>

        {/* TOP SUPPLIED PARTS */}
        <Box
          flex="1 1 280px"
          minWidth="260px"
          backgroundColor={colors.primary[400]}
          borderRadius="4px"
          p="18px"
        >
          <Typography
            variant="subtitle2"
            fontWeight="700"
            color={colors.grey[300]}
            mb="14px"
            sx={{ textTransform: "uppercase", letterSpacing: "0.5px", fontSize: "11px" }}
          >
            Top Supplied Parts
          </Typography>
          <Box display="flex" flexDirection="column" gap="10px">
            {topParts.map((part, idx) => (
              <Box key={part.partNumber} display="flex" alignItems="center" gap="10px">
                <Typography
                  fontSize="12px"
                  fontWeight="700"
                  color={colors.grey[500]}
                  minWidth="18px"
                >
                  {idx + 1}
                </Typography>
                <Box flex="1" minWidth={0}>
                  <Typography fontSize="13px" color={colors.grey[100]} noWrap>
                    {part.name}
                  </Typography>
                  <Typography fontSize="11px" color={colors.grey[500]}>
                    {part.partNumber}
                  </Typography>
                </Box>
                <Typography fontSize="13px" fontWeight="700" color={colors.blueAccent[400]}>
                  {part.quantity}
                </Typography>
              </Box>
            ))}
            {topParts.length === 0 && (
              <Typography color={colors.grey[400]} fontSize="13px">
                No supply records yet.
              </Typography>
            )}
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default Line;