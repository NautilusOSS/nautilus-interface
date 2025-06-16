import React from "react";
import { useSelector } from "react-redux";
import { RootState } from "@/store/store";
import ConnectWallet from "../ConnectWallet";

// Add interface for better type safety
interface SideBarProps {
  exclude?: string[];
  flattenMarketplace?: boolean;
}

export function SideBar({ exclude, flattenMarketplace }: SideBarProps) {
  const isDarkTheme = useSelector(
    (state: RootState) => state.theme.isDarkTheme
  );

  return (
    <div className="flex items-center justify-center">
      <ConnectWallet expanded={true} />
    </div>
  );
}
