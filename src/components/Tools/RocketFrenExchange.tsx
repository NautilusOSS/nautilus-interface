import { useWallet } from "@txnlab/use-wallet-react";
import algosdk from "algosdk";
import BigNumber from "bignumber.js";
import React, { useState, useEffect, useCallback, act } from "react";
import styled from "styled-components";
import { CONTRACT, abi } from "ulujs";
import { toast } from "react-toastify";
import { MIMIR_API } from "@/config/arc72-idx";
import { getAlgorandClients } from "@/wallets";

// Contract IDs - Update these with actual ROCKET and FREN contract IDs
const ROCKET_CONTRACT_ID = 401384; // ROCKET contract ID
const FREN_CONTRACT_ID = 419385; // FREN contract ID
const EXCHANGE_RATE = 80000; // 80k:1 rate (80,000 ROCKET = 1 FREN)
const EXCHANGE_CONTRACT_ID = 48498647; // Exchange contract ID
const SPECIAL_ACCOUNT_ADDRESS = "FPY4KD56PCABYDMNN426FBJJUOGCFYD4VPKTVK2OZUC3SNTBSVHGXCRVZI";

const Container = styled.div`
  max-width: 600px;
  margin: 0 auto;
  padding: 2rem;
`;

const Card = styled.div`
  background: var(--background-secondary);
  border-radius: 16px;
  padding: 2rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
`;

const Title = styled.h2`
  text-align: center;
  margin-bottom: 0.5rem;
  color: var(--text-primary);
  font-size: 1.75rem;
`;

const Subtitle = styled.p`
  text-align: center;
  color: var(--text-secondary);
  margin-bottom: 2rem;
  font-size: 0.9rem;
`;

const SwapContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const InputGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const Label = styled.label`
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--text-secondary);
`;

const InputWrapper = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  background: var(--background-tertiary);
  border: 2px solid var(--border-color);
  border-radius: 12px;
  padding: 1rem;
  transition: border-color 0.2s;

  &:focus-within {
    border-color: var(--primary-color);
  }
`;

const TokenInput = styled.input`
  flex: 1;
  border: none;
  background: transparent;
  color: var(--text-primary);
  font-size: 1.25rem;
  font-weight: 600;
  outline: none;

  &::placeholder {
    color: var(--text-secondary);
    opacity: 0.5;
  }
`;

const TokenLabel = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: var(--background-primary);
  border-radius: 8px;
  font-weight: 600;
  color: var(--text-primary);
  font-size: 0.875rem;
`;

const BalanceText = styled.div`
  font-size: 0.75rem;
  color: var(--text-secondary);
  margin-top: 0.25rem;
  display: flex;
  justify-content: space-between;
`;

const SwapButton = styled.button`
  width: 100%;
  padding: 1rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
  margin-top: 1rem;

  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const SwapArrow = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  margin: -0.5rem 0;
  z-index: 1;

  svg {
    width: 24px;
    height: 24px;
    color: var(--text-secondary);
    background: var(--background-secondary);
    padding: 0.5rem;
    border-radius: 50%;
    border: 2px solid var(--border-color);
  }
`;

const ErrorText = styled.div`
  color: #ef4444;
  font-size: 0.875rem;
  margin-top: 0.5rem;
  text-align: center;
`;

const ExchangeRateInfo = styled.div`
  text-align: center;
  padding: 1rem;
  background: var(--background-tertiary);
  border-radius: 8px;
  margin-bottom: 1rem;
  font-size: 0.875rem;
  color: var(--text-secondary);
`;

