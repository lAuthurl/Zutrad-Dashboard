import { useState, useMemo } from "react";
import { Box, Typography, useTheme, Chip, CircularProgress, Alert } from "@mui/material";
import Header from "../../components/Header";
import PieChart, { computeReportStatusData } from "../../components/PieChart";
import { tokens } from "../../theme";
import { useReportData } from "../../hooks/useChartData";
import { useDateFormat } from "../settings/dateFormat.logic";

const STATUS_DISPLAY = {
  approved: { color: "#4caf50", bg: "#1f4a21" },
  pending: { color: "#42a5f5", bg: "#1a3a5c" },
  rejected: { color: "#ff8a8a", bg: "#7a1f1f" },
};

const Pie = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const [selectedStatus, setSelectedStatus] = useState(null);
  const { data: reports, loading, error } = useReportData();

  const statusData = useMemo(() => computeReportStatusData(reports), [reports]);
  const totalReports = statusData.reduce((sum, d) => sum + d.value, 0);

  // Group reports by month + status to build a simple trend strip —
  // this is the part a static pie can never show: is "rejected" growing.
  const monthlyTrend = useMemo(() => {
    const byMonth = {};
    reports.forEach((report) => {
      const date = new Date(report.createdAt);
      const key = date.toLocaleString("default", { month: "short", year: "2-digit" });
      if (!byMonth[key]) {
        byMonth[key] = { month: key, sortDate: new Date(date.getFullYear(), date.getMonth(), 1), approved: 0, pending: 0, rejected: 0 };
      }
      byMonth[key][report.status] = (byMonth[key][report.status] || 0) + 1;
    });
    return Object.values(byMonth).sort((a, b) => a.sortDate - b.sortDate);
  }, [reports]);

  const maxMonthlyTotal = Math.max(
    ...monthlyTrend.map((m) => m.approved + m.pending + m.rejected),
    1
  );

  const filteredReports = useMemo(() => {
    const sorted = [...reports].sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );
    return selectedStatus ? sorted.filter((r) => r.status === selectedStatus) : sorted;
  }, [reports, selectedStatus]);

  const { formatDate } = useDateFormat();

  return (
    <Box m="20px">
      <Header
        title="Report Status Distribution"
        subtitle="Breakdown of reports by approval status"
      />

      <Box display="flex" gap="20px" flexWrap="wrap" mt="16px">
        {/* PIE */}
        <Box
          flex="1 1 420px"
          minWidth="320px"
          height="50vh"
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
            <PieChart onStatusSelect={setSelectedStatus} selectedStatus={selectedStatus} reports={reports} />
          )}
        </Box>

        {/* TREND STRIP */}
        <Box
          flex="1 1 380px"
          minWidth="300px"
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
            Monthly Trend by Status
          </Typography>
          {monthlyTrend.length === 0 ? (
            <Typography color={colors.grey[400]} fontSize="13px">
              No report history yet.
            </Typography>
          ) : (
            <Box display="flex" flexDirection="column" gap="14px">
              {monthlyTrend.map((m) => {
                const monthTotal = m.approved + m.pending + m.rejected;
                return (
                  <Box key={m.month}>
                    <Box display="flex" justifyContent="space-between" mb="4px">
                      <Typography fontSize="12px" color={colors.grey[300]} fontWeight="600">
                        {m.month}
                      </Typography>
                      <Typography fontSize="12px" color={colors.grey[400]}>
                        {monthTotal} report{monthTotal !== 1 ? "s" : ""}
                      </Typography>
                    </Box>
                    <Box
                      display="flex"
                      height="10px"
                      borderRadius="4px"
                      overflow="hidden"
                      backgroundColor={colors.primary[600] ?? colors.primary[500]}
                    >
                      {["approved", "pending", "rejected"].map((status) =>
                        m[status] > 0 ? (
                          <Box
                            key={status}
                            sx={{
                              width: `${(m[status] / maxMonthlyTotal) * 100}%`,
                              backgroundColor: STATUS_DISPLAY[status].color,
                              opacity: !selectedStatus || selectedStatus === status ? 1 : 0.3,
                              transition: "opacity 0.15s ease",
                            }}
                          />
                        ) : null
                      )}
                    </Box>
                  </Box>
                );
              })}
            </Box>
          )}

          <Box display="flex" gap="8px" mt="18px" flexWrap="wrap">
            {Object.entries(STATUS_DISPLAY).map(([status, style]) => (
              <Chip
                key={status}
                label={status.charAt(0).toUpperCase() + status.slice(1)}
                onClick={() => setSelectedStatus(selectedStatus === status ? null : status)}
                size="small"
                sx={{
                  backgroundColor: selectedStatus === status ? style.bg : "transparent",
                  color: style.color,
                  border: `1px solid ${style.color}`,
                  fontWeight: "600",
                  cursor: "pointer",
                }}
              />
            ))}
            {selectedStatus && (
              <Chip
                label="Clear filter"
                onClick={() => setSelectedStatus(null)}
                size="small"
                sx={{ color: colors.grey[300], cursor: "pointer" }}
              />
            )}
          </Box>
        </Box>
      </Box>

      {/* FILTERED REPORT LIST */}
      <Box
        mt="20px"
        backgroundColor={colors.primary[400]}
        borderRadius="4px"
        p="16px 18px"
      >
        <Typography
          variant="subtitle2"
          fontWeight="700"
          color={colors.grey[300]}
          mb="12px"
          sx={{ textTransform: "uppercase", letterSpacing: "0.5px", fontSize: "11px" }}
        >
          {selectedStatus
            ? `${selectedStatus.charAt(0).toUpperCase() + selectedStatus.slice(1)} Reports (${filteredReports.length})`
            : `All Reports (${totalReports})`}
        </Typography>
        <Box display="flex" flexDirection="column" gap="8px">
          {filteredReports.map((report) => {
            const style = STATUS_DISPLAY[report.status] ?? { color: colors.grey[300] };
            return (
              <Box
                key={report.id}
                display="flex"
                justifyContent="space-between"
                alignItems="flex-start"
                p="10px 12px"
                borderRadius="4px"
                backgroundColor={colors.primary[500]}
                borderLeft={`3px solid ${style.color}`}
              >
                <Box flex="1" minWidth={0} pr="12px">
                  <Typography fontSize="13px" color={colors.grey[100]} fontWeight="600">
                    {report.client.companyName} — Line {report.lineNumber}
                  </Typography>
                  <Typography fontSize="12px" color={colors.grey[400]} mt="2px">
                    {report.reportDetails}
                  </Typography>
                </Box>
                <Box textAlign="right" flexShrink={0}>
                  <Typography fontSize="11px" color={style.color} fontWeight="700" sx={{ textTransform: "capitalize" }}>
                    {report.status}
                  </Typography>
                  <Typography fontSize="11px" color={colors.grey[500]} mt="2px">
                    {formatDate(report.createdAt)}
                  </Typography>
                </Box>
              </Box>
            );
          })}
          {filteredReports.length === 0 && (
            <Typography color={colors.grey[400]} fontSize="13px">
              No reports match this filter.
            </Typography>
          )}
        </Box>
      </Box>
    </Box>
  );
};

export default Pie;