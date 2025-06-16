import React from "react";
import styled from "styled-components";
import { Avatar } from "@mui/material";
import { Link } from "react-router-dom";
import { compactAddress } from "@/utils/mp";

const ConnectAccountDropdown = styled.div<{
  expanded: boolean;
  expandedWidth: number;
}>`
  color: #93f;
  display: flex;
  padding: 0px;
  justify-content: flex-start;
  align-items: center;
  gap: 8px;
  border-radius: 32px;
  box-shadow: 0px 2px 4px 0px rgba(16, 24, 40, 0.1);
  width: ${(props) => (props.expanded ? props.expandedWidth : "48px")};
  overflow: hidden;
  background: ${(props) => (props.expanded ? "#93f" : "transparent")};
  color: ${(props) => (props.expanded ? "#fff" : "#93f")};
  transition: all 0.3s ease-out;
  cursor: pointer;
  
  &:hover {
    background: #93f;
    color: #fff;
    transform: scale(1.02);
    width: ${(props) => props.expandedWidth}px;
    transition: all 0.4s cubic-bezier(0.2, 0, 0, 1);
  }
`;

const AccountDropdownLabel = styled.span<{ theme: "light" | "dark" }>`
  height: 17px;
  flex-shrink: 0;
  color: ${(props) => (props.theme === "dark" ? "#fff" : "inherit")};
  text-align: right;
  font-family: Nohemi;
  font-size: 16px;
  font-style: normal;
  font-weight: 600;
  line-height: 22px;
`;

interface WalletButtonProps {
  activeAccount: any;
  displayName: string;
  loading: boolean;
  isDarkTheme: boolean;
  expanded: boolean;
  open: boolean;
  tokenInfo: any;
  onClick: (e: React.MouseEvent) => void;
}

export const WalletButton: React.FC<WalletButtonProps> = ({
  activeAccount,
  displayName,
  loading,
  isDarkTheme,
  expanded,
  open,
  tokenInfo,
  onClick,
}) => {
  return (
    <ConnectAccountDropdown
      id="basic-button"
      aria-controls={open ? "basic-menu" : undefined}
      aria-haspopup="true"
      aria-expanded={open ? "true" : undefined}
      onClick={onClick}
      expandedWidth={(displayName?.length || 0) * 10 + 48}
      expanded={expanded || open}
    >
      <Link
        to={`/account/${activeAccount?.address}`}
        onClick={(e: any) => {
          e.stopPropagation();
        }}
      >
        {tokenInfo?.metadata?.avatar ? (
          <Avatar
            src={tokenInfo?.metadata?.avatar}
            style={{ width: 48, height: 48 }}
          />
        ) : (
          <Avatar style={{ width: 48, height: 48 }}>
            {displayName ? displayName[0] : ""}
          </Avatar>
        )}
      </Link>
      <AccountDropdownLabel
        className="light"
        theme={isDarkTheme ? "dark" : "light"}
      >
        {loading ? "Loading..." : displayName || ""}
      </AccountDropdownLabel>
      <Link
        to={`/wallet/${activeAccount?.address}`}
        onClick={(e: any) => {
          e.stopPropagation();
        }}
      ></Link>
    </ConnectAccountDropdown>
  );
}; 