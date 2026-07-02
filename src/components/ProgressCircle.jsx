import { Box, useTheme } from "@mui/material";
import { tokens } from "../theme";

const ProgressCircle = ({ progress = "0.75", size = "38" }) => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const numSize = Number(size);
  const strokeWidth = 4;
  const radius = (numSize - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - Number(progress));

  return (
    <Box sx={{ flexShrink: 0, lineHeight: 0 }}>
      <svg width={numSize} height={numSize} style={{ transform: "rotate(-90deg)" }}>
        {/* Track */}
        <circle
          cx={numSize / 2}
          cy={numSize / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth={strokeWidth}
        />
        {/* Progress */}
        <circle
          cx={numSize / 2}
          cy={numSize / 2}
          r={radius}
          fill="none"
          stroke={colors.greenAccent[500]}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.4s ease" }}
        />
      </svg>
    </Box>
  );
};

export default ProgressCircle;