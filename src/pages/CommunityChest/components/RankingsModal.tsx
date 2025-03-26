import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
} from "@mui/material";
import styled from "styled-components";
import BigNumber from "bignumber.js";
import { useEnvoiResolver } from "@/hooks/useEnvoiResolver";

const StyledDialog = styled(Dialog)<{ $isDarkTheme: boolean }>`
  .MuiDialog-paper {
    background-color: ${(props) =>
      props.$isDarkTheme ? "rgb(23, 23, 23)" : "rgb(255, 255, 255)"};
    color: ${(props) => (props.$isDarkTheme ? "#fff" : "#000")};
    border-radius: 24px;
    padding: 16px;
    border: 1px solid
      ${(props) =>
        props.$isDarkTheme ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)"};
  }
`;

const HolderRow = styled(Box)<{ $isDarkTheme: boolean }>`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 16px;
  border-bottom: 1px solid
    ${(props) =>
      props.$isDarkTheme ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)"};

  &:last-child {
    border-bottom: none;
  }
`;

interface RankingsModalProps {
  open: boolean;
  onClose: () => void;
  isDarkTheme: boolean;
  holders: any[];
  totalSupply: string;
}

const RankingsModal: React.FC<RankingsModalProps> = ({
  open,
  onClose,
  isDarkTheme,
  holders,
  totalSupply,
}) => {
  const resolver = useEnvoiResolver();
  const [resolvedNames, setResolvedNames] = React.useState<Record<
    string,
    string
  > | null>(null);

  // Sort holders by balance in descending order
  const sortedHolders = React.useMemo(() => {
    return [...holders].sort((a, b) =>
      new BigNumber(b.balance).minus(new BigNumber(a.balance)).toNumber()
    );
  }, [holders]);

  // Take top 10 holders for the pie chart
  const top10Holders = React.useMemo(() => {
    return sortedHolders.slice(0, 10);
  }, [sortedHolders]);

  const totalTop10Balance = React.useMemo(() => {
    if (!top10Holders) return new BigNumber(0);
    return top10Holders.reduce(
      (sum: BigNumber, holder: any) => sum.plus(new BigNumber(holder.balance)),
      new BigNumber(0)
    );
  }, [top10Holders]);

  // Add useEffect to resolve names
  React.useEffect(() => {
    if (!top10Holders || resolvedNames) return;
    const resolveNames = async () => {
      const names: Record<string, string> = {};
      for (const holder of top10Holders) {
        try {
          const profile = await resolver.getProfileFromAddress(
            holder.accountId
          );
          if (profile?.name) {
            names[holder.accountId] = profile.name;
          }
        } catch (error) {
          console.error(
            `Failed to resolve name for ${holder.accountId}:`,
            error
          );
        }
      }
      setResolvedNames(names);
    };
    resolveNames();
  }, [top10Holders, resolver, resolvedNames]);

  // Calculate angles for pie chart
  let startAngle = 0;
  const pieChartData = React.useMemo(() => {
    if (!top10Holders || !totalTop10Balance) return [];
    return top10Holders.map((holder: any) => {
      const percentage = new BigNumber(holder.balance)
        .dividedBy(totalTop10Balance)
        .toNumber();
      const angle = percentage * Math.PI * 2;
      const data = {
        startAngle,
        endAngle: startAngle + angle,
        percentage,
        holder,
      };
      startAngle += angle;
      return data;
    });
  }, [top10Holders, totalTop10Balance]);

  // Function to generate SVG path for pie slice
  const getSlicePath = (
    startAngle: number,
    endAngle: number,
    radius: number
  ) => {
    const center = { x: 190, y: 120 };
    const start = {
      x: center.x + Math.cos(startAngle) * radius,
      y: center.y + Math.sin(startAngle) * radius,
    };
    const end = {
      x: center.x + Math.cos(endAngle) * radius,
      y: center.y + Math.sin(endAngle) * radius,
    };
    const largeArcFlag = endAngle - startAngle <= Math.PI ? "0" : "1";

    return `M ${center.x} ${center.y}
            L ${start.x} ${start.y}
            A ${radius} ${radius} 0 ${largeArcFlag} 1 ${end.x} ${end.y}
            Z`;
  };

  // Colors for pie chart slices
  const colors = [
    "#1976d2",
    "#2196f3",
    "#64b5f6",
    "#90caf9",
    "#bbdefb",
    "#0d47a1",
    "#1565c0",
    "#1e88e5",
    "#42a5f5",
    "#64b5f6",
  ];

  return (
    <StyledDialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      $isDarkTheme={isDarkTheme}
    >
      <DialogTitle>
        <Typography variant="h6" component="div" sx={{ fontWeight: 600 }}>
          Top Holders
        </Typography>
      </DialogTitle>
      <DialogContent>
        {/* Pie Chart */}
        <Box sx={{ mb: 4, display: "flex", justifyContent: "center" }}>
          <svg width="380" height="240" viewBox="0 0 380 240">
            {/* Background Circle */}
            <circle
              cx="190"
              cy="120"
              r="100"
              fill="none"
              stroke={isDarkTheme ? "#ffffff33" : "#00000033"}
              strokeWidth="2"
            />

            {/* Pie Slices */}
            {pieChartData.map((slice, index) => (
              <path
                key={index}
                d={getSlicePath(
                  slice.startAngle - Math.PI / 2,
                  slice.endAngle - Math.PI / 2,
                  100
                )}
                fill={colors[index]}
                opacity="0.8"
              >
                <title>
                  {`${slice.holder.accountId.slice(
                    0,
                    6
                  )}...${slice.holder.accountId.slice(-4)}: ${(
                    slice.percentage * 100
                  ).toFixed(2)}%`}
                </title>
              </path>
            ))}
          </svg>
        </Box>

        {/* Holders List */}
        {top10Holders &&
          top10Holders.map((holder, index) => (
            <HolderRow key={index} $isDarkTheme={isDarkTheme}>
              <Typography>
                {`${index + 1}. ${
                  resolvedNames?.[holder.accountId] ||
                  `${holder.accountId.slice(0, 6)}...${holder.accountId.slice(
                    -4
                  )}`
                }`}
              </Typography>
              <Typography>
                {new BigNumber(holder.balance).dividedBy(1e6).toFormat()} VOI
              </Typography>
            </HolderRow>
          ))}
      </DialogContent>
      <DialogActions>
        <Button
          onClick={onClose}
          sx={{
            color: isDarkTheme ? "#90caf9" : "#1976d2",
          }}
        >
          Close
        </Button>
      </DialogActions>
    </StyledDialog>
  );
};

export default RankingsModal;
