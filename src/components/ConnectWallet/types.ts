import { WalletAccount } from "./types/index";

export interface ConnectWalletProps {
  expanded?: boolean;
  theme?: "light" | "dark";
  onWalletConnect?: (account: WalletAccount) => void;
  onWalletDisconnect?: () => void;
  onMobileSidebarClose?: () => void;
} 