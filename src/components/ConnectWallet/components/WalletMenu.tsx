import React from "react";
import styled from "styled-components";
import {
  Avatar,
  Box,
  Divider,
  MenuItem,
  Select,
  Typography,
  CircularProgress,
  Alert,
} from "@mui/material";
import { useWallet } from "@txnlab/use-wallet-react";
import { currentVersion, deploymentVersion } from "@/contants/versions";
import { compactAddress } from "@/utils/mp";

const AccountMenu = styled.div`
  padding: 0;
  max-height: 60vh;
  overflow-y: auto;
`;

const WalletContainer = styled.div`
  display: flex;
  padding: 16px;
  flex-direction: column;
  justify-content: flex-start;
  align-items: center;
  gap: 16px;
  width: 100%;
  box-sizing: border-box;
`;

const ProviderContainer = styled.div<{ $isDarkTheme?: boolean }>`
  width: 100%;
  max-width: 400px;
  display: flex;
  padding: 16px;
  flex-direction: column;
  justify-content: center;
  align-items: flex-start;
  gap: 16px;
  border-radius: 12px;
  background: ${(props) =>
    props.$isDarkTheme
      ? "rgba(255, 255, 255, 0.05)"
      : "rgba(231, 231, 231, 0.36)"};
  border: 1px solid
    ${(props) =>
      props.$isDarkTheme ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)"};
`;

const ProviderIconContainer = styled.div`
  display: flex;
  width: 100%;
  justify-content: space-between;
  align-items: center;
`;

const ProviderName = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
`;

const WalletIcon = styled.div`
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  border-radius: 1000px;
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
`;

const ProviderNameLabel = styled.div<{ $isDarkTheme?: boolean }>`
  color: ${(props) => (props.$isDarkTheme ? "#FFFFFF" : "#161717")};
  font-size: 16px;
  font-style: normal;
  font-weight: 600;
  line-height: 22px;
`;

const ErrorContainer = styled.div`
  padding: 16px;
  margin: 8px 0;
  border-radius: 8px;
  background: rgba(244, 67, 54, 0.1);
  border: 1px solid rgba(244, 67, 54, 0.3);
`;

const LoadingContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 32px;
`;

const ConnectButton = styled.button<{ $isDarkTheme?: boolean }>`
  background: ${(props) => (props.$isDarkTheme ? "#9933FF" : "#9933FF")};
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: ${(props) => (props.$isDarkTheme ? "#7B2CC7" : "#7B2CC7")};
    transform: translateY(-1px);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }
`;

const DisconnectButton = styled.button<{ $isDarkTheme?: boolean }>`
  background: transparent;
  color: ${(props) => (props.$isDarkTheme ? "#FF6B6B" : "#FF6B6B")};
  border: 1px solid ${(props) => (props.$isDarkTheme ? "#FF6B6B" : "#FF6B6B")};
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: ${(props) => (props.$isDarkTheme ? "#FF6B6B" : "#FF6B6B")};
    color: white;
  }
`;

const AccountSelect = styled(Select)<{ $isDarkTheme?: boolean }>`
  width: 100%;

  .MuiSelect-select {
    color: ${(props) => (props.$isDarkTheme ? "#FFFFFF" : "#161717")};
    font-size: 14px;
  }

  .MuiOutlinedInput-notchedOutline {
    border-color: ${(props) =>
      props.$isDarkTheme ? "rgba(255, 255, 255, 0.2)" : "rgba(0, 0, 0, 0.2)"};
  }

  &:hover .MuiOutlinedInput-notchedOutline {
    border-color: ${(props) =>
      props.$isDarkTheme ? "rgba(255, 255, 255, 0.3)" : "rgba(0, 0, 0, 0.3)"};
  }
`;

const VersionText = styled(Typography)<{ $isDarkTheme?: boolean }>`
  color: ${(props) =>
    props.$isDarkTheme ? "rgba(255, 255, 255, 0.6)" : "rgba(0, 0, 0, 0.6)"};
  font-size: 12px;
  text-align: center;
  margin-top: 16px;
`;

