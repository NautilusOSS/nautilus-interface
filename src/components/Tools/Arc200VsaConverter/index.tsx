import { useWallet } from "@txnlab/use-wallet-react";
import algosdk, { Algodv2 } from "algosdk";
import BigNumber from "bignumber.js";
import React, { useState, useEffect, useCallback } from "react";
import styled, { keyframes } from "styled-components";
import { CONTRACT, abi } from "ulujs";

// 8-bit Zelda-style animations
const triforceGlow = keyframes`
  0%, 100% { 
    filter: brightness(1) drop-shadow(0 0 5px #FFD700);
    transform: scale(1);
  }
  50% { 
    filter: brightness(1.3) drop-shadow(0 0 15px #FFD700);
    transform: scale(1.1);
  }
`;

const rupeeSparkle = keyframes`
  0%, 100% { 
    transform: scale(1) rotate(0deg);
    filter: brightness(1);
  }
  25% { 
    transform: scale(1.2) rotate(90deg);
    filter: brightness(1.5);
  }
  50% { 
    transform: scale(1.1) rotate(180deg);
    filter: brightness(1.2);
  }
  75% { 
    transform: scale(1.3) rotate(270deg);
    filter: brightness(1.8);
  }
`;

const heartBeat = keyframes`
  0%, 100% { 
    transform: scale(1);
    filter: brightness(1);
  }
  50% { 
    transform: scale(1.15);
    filter: brightness(1.4);
  }
`;

const magicPulse = keyframes`
  0%, 100% { 
    transform: scale(1);
    opacity: 1;
  }
  50% { 
    transform: scale(1.05);
    opacity: 0.8;
  }
`;

const Container = styled.div`
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem;
  background: 
    linear-gradient(180deg, #1a472a 0%, #2d5a3d 30%, #4a7c59 60%, #6b8e76 100%),
    repeating-linear-gradient(
      45deg,
      transparent,
      transparent 10px,
      rgba(34, 139, 34, 0.1) 10px,
      rgba(34, 139, 34, 0.1) 20px
    );
  border: 4px solid #228B22;
  border-radius: 0;
  box-shadow: 
    0 0 30px rgba(34, 139, 34, 0.6),
    inset 0 0 30px rgba(0, 0, 0, 0.3);
  position: relative;
  overflow: hidden;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 100%;
    background: 
      radial-gradient(circle at 20% 20%, rgba(255, 215, 0, 0.1) 0%, transparent 50%),
      radial-gradient(circle at 80% 80%, rgba(255, 215, 0, 0.1) 0%, transparent 50%);
    pointer-events: none;
  }
  
  &::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 20px;
    background: repeating-linear-gradient(
      90deg,
      #228B22,
      #228B22 8px,
      #32CD32 8px,
      #32CD32 16px
    );
  }
`;

const Title = styled.h2`
  font-family: 'Courier New', monospace;
  font-size: 2.5rem;
  color: #FFD700;
  text-align: center;
  margin-bottom: 1rem;
  text-shadow: 
    2px 2px 0px #000,
    4px 4px 0px #228B22;
  letter-spacing: 3px;
  position: relative;
  font-weight: bold;
  background: rgba(0, 0, 0, 0.8);
  padding: 1.5rem;
  border: 3px solid #FFD700;
  border-radius: 0;
  box-shadow: 
    0 0 20px rgba(255, 215, 0, 0.5),
    inset 0 0 20px rgba(255, 215, 0, 0.1);
  
  &::before {
    content: '🔶';
    position: absolute;
    left: -40px;
    top: 50%;
    transform: translateY(-50%);
    font-size: 2rem;
    animation: ${triforceGlow} 3s ease-in-out infinite;
  }
  
  &::after {
    content: '🔶';
    position: absolute;
    right: -40px;
    top: 50%;
    transform: translateY(-50%);
    font-size: 2rem;
    animation: ${triforceGlow} 3s ease-in-out infinite reverse;
  }
`;

const Subtitle = styled.p`
  font-family: 'Courier New', monospace;
  color: #FFD700;
  text-align: center;
  margin-bottom: 2rem;
  font-size: 1.1rem;
  text-shadow: 2px 2px 0px #000;
  font-weight: bold;
  background: rgba(0, 0, 0, 0.7);
  padding: 0.5rem 1rem;
  border: 2px solid #228B22;
  border-radius: 0;
`;

