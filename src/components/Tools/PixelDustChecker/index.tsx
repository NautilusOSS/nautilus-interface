import BigNumber from "bignumber.js";
import React, { useCallback, useEffect, useState } from "react";
import styled from "styled-components";
import { airdropAmounts } from "./airdrop";
import { useWallet } from "@txnlab/use-wallet-react";

const Container = styled.div`
  padding: 2rem;
  max-width: 800px;
  margin: 0 auto;
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

const Input = styled.input`
  flex: 1;
  padding: 1rem;
  border: 2px solid var(--border-color);
  border-radius: 8px;
  font-size: 1.1rem;
  transition: border-color 0.2s ease;

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
`;

const WalletButton = styled(Button)`
  width: auto;
  white-space: nowrap;
`;

const ResultContainer = styled.div`
  margin-top: 2rem;
  padding: 1.5rem;
  background: var(--background-secondary);
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);

  p {
    margin: 0.5rem 0;
    font-size: 1.1rem;
    line-height: 1.5;
  }
`;

// ... existing imports ...

interface Sale {
  round: number;
  price: number;
  nft_id: string;
  collection_id: number;
  collection_name: string;
  name: string;
  seller: string;
  buyer: string;
}

interface TokenBalance {
  contractId: number;
  tokenId: string;
  balance: string;
  decimals: number;
  symbol: string;
}

interface BalanceResponse {
  balances: TokenBalance[];
}

const ButtonGroup = styled.div`
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
`;

const PixelDustChecker: React.FC = () => {
  const { activeAccount } = useWallet();
  const [address, setAddress] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [sales, setSales] = useState<Sale[]>([]);
  const [tokenBalances, setTokenBalances] = useState<TokenBalance[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCheck = useCallback(() => {
    const cleanAddress = address.trim();

    if (!cleanAddress) {
      setResult("Please enter a wallet address");
      return;
    }

    // Find airdrop amount for the address
    const airdropEntry = airdropAmounts.find(
      (entry) => entry.Address === cleanAddress
    );
    const airdropAmount = airdropEntry?.AirdropAmount;

    // Get PXD balance
    const pxdBalance = new BigNumber(
      tokenBalances.find((token) => token.symbol === "PXD")?.balance || 0
    )
      .dividedBy(10 ** 8)
      .toNumber();

    let resultText = "";

    if (airdropAmount) {
      resultText +=
        `Airdrop amount: ${airdropAmount.toLocaleString()} $PXD\n` +
        `Current PXD balance: ${pxdBalance.toLocaleString()} PXD\n`;
    } else {
      resultText +=
        "This address is not eligible for the airdrop.\n" +
        `Current PXD balance: ${pxdBalance.toLocaleString()} PXD\n`;
    }

    setResult(resultText);
  }, [address, activeAccount]);

  const handleUseActiveWallet = () => {
    // TODO: Replace with actual wallet connection logic
    setAddress(activeAccount?.address || "");
  };

  useEffect(() => {
    if (activeAccount) {
      handleCheck();
    }
  }, [address, activeAccount]);

  return (
    <Container>
      <Title>Pixel Dust Checker</Title>
      <Subtitle>
        Check pixel dust balance and estimated airdrop for any address
      </Subtitle>

      <InputGroup>
        <Input
          type="text"
          placeholder="Enter wallet address"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
        />
        {activeAccount && (
          <WalletButton onClick={handleUseActiveWallet}>
            Use Active Wallet
          </WalletButton>
        )}
      </InputGroup>

      {isLoading ? (
        <p>Loading data...</p>
      ) : error ? (
        <p style={{ color: "var(--error-color)", textAlign: "center" }}>
          Error: {error}
        </p>
      ) : (
        <Button onClick={handleCheck} aria-label="Check Balance">
          Check Balance
        </Button>
      )}

      {result && (
        <ResultContainer>
          {result.split("\n").map((line, index) => (
            <p key={index}>{line}</p>
          ))}
        </ResultContainer>
      )}
    </Container>
  );
};

export default PixelDustChecker;
