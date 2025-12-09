import React, { useMemo, useState, useEffect, useCallback } from "react";
import PositionTable from "../PositionTable";
import { useOwnedStakingContract, useStakingContract } from "@/hooks/staking";
import { useWallet } from "@txnlab/use-wallet-react";
import { useOwnedARC72Token } from "@/hooks/arc72";
import PositionSummary from "../PositionSummary";
import { useSelector } from "react-redux";
import { RootState } from "@/store/store";
import { TOKEN_NAUT_VOI_STAKING } from "@/contants/tokens";
import { useInView } from "react-intersection-observer";
import styled from "styled-components";
import { Dialog, DialogContent, DialogTitle, DialogActions, Button, TextField, Box, IconButton, Chip } from "@mui/material";
import { Close, Add, Delete } from "@mui/icons-material";
import { toast } from "react-hot-toast";
import { useQueries } from "@tanstack/react-query";
import axios from "axios";
import algosdk from "algosdk";
import { SCS_API } from "@/contants/endpoints";
import { getAlgorandClients } from "@/wallets";
import { transformAppData, addRewardEstimates } from "@/hooks/staking";
import { getStakingWithdrawableAmount } from "@/utils/staking";

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

const AddContractButton = styled(Button)`
  margin-bottom: 16px;
  &.dark {
    background: #9933ff;
    color: #fff;
    &:hover {
      background: #8829e0;
    }
  }
  &.light {
    background: #9933ff;
    color: #fff;
    &:hover {
      background: #8829e0;
    }
  }
`;

const ContractChipContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 16px;
  margin-bottom: 16px;