const InputGroup = styled.div`
  margin-bottom: 2rem;
  position: relative;
  background: rgba(0, 0, 0, 0.8);
  padding: 1.5rem;
  border: 3px solid #228B22;
  border-radius: 0;
  box-shadow: 
    0 0 20px rgba(34, 139, 34, 0.4),
    inset 0 0 20px rgba(0, 0, 0, 0.3);
  
  &::before {
    content: '💎';
    position: absolute;
    left: -30px;
    top: 50%;
    transform: translateY(-50%);
    font-size: 1.5rem;
    animation: ${rupeeSparkle} 2s ease-in-out infinite;
  }
`;

const ContractPrefixContainer = styled.div`
  display: flex;
  gap: 1rem;
  align-items: center;
  margin-bottom: 1rem;
`;

const ContractPrefixButton = styled.button`
  background: linear-gradient(45deg, #FFD700, #FFA500);
  color: #000;
  border: 2px solid #228B22;
  border-radius: 0;
  padding: 0.5rem 1rem;
  font-family: 'Courier New', monospace;
  font-size: 0.9rem;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s ease;
  text-transform: uppercase;
  letter-spacing: 1px;
  text-shadow: 1px 1px 0px #FFF;
  box-shadow: 
    0 2px 0 #228B22,
    0 0 10px rgba(255, 215, 0, 0.3);
  white-space: nowrap;
  
  &:hover {
    transform: translateY(-1px);
    box-shadow: 
      0 3px 0 #228B22,
      0 0 15px rgba(255, 215, 0, 0.5);
  }

  &:active {
    transform: translateY(0);
    box-shadow: 
      0 1px 0 #228B22,
      0 0 10px rgba(255, 215, 0, 0.3);
  }
`;

const Label = styled.label`
  display: block;
  margin-bottom: 0.8rem;
  font-family: 'Courier New', monospace;
  font-weight: bold;
  color: #FFD700;
  font-size: 1.1rem;
  text-transform: uppercase;
  letter-spacing: 1px;
  text-shadow: 1px 1px 0px #000;
`;

const Input = styled.input`
  width: 100%;
  padding: 1rem;
  border: 3px solid #228B22;
  border-radius: 0;
  background: #000;
  color: #FFD700;
  font-family: 'Courier New', monospace;
  font-size: 1.1rem;
  font-weight: bold;
  box-shadow: 
    inset 0 0 10px rgba(34, 139, 34, 0.3),
    0 0 10px rgba(34, 139, 34, 0.2);
  transition: all 0.3s ease;

  &:focus {
    outline: none;
    border-color: #FFD700;
    box-shadow: 
      inset 0 0 15px rgba(255, 215, 0, 0.4),
      0 0 20px rgba(255, 215, 0, 0.6);
    background: #0a0a0a;
  }

  &::placeholder {
    color: #228B22;
    font-style: italic;
  }
`;

const Select = styled.select`
  width: 100%;
  padding: 1rem;
  border: 2px solid #00ff41;
  border-radius: 0;
  background: #000;
  color: #00ff41;
  font-family: 'Courier New', monospace;
  font-size: 1.1rem;
  box-shadow: 
    inset 0 0 10px rgba(0, 255, 65, 0.2),
    0 0 10px rgba(0, 255, 65, 0.3);
  cursor: pointer;
  
  &:focus {
    outline: none;
    border-color: #00ffff;
    box-shadow: 
      inset 0 0 15px rgba(0, 255, 255, 0.3),
      0 0 20px rgba(0, 255, 255, 0.5);
  }
  
  option {
    background: #000;
    color: #00ff41;
  }
`;

const InputWithMax = styled.div`
  display: flex;
  gap: 1rem;
  align-items: center;
`;

const MaxButton = styled.button`
  background: linear-gradient(45deg, #FFD700, #FFA500);
  color: #000;
  border: 3px solid #228B22;
  border-radius: 0;
  padding: 1rem 1.5rem;
  font-family: 'Courier New', monospace;
  font-size: 1rem;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s ease;
  text-transform: uppercase;
  letter-spacing: 1px;
  text-shadow: 1px 1px 0px #FFF;
  box-shadow: 
    0 4px 0 #228B22,
    0 0 15px rgba(255, 215, 0, 0.5);
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 
      0 6px 0 #228B22,
      0 0 25px rgba(255, 215, 0, 0.8);
  }

  &:active {
    transform: translateY(0);
    box-shadow: 
      0 2px 0 #228B22,
      0 0 15px rgba(255, 215, 0, 0.5);
  }

  &:disabled {
    background: #4a4a4a;
    border-color: #666;
    color: #999;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }
`;