const RocketFrenExchange: React.FC = () => {
  const { activeAccount, signTransactions } = useWallet();
  const [rocketAmount, setRocketAmount] = useState<string>("");
  const [frenAmount, setFrenAmount] = useState<string>("");
  const [rocketBalance, setRocketBalance] = useState<string>("0");
  const [frenBalance, setFrenBalance] = useState<string>("0");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isApproving, setIsApproving] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [rocketDecimals, setRocketDecimals] = useState<number>(6);
  const [frenDecimals, setFrenDecimals] = useState<number>(6);

  // Fetch balances directly from contracts using CONTRACT class
  const fetchBalances = useCallback(async () => {
    if (!activeAccount) {
      setRocketBalance("0");
      setFrenBalance("0");
      return;
    }

    try {
      const { algodClient } = getAlgorandClients();
      // Fetch ROCKET balance directly from contract
      try {
        const rocketCi = new CONTRACT(
          ROCKET_CONTRACT_ID,
          algodClient,
          undefined,
          abi.nt200,
          { addr: activeAccount.address, sk: new Uint8Array() }
        );

        const decimalsR = await rocketCi.arc200_decimals();
        const balanceR = await rocketCi.arc200_balanceOf(activeAccount.address);

        if (decimalsR.success && balanceR.success) {
          const decimals = Number(decimalsR.returnValue);
          const balance = balanceR.returnValue;

          setRocketDecimals(decimals);

          const formattedBalance = new BigNumber(balance.toString())
            .div(new BigNumber(10).pow(decimals))
            .toFixed(6)

          setRocketBalance(formattedBalance);
        } else {
          setRocketBalance("0");
        }
      } catch (error) {
        console.error("Error fetching ROCKET balance:", error);
        setRocketBalance("0");
      }

      // Fetch FREN balance directly from contract
      try {
        const frenCi = new CONTRACT(
          FREN_CONTRACT_ID,
          algodClient,
          undefined,
          abi.arc200,
          { addr: activeAccount.address, sk: new Uint8Array() }
        );

        // Fetch decimals and balance in parallel
        const [decimalsR, balanceR] = await Promise.all([
          frenCi.arc200_decimals(),
          frenCi.arc200_balanceOf(activeAccount.address),
        ]);

        if (decimalsR.success && balanceR.success) {
          const decimals = Number(decimalsR.returnValue);
          const balance = balanceR.returnValue;

          setFrenDecimals(decimals);

          const formattedBalance = new BigNumber(balance.toString())
            .div(new BigNumber(10).pow(decimals))
            .toString();

          setFrenBalance(formattedBalance);
        } else {
          setFrenBalance("0");
        }
      } catch (error) {
        console.error("Error fetching FREN balance:", error);
        setFrenBalance("0");
      }
    } catch (error) {
      console.error("Error fetching balances:", error);
      setRocketBalance("0");
      setFrenBalance("0");
    }
  }, [activeAccount]);

  useEffect(() => {
    if (activeAccount) {
      fetchBalances();
    } else {
      setRocketBalance("0");
      setFrenBalance("0");
    }
  }, [activeAccount?.address]);

  // Calculate FREN amount when ROCKET amount changes
  useEffect(() => {
    if (rocketAmount && parseFloat(rocketAmount) > 0) {
      const fren = new BigNumber(rocketAmount)
        .div(EXCHANGE_RATE)
        .toFixed(frenDecimals);
      setFrenAmount(fren);
    } else {
      setFrenAmount("");
    }
  }, [rocketAmount, frenDecimals]);

  const handleRocketAmountChange = (value: string) => {
    // Only allow numbers and decimal point
    if (value === "" || /^\d*\.?\d*$/.test(value)) {
      setRocketAmount(value);

      // Validate increment of 80000
      if (value && parseFloat(value) > 0) {
        const amount = new BigNumber(value);
        const remainder = amount.mod(EXCHANGE_RATE);
        // Check if remainder is effectively zero (accounting for floating point precision)
        if (!remainder.isZero() && remainder.abs().isGreaterThan(new BigNumber(0.000001))) {
          setError(`Amount must be in increments of ${EXCHANGE_RATE.toLocaleString()} ROCKET`);
        } else {
          setError("");
        }
      } else {
        setError("");
      }
    }
  };

  const handleMaxClick = () => {
    const balance = new BigNumber(rocketBalance);
    // Round down to nearest multiple of EXCHANGE_RATE
    const maxAmount = balance.div(EXCHANGE_RATE).integerValue(BigNumber.ROUND_DOWN).times(EXCHANGE_RATE);
    setRocketAmount(maxAmount.toString());
    setError("");
  };

  const handleApprove25kFren = async () => {
    if (!activeAccount) {
      setError("Please connect your wallet");
      toast.error("Please connect your wallet");
      return;
    }
    setIsApproving(true);
    setError("");
    try {
      const { algodClient } = getAlgorandClients();
      const amount25kAtomic = BigInt(
        new BigNumber(25000).times(10 ** frenDecimals).toFixed(0)
      );
      const frenCi = new CONTRACT(
        FREN_CONTRACT_ID,
        algodClient,
        undefined,
        abi.nt200,
        { addr: activeAccount.address, sk: new Uint8Array() }
      );
      frenCi.setFee(2000);
      const approveR = await frenCi.arc200_approve(
        algosdk.getApplicationAddress(EXCHANGE_CONTRACT_ID),
        amount25kAtomic
      );
      if (!approveR.success) {
        throw new Error("Failed to approve 25k FREN");
      }
      const stxns = await signTransactions(
        approveR.txns.map(
          (txn: string) => new Uint8Array(Buffer.from(txn, "base64"))
        )
      );
      const { txId } = await algodClient
        .sendRawTransaction(stxns as Uint8Array[])
        .do();
      await algosdk.waitForConfirmation(algodClient, txId, 4);
      toast.success("Approved 25,000 FREN for exchange");
      await fetchBalances();
    } catch (err) {
      console.error("Approve 25k FREN error:", err);
      const message = err instanceof Error ? err.message : "Approve failed";
      setError(message);
      toast.error(message);
    } finally {
      setIsApproving(false);
    }
  };

  const handleSwap = async () => {
    if (!activeAccount) {
      setError("Please connect your wallet");
      toast.error("Please connect your wallet");
      return;
    }

    if (!rocketAmount || parseFloat(rocketAmount) <= 0) {
      setError("Please enter a valid amount");
      return;
    }

    const rocketAmountNum = parseFloat(rocketAmount);
    const userBalance = parseFloat(rocketBalance);

    // Validate increment of 80000 using BigNumber for precision
    const amount = new BigNumber(rocketAmount);
    const remainder = amount.mod(EXCHANGE_RATE);
    if (!remainder.isZero() && remainder.abs().isGreaterThan(new BigNumber(0.000001))) {
      setError(`Amount must be in increments of ${EXCHANGE_RATE.toLocaleString()} ROCKET`);
      toast.error(`Amount must be in increments of ${EXCHANGE_RATE.toLocaleString()} ROCKET`);
      return;
    }

    if (rocketAmountNum > userBalance) {
      setError(`Insufficient ROCKET balance. You have ${rocketBalance} ROCKET`);
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const { algodClient } = getAlgorandClients();

      // Calculate FREN amount
      const frenAmountNum = new BigNumber(rocketAmount)
        .div(EXCHANGE_RATE)
        .toFixed(frenDecimals);

      // Convert to atomic units
      const rocketAmountAtomic = BigInt(new BigNumber(rocketAmount)
        .times(10 ** rocketDecimals)
        .toFixed(0));


      const ci = new CONTRACT(
        EXCHANGE_CONTRACT_ID,
        algodClient,
        undefined,
        abi.custom,
        { addr: activeAccount.address, sk: new Uint8Array() }
      );

      const builder = {
        exchange: new CONTRACT(
          EXCHANGE_CONTRACT_ID,
          algodClient,
          undefined,
          {
            name: "exchange",
            desc: "exchange",
            methods: [
              {
                "name": "exchange",
                "args": [
                  {
                    "type": "uint256",
                    "name": "amount"
                  }
                ],
                "readonly": false,
                "returns": {
                  "type": "void"
                }
              },
            ],
            events: [],
          },
          { addr: activeAccount.address, sk: new Uint8Array() },
          true,
          false,
          true
        ),
        rocket: new CONTRACT(
          ROCKET_CONTRACT_ID,
          algodClient,
          undefined,
          abi.nt200,
          { addr: activeAccount.address, sk: new Uint8Array() },
          true,
          false,
          true
        ),
        fren: new CONTRACT(
          FREN_CONTRACT_ID,
          algodClient,
          undefined,
          abi.nt200,
          { addr: activeAccount.address, sk: new Uint8Array() },
          true,
          false,
          true
        ),
      };

      const buildN = [];

      {
        const txnO = (await builder.fren.arc200_transfer(activeAccount.address, 0)).obj;
        buildN.push({
          ...txnO,
          note: new TextEncoder().encode("transfer fren to self"),
          payment: 28500,
        });
      }

      {
        const txnO = (await builder.rocket.arc200_approve(algosdk.getApplicationAddress(EXCHANGE_CONTRACT_ID), rocketAmountAtomic)).obj;
        buildN.push({
          ...txnO,
          note: new TextEncoder().encode("approve rocket"),
          payment: 28501,
        });
      }

      {
        const txnO = (await builder.exchange.exchange(rocketAmountAtomic)).obj;
        buildN.push({
          ...txnO,
          note: new TextEncoder().encode("exchange"),
          payment: 1e6,
        });
      }

      ci.setExtraTxns(buildN);
      ci.setEnableGroupResourceSharing(true);
      ci.setFee(2000);
      const customR = await ci.custom();

      console.log({ customR });
      // Sign and send transaction
      const stxns = await signTransactions(
        customR.txns.map(
          (txn: string) => new Uint8Array(Buffer.from(txn, "base64"))
        )
      );

      const { txId } = await algodClient
        .sendRawTransaction(stxns as Uint8Array[])
        .do();

      await algosdk.waitForConfirmation(algodClient, txId, 4);

      // TODO: Call exchange contract to mint FREN tokens
      // This would typically be done through the exchange contract's swap method

      toast.success(`Successfully swapped ${rocketAmount} ROCKET for ${frenAmountNum} FREN!`);

      // Refresh balances
      await fetchBalances();

      // Clear inputs
      setRocketAmount("");
      setFrenAmount("");
    } catch (error) {
      console.error("Swap error:", error);
      const errorMessage = error instanceof Error ? error.message : "Swap failed";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const rocketAmountNum = rocketAmount ? parseFloat(rocketAmount) : 0;
  // Validate increment using BigNumber for precision
  const isValidIncrement = rocketAmountNum === 0 || (() => {
    const amount = new BigNumber(rocketAmount);
    const remainder = amount.mod(EXCHANGE_RATE);
    return remainder.isZero() || remainder.abs().isLessThanOrEqualTo(new BigNumber(0.000001));
  })();

  const isSwapDisabled =
    !activeAccount ||
    !rocketAmount ||
    rocketAmountNum <= 0 ||
    rocketAmountNum > parseFloat(rocketBalance) ||
    !isValidIncrement ||
    isLoading;

  return (
    <Container>
      <Card>
        <Title>Rocket Fren Exchange</Title>
        <Subtitle>Convert ROCKET to FREN at 80,000:1 rate</Subtitle>

        <ExchangeRateInfo>
          Exchange Rate: {EXCHANGE_RATE.toLocaleString()} ROCKET = 1 FREN
          <br />
          <span style={{ fontSize: "0.75rem", opacity: 0.8 }}>
            Amount must be in increments of {EXCHANGE_RATE.toLocaleString()} ROCKET
          </span>
        </ExchangeRateInfo>

        <SwapContainer>
          <InputGroup>
            <Label>You Pay</Label>
            <InputWrapper>
              <TokenInput
                type="text"
                value={rocketAmount}
                onChange={(e) => handleRocketAmountChange(e.target.value)}
                placeholder="0.0"
              />
              <TokenLabel>ROCKET</TokenLabel>
            </InputWrapper>
            <BalanceText>
              <span>Balance: {rocketBalance} ROCKET</span>
              <button
                onClick={handleMaxClick}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--primary-color)",
                  cursor: "pointer",
                  fontSize: "0.75rem",
                  textDecoration: "underline",
                }}
              >
                MAX
              </button>
            </BalanceText>
          </InputGroup>

          <SwapArrow>
            <svg
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 14l-7 7m0 0l-7-7m7 7V3"
              />
            </svg>
          </SwapArrow>

          <InputGroup>
            <Label>You Receive</Label>
            <InputWrapper>
              <TokenInput
                type="text"
                value={frenAmount}
                readOnly
                placeholder="0.0"
                style={{ cursor: "not-allowed" }}
              />
              <TokenLabel>FREN</TokenLabel>
            </InputWrapper>
            <BalanceText>
              <span>Balance: {frenBalance} FREN</span>
            </BalanceText>
          </InputGroup>

          {error && <ErrorText>{error}</ErrorText>}

          <SwapButton onClick={handleSwap} disabled={isSwapDisabled}>
            {isLoading ? "Swapping..." : "Swap"}
          </SwapButton>

          {activeAccount?.address === SPECIAL_ACCOUNT_ADDRESS && (
            <SwapButton
              type="button"
              onClick={handleApprove25kFren}
              disabled={isLoading || isApproving}
              style={{ marginTop: "0.5rem" }}
            >
              {isApproving ? "Approving..." : "Special Action (Approve 25k FREN)"}
            </SwapButton>
          )}
        </SwapContainer>
      </Card>
    </Container>
  );
};

export default RocketFrenExchange;
