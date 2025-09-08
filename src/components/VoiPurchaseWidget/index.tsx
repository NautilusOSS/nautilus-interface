import React, { useState } from "react";
import { Box, Button, CircularProgress } from "@mui/material";
import { useSelector } from "react-redux";
import { RootState } from "@/store/store";
import styled from "styled-components";

// Styled components
const WidgetContainer = styled(Box)<{ $isDark?: boolean }>`
  width: 100%;
  max-width: 100%;
  height: 120px;
  border-radius: 20px;
  overflow: hidden;
  position: relative;
  background: ${(props) =>
    props.$isDark
      ? "linear-gradient(135deg, rgba(156, 39, 176, 0.1) 0%, rgba(123, 31, 162, 0.05) 100%)"
      : "linear-gradient(135deg, rgba(156, 39, 176, 0.05) 0%, rgba(123, 31, 162, 0.02) 100%)"};
  border: 1px solid
    ${(props) =>
      props.$isDark ? "rgba(156, 39, 176, 0.2)" : "rgba(156, 39, 176, 0.1)"};
  backdrop-filter: blur(5px);
  box-shadow: ${(props) =>
    props.$isDark
      ? "0 8px 32px rgba(0, 0, 0, 0.3)"
      : "0 8px 32px rgba(0, 0, 0, 0.1)"};
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover {
    transform: translateY(-2px);
  }
`;

const IframeContainer = styled(Box)<{ $isDark?: boolean }>`
  display: flex;
  justify-content: center;
  margin-bottom: 16px;
  margin-top: 24px;

  iframe {
    border-radius: 16px;
    border: none;
    box-shadow: ${(props) =>
      props.$isDark
        ? "0 8px 32px rgba(0, 0, 0, 0.3)"
        : "0 8px 32px rgba(0, 0, 0, 0.1)"};
  }
`;

const HideButton = styled(Button)<{ $isDark?: boolean }>`
  background: ${(props) =>
    props.$isDark ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.03)"};
  border: 1px solid
    ${(props) =>
      props.$isDark ? "rgba(255, 255, 255, 0.2)" : "rgba(0, 0, 0, 0.1)"};
  color: ${(props) => (props.$isDark ? "#fff" : "#000")};
  backdrop-filter: blur(10px);
  border-radius: 20px;
  text-transform: none;
  font-weight: 500;
  transition: all 0.2s ease;

  &:hover {
    background: ${(props) =>
      props.$isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.05)"};
    border-color: ${(props) =>
      props.$isDark ? "rgba(255, 255, 255, 0.3)" : "rgba(0, 0, 0, 0.15)"};
    transform: translateY(-1px);
  }

  &:active {
    transform: translateY(0);
  }
`;

// Component props interface
interface VoiPurchaseWidgetProps {
  walletAddress?: string;
  title?: string;
  subtitle?: string;
  clickText?: string;
  width?: number;
  height?: number;
  showBanner?: boolean;
  className?: string;
  sx?: any;
  address?: string;
}

