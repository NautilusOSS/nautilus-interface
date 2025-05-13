import React, { useState, useEffect } from "react";
import styled from "styled-components";
import { APP_SPEC as SlotMachineAppSpec } from "../../clients/SlotMachineClient";
import { useWallet } from "@txnlab/use-wallet-react";
import { CONTRACT, abi } from "ulujs";
import algosdk from "algosdk";
import { getAlgorandClients } from "@/wallets";

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
      const betAmount = 1e6;
      ci.setEnableRawBytes(true);
      ci.setPaymentAmount(betAmount + 137700);
      const spinR = await ci.spin(betAmount, 1234567890, new Date().getTime());
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
            multiplier = Number(decodedClaimEvent.payout) / Number(betAmount);
            break;
          }
          // wait
          await new Promise((resolve) => setTimeout(resolve, 500));
          continue;
        }
        payout = claimR.returnValue;
        multiplier = Number(payout) / Number(betAmount);
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

  return (
    <Container>
      <SlotDisplay>
        {reels.map((value, index) => (
          <Reel key={index}>{symbols[value]}</Reel>
        ))}
      </SlotDisplay>

      <ButtonContainer>
        <SpinButton onClick={handleSpin} disabled={isSpinning}>
          {isSpinning ? "Spinning..." : "Spin!"}
        </SpinButton>
      </ButtonContainer>

      {!activeAccount && (
        <WalletMessage>Connect your wallet to play for real!</WalletMessage>
      )}

      {!isSpinning && spins > 0 && (
        reels.every((val) => val === reels[0]) && currentMultiple > 0 ? (
          <ResultMessage win={true}>
            🎉 Winner! ({currentMultiple}x) 🎉
          </ResultMessage>
        ) : (
          <ResultMessage win={false}>Try again! Spin to win! 🎰</ResultMessage>
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
    </Container>
  );
};

export default SlotMachine;
