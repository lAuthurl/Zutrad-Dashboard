import { Box, Typography, useTheme } from "@mui/material";
import { tokens } from "../theme";
import ProgressCircle from "./ProgressCircle";

const StatBox = ({ title, subtitle, icon, progress, increase }) => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);

  return (
    <Box width="100%" p="16px 20px" display="flex" flexDirection="column" justifyContent="space-between" height="100%">

      {/* Top: icon + ring side by side */}
      <Box display="flex" justifyContent="space-between" alignItems="center">
        <Box
          sx={{
            width: 40,
            height: 40,
            borderRadius: "10px",
            background: `rgba(255,255,255,0.06)`,
            border: `1px solid rgba(255,255,255,0.08)`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          {icon}
        </Box>
        <ProgressCircle progress={progress} size="38" />
      </Box>

      {/* Middle: big number */}
      <Typography
        variant="h3"
        fontWeight="700"
        sx={{ color: colors.grey[100], mt: "10px", lineHeight: 1 }}
      >
        {title}
      </Typography>

      {/* Bottom: subtitle + increase */}
      <Box display="flex" justifyContent="space-between" alignItems="flex-end" mt="8px">
        <Typography
          variant="body2"
          sx={{
            color: colors.greenAccent[400],
            fontWeight: 600,
            fontSize: "12px",
          }}
        >
          {subtitle}
        </Typography>
        <Typography
          variant="caption"
          sx={{
            color: colors.grey[500],
            fontSize: "11px",
            fontStyle: "italic",
            textAlign: "right",
          }}
        >
          {increase}
        </Typography>
      </Box>
    </Box>
  );
};

export default StatBox;