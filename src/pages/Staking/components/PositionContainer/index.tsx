import React, { useMemo, useState, useEffect, useCallback } from "react";
import PositionTable from "../PositionTable";
import { useOwnedStakingContract } from "@/hooks/staking";
import { useWallet } from "@txnlab/use-wallet-react";
import { useOwnedARC72Token } from "@/hooks/arc72";
import PositionSummary from "../PositionSummary";
import { useSelector } from "react-redux";
import { RootState } from "@/store/store";
import { TOKEN_NAUT_VOI_STAKING } from "@/contants/tokens";
import { useInView } from "react-intersection-observer";
import styled from "styled-components";
import { Dialog, DialogContent, DialogTitle } from "@mui/material";
import { Close } from "@mui/icons-material";

const NotConnectedContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px;
  text-align: center;
  gap: 16px;

  &.dark {
    background: #202020;
    border: 1px solid #2b2b2b;
  }
  &.light {
    background: #fff;
    border: 1px solid #eaebf0;
  }
  border-radius: 10px;
`;

const DataPreviewGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  width: 100%;
  max-width: 600px;
  margin-bottom: 24px;
`;

const DataPreviewCard = styled.div`
  padding: 16px;
  border-radius: 8px;

  &.dark {
    background: #2b2b2b;
    border: 1px solid #363636;
  }
  &.light {
    background: #f8f9fa;
    border: 1px solid #eaebf0;
  }
`;

const DataLabel = styled.div`
  font-family: "Inter";
  font-size: 12px;
  margin-bottom: 4px;

  &.dark {
    color: #68727d;
  }
  &.light {
    color: #68727d;
  }
`;

const DataValue = styled.div`
  font-family: "Nohemi";
  font-size: 20px;
  font-weight: 600;

  &.dark {
    color: #fff;
  }
  &.light {
    color: #161717;
  }
`;

const ConnectMessage = styled.h3`
  font-family: "Nohemi";
  font-size: 24px;
  margin: 0;

  &.dark {
    color: #fff;
  }
  &.light {
    color: #161717;
  }
`;

const ConnectDescription = styled.p`
  font-family: "Inter";
  font-size: 16px;
  margin: 0;

  &.dark {
    color: #68727d;
  }
  &.light {
    color: #68727d;
  }
`;

const ConnectButton = styled.button`
  padding: 12px 24px;
  border-radius: 100px;
  font-family: "Inter";
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;

  &.dark {
    background: #9933ff;
    color: #fff;
    border: none;
    &:hover {
      background: #8829e0;
    }
  }
  &.light {
    background: #9933ff;
    color: #fff;
    border: none;
    &:hover {
      background: #8829e0;
    }
  }
`;

const WalletProviderCard = styled.div`
  padding: 16px;
  border-radius: 8px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  cursor: pointer;
  transition: all 0.2s;

  &.dark {
    background: #2b2b2b;
    border: 1px solid #363636;
    &:hover {
      background: #363636;
    }
  }
  &.light {
    background: #f8f9fa;
    border: 1px solid #eaebf0;
    &:hover {
      background: #eaebf0;
    }
  }
`;