`;

const STORAGE_KEY = "staking_manual_contracts";

const PositionContainer: React.FC = () => {
  const { activeAccount, providers, connect } = useWallet();
  const isDarkTheme = useSelector(
    (state: RootState) => state.theme.isDarkTheme
  );
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [showAddContractModal, setShowAddContractModal] = useState(false);
  const [contractIdInput, setContractIdInput] = useState("");
  const [manualContractIds, setManualContractIds] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

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

  // Fetch data for manually added contracts using useQueries
  const { algodClient } = getAlgorandClients();
  const manualContractQueries = useQueries({
    queries: manualContractIds.map((contractId) => ({
      queryKey: ["stakingAccount", contractId, { includeRewards: true, includeWithdrawable: true }],
      queryFn: async () => {
        const response = await axios.get(`${SCS_API}/app/${contractId}`);
        const appData = response.data;
        
        // Get creator from appInfo or try to find it from accounts endpoint
        let creator = appData.appInfo?.creator;
        if (!creator) {
          try {
            const accountResponse = await axios.get(`${SCS_API}/account/${appData.address}`);
            creator = accountResponse.data.creator;
          } catch (e) {
            console.warn("Could not fetch creator from account endpoint", e);
          }
        }
        
        const account = transformAppData(
          {
            id: appData.id,
            address: appData.address,
            globalState: appData.appInfo?.globalState || [],
          },
          creator || ""
        );

        const transformedAccount = addRewardEstimates([account])[0];

        // Fetch account information to get part_vote_lst and calculate expires
        try {
          const appAddress = algosdk.getApplicationAddress(transformedAccount.contractId);
          const accInfo = await algodClient.accountInformation(appAddress).do();
          
          const part_vote_lst = accInfo?.participation?.["vote-last-valid"] || 0;
          const expires = part_vote_lst;
          
          let result = {
            ...transformedAccount,
            part_vote_lst: Number(part_vote_lst),
            expires: Number(expires),
          };
          
          // Include withdrawable if needed
          const withdrawable = await getStakingWithdrawableAmount(
            algodClient,
            Number(contractId),
            transformedAccount.global_owner
          );
          result = {
            ...result,
            value: accInfo.amount,
            withdrawable: withdrawable.toString(),
            unlockTime:
              transformedAccount.global_funding +
              (transformedAccount.global_lockup_delay +
                transformedAccount.global_vesting_delay * transformedAccount.global_period) *
                transformedAccount.global_period_seconds +
              transformedAccount.global_distribution_count *
                transformedAccount.global_distribution_seconds,
          };
          
          return result;
        } catch (e) {
          console.warn(`Failed to fetch account info for contract ${contractId}`, e);
          return {
            ...transformedAccount,
            part_vote_lst: 0,
            expires: 0,
          };
        }
      },
      enabled: !!contractId,
      staleTime: 5 * 60 * 1000,
      cacheTime: 10 * 60 * 1000,
    })),
  });

  const manualContracts = useMemo(() => {
    return manualContractQueries
      .map((query) => query.data)
      .filter((data): data is NonNullable<typeof data> => data !== undefined);
  }, [manualContractQueries]);

  // Merge owned contracts with manually added contracts
  const allStakingContracts = useMemo(() => {
    const owned = stakingContractData || [];
    const ownedIds = new Set(owned.map((c: any) => c.contractId.toString()));
    
    // Only include manual contracts that aren't already in owned contracts
    const manualFiltered = manualContracts.filter(
      (contract) => !ownedIds.has(contract.contractId.toString())
    );
    
    return [...owned, ...manualFiltered];
  }, [stakingContractData, manualContracts]);

  // Functions to manage manual contracts
  const handleAddContract = () => {
    const contractId = contractIdInput.trim();
    if (!contractId) {
      toast.error("Please enter a contract ID");
      return;
    }

    // Validate it's a number
    if (isNaN(Number(contractId))) {
      toast.error("Contract ID must be a number");
      return;
    }

    // Check if already added
    if (manualContractIds.includes(contractId)) {
      toast.error("Contract already added");
      return;
    }

    // Check if already in owned contracts
    const ownedIds = new Set(
      (stakingContractData || []).map((c: any) => c.contractId.toString())
    );
    if (ownedIds.has(contractId)) {
      toast.error("Contract already in your positions");
      return;
    }

    const newContractIds = [...manualContractIds, contractId];
    setManualContractIds(newContractIds);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newContractIds));
    setContractIdInput("");
    setShowAddContractModal(false);
    toast.success("Contract added successfully");
  };

  const handleRemoveContract = (contractId: string) => {
    const newContractIds = manualContractIds.filter((id) => id !== contractId);
    setManualContractIds(newContractIds);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newContractIds));
    toast.success("Contract removed");
  };

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

  const isLoadingManualContracts = manualContractQueries.some(
    (query) => query.isLoading || query.isFetching
  );

  if (stakingContractLoading || arc72TokenLoading || isLoadingManualContracts) {
    return <div>Loading...</div>;
  }

  return (
    <div style={{ marginTop: "20px" }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
        <AddContractButton
          variant="contained"
          startIcon={<Add />}
          onClick={() => setShowAddContractModal(true)}
          className={isDarkTheme ? "dark" : "light"}
        >
          Add Contract by ID
        </AddContractButton>
        {manualContractIds.length > 0 && (
          <ContractChipContainer>
            {manualContractIds.map((contractId) => (
              <Chip
                key={contractId}
                label={`Contract ${contractId}`}
                onDelete={() => handleRemoveContract(contractId)}
                deleteIcon={<Delete />}
                sx={{
                  backgroundColor: isDarkTheme ? "#2b2b2b" : "#f8f9fa",
                  color: isDarkTheme ? "#fff" : "#161717",
                  "& .MuiChip-deleteIcon": {
                    color: isDarkTheme ? "#fff" : "#161717",
                  },
                }}
              />
            ))}
          </ContractChipContainer>
        )}
      </Box>

      <Dialog
        open={showAddContractModal}
        onClose={() => {
          setShowAddContractModal(false);
          setContractIdInput("");
        }}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            backgroundColor: isDarkTheme
              ? "rgba(30, 30, 30, 0.95)"
              : "rgba(255, 255, 255, 0.95)",
            backdropFilter: "blur(10px)",
            borderRadius: "16px",
          },
        }}
      >
        <DialogTitle>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span style={{ color: isDarkTheme ? "#fff" : "inherit" }}>
              Add Contract by ID
            </span>
            <Close
              onClick={() => {
                setShowAddContractModal(false);
                setContractIdInput("");
              }}
              style={{ cursor: "pointer", color: isDarkTheme ? "#fff" : "inherit" }}
            />
          </div>
        </DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Contract ID"
            value={contractIdInput}
            onChange={(e) => setContractIdInput(e.target.value)}
            placeholder="Enter contract ID (e.g., 123456)"
            sx={{
              mt: 2,
              "& .MuiInputBase-input": {
                color: isDarkTheme ? "white" : "inherit",
              },
              "& .MuiInputLabel-root": {
                color: isDarkTheme ? "rgba(255, 255, 255, 0.7)" : "inherit",
              },
              "& .MuiOutlinedInput-root": {
                "& fieldset": {
                  borderColor: isDarkTheme ? "#3b3b3b" : "#eaebf0",
                },
                "&:hover fieldset": {
                  borderColor: isDarkTheme ? "#9933ff" : "#9933ff",
                },
                "&.Mui-focused fieldset": {
                  borderColor: "#9933ff",
                },
              },
            }}
            onKeyPress={(e) => {
              if (e.key === "Enter") {
                handleAddContract();
              }
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setShowAddContractModal(false);
              setContractIdInput("");
            }}
            sx={{
              color: isDarkTheme ? "white" : "inherit",
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleAddContract}
            variant="contained"
            sx={{
              backgroundColor: "#9933ff",
              color: "white",
              "&:hover": { backgroundColor: "#7f2adb" },
            }}
          >
            Add Contract
          </Button>
        </DialogActions>
      </Dialog>

      <PositionSummary
        stakingContracts={allStakingContracts}
        arc72Tokens={arc72TokenData}
        isDarkTheme={isDarkTheme}
      />
      <PositionTable
        stakingContracts={allStakingContracts?.slice(0, displayCount) || []}
        arc72Tokens={arc72TokenData?.slice(0, displayCount)}
        onRefresh={() => {
          refetchStakingContract();
          refetchArc72Token();
          manualContractQueries.forEach((query) => {
            query.refetch();
          });
        }}
      />

      {/* Invisible load more trigger */}
      {(allStakingContracts?.length > displayCount ||
        arc72TokenData?.length > displayCount) && (
        <div ref={loadMoreRef} style={{ height: "20px", margin: "20px 0" }} />
      )}
    </div>
  );
};

export default PositionContainer;
