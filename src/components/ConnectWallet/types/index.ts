export interface WalletAccount {
  address: string;
  providerId?: string;
}

export interface WalletMetadata {
  name: string;
  icon: string;
  description?: string;
}

export interface Wallet {
  id: string;
  metadata: WalletMetadata;
  isActive: boolean;
  isConnected: boolean;
  accounts: WalletAccount[];
  activeAccount?: WalletAccount;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  setActiveAccount: (address: string) => void;
}

export interface TokenInfo {
  name: string;
  metadata?: {
    avatar?: string;
    description?: string;
  };
}

export interface WalletDisplayState {
  loading: boolean;
  displayName: string;
  tokenInfo: TokenInfo | null;
  expandedWidth: number;
  avatarDisplay: {
    type: 'image' | 'text';
    src?: string;
    text?: string;
  };
}

export interface ConnectWalletProps {
  theme?: "light" | "dark";
  expanded?: boolean;
  onWalletConnect?: (account: WalletAccount) => void;
  onWalletDisconnect?: () => void;
  onMobileSidebarClose?: () => void;
}

export interface WalletButtonProps {
  activeAccount: WalletAccount | null;
  displayName: string;
  loading: boolean;
  isDarkTheme: boolean;
  expanded: boolean;
  open: boolean;
  tokenInfo: TokenInfo | null;
  onClick: (e: React.MouseEvent) => void;
}

export interface WalletMenuProps {
  isDarkTheme: boolean;
  onClose: () => void;
} 