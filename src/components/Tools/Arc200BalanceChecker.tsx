import React, { useState } from "react";
import styled from "styled-components";
import { Alert, Snackbar } from "@mui/material";
import { MIMIR_API } from "@/config/arc72-idx";
import { useWallet } from "@txnlab/use-wallet-react";
import { getAlgorandClients } from "@/wallets";
import { abi, CONTRACT } from "ulujs";
import BigNumber from "bignumber.js";

const Container = styled.div`
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem;
`;

const Title = styled.h2`
  font-size: 2rem;
  margin-bottom: 0.5rem;
  color: var(--text-primary);
  text-align: center;
`;

const Subtitle = styled.p`
  color: var(--text-secondary);
  text-align: center;
  margin-bottom: 2rem;
  font-size: 1.1rem;
`;

const InputGroup = styled.div`
  display: flex;
  gap: 1rem;
  margin-bottom: 1.5rem;
`;

const SearchContainer = styled.div`
  margin-top: 1.5rem;
  margin-bottom: 1rem;
`;

const SearchInput = styled.input`
  width: 100%;
  padding: 0.75rem;
  border: 2px solid var(--border-color);
  border-radius: 8px;
  font-size: 1rem;
  transition: border-color 0.2s ease;
  background: var(--background-secondary);
  color: var(--text-primary);

  &:focus {
    border-color: var(--primary-color);
    outline: none;
  }
`;

const Input = styled.input`
  flex: 1;
  padding: 1rem;
  border: 2px solid var(--border-color);
  border-radius: 8px;
  font-size: 1.1rem;
  transition: border-color 0.2s ease;
  background: var(--background-secondary);
  color: var(--text-primary);

  &:focus {
    border-color: var(--primary-color);
    outline: none;
  }
`;

const Button = styled.button`
  background: var(--primary-color);
  color: var(--background-secondary);
  padding: 1rem 2rem;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  font-size: 1.1rem;
  width: 100%;
  transition: all 0.2s ease;

  &:hover {
    background: var(--primary-color-dark);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }
`;

const WalletButton = styled(Button)`
  width: auto;
  white-space: nowrap;
`;

const ResultsContainer = styled.div`
  margin-top: 2rem;
  padding: 1.5rem;
  background: var(--background-secondary);
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
`;

const TokenCard = styled.div`
  background: var(--background-tertiary);
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1rem;
  border: 1px solid var(--border-color);
`;

const TokenHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
`;

const TokenName = styled.h3`
  margin: 0;
  color: var(--text-primary);
  font-size: 1.2rem;
`;

const TokenSymbol = styled.span`
  background: var(--primary-color);
  color: white;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.8rem;
  font-weight: 600;
`;

const TokenDetails = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 0.5rem;
  font-size: 0.9rem;
  color: var(--text-secondary);
`;

const BalanceAmount = styled.div`
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--text-primary);
  margin-top: 0.5rem;
`;

const LoadingSpinner = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 2rem;
  font-size: 1.1rem;
  color: var(--text-secondary);
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 2rem;
  color: var(--text-secondary);
  font-size: 1.1rem;
`;

const SearchResultsInfo = styled.div`
  margin-bottom: 1rem;
  padding: 0.5rem 1rem;
  background: var(--background-tertiary);
  border-radius: 6px;
  font-size: 0.9rem;
  color: var(--text-secondary);
  text-align: center;
`;

const NoResultsState = styled.div`
  text-align: center;
  padding: 2rem;
  color: var(--text-secondary);
  font-size: 1.1rem;
`;

const VerifyButton = styled.button`
  background: var(--primary-color);
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 500;
  transition: all 0.2s ease;
  margin-top: 0.5rem;

  &:hover {
    background: var(--primary-color-dark);
    transform: translateY(-1px);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }
`;

const VerificationStatus = styled.div<{
  status: "verified" | "failed" | "verifying";
}>`
  margin-top: 0.5rem;
  padding: 0.5rem;
  border-radius: 4px;
  font-size: 0.9rem;
  font-weight: 500;
  text-align: center;

  ${(props) => {
    switch (props.status) {
      case "verified":
        return `
          background: #d4edda;
          color: #155724;
          border: 1px solid #c3e6cb;
        `;
      case "failed":
        return `
          background: #f8d7da;
          color: #721c24;
          border: 1px solid #f5c6cb;
        `;
      case "verifying":
        return `
          background: #d1ecf1;
          color: #0c5460;
          border: 1px solid #bee5eb;
        `;
      default:
        return "";
    }
  }}
`;

interface TokenBalance {
  contractId: number;
  balance: string;
  tokenId: string;
}

interface TokenInfo {
  contractId: number;
  name: string;
  symbol: string;
  decimals: number;
  totalSupply: string;
  creator: string;
  mintRound: number;
  tokenId: string | null;
}

interface BalanceResponse {
  balances: TokenBalance[];
}

interface TokenInfoResponse {
  tokens: TokenInfo[];
}

const Arc200BalanceChecker: React.FC = () => {
  const { activeAccount } = useWallet();
  const [address, setAddress] = useState("");
  const [balances, setBalances] = useState<TokenBalance[]>([]);
  const [tokenInfo, setTokenInfo] = useState<Record<number, TokenInfo>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [verificationStates, setVerificationStates] = useState<
    Record<number, "idle" | "verifying" | "verified" | "failed">
  >({});
  const [verificationDetails, setVerificationDetails] = useState<
    Record<
      number,
      {
        balanceMatches?: boolean;
        onChainBalance?: string;
        indexerBalance?: string;
      }
    >
  >({});
  const [toast, setToast] = useState<{
    open: boolean;
    message: string;
    severity: "error" | "success";
  }>({
    open: false,
    message: "",
    severity: "error",
  });

  const handleCloseToast = () => {
    setToast({ ...toast, open: false });
  };

  const handleUseActiveWallet = () => {
    if (activeAccount) {
      setAddress(activeAccount.address);
    }
  };

  const formatBalance = (balance: string, decimals: number = 0) => {
    const num = parseFloat(balance);
    return (num / Math.pow(10, decimals)).toFixed(decimals);
  };

  const verifyToken = async (contractId: number) => {
    if (!activeAccount) {
      setToast({
        open: true,
        message: "Please connect your wallet to verify tokens",
        severity: "error",
      });
      return;
    }

    setVerificationStates((prev) => ({ ...prev, [contractId]: "verifying" }));

    try {
      const { algodClient } = getAlgorandClients();

      // Create contract instance using ulujs
      const ci = new CONTRACT(contractId, algodClient, undefined, abi.arc200, {
        addr: activeAccount.address,
        sk: new Uint8Array(0),
      });

      // Verify token by calling arc200 methods including balance
      const [
        nameResult,
        symbolResult,
        decimalsResult,
        totalSupplyResult,
        balanceResult,
      ] = await Promise.all([
        ci.arc200_name(),
        ci.arc200_symbol(),
        ci.arc200_decimals(),
        ci.arc200_totalSupply(),
        ci.arc200_balanceOf(activeAccount.address),
      ]);

      console.log({
        nameResult,
        symbolResult,
        decimalsResult,
        totalSupplyResult,
        balanceResult,
      });

      // Check if all calls were successful
      const isVerified =
        nameResult.success &&
        symbolResult.success &&
        decimalsResult.success &&
        totalSupplyResult.success &&
        balanceResult.success;

      if (isVerified) {
        // Compare indexer balance with on-chain balance
        const indexerBalance =
          balances.find((b) => b.contractId === contractId)?.balance || "0";
        const onChainBalance = balanceResult.returnValue.toString();
        const decimals = Number(decimalsResult.returnValue);

        // Format balances for comparison (remove decimals for comparison)
        const indexerBalanceFormatted = new BigNumber(indexerBalance)
          .dividedBy(new BigNumber(10).pow(decimals))
          .toFixed(decimals);
        const onChainBalanceFormatted = new BigNumber(onChainBalance)
          .dividedBy(new BigNumber(10).pow(decimals))
          .toFixed(decimals);

        const balanceMatches =
          indexerBalanceFormatted === onChainBalanceFormatted;

        // Store verification details
        setVerificationDetails((prev) => ({
          ...prev,
          [contractId]: {
            balanceMatches,
            onChainBalance: onChainBalanceFormatted,
            indexerBalance: indexerBalanceFormatted,
          },
        }));

        setVerificationStates((prev) => ({
          ...prev,
          [contractId]: "verified",
        }));

        if (balanceMatches) {
          setToast({
            open: true,
            message: `Token ${contractId} verified successfully! Balance matches on-chain data.`,
            severity: "success",
          });
        } else {
          setToast({
            open: true,
            message: `Token ${contractId} verified but balance mismatch detected!`,
            severity: "error",
          });
        }
      } else {
        setVerificationStates((prev) => ({ ...prev, [contractId]: "failed" }));
        setToast({
          open: true,
          message: `Token ${contractId} verification failed`,
          severity: "error",
        });
      }
    } catch (error) {
      console.error(`Error verifying token ${contractId}:`, error);
      setVerificationStates((prev) => ({ ...prev, [contractId]: "failed" }));
      setToast({
        open: true,
        message: `Failed to verify token ${contractId}`,
        severity: "error",
      });
    }
  };

  // Filter balances based on search query
  const filteredBalances = balances.filter((balance) => {
    if (!searchQuery.trim()) return true;

    const token = tokenInfo[balance.contractId];
    const query = searchQuery.toLowerCase();

    return (
      balance.contractId.toString().includes(query) ||
      (token?.name && token.name.toLowerCase().includes(query)) ||
      (token?.symbol && token.symbol.toLowerCase().includes(query)) ||
      (token?.creator && token.creator.toLowerCase().includes(query))
    );
  });

  const handleCheckBalances = async () => {
    const cleanAddress = address.trim();

    if (!cleanAddress) {
      setToast({
        open: true,
        message: "Please enter a wallet address",
        severity: "error",
      });
      return;
    }

    setIsLoading(true);
    setError(null);
    setBalances([]);
    setTokenInfo({});
    setSearchQuery("");
    setVerificationStates({});
    setVerificationDetails({});

    try {
      // Fetch ARC200 balances
      const balancesResponse = await fetch(
        `${MIMIR_API}/arc200/balances?accountId=${cleanAddress}`
      );

      if (!balancesResponse.ok) {
        throw new Error("Failed to fetch ARC200 balances");
      }

      const balancesData: BalanceResponse = await balancesResponse.json();

      // Filter out zero balances
      const nonZeroBalances = balancesData.balances.filter(
        (balance) => balance.balance !== "0"
      );

      setBalances(nonZeroBalances);

      // Fetch token information for each balance
      const tokenInfoPromises = nonZeroBalances.map(async (balance) => {
        try {
          const tokenResponse = await fetch(
            `${MIMIR_API}/arc200/tokens?includes=all&contractId=${balance.contractId}`
          );

          if (!tokenResponse.ok) {
            return null;
          }

          const tokenData: TokenInfoResponse = await tokenResponse.json();
          return tokenData.tokens[0] || null;
        } catch (error) {
          console.error(
            `Failed to fetch token info for contract ${balance.contractId}:`,
            error
          );
          return null;
        }
      });

      const tokenInfoResults = await Promise.all(tokenInfoPromises);
      const tokenInfoMap: Record<number, TokenInfo> = {};

      tokenInfoResults.forEach((token) => {
        if (token) {
          tokenInfoMap[token.contractId] = token;
        }
      });

      setTokenInfo(tokenInfoMap);

      if (nonZeroBalances.length === 0) {
        setToast({
          open: true,
          message: "No ARC200 token balances found for this address",
          severity: "success",
        });
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "An error occurred";
      setError(errorMessage);
      setToast({
        open: true,
        message: errorMessage,
        severity: "error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Container>
      <Title>ARC200 Balance Checker</Title>
      <Subtitle>Check ARC200 token balances for any wallet address</Subtitle>

      <InputGroup>
        <Input
          type="text"
          placeholder="Enter wallet address"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          aria-label="Wallet address input"
        />
        {activeAccount && (
          <WalletButton onClick={handleUseActiveWallet}>
            Use Active Wallet
          </WalletButton>
        )}
      </InputGroup>

      <Button
        onClick={handleCheckBalances}
        disabled={isLoading || !address.trim()}
        aria-label="Check ARC200 balances"
      >
        {isLoading ? "Checking..." : "Check Balances"}
      </Button>

      {!isLoading && !error && balances.length > 0 && (
        <SearchContainer>
          <SearchInput
            type="text"
            placeholder="Search tokens by name, symbol, contract ID, or creator..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Search tokens"
          />
        </SearchContainer>
      )}

      {isLoading && <LoadingSpinner>Loading ARC200 balances...</LoadingSpinner>}

      {error && (
        <ResultsContainer>
          <div style={{ color: "var(--error-color)", textAlign: "center" }}>
            Error: {error}
          </div>
        </ResultsContainer>
      )}

      {!isLoading && !error && balances.length > 0 && (
        <ResultsContainer>
          <h3
            style={{
              marginTop: 0,
              marginBottom: "1rem",
              color: "var(--text-primary)",
            }}
          >
            ARC200 Token Balances ({balances.length})
          </h3>

          {searchQuery && (
            <SearchResultsInfo>
              Showing {filteredBalances.length} of {balances.length} tokens
              {filteredBalances.length === 0 && " - No matches found"}
            </SearchResultsInfo>
          )}

          {filteredBalances.length > 0 ? (
            filteredBalances.map((balance) => {
              const token = tokenInfo[balance.contractId];
              const formattedBalance = token
                ? formatBalance(balance.balance, token.decimals)
                : balance.balance;

              return (
                <TokenCard key={balance.contractId}>
                  <TokenHeader>
                    <TokenName>
                      {token?.name || `Contract ${balance.contractId}`}
                    </TokenName>
                    {token?.symbol && <TokenSymbol>{token.symbol}</TokenSymbol>}
                  </TokenHeader>

                  <BalanceAmount>{formattedBalance}</BalanceAmount>

                  <TokenDetails>
                    <div>
                      <strong>Contract ID:</strong> {balance.contractId}
                    </div>
                    {token?.tokenId && (
                      <div>
                        <strong>Token ID:</strong> {token.tokenId}
                      </div>
                    )}
                    {token?.decimals && (
                      <div>
                        <strong>Decimals:</strong> {token.decimals}
                      </div>
                    )}
                    {token?.creator && (
                      <div>
                        <strong>Creator:</strong> {token.creator}
                      </div>
                    )}
                    {token?.mintRound && (
                      <div>
                        <strong>Mint Round:</strong> {token.mintRound}
                      </div>
                    )}
                  </TokenDetails>

                  <VerifyButton
                    onClick={() => verifyToken(balance.contractId)}
                    disabled={
                      verificationStates[balance.contractId] === "verifying"
                    }
                  >
                    {verificationStates[balance.contractId] === "verifying"
                      ? "Verifying..."
                      : verificationStates[balance.contractId] === "verified"
                      ? "✓ Verified"
                      : verificationStates[balance.contractId] === "failed"
                      ? "✗ Failed"
                      : "Verify Token"}
                  </VerifyButton>

                  {verificationStates[balance.contractId] &&
                    verificationStates[balance.contractId] !== "idle" && (
                      <VerificationStatus
                        status={
                          verificationStates[balance.contractId] as
                            | "verified"
                            | "failed"
                            | "verifying"
                        }
                      >
                        {verificationStates[balance.contractId] ===
                          "verifying" && "Verifying token on-chain..."}
                        {verificationStates[balance.contractId] ===
                          "verified" && (
                          <>
                            Token verified successfully!
                            {verificationDetails[balance.contractId] && (
                              <div
                                style={{
                                  marginTop: "0.5rem",
                                  fontSize: "0.8rem",
                                }}
                              >
                                {verificationDetails[balance.contractId]
                                  .balanceMatches ? (
                                  <span style={{ color: "#155724" }}>
                                    ✓ Balance matches on-chain
                                  </span>
                                ) : (
                                  <div>
                                    <div style={{ color: "#721c24" }}>
                                      ⚠ Balance mismatch detected
                                    </div>
                                    <div
                                      style={{
                                        fontSize: "0.7rem",
                                        marginTop: "0.25rem",
                                      }}
                                    >
                                      Indexer:{" "}
                                      {
                                        verificationDetails[balance.contractId]
                                          .indexerBalance
                                      }
                                      <br />
                                      On-chain:{" "}
                                      {
                                        verificationDetails[balance.contractId]
                                          .onChainBalance
                                      }
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </>
                        )}
                        {verificationStates[balance.contractId] === "failed" &&
                          "Token verification failed"}
                      </VerificationStatus>
                    )}
                </TokenCard>
              );
            })
          ) : searchQuery ? (
            <NoResultsState>
              No tokens match your search criteria. Try a different search term.
            </NoResultsState>
          ) : null}
        </ResultsContainer>
      )}

      {!isLoading && !error && balances.length === 0 && address && (
        <EmptyState>
          No ARC200 token balances found for this address.
        </EmptyState>
      )}

      <Snackbar
        open={toast.open}
        autoHideDuration={5000}
        onClose={handleCloseToast}
      >
        <Alert severity={toast.severity} onClose={handleCloseToast}>
          {toast.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default Arc200BalanceChecker;
