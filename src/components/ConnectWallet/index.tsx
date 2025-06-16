import * as React from "react";
import { Modal, Box } from "@mui/material";
import styled from "styled-components";
import { useSelector } from "react-redux";
import { RootState } from "../../store/store";
import { useWallet } from "@txnlab/use-wallet-react";

// Import new components and hooks
import { WalletButton } from "./components/WalletButton";
import { WalletMenu } from "./components/WalletMenu";
import { useWalletDisplay } from "./hooks/useWalletDisplay";
import { ConnectWalletProps } from "./types";

// Temporary inline components until import issues are resolved
const WalletIcon2 = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
  >
    <path
      d="M11 9.33333H11.0067M2 3.33333V12.6667C2 13.403 2.59695 14 3.33333 14H12.6667C13.403 14 14 13.403 14 12.6667V6C14 5.26362 13.403 4.66667 12.6667 4.66667L3.33333 4.66667C2.59695 4.66667 2 4.06971 2 3.33333ZM2 3.33333C2 2.59695 2.59695 2 3.33333 2H11.3333M11.3333 9.33333C11.3333 9.51743 11.1841 9.66667 11 9.66667C10.8159 9.66667 10.6667 9.51743 10.6667 9.33333C10.6667 9.14924 10.8159 9 11 9C11.1841 9 11.3333 9.14924 11.3333 9.33333Z"
      stroke="#161717"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const WalletIconContainer = styled.div`
  display: flex;
  padding: var(--Main-System-8px, 8px);
  align-items: flex-start;
  gap: var(--Main-System-10px, 10px);
  border-radius: 100px;
  background: #9f3;
  flex-shrink: 0;
`;

const Button = styled.div`
  cursor: pointer;
`;

const AccountDropdown = styled(Button)`
  color: #93f;
  display: flex;
  padding: 6px 6px 8px 20px;
  justify-content: flex-end;
  align-items: center;
  gap: 16px;
  border-radius: 32px;
  border: 1px solid #93f;
  width: fit-content;
  box-shadow: 0px 2px 4px 0px rgba(16, 24, 40, 0.1);
  &:hover {
    border: 1px solid #93f;
    background: #93f;
    color: #fff;
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

const ModalContent = styled(Box)<{ $isDarkTheme?: boolean }>`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: ${(props) => props.$isDarkTheme ? "#1a1a1a" : "#ffffff"};
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
  padding: 0;
  max-width: 90vw;
  max-height: 80vh;
  overflow: hidden;
  outline: none;
  
  @media (max-width: 768px) {
    width: 95vw;
    max-height: 85vh;
    border-radius: 12px;
  }
`;

const ModalHeader = styled.div<{ $isDarkTheme?: boolean }>`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid ${(props) => props.$isDarkTheme ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)"};
  
  @media (max-width: 768px) {
    padding: 16px 20px;
  }
`;

const ModalTitle = styled.h2<{ $isDarkTheme?: boolean }>`
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: ${(props) => props.$isDarkTheme ? "#ffffff" : "#161717"};
  
  @media (max-width: 768px) {
    font-size: 18px;
  }
`;

const CloseButton = styled.button<{ $isDarkTheme?: boolean }>`
  background: none;
  border: none;
  cursor: pointer;
  padding: 8px;
  border-radius: 8px;
  color: ${(props) => props.$isDarkTheme ? "#ffffff" : "#161717"};
  opacity: 0.7;
  transition: opacity 0.2s;
  
  &:hover {
    opacity: 1;
    background: ${(props) => props.$isDarkTheme ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.05)"};
  }
  
  svg {
    width: 20px;
    height: 20px;
  }
`;

function BasicMenu({ expanded, theme = "light", onWalletConnect, onWalletDisconnect, onMobileSidebarClose }: ConnectWalletProps) {
  const isDarkTheme = useSelector((state: RootState) => state.theme.isDarkTheme);
  const { activeAccount, wallets } = useWallet();
  const [isModalOpen, setIsModalOpen] = React.useState(false);

  // Use the custom hook for wallet display logic
  const { loading, displayName, tokenInfo, expandedWidth, avatarDisplay } = useWalletDisplay();

  const handleOpenModal = (event: React.MouseEvent) => {
    event.preventDefault();
    // Close mobile sidebar if callback is provided
    if (onMobileSidebarClose) {
      onMobileSidebarClose();
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  // Handle wallet connection events
  React.useEffect(() => {
    if (activeAccount && onWalletConnect) {
      // Convert the wallet account to match our interface
      const walletAccount = {
        address: activeAccount.address,
        providerId: undefined // The library doesn't provide this property
      };
      onWalletConnect(walletAccount);
    }
  }, [activeAccount, onWalletConnect]);

  const handleWalletDisconnect = React.useCallback(() => {
    if (onWalletDisconnect) {
      onWalletDisconnect();
    }
  }, [onWalletDisconnect]);

  return (
    <div>
      {!activeAccount ? (
        <AccountDropdown
          className={isDarkTheme ? "dark" : "light"}
          onClick={handleOpenModal}
        >
          <AccountDropdownLabel
            className=""
            theme={isDarkTheme ? "dark" : "light"}
          >
            Connect
          </AccountDropdownLabel>
          <WalletIconContainer>
            <WalletIcon2 />
          </WalletIconContainer>
        </AccountDropdown>
      ) : (
        <WalletButton
          activeAccount={activeAccount}
          displayName={displayName}
          loading={loading}
          isDarkTheme={isDarkTheme}
          expanded={expanded || false}
          open={false}
          tokenInfo={tokenInfo}
          onClick={handleOpenModal}
        />
      )}

      <Modal
        open={isModalOpen}
        onClose={handleCloseModal}
        aria-labelledby="wallet-modal-title"
        aria-describedby="wallet-modal-description"
        sx={{
          backdropFilter: 'blur(4px)',
        }}
      >
        <ModalContent $isDarkTheme={isDarkTheme}>
          <ModalHeader $isDarkTheme={isDarkTheme}>
            <ModalTitle $isDarkTheme={isDarkTheme}>
              {activeAccount ? "Wallet Settings" : "Connect Wallet"}
            </ModalTitle>
            <CloseButton 
              $isDarkTheme={isDarkTheme}
              onClick={handleCloseModal}
              aria-label="Close wallet modal"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </CloseButton>
          </ModalHeader>
          
          <WalletMenu
            isDarkTheme={isDarkTheme}
            onClose={handleCloseModal}
          />
        </ModalContent>
      </Modal>
    </div>
  );
}

export default BasicMenu;