const PositionContainer: React.FC = () => {
  const { activeAccount, providers, connect } = useWallet();
  const isDarkTheme = useSelector(
    (state: RootState) => state.theme.isDarkTheme
  );
  const [showWalletModal, setShowWalletModal] = useState(false);

  if (!activeAccount) {
    return (
      <NotConnectedContainer className={isDarkTheme ? "dark" : "light"}>
        {/*<DataPreviewGrid>
          <DataPreviewCard className={isDarkTheme ? 'dark' : 'light'}>
            <DataLabel className={isDarkTheme ? 'dark' : 'light'}>
              Total Value Locked
            </DataLabel>
            <DataValue className={isDarkTheme ? 'dark' : 'light'}>
              $4.2M
            </DataValue>
          </DataPreviewCard>
          <DataPreviewCard className={isDarkTheme ? 'dark' : 'light'}>
            <DataLabel className={isDarkTheme ? 'dark' : 'light'}>
              Active Stakers
            </DataLabel>
            <DataValue className={isDarkTheme ? 'dark' : 'light'}>
              1,234
            </DataValue>
          </DataPreviewCard>
          <DataPreviewCard className={isDarkTheme ? 'dark' : 'light'}>
            <DataLabel className={isDarkTheme ? 'dark' : 'light'}>
              APR
            </DataLabel>
            <DataValue className={isDarkTheme ? 'dark' : 'light'}>
              12.5%
            </DataValue>
          </DataPreviewCard>
        </DataPreviewGrid>*/}
        <ConnectMessage className={isDarkTheme ? "dark" : "light"}>
          Connect Your Wallet
        </ConnectMessage>
        <ConnectDescription className={isDarkTheme ? "dark" : "light"}>
          Connect your wallet to view your staking positions
        </ConnectDescription>
        <ConnectButton
          className={isDarkTheme ? "dark" : "light"}
          onClick={() => setShowWalletModal(true)}
        >
          Connect Wallet
        </ConnectButton>

        <Dialog
          open={showWalletModal}
          onClose={() => setShowWalletModal(false)}
          maxWidth="xs"
          fullWidth
        >
          <DialogTitle>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span>Connect Wallet</span>
              <Close
                onClick={() => setShowWalletModal(false)}
                style={{ cursor: "pointer" }}
              />
            </div>
          </DialogTitle>
          <DialogContent>
            {providers?.map((provider) => (
              <WalletProviderCard
                key={provider.metadata.id}
                className={isDarkTheme ? "dark" : "light"}
                onClick={() => {
                  connect(provider);
                  setShowWalletModal(false);
                }}
              >
                <div
                  style={{ display: "flex", alignItems: "center", gap: "12px" }}
                >
                  <img
                    src={provider.metadata.icon}
                    alt={provider.metadata.name}
                    style={{ width: "24px", height: "24px" }}
                  />
                  <span>{provider.metadata.name}</span>
                </div>
              </WalletProviderCard>
            ))}
          </DialogContent>
        </Dialog>
      </NotConnectedContainer>
    );
  }

  const { data: stakingContractData, isLoading: stakingContractLoading, refetch: refetchStakingContract } =
    useOwnedStakingContract(activeAccount?.address, {
      includeRewards: true,
      includeWithdrawable: true,
    });
  const {
    data: arc72TokenData,
    isLoading: arc72TokenLoading,
    refetch: refetchArc72Token,
  } = useOwnedARC72Token(activeAccount?.address, TOKEN_NAUT_VOI_STAKING, {
    includeStaking: true,
  });

  // Infinite scroll setup
  const [displayCount, setDisplayCount] = useState(10);
  const { ref: loadMoreRef, inView } = useInView();

  const loadMore = useCallback(() => {
    if (!stakingContractLoading && !arc72TokenLoading) {
      setDisplayCount((prev) => prev + 10);
    }
  }, [stakingContractLoading, arc72TokenLoading]);

  useEffect(() => {
    if (inView) {
      loadMore();
    }
  }, [inView, loadMore]);

  if (stakingContractLoading || arc72TokenLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div style={{ marginTop: "20px" }}>
      <PositionSummary
        stakingContracts={stakingContractData}
        arc72Tokens={arc72TokenData}
        isDarkTheme={isDarkTheme}
      />
      <PositionTable
        stakingContracts={stakingContractData?.slice(0, displayCount) || []}
        arc72Tokens={arc72TokenData?.slice(0, displayCount)}
        onRefresh={() => {
          refetchStakingContract();
          refetchArc72Token();
        }}
      />

      {/* Invisible load more trigger */}
      {(stakingContractData?.length > displayCount ||
        arc72TokenData?.length > displayCount) && (
        <div ref={loadMoreRef} style={{ height: "20px", margin: "20px 0" }} />
      )}
    </div>
  );
};

export default PositionContainer;