const ConvertButton = styled.button`
  background: linear-gradient(45deg, #228B22, #32CD32);
  color: #FFD700;
  border: 4px solid #FFD700;
  border-radius: 0;
  padding: 1.5rem 3rem;
  font-family: 'Courier New', monospace;
  font-size: 1.3rem;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s ease;
  text-transform: uppercase;
  letter-spacing: 2px;
  text-shadow: 2px 2px 0px #000;
  box-shadow: 
    0 6px 0 #006400,
    0 0 25px rgba(34, 139, 34, 0.6);
  width: 100%;
  margin-top: 1rem;
  position: relative;
  
  &::before {
    content: '❤️';
    position: absolute;
    left: 20px;
    top: 50%;
    transform: translateY(-50%);
    font-size: 1.5rem;
    animation: ${heartBeat} 1.5s ease-in-out infinite;
  }
  
  &:hover {
    transform: translateY(-3px);
    box-shadow: 
      0 9px 0 #006400,
      0 0 35px rgba(34, 139, 34, 0.9);
  }

  &:active {
    transform: translateY(-1px);
    box-shadow: 
      0 3px 0 #006400,
      0 0 25px rgba(34, 139, 34, 0.6);
  }

  &:disabled {
    background: #4a4a4a;
    border-color: #666;
    color: #999;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }
`;

const Result = styled.div`
  margin-top: 2rem;
  padding: 1.5rem;
  background: rgba(0, 0, 0, 0.8);
  border: 3px solid #32CD32;
  border-radius: 0;
  word-break: break-all;
  font-family: 'Courier New', monospace;
  position: relative;
  overflow: hidden;
  box-shadow: 
    0 0 20px rgba(50, 205, 50, 0.4),
    inset 0 0 20px rgba(0, 0, 0, 0.3);
  
  &::before {
    content: '💎';
    position: absolute;
    right: 20px;
    top: 20px;
    font-size: 2rem;
    animation: ${rupeeSparkle} 2s ease-in-out infinite;
  }
`;

const ErrorResult = styled(Result)`
  border-color: #FF4500;
  background: rgba(139, 0, 0, 0.3);
  color: #FFD700;
  box-shadow: 
    0 0 20px rgba(255, 69, 0, 0.4),
    inset 0 0 20px rgba(139, 0, 0, 0.3);
  
  &::before {
    content: '💀';
    animation: ${magicPulse} 1s ease-in-out infinite;
  }
`;

const BalanceDisplay = styled.div`
  background: rgba(0, 0, 0, 0.8);
  border: 3px solid #4169E1;
  padding: 1.5rem;
  border-radius: 0;
  margin-bottom: 2rem;
  position: relative;
  overflow: hidden;
  box-shadow: 
    0 0 20px rgba(65, 105, 225, 0.4),
    inset 0 0 20px rgba(0, 0, 0, 0.3);
  
  &::before {
    content: '🔶';
    position: absolute;
    right: 20px;
    top: 20px;
    font-size: 2rem;
    animation: ${triforceGlow} 3s ease-in-out infinite;
  }
`;

const BalanceItem = styled.div`
  display: flex;
  justify-content: space-between;
  margin-bottom: 1rem;
  font-family: 'Courier New', monospace;
  color: #4169E1;
  text-shadow: 1px 1px 0px #000;
  
  &:last-child {
    margin-bottom: 0;
  }
  
  span:first-child {
    color: #FFD700;
    font-weight: bold;
  }
  
  span:last-child {
    color: #32CD32;
    font-weight: bold;
  }
`;

const DirectionToggle = styled.div`
  display: flex;
  gap: 1rem;
  margin-bottom: 2rem;
`;

