import React, { useState, useEffect } from "react";
import styled from "styled-components";
import { APP_SPEC as SlotMachineAppSpec } from "../../clients/SlotMachineClient";
import { APP_SPEC as YBTAppSpec } from "../../clients/YieldBearingTokenClient";
import { useWallet } from "@txnlab/use-wallet-react";
import { CONTRACT, abi } from "ulujs";
import algosdk from "algosdk";
import { getAlgorandClients } from "@/wallets";
import BigNumber from "bignumber.js";
import { useSelector } from "react-redux";

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2rem;
  padding: 2rem;
  background: var(--background-secondary);
  border-radius: 12px;
`;

const SlotDisplay = styled.div`
  display: flex;
  gap: 1rem;
  background: var(--background-primary);
  padding: 2rem;
  border-radius: 8px;
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.1);
`;

const Reel = styled.div`
  font-size: 3rem;
  font-weight: bold;
  width: 80px;
  height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  color: #333;
`;

const SpinButton = styled.button`
  padding: 1rem 2rem;
  font-size: 1.2rem;
  font-weight: bold;
  background: linear-gradient(135deg, #34d399 0%, #059669 100%);
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: transform 0.2s, opacity 0.2s;
  width: 200px;

  &:hover {
    transform: translateY(-2px);
  }

  &:disabled {
    opacity: 0.7;
    cursor: not-allowed;
    transform: none;
  }
`;

const ResultMessage = styled.div<{ win: boolean }>`
  font-size: 1.5rem;
  font-weight: bold;
  color: ${(props) => (props.win ? "#34D399" : "var(--text-primary)")};
  text-align: center;
  margin-top: 1rem;
`;

const Stats = styled.div`
  display: flex;
  gap: 2rem;
  margin-top: 1rem;
  font-size: 1rem;
  color: var(--text-secondary);
  align-items: center;
`;

const WalletMessage = styled.div`
  color: var(--text-secondary);
  font-size: 0.9rem;
  margin-top: 0.5rem;
  text-align: center;
`;

const ButtonContainer = styled.div`
  display: flex;
  gap: 1rem;
  flex-direction: column;
  align-items: center;
  width: 100%;
  max-width: 200px;
`;

const BetInput = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;
`;

const StyledInput = styled.input`
  padding: 0.5rem;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  width: 100px;
  text-align: center;
  background: var(--background-primary);
  color: var(--text-primary);
`;

const SLOT_MACHINE_CTCINFO = 40048754;
const slotMachineABI = {
  name: "Slot Machine",
  desc: "A simple slot machine game",
  methods: SlotMachineAppSpec.contract.methods,
  events: [
    {
      name: "BetPlaced",
      args: [
        {
          type: "address",
        },
        {
          type: "uint64",
        },
        {
          type: "uint64",
        },
        {
          type: "uint64",
        },
        {
          type: "uint64",
        },
      ],
    },
    {
      name: "BetClaimed",
      args: [
        {
          type: "address",
        },
        {
          type: "uint64",
        },
        {
          type: "uint64",
        },
        {
          type: "uint64",
        },
        {
          type: "uint64",
        },
        {
          type: "uint64",
        },
      ],
    },
  ],
};
const YBT_CTCINFO = 40048753;
const ybtABI = {
  name: "YieldBearingToken",
  desc: "Yield Bearing Token",
  methods: YBTAppSpec.contract.methods,
  events: [],
};

const decodeBetClaimedEvent = (event: any[]) => {
  const [
    txId,
    round,
    timestamp,
    addr,
    amount,
    providerKey,
    index,
    claimRound,
    payout,
  ] = event;
  return {
    txId,
    round,
    timestamp,
    addr,
    amount,
    providerKey,
    index,
    claimRound,
    payout,
  };
};

const TabContainer = styled.div`
  width: 100%;
  margin-bottom: 2rem;
`;

const TabList = styled.div`
  display: flex;
  gap: 1rem;
  border-bottom: 1px solid var(--border-color);
  margin-bottom: 2rem;
`;

const Tab = styled.button<{ active: boolean }>`
  padding: 0.5rem 1rem;
  background: none;
  border: none;
  color: var(--text-primary);
  cursor: pointer;
  border-bottom: 2px solid
    ${(props) => (props.active ? "var(--accent-color)" : "transparent")};
  transition: border-color 0.2s;

  &:hover {
    border-bottom-color: ${(props) =>
      props.active ? "var(--accent-color)" : "var(--border-color)"};
  }
`;

const SwapContainer = styled.div`
  background: var(--background-secondary);
  border-radius: 12px;
  padding: 1.5rem;
  width: 100%;
  max-width: 400px;
`;

const SwapBox = styled.div`
  background: var(--background-primary);
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1rem;
`;

const MaxButton = styled.button`
  background: none;
  border: none;
  color: var(--accent-color);
  cursor: pointer;
  font-size: 0.9rem;
  padding: 0;
  margin-left: auto;

  &:hover {
    text-decoration: underline;
  }
`;

const SwapHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
  color: var(--text-secondary);
  font-size: 0.9rem;
  gap: 0.5rem;
`;

const SwapInput = styled.input`
  width: 100%;
  background: none;
  border: none;
  color: var(--text-primary);
  font-size: 1.5rem;
  outline: none;
  padding: 0.5rem 0;

  &::-webkit-outer-spin-button,
  &::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }
`;

const SwapButton = styled.button`
  width: 100%;
  padding: 1rem;
  background: var(--accent-color);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 1.1rem;
  font-weight: bold;
  cursor: pointer;
  transition: opacity 0.2s;

  &:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }
`;

const SwapType = styled.div`
  display: flex;
  gap: 1rem;
  margin-bottom: 1.5rem;
`;

const SwapTypeButton = styled.button<{ active: boolean; isDarkTheme: boolean }>`
  padding: 0.5rem 1rem;
  background: ${(props) =>
    props.active ? (props.isDarkTheme ? "#34d399" : "#34d399") : "#ffffff"};
  color: ${(props) => (props.active ? "#ffffff" : "#374151")};
  border: 2px solid ${(props) => (props.active ? "#34d399" : "#e5e7eb")};
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  font-weight: ${(props) => (props.active ? "bold" : "normal")};

  &:hover {
    border-color: #34d399;
    background: ${(props) =>
      props.active ? (props.isDarkTheme ? "#34d399" : "#34d399") : "#ffffff"};
  }
`;

const ContributeSection = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  padding: 2rem;
  background: var(--background-primary);
  border-radius: 8px;
`;

const DisclaimerText = styled.div`
  color: var(--text-secondary);
  font-size: 0.8rem;
  text-align: center;
  margin-top: 1rem;
  padding: 0.5rem;
  border-radius: 4px;
  background: var(--background-primary);
`;