const VoiPurchaseWidget: React.FC<VoiPurchaseWidgetProps> = ({
  walletAddress,
  title = "Need VOI?",
  subtitle = "Purchase VOI tokens to participate in auctions",
  clickText = "Click to open purchase widget",
  width = 480,
  height = 600,
  showBanner = true,
  className,
  sx,
  address,
}) => {
  const isDarkTheme = useSelector(
    (state: RootState) => state.theme.isDarkTheme
  );
  const [showWidget, setShowWidget] = useState(false);

  const handleBannerClick = () => {
    setShowWidget(true);
  };

  const handleHideWidget = () => {
    setShowWidget(false);
  };

  const renderBanner = () => (
    <WidgetContainer
      $isDark={isDarkTheme}
      onClick={handleBannerClick}
      className={className}
      sx={sx}
    >
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 800 120"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
        }}
      >
        {/* Background gradient */}
        <defs>
          <linearGradient id="bannerGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop
              offset="0%"
              stopColor={isDarkTheme ? "#9c27b0" : "#7b1fa2"}
              stopOpacity="0.1"
            />
            <stop
              offset="50%"
              stopColor={isDarkTheme ? "#ab47bc" : "#8e24aa"}
              stopOpacity="0.15"
            />
            <stop
              offset="100%"
              stopColor={isDarkTheme ? "#9c27b0" : "#7b1fa2"}
              stopOpacity="0.1"
            />
          </linearGradient>
          <linearGradient id="textGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={isDarkTheme ? "#e1bee7" : "#4a148c"} />
            <stop
              offset="50%"
              stopColor={isDarkTheme ? "#f8bbd9" : "#6a1b9a"}
            />
            <stop
              offset="100%"
              stopColor={isDarkTheme ? "#e1bee7" : "#4a148c"}
            />
          </linearGradient>
        </defs>

        {/* Background pattern */}
        <rect width="100%" height="100%" fill="url(#bannerGradient)" />

        {/* Decorative circles */}
        <circle
          cx="100"
          cy="30"
          r="15"
          fill={isDarkTheme ? "#9c27b0" : "#7b1fa2"}
          opacity="0.2"
        />
        <circle
          cx="700"
          cy="90"
          r="20"
          fill={isDarkTheme ? "#ab47bc" : "#8e24aa"}
          opacity="0.15"
        />
        <circle
          cx="150"
          cy="90"
          r="10"
          fill={isDarkTheme ? "#ce93d8" : "#9c27b0"}
          opacity="0.3"
        />
        <circle
          cx="650"
          cy="40"
          r="12"
          fill={isDarkTheme ? "#e1bee7" : "#6a1b9a"}
          opacity="0.2"
        />

        {/* Main text */}
        <text
          x="400"
          y="50"
          textAnchor="middle"
          fontSize="24"
          fontWeight="700"
          fill="url(#textGradient)"
          fontFamily="system-ui, -apple-system, sans-serif"
        >
          {title}
        </text>

        {/* Subtitle */}
        <text
          x="400"
          y="75"
          textAnchor="middle"
          fontSize="14"
          fontWeight="500"
          fill={isDarkTheme ? "#e1bee7" : "#4a148c"}
          fontFamily="system-ui, -apple-system, sans-serif"
          opacity="0.8"
        >
          {subtitle}
        </text>

        {/* Click indicator */}
        <text
          x="400"
          y="95"
          textAnchor="middle"
          fontSize="12"
          fontWeight="400"
          fill={isDarkTheme ? "#ce93d8" : "#7b1fa2"}
          fontFamily="system-ui, -apple-system, sans-serif"
          opacity="0.7"
        >
          {clickText}
        </text>

        {/* Arrow icon */}
        <path
          d="M 720 60 L 750 60 L 740 50 L 740 45 L 760 60 L 740 75 L 740 70 L 750 60"
          fill={isDarkTheme ? "#e1bee7" : "#4a148c"}
          opacity="0.8"
        />
      </svg>
    </WidgetContainer>
  );

  const renderWidget = () => (
    <>
      <IframeContainer $isDark={isDarkTheme}>
        <iframe
          src={`https://ibuyvoi.com/widget?destination=${
            address || "VOI_WALLET_ADDRESS"
          }&theme=${isDarkTheme ? "dark" : "light"}`}
          width={width}
          height={height}
          frameBorder="0"
          title="VOI Purchase Widget"
        />
      </IframeContainer>
      <Box sx={{ display: "flex", justifyContent: "center", mt: 2 }}>
        <HideButton
          $isDark={isDarkTheme}
          variant="outlined"
          onClick={handleHideWidget}
          size="small"
        >
          Hide Widget
        </HideButton>
      </Box>
    </>
  );

  if (!showBanner) {
    return renderWidget();
  }

  return showWidget ? renderWidget() : renderBanner();
};

export default VoiPurchaseWidget;