const DirectionButton = styled.button<{ active: boolean }>`
  flex: 1;
  padding: 1rem;
  border: 3px solid ${props => props.active ? '#FFD700' : '#228B22'};
  background: ${props => props.active ? 'rgba(255, 215, 0, 0.2)' : 'rgba(0, 0, 0, 0.8)'};
  color: ${props => props.active ? '#FFD700' : '#228B22'};
  font-family: 'Courier New', monospace;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s ease;
  text-transform: uppercase;
  letter-spacing: 1px;
  box-shadow: ${props => props.active 
    ? '0 4px 0 #FFD700, 0 0 20px rgba(255, 215, 0, 0.5)' 
    : '0 4px 0 #228B22, 0 0 10px rgba(34, 139, 34, 0.3)'
  };
  
  &:hover {
    border-color: #FFD700;
    background: rgba(255, 215, 0, 0.2);
    box-shadow: 0 4px 0 #FFD700, 0 0 20px rgba(255, 215, 0, 0.5);
  }
  
  &::before {
    content: '💎';
    margin-right: 10px;
    animation: ${props => props.active ? rupeeSparkle : magicPulse} 1s ease-in-out infinite;
  }
`;

const LoadingSpinner = styled.div`
  display: inline-block;
  width: 20px;
  height: 20px;
  border: 3px solid #FFD700;
  border-radius: 50%;
  border-top-color: transparent;
  animation: spin 1s ease-in-out infinite;
  
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;

const arc200ExchangeABI = {
  name: "arc200",
  description: "ARC200",
  methods: [
    ...abi.arc200.methods,
    {
      name: "arc200_exchange",
      args: [],
      readonly: false,
      returns: {
        type: "(uint64,address)",
      },
      desc: "ARC-200 exchange info (external)",
    },
    {
      name: "arc200_redeem",
      args: [
        {
          type: "uint64",
          name: "amount",
          desc: "amount of ASA to redeem",
        },
      ],
      readonly: false,
      returns: {
        type: "void",
        desc: "None",
      },
      desc: "Redeem ASA for ARC-200",
    },
    {
      name: "arc200_swapBack",
      args: [
        {
          type: "uint64",
          name: "amount",
          desc: "amount of ARC-200 to swap back",
        },
      ],
      readonly: false,
      returns: {
        type: "void",
        desc: "None",
      },
      desc: "Swap ARC-200 back to ASA",
    },
  ],
  events: [],
};

const Arc200VsaConverter: React.FC = () => {
  const { algodClient, activeAccount, signTransactions } = useWallet();
  const [arc200Amount, setArc200Amount] = useState<string>("");
  const [vsaAmount, setVsaAmount] = useState<string>("");
  const [direction, setDirection] = useState<"arc200ToVsa" | "vsaToArc200">(
    "arc200ToVsa"
  );
  const [contractId, setContractId] = useState<string>("");
  const [arc200Balance, setArc200Balance] = useState<string>("");
  const [vsaBalance, setVsaBalance] = useState<string>("");
  const [isConverting, setIsConverting] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [validationError, setValidationError] = useState<string>("");
  const [exchangeInfo, setExchangeInfo] = useState<{
    assetId: number;
    sinkAddress: string;
    reserve: string;
  } | null>(null);

  console.log({ exchangeInfo });

  useEffect(() => {
    const fetchExchangeInfo = async () => {
      if (!contractId || !activeAccount) {
        setExchangeInfo(null);
        setArc200Balance("");
        setVsaBalance("");
        return;
      }

      try {
        setError("");
        const ci = new CONTRACT(
          Number(contractId),
          algodClient,
          undefined,
          arc200ExchangeABI,
          { addr: activeAccount.address, sk: new Uint8Array() }
        );

        // Get exchange info using arc200_exchange method
        const exchangeR = await ci.arc200_exchange();
        if (!exchangeR.success) {
          throw new Error("Failed to fetch exchange info");
        }

        // Parse the return value (uint64,address)
        const [assetId, sinkAddress] = exchangeR.returnValue;
        
        // Fetch the reserve (application account balance)
        const reserve = await fetchReserve(algodClient, Number(contractId), Number(assetId));
        
        setExchangeInfo({ 
          assetId: Number(assetId), 
          sinkAddress,
          reserve 
        });

        // Fetch balances using the determined asset ID
        const arc200Result = await fetchArc200Balance(
          algodClient,
          contractId,
          activeAccount.address
        );
        const vsaResult = await fetchVsaBalance(
          algodClient,
          contractId,
          activeAccount.address,
          Number(assetId)
        );

        setArc200Balance(arc200Result);
        setVsaBalance(vsaResult);
      } catch (error) {
        console.error("Error fetching exchange info:", error);
        setError(
          "Failed to fetch exchange info. Please check the contract ID."
        );
        setExchangeInfo(null);
      }
    };

    fetchExchangeInfo();
  }, [contractId, activeAccount, algodClient]);

  const handleConvert = useCallback(async () => {
    if (!activeAccount || !contractId || !exchangeInfo) {
      setError("Please connect your wallet and enter a valid contract ID");
      return;
    }

    const amount = direction === "arc200ToVsa" ? arc200Amount : vsaAmount;
    if (!amount || parseFloat(amount) <= 0) {
      setError("Please enter a valid amount");
      return;
    }

    setIsConverting(true);
    setError("");

    try {
      if (direction === "arc200ToVsa") {
        // Convert ARC200 to VSA
        const ci = new CONTRACT(
          Number(contractId),
          algodClient,
          undefined,
          arc200ExchangeABI,
          { addr: activeAccount.address, sk: new Uint8Array() }
        );

        const decimalsR = await ci.arc200_decimals();
        if (!decimalsR.success) {
          throw new Error("Failed to fetch ARC200 decimals");
        }
        const decimals = Number(decimalsR.returnValue);

        ci.setFee(2000);
        const amountBigInt = BigInt(
          new BigNumber(arc200Amount).times(10 ** decimals).toFixed()
        );

        // Use the deposit method for ARC200 to VSA conversion
        const depositR = await ci.arc200_swapBack(amountBigInt);
        if (!depositR.success) {
          throw new Error("Failed to deposit ARC200 tokens");
        }

        const stxns = await signTransactions(
          depositR.txns.map(
            (txn: string) => new Uint8Array(Buffer.from(txn, "base64"))
          )
        );

        const { txId } = await algodClient
          .sendRawTransaction(stxns as Uint8Array[])
          .do();

        await algosdk.waitForConfirmation(algodClient, txId, 4);
      } else {
        // Convert VSA to ARC200
        const ci = new CONTRACT(
          Number(contractId),
          algodClient,
          undefined,
          abi.custom,
          { addr: activeAccount.address, sk: new Uint8Array() }
        );
        const ciTok = new CONTRACT(
          Number(contractId),
          algodClient,
          undefined,
          abi.nt200,
          { addr: activeAccount.address, sk: new Uint8Array() }
        );
        const builder = {
          exchange: new CONTRACT(
            Number(contractId),
            algodClient,
            undefined,
            arc200ExchangeABI,
            { addr: activeAccount.address, sk: new Uint8Array() },
            true,
            false,
            true
          ),
        };
        const buildN = [];

        {
          const decimalsR = await ciTok.arc200_decimals();
          if (!decimalsR.success) {
            throw new Error("Failed to fetch ARC200 decimals");
          }
          const decimals = Number(decimalsR.returnValue);

          const amountBigInt = BigInt(
            new BigNumber(vsaAmount).times(10 ** decimals).toFixed()
          );

          // Use the withdraw method for VSA to ARC200 conversion
          const withdrawO = (await builder.exchange.arc200_redeem(amountBigInt))
            .obj;
          buildN.push({
            ...withdrawO,
            xaid: exchangeInfo.assetId,
            aamt: amountBigInt,
            note: new TextEncoder().encode("VSA to ARC200"),
          });
        }
        console.log({ buildN });
        ci.setFee(2000);
        ci.setEnableGroupResourceSharing(true);
        ci.setExtraTxns(buildN);
        const customR = await ci.custom();
        console.log({ customR });
        if (!customR.success) {
          throw new Error("Failed to withdraw VSA tokens");
        }
        const stxns = await signTransactions(
          customR.txns.map(
            (txn: string) => new Uint8Array(Buffer.from(txn, "base64"))
          )
        );

        const { txId } = await algodClient
          .sendRawTransaction(stxns as Uint8Array[])
          .do();

        await algosdk.waitForConfirmation(algodClient, txId, 4);
      }

      // Refresh balances after conversion
      const arc200Result = await fetchArc200Balance(
        algodClient,
        contractId,
        activeAccount.address
      );
      const vsaResult = await fetchVsaBalance(
        algodClient,
        contractId,
        activeAccount.address,
        exchangeInfo.assetId
      );
      setArc200Balance(arc200Result);
      setVsaBalance(vsaResult);

      // Clear input fields
      setArc200Amount("");
      setVsaAmount("");
    } catch (error) {
      console.error("Conversion error:", error);
      setError(error instanceof Error ? error.message : "Conversion failed");
    } finally {
      setIsConverting(false);
    }
  }, [
    contractId,
    activeAccount,
    direction,
    arc200Amount,
    vsaAmount,
    algodClient,
    signTransactions,
    exchangeInfo,
  ]);

  const validateArc200ToVsa = useCallback((amount: string) => {
    if (!amount || parseFloat(amount) <= 0) {
      setValidationError("Please enter a valid amount");
      return false;
    }

    const userBalance = parseFloat(arc200Balance || "0");
    const inputAmount = parseFloat(amount);
    const availableReserve = parseFloat(exchangeInfo?.reserve || "0");

    if (inputAmount > userBalance) {
      setValidationError(`Insufficient ARC200 balance. You have ${arc200Balance} ARC200`);
      return false;
    }

    if (inputAmount > availableReserve) {
      setValidationError(`Insufficient reserve. Only ${exchangeInfo?.reserve} ARC200 can be converted to VSA`);
      return false;
    }

    setValidationError("");
    return true;
  }, [arc200Balance, exchangeInfo?.reserve]);

  const handleArc200AmountChange = (value: string) => {
    setArc200Amount(value);
    if (direction === "arc200ToVsa" && value) {
      validateArc200ToVsa(value);
    } else {
      setValidationError("");
    }
  };

  return (
    <Container>
      <Title>ARC200 EXCHANGE</Title>
      <Subtitle>CONVERT BETWEEN ARC200 TOKENS AND VSA TOKENS</Subtitle>

      <InputGroup>
        <Label>CONTRACT ID</Label>
        <Input
          type="text"
          value={contractId}
          onChange={(e) => setContractId(e.target.value)}
          placeholder="ENTER CONTRACT ID..."
        />
        <ContractPrefixContainer>
          <ContractPrefixButton
            onClick={() => setContractId("420069")}
            title="Click to use UNIT contract ID"
          >
            UNIT (420069)
          </ContractPrefixButton>
        </ContractPrefixContainer>
      </InputGroup>

      {exchangeInfo && (
        <BalanceDisplay>
          <Label>EXCHANGE INFORMATION</Label>
          <BalanceItem>
            <span>ASSET ID:</span>
            <span>{exchangeInfo.assetId}</span>
          </BalanceItem>
          <BalanceItem>
            <span>SINK ADDRESS:</span>
            <span>{exchangeInfo.sinkAddress}</span>
          </BalanceItem>
          <BalanceItem>
            <span>RESERVE (ARC200):</span>
            <span>{exchangeInfo.reserve}</span>
          </BalanceItem>
        </BalanceDisplay>
      )}

      {contractId && (
        <BalanceDisplay>
          <Label>CURRENT BALANCES</Label>
          <BalanceItem>
            <span>ARC200 BALANCE:</span>
            <span>{arc200Balance || <LoadingSpinner />}</span>
          </BalanceItem>
          <BalanceItem>
            <span>VSA BALANCE:</span>
            <span>{vsaBalance || <LoadingSpinner />}</span>
          </BalanceItem>
        </BalanceDisplay>
      )}

      <InputGroup>
        <Label>CONVERSION DIRECTION</Label>
        <DirectionToggle>
          <DirectionButton
            active={direction === "arc200ToVsa"}
            onClick={() => setDirection("arc200ToVsa")}
          >
            ARC200 → VSA
          </DirectionButton>
          <DirectionButton
            active={direction === "vsaToArc200"}
            onClick={() => setDirection("vsaToArc200")}
          >
            VSA → ARC200
          </DirectionButton>
        </DirectionToggle>
      </InputGroup>

      <InputGroup>
        <Label>
          {direction === "arc200ToVsa" ? "ARC200 AMOUNT" : "VSA AMOUNT"}
        </Label>
        <InputWithMax>
          <Input
            type="number"
            value={direction === "arc200ToVsa" ? arc200Amount : vsaAmount}
            onChange={(e) => {
              if (direction === "arc200ToVsa") {
                handleArc200AmountChange(e.target.value);
              } else {
                setVsaAmount(e.target.value);
                setValidationError("");
              }
            }}
            placeholder="ENTER AMOUNT..."
            min="0"
            step="0.000001"
          />
          <MaxButton
            onClick={() => {
              if (direction === "arc200ToVsa") {
                const maxAmount = Math.min(
                  parseFloat(arc200Balance || "0"),
                  parseFloat(exchangeInfo?.reserve || "0")
                );
                setArc200Amount(maxAmount.toString());
                setValidationError("");
              } else {
                setVsaAmount(vsaBalance || "0");
                setValidationError("");
              }
            }}
            disabled={!exchangeInfo || (!arc200Balance && !vsaBalance)}
          >
            MAX
          </MaxButton>
        </InputWithMax>
        {validationError && (
          <div style={{ 
            color: '#FF4500', 
            fontSize: '0.9rem', 
            marginTop: '0.5rem',
            fontFamily: 'Courier New, monospace',
            textShadow: '1px 1px 0px #000'
          }}>
            ⚠️ {validationError}
          </div>
        )}
      </InputGroup>

      {error && (
        <ErrorResult>
          <strong>ERROR:</strong> {error}
        </ErrorResult>
      )}

      <ConvertButton
        onClick={handleConvert}
        disabled={
          (!arc200Amount && !vsaAmount) ||
          !contractId ||
          isConverting ||
          !exchangeInfo ||
          !!validationError
        }
      >
        {isConverting ? "CONVERTING..." : "CONVERT TOKENS"}
      </ConvertButton>

      {((direction === "arc200ToVsa" && arc200Amount) ||
        (direction === "vsaToArc200" && vsaAmount)) && (
        <Result>
          <strong>CONVERSION PREVIEW:</strong>
          <br />
          {direction === "arc200ToVsa"
            ? `${arc200Amount} ARC200 → ${arc200Amount} VSA`
            : `${vsaAmount} VSA → ${vsaAmount} ARC200`}
        </Result>
      )}
    </Container>
  );
};

// Helper functions to fetch balances
async function fetchArc200Balance(
  algodClient: Algodv2,
  contractId: string,
  account: string
): Promise<string> {
  try {
    const ci = new CONTRACT(
      Number(contractId),
      algodClient,
      undefined,
      abi.arc200,
      {
        addr: account,
        sk: new Uint8Array(),
      }
    );
    const decimalsR = await ci.arc200_decimals();
    if (!decimalsR.success) {
      throw new Error("Failed to fetch ARC200 decimals");
    }
    const decimals = decimalsR.returnValue;
    const balanceR = await ci.arc200_balanceOf(account);
    if (!balanceR.success) {
      throw new Error("Failed to fetch ARC200 balance");
    }
    return BigNumber(balanceR.returnValue)
      .div(new BigNumber(10).pow(decimals))
      .toString();
  } catch (error) {
    console.error("Error fetching ARC200 balance:", error);
    return "0";
  }
}

async function fetchVsaBalance(
  algodClient: Algodv2,
  contractId: string,
  account: string,
  assetId: number
): Promise<string> {
  try {
    const assetInfo = await algodClient.getAssetByID(assetId).do();
    const accountAssets = await algodClient
      .accountAssetInformation(account, assetId)
      .do();

    const asset = accountAssets?.["asset-holding"]?.["amount"] || "0";
    const decimals = assetInfo?.params?.["decimals"] || 6; // Default VSA decimals
    const balance = BigNumber(asset).div(new BigNumber(10).pow(decimals));
    return balance.toFixed(decimals);
  } catch (error) {
    console.error("Error fetching VSA balance:", error);
    return "0";
  }
}

async function fetchReserve(
  algodClient: Algodv2,
  contractId: number,
  assetId: number
): Promise<string> {
  try {
    // Get the application account info
    const appInfo = await algodClient.getApplicationByID(contractId).do();
    const appAddress = algosdk.getApplicationAddress(contractId);
    
    // Get the asset balance for the application account
    const accountAssets = await algodClient
      .accountAssetInformation(appAddress, assetId)
      .do();

    const asset = accountAssets?.["asset-holding"]?.["amount"] || "0";
    
    // Get asset info for decimals
    const assetInfo = await algodClient.getAssetByID(assetId).do();
    const decimals = assetInfo?.params?.["decimals"] || 6;
    
    // Format the reserve amount
    const reserve = BigNumber(asset).div(new BigNumber(10).pow(decimals));
    return reserve.toFixed(decimals);
  } catch (error) {
    console.error("Error fetching reserve:", error);
    return "0";
  }
}

export default Arc200VsaConverter;