interface WalletMenuProps {
  isDarkTheme: boolean;
  onClose: () => void;
}

export const WalletMenu: React.FC<WalletMenuProps> = ({
  isDarkTheme,
  onClose,
}) => {
  const { activeAccount, wallets } = useWallet();
  const [error, setError] = React.useState<string | null>(null);
  const [connectingWallet, setConnectingWallet] = React.useState<string | null>(
    null
  );

  const handleWalletConnect = async (wallet: any) => {
    setError(null);
    setConnectingWallet(wallet.id);

    try {
      console.log(wallet.metadata.name);
      if (
        wallet.metadata.name === "WalletConnect" ||
        wallet.metadata.name === "BiatecWallet"
      ) {
        onClose();
      }
      await wallet.connect();
    } catch (err) {
      setError(
        `Failed to connect to ${wallet.metadata.name}: ${
          err instanceof Error ? err.message : "Unknown error"
        }`
      );
    } finally {
      setConnectingWallet(null);
    }
  };

  const handleWalletDisconnect = async (wallet: any) => {
    setError(null);

    try {
      await wallet.disconnect();
      onClose();
    } catch (err) {
      setError(
        `Failed to disconnect from ${wallet.metadata.name}: ${
          err instanceof Error ? err.message : "Unknown error"
        }`
      );
    }
  };

  const handleAccountChange = (wallet: any, address: string) => {
    setError(null);

    try {
      wallet.setActiveAccount(address);
    } catch (err) {
      setError(
        `Failed to switch account: ${
          err instanceof Error ? err.message : "Unknown error"
        }`
      );
    }
  };

  if (!wallets || wallets.length === 0) {
    return (
      <AccountMenu>
        <ErrorContainer>
          <Typography variant="body2" color="error">
            No wallets available. Please install a supported wallet extension.
          </Typography>
        </ErrorContainer>
      </AccountMenu>
    );
  }

  return (
    <AccountMenu>
      <WalletContainer>
        {error && (
          <ErrorContainer>
            <Alert severity="error" onClose={() => setError(null)}>
              {error}
            </Alert>
          </ErrorContainer>
        )}

        {wallets?.map((wallet) => (
          <ProviderContainer key={wallet.id} $isDarkTheme={isDarkTheme}>
            <ProviderIconContainer>
              <ProviderName>
                <WalletIcon
                  style={{
                    backgroundImage: `url(${wallet.metadata.icon})`,
                  }}
                />
                <ProviderNameLabel $isDarkTheme={isDarkTheme}>
                  {wallet.metadata.name}
                </ProviderNameLabel>
              </ProviderName>

              <Box sx={{ flexShrink: 0 }}>
                {connectingWallet === wallet.id ? (
                  <CircularProgress size={24} />
                ) : wallet.isActive ? (
                  <DisconnectButton
                    $isDarkTheme={isDarkTheme}
                    onClick={() => handleWalletDisconnect(wallet)}
                  >
                    Disconnect
                  </DisconnectButton>
                ) : (
                  <ConnectButton
                    $isDarkTheme={isDarkTheme}
                    onClick={() => handleWalletConnect(wallet)}
                  >
                    Connect
                  </ConnectButton>
                )}
              </Box>
            </ProviderIconContainer>

            {wallet.isActive && wallet.accounts.length > 0 && (
              <AccountSelect
                $isDarkTheme={isDarkTheme}
                fullWidth
                size="small"
                value={activeAccount?.address || ""}
                onChange={(e) =>
                  handleAccountChange(wallet, e.target.value as string)
                }
                color="primary"
              >
                {wallet.accounts.map((account) => (
                  <MenuItem value={account.address} key={account.address}>
                    {compactAddress(account.address)}
                  </MenuItem>
                ))}
              </AccountSelect>
            )}
          </ProviderContainer>
        ))}

        <Divider sx={{ width: "100%", margin: "16px 0" }} />

        <VersionText $isDarkTheme={isDarkTheme}>
          Nautilus Ver {currentVersion}.{deploymentVersion}
        </VersionText>
      </WalletContainer>
    </AccountMenu>
  );
};