const SlotMachine: React.FC = () => {
  const { activeAccount, signTransactions, algodClient } = useWallet();
  const [reels, setReels] = useState<number[]>([0, 0, 0]);
  const [isSpinning, setIsSpinning] = useState(false);
  const [spins, setSpins] = useState(0);
  const [wins, setWins] = useState(0);
  const [contractBalance, setContractBalance] = useState<number>(0);
  const [currentMultiple, setCurrentMultiple] = useState<number>(0);
  const [betClaimedEvents, setBetClaimedEvents] = useState<any[]>([]);
  const [lastRound, setLastRound] = useState<number>(0);
  const [betAmount, setBetAmount] = useState<number>(1);
  const [activeTab, setActiveTab] = useState<"play" | "contribute">("play");
  const [swapType, setSwapType] = useState<"deposit" | "withdraw">("deposit");
  const [swapAmount, setSwapAmount] = useState<string>("");
  const [voiBalance, setVoiBalance] = useState<number>(0);
  const [ybtBalance, setYbtBalance] = useState<number>(0);
  const isDarkTheme = useSelector((state: any) => state.theme.isDarkTheme);
  const [simulatedWithdraw, setSimulatedWithdraw] = useState<{
    voiAmount: number | null;
    loading: boolean;
  }>({ voiAmount: null, loading: false });

  const symbols = ["🍒", "🍊", "🍇", "🍎", "💎", "7️⃣", "🎰"];

  const fetchLastRound = async () => {
    const lastRound = (await algodClient.status().do())["last-round"];
    setLastRound(lastRound);
  };

  const fetchContractBalance = async () => {
    try {
      const accountInfo = await algodClient
        .accountInformation(algosdk.getApplicationAddress(SLOT_MACHINE_CTCINFO))
        .do();
      setContractBalance(accountInfo.amount);
    } catch (error) {
      console.error("Error fetching contract balance:", error);
    }
  };

  const getBetClaimedEvents = async (betKey: string) => {
    const { algodClient, indexerClient } = getAlgorandClients();
    const ci = new CONTRACT(
      SLOT_MACHINE_CTCINFO,
      algodClient,
      indexerClient,
      slotMachineABI,
      {
        addr: algosdk.getApplicationAddress(SLOT_MACHINE_CTCINFO),
        sk: new Uint8Array(),
      }
    );
    const events = await ci.getEvents({
      minRound: lastRound,
    });
    const BetClaimedEvents: any[] =
      events.find((e: any) => e.name === "BetClaimed")?.events || [];
    return BetClaimedEvents;
  };

  const fetchBetClaimed = async () => {
    getBetClaimedEvents("").then(setBetClaimedEvents);
  };

  const fetchVoiBalance = async () => {
    if (!activeAccount) return;
    try {
      const accountInfo = await algodClient
        .accountInformation(activeAccount.address)
        .do();
      setVoiBalance(accountInfo.amount / 1e6);
    } catch (error) {
      console.error("Error fetching VOI balance:", error);
    }
  };

  const fetchYbtBalance = async () => {
    if (!activeAccount) return;
    try {
      const ci = new CONTRACT(YBT_CTCINFO, algodClient, undefined, ybtABI, {
        addr: activeAccount.address,
        sk: new Uint8Array(),
      });
      const arc200_balanceOfR = await ci.arc200_balanceOf(
        activeAccount.address
      );
      setYbtBalance(
        new BigNumber(arc200_balanceOfR.returnValue).div(1e9).toNumber()
      );
    } catch (error) {
      console.error("Error fetching YBT balance:", error);
    }
  };

  useEffect(() => {
    fetchLastRound();
  }, []);

  useEffect(() => {
    fetchBetClaimed();
  }, [lastRound]);

  useEffect(() => {
    fetchContractBalance();
  }, []);

  useEffect(() => {
    if (betClaimedEvents?.length || 0 === 0) {
      return;
    }
    console.log({ betClaimedEvents });
    setBetClaimedEvents([]);
  }, [betClaimedEvents]);

  useEffect(() => {
    if (activeAccount) {
      fetchVoiBalance();
      fetchYbtBalance();
    }
  }, [activeAccount]);

  useEffect(() => {
    // Reset swap amount
    setSwapAmount("");
    // Refresh balances if wallet is connected
    if (activeAccount) {
      fetchVoiBalance();
      fetchYbtBalance();
    }
  }, [swapType]); // Trigger when swapType changes

  useEffect(() => {
    if (swapType !== "withdraw" || !swapAmount) {
      setSimulatedWithdraw({ voiAmount: null, loading: false });
      return;
    }

    const simulateWithdraw = async () => {
      try {
        setSimulatedWithdraw((prev) => ({ ...prev, loading: true }));
        const ci = new CONTRACT(YBT_CTCINFO, algodClient, undefined, ybtABI, {
          addr: activeAccount?.address || "",
          sk: new Uint8Array(),
        });
        ci.setFee(5000);
        const simulateR = await ci.withdraw(
          BigInt(new BigNumber(swapAmount).multipliedBy(1e9).toFixed(0))
        );
        const voiAmount = Number(simulateR.returnValue) / 1e6;
        setSimulatedWithdraw({ voiAmount, loading: false });
      } catch (error) {
        console.error("Simulation error:", error);
        setSimulatedWithdraw({ voiAmount: null, loading: false });
      }
    };

    const debounceTimer = setTimeout(simulateWithdraw, 500);
    return () => clearTimeout(debounceTimer);
  }, [swapAmount, swapType, activeAccount]);

  const handleSpin = async () => {
    if (!activeAccount) {
      spin();
      return;
    }
    try {
      setIsSpinning(true);
      // Start spinning immediately while waiting for transaction
      const spinningInterval = setInterval(() => {
        setReels((prev) =>
          prev.map(() => Math.floor(Math.random() * symbols.length))
        );
      }, 200);
      const ci = new CONTRACT(
        SLOT_MACHINE_CTCINFO,
        algodClient,
        undefined,
        slotMachineABI,
        {
          addr: activeAccount.address,
          sk: new Uint8Array(),
        }
      );
      const betAmountMicroVoi = betAmount * 1e6; // Convert VOI to microVOI
      ci.setEnableRawBytes(true);
      ci.setPaymentAmount(betAmountMicroVoi + 37700);
      const spinR = await ci.spin(
        betAmountMicroVoi,
        1234567890,
        new Date().getTime()
      );
      if (!spinR.success) {
        throw new Error("Spin failed");
      }
      const stxns = await signTransactions(
        spinR.txns.map((t: string) => new Uint8Array(Buffer.from(t, "base64")))
      );
      const { txId } = await algodClient
        .sendRawTransaction(stxns as Uint8Array[])
        .do();
      await algosdk.waitForConfirmation(algodClient, txId, 4);

      const betKey = spinR.returnValue;
      console.log({ betKey });
      let payout = 0;
      let multiplier = 0;
      do {
        ci.setFee(4000);
        ci.setEnableParamsLastRoundMod(true);
        const claimR = await ci.claim(betKey);
        console.log({ claimR });
        if (!claimR.success) {
          // if error contains box_len then it was already mined
          // so we need to get the events and find the claim event
          if (claimR.error.indexOf("box_len") !== -1) {
            const events = await getBetClaimedEvents(betKey);
            const claimEvent = events.find((e: any[]) => {
              const decodedEvent = decodeBetClaimedEvent(e);
              return decodedEvent.addr === activeAccount.address;
              // TODO: check if the bet key is correct
            });
            const decodedClaimEvent = decodeBetClaimedEvent(claimEvent);
            payout = Number(decodedClaimEvent.payout);
            multiplier =
              Number(decodedClaimEvent.payout) / Number(betAmountMicroVoi);
            break;
          }
          // wait
          await new Promise((resolve) => setTimeout(resolve, 500));
          continue;
        }
        payout = claimR.returnValue;
        multiplier = Number(payout) / Number(betAmountMicroVoi);
        break;
      } while (1);
      console.log({ betKey, payout, multiplier });

      // Clear the spinning interval and show final result
      clearInterval(spinningInterval);
      spin(multiplier);
      setTimeout(fetchContractBalance, 3000);
      fetchLastRound();
    } catch (error) {
      console.error(error);
      // Make sure to stop spinning on error
      setIsSpinning(false);
    }
  };

  const spin = (multiple = 1) => {
    setCurrentMultiple(multiple);
    setReels([0, 0, 0]);

    // Calculate final outcome based on multiple
    let finalReels: number[];
    if (multiple === 0) {
      // For losses, generate random non-matching values
      finalReels = Array(3)
        .fill(0)
        .map(() => Math.floor(Math.random() * symbols.length));
      // Ensure they don't accidentally match
      if (finalReels.every((val) => val === finalReels[0])) {
        finalReels[1] = (finalReels[0] + 1) % symbols.length;
      }
    } else {
      const finalValue = Math.min(
        Math.floor(multiple / 15),
        symbols.length - 1
      );
      finalReels = [finalValue, finalValue, finalValue];
    }

    // Configure timing for each reel - longer spin for losses
    const baseTime = multiple === 0 ? 2500 : 1500;
    const timeIncrement = Math.min(multiple * 10, 500);
    const reelTimes = [
      baseTime + timeIncrement,
      baseTime + timeIncrement * 1.5,
      baseTime + timeIncrement * 2,
    ];
    const spinInterval = 50;

    // Spin each reel independently
    reelTimes.forEach((stopTime, reelIndex) => {
      const interval = setInterval(() => {
        setReels((prev) => {
          const newReels = [...prev];
          newReels[reelIndex] = Math.floor(Math.random() * symbols.length);
          return newReels;
        });

        // Add easing to slow down the spin
        if (Date.now() - startTime > stopTime - 500) {
          clearInterval(interval);

          // Start slowing down
          const slowInterval = setInterval(() => {
            setReels((prev) => {
              const newReels = [...prev];
              newReels[reelIndex] = Math.floor(Math.random() * symbols.length);
              return newReels;
            });
          }, 200);

          // Stop completely and show final value
          setTimeout(() => {
            clearInterval(slowInterval);
            setReels((prev) => {
              const newReels = [...prev];
              newReels[reelIndex] = finalReels[reelIndex];
              return newReels;
            });

            if (reelIndex === reelTimes.length - 1) {
              setIsSpinning(false);
              setSpins((s) => s + 1);
              if (multiple > 0) {
                setWins((w) => w + 1);
              }
            }
          }, 500);
        }
      }, spinInterval);
    });

    const startTime = Date.now();
  };

  const getWinRate = () => {
    if (spins === 0) return "0%";
    return `${((wins / spins) * 100).toFixed(1)}%`;
  };

  const handleBetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Number(e.target.value);
    if (value >= 1 && value <= 1000) {
      setBetAmount(value);
    }
  };

  const handleSwap = async () => {
    try {
      const { algodClient } = getAlgorandClients();
      if (!activeAccount || !swapAmount) return;
      if (swapType === "deposit") {
        if (Number(swapAmount) > voiBalance) {
          alert("Insufficient balance");
          return;
        }
        const ci = new CONTRACT(YBT_CTCINFO, algodClient, undefined, ybtABI, {
          addr: activeAccount.address,
          sk: new Uint8Array(),
        });
        ci.setFee(4000);
        ci.setPaymentAmount(Number(swapAmount) * 1e6);
        const depositR = await ci.deposit();
        if (!depositR.success) {
          alert("Deposit failed");
          return;
        }
        const stxns = await signTransactions(
          depositR.txns.map(
            (t: string) => new Uint8Array(Buffer.from(t, "base64"))
          )
        );
        const { txId } = await algodClient
          .sendRawTransaction(stxns as Uint8Array[])
          .do();
        await algosdk.waitForConfirmation(algodClient, txId, 4);
        fetchVoiBalance();
        fetchContractBalance();
      } else {
        if (Number(swapAmount) > ybtBalance) {
          alert("Insufficient balance");
          return;
        }
        const ci = new CONTRACT(YBT_CTCINFO, algodClient, undefined, ybtABI, {
          addr: activeAccount.address,
          sk: new Uint8Array(),
        });
        ci.setFee(5000);
        const withdrawR = await ci.withdraw(
          BigInt(new BigNumber(swapAmount).multipliedBy(1e9).toFixed(0))
        );
        if (!withdrawR.success) {
          alert("Withdraw failed");
          return;
        }
        const stxns = await signTransactions(
          withdrawR.txns.map(
            (t: string) => new Uint8Array(Buffer.from(t, "base64"))
          )
        );
        const { txId } = await algodClient
          .sendRawTransaction(stxns as Uint8Array[])
          .do();
        await algosdk.waitForConfirmation(algodClient, txId, 4);
        fetchVoiBalance();
        fetchContractBalance();
        fetchYbtBalance();
        setSwapAmount("");
      }
      console.log(`${swapType}ing ${swapAmount} VOI`);
    } catch (error) {
      console.error(error);
    }
  };

  const renderSwapBox = () => (
    <SwapBox>
      <SwapHeader>
        <span>Amount</span>
        <MaxButton
          onClick={() =>
            setSwapAmount(
              swapType === "deposit"
                ? voiBalance.toString()
                : ybtBalance.toFixed(9)
            )
          }
        >
          MAX
        </MaxButton>
        <span>
          Balance:{" "}
          {activeAccount
            ? swapType === "deposit"
              ? voiBalance.toFixed(2)
              : ybtBalance.toFixed(9)
            : "0.00"}{" "}
          {swapType === "deposit" ? "VOI" : "VCD"}
        </span>
      </SwapHeader>
      <SwapInput
        type="number"
        placeholder="0.00"
        value={swapAmount}
        onChange={(e) => setSwapAmount(e.target.value)}
      />
      {swapType === "withdraw" && swapAmount && (
        <SwapHeader style={{ marginTop: "0.5rem" }}>
          <span>
            {simulatedWithdraw.loading
              ? "Calculating..."
              : simulatedWithdraw.voiAmount !== null
              ? `You will receive: ${simulatedWithdraw.voiAmount.toFixed(
                  6
                )} VOI`
              : ""}
          </span>
        </SwapHeader>
      )}
    </SwapBox>
  );

  const renderContributeSection = () => (
    <SwapContainer>
      <SwapType>
        <SwapTypeButton
          isDarkTheme={isDarkTheme}
          active={swapType === "deposit"}
          onClick={() => setSwapType("deposit")}
        >
          Deposit
        </SwapTypeButton>
        <SwapTypeButton
          isDarkTheme={isDarkTheme}
          active={swapType === "withdraw"}
          onClick={() => setSwapType("withdraw")}
        >
          Withdraw
        </SwapTypeButton>
      </SwapType>

      {renderSwapBox()}

      <SwapButton
        onClick={handleSwap}
        disabled={!activeAccount || !swapAmount || isNaN(Number(swapAmount))}
      >
        {!activeAccount
          ? "Connect Wallet"
          : !swapAmount
          ? "Enter Amount"
          : `${swapType.charAt(0).toUpperCase() + swapType.slice(1)} VOI`}
      </SwapButton>
    </SwapContainer>
  );

  return (
    <Container>
      <DisclaimerText>
        ⚠️ This is for demonstration purposes only. Play at your own risk. Never spend more than you can afford to lose.
      </DisclaimerText>
      
      <TabContainer>
        <TabList>
          <Tab
            active={activeTab === "play"}
            onClick={() => setActiveTab("play")}
          >
            Play
          </Tab>
          <Tab
            active={activeTab === "contribute"}
            onClick={() => setActiveTab("contribute")}
          >
            Contribute
          </Tab>
        </TabList>
      </TabContainer>

      {activeTab === "play" ? (
        <>
          <SlotDisplay>
            {reels.map((value, index) => (
              <Reel key={index}>{symbols[value]}</Reel>
            ))}
          </SlotDisplay>

          <ButtonContainer>
            <BetInput>
              <StyledInput
                type="number"
                min="1"
                max="1000"
                value={betAmount}
                onChange={handleBetChange}
                disabled={isSpinning}
              />
              <span>VOI</span>
            </BetInput>
            <SpinButton onClick={handleSpin} disabled={isSpinning}>
              {isSpinning ? "Spinning..." : "Spin!"}
            </SpinButton>
          </ButtonContainer>

          {!activeAccount && (
            <WalletMessage>Connect your wallet to play for real!</WalletMessage>
          )}

          {!isSpinning &&
            spins > 0 &&
            (reels.every((val) => val === reels[0]) && currentMultiple > 0 ? (
              <ResultMessage win={true}>
                🎉 Winner! ({currentMultiple}x) 🎉
              </ResultMessage>
            ) : (
              <ResultMessage win={false}>
                Try again! Spin to win! 🎰
              </ResultMessage>
            ))}

          <Stats>
            <div>Total Spins: {spins}</div>
            <div>Wins: {wins}</div>
            <div>Win Rate: {getWinRate()}</div>
            <div>
              Prize Pool: {contractBalance / 1e6}{" "}
              <span style={{ fontSize: "1.2rem" }}>&#120167;</span>
            </div>
          </Stats>
        </>
      ) : (
        renderContributeSection()
      )}
    </Container>
  );
};

export default SlotMachine;
