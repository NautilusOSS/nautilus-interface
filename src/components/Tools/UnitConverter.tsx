import { getAlgorandClients } from "@/wallets";
import { useWallet } from "@txnlab/use-wallet-react";
import algosdk from "algosdk";
import BigNumber from "bignumber.js";
import React, { useState, useEffect } from "react";
import styled from "styled-components";
import { abi, CONTRACT } from "ulujs";

const Container = styled.div`
  max-width: 600px;
  margin: 0 auto;
  padding: 2rem;
  font-family: "Courier New", monospace;
  background: linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #16213e 100%),
    repeating-linear-gradient(
      0deg,
      transparent,
      transparent 2px,
      rgba(0, 255, 255, 0.1) 2px,
      rgba(0, 255, 255, 0.1) 4px
    );
  min-height: 100vh;
  position: relative;

  /* Large screen optimizations */
  @media (min-width: 1200px) {
    max-width: 800px;
    padding: 1.5rem;
  }

  @media (min-width: 1600px) {
    max-width: 1000px;
    padding: 1rem;
  }

  @media (min-height: 900px) {
    padding-top: 1rem;
    padding-bottom: 1rem;
  }

  &::before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: radial-gradient(
        circle at 20% 80%,
        rgba(0, 255, 255, 0.1) 0%,
        transparent 50%
      ),
      radial-gradient(
        circle at 80% 20%,
        rgba(255, 0, 255, 0.1) 0%,
        transparent 50%
      );
    pointer-events: none;
    animation: scanlines 8s linear infinite;
  }

  @keyframes scanlines {
    0% {
      transform: translateY(0);
    }
    100% {
      transform: translateY(100vh);
    }
  }

  @keyframes pixelFloat {
    0%,
    100% {
      transform: translateY(0px) rotate(0deg);
    }
    50% {
      transform: translateY(-10px) rotate(5deg);
    }
  }

  @keyframes monsterBounce {
    0%,
    100% {
      transform: translateY(0px);
    }
    50% {
      transform: translateY(-5px);
    }
  }

  @keyframes textGlow {
    0% {
      text-shadow: 1px 1px 0px #000, 0 0 5px rgba(0, 255, 0, 0.5);
    }
    100% {
      text-shadow: 1px 1px 0px #000, 0 0 15px rgba(0, 255, 0, 1);
    }
  }
`;

const Title = styled.h2`
  font-size: 2rem;
  margin-bottom: 1.5rem;
  color: #00ffff;
  text-align: center;
  text-shadow: 2px 2px 0px #000, 4px 4px 0px #0000ff,
    0 0 20px rgba(0, 255, 255, 0.8);
  font-family: "Courier New", monospace;
  font-weight: bold;
  letter-spacing: 2px;
  text-transform: uppercase;
  animation: titleGlow 2s ease-in-out infinite alternate;
  position: relative;

  &::before {
    content: "█";
    position: absolute;
    left: -20px;
    top: 50%;
    transform: translateY(-50%);
    color: #00ffff;
    animation: blink 1s infinite;
  }

  &::after {
    content: "█";
    position: absolute;
    right: -20px;
    top: 50%;
    transform: translateY(-50%);
    color: #00ffff;
    animation: blink 1s infinite 0.5s;
  }

  @keyframes titleGlow {
    0% {
      text-shadow: 2px 2px 0px #000, 4px 4px 0px #0000ff,
        0 0 20px rgba(0, 255, 255, 0.8);
    }
    100% {
      text-shadow: 2px 2px 0px #000, 4px 4px 0px #0000ff,
        0 0 30px rgba(0, 255, 255, 1);
    }
  }

  @keyframes blink {
    0%,
    50% {
      opacity: 1;
    }
    51%,
    100% {
      opacity: 0;
    }
  }
`;

const ConverterCard = styled.div`
  background: rgba(0, 0, 0, 0.8);
  border: 3px solid #00ffff;
  border-radius: 0;
  padding: 2rem;
  box-shadow: 0 0 20px rgba(0, 255, 255, 0.5),
    inset 0 0 20px rgba(0, 255, 255, 0.1), 0 0 40px rgba(0, 255, 255, 0.2);
  position: relative;
  animation: cardPulse 3s ease-in-out infinite;

  &::before {
    content: "";
    position: absolute;
    top: -2px;
    left: -2px;
    right: -2px;
    bottom: -2px;
    background: linear-gradient(45deg, #00ffff, #0080ff, #00ffff);
    z-index: -1;
    border-radius: 2px;
    animation: borderRotate 4s linear infinite;
  }

  &::after {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: repeating-linear-gradient(
      90deg,
      transparent,
      transparent 20px,
      rgba(0, 255, 255, 0.05) 20px,
      rgba(0, 255, 255, 0.05) 21px
    );
    pointer-events: none;
  }

  @keyframes cardPulse {
    0%,
    100% {
      box-shadow: 0 0 20px rgba(0, 255, 255, 0.5),
        inset 0 0 20px rgba(0, 255, 255, 0.1), 0 0 40px rgba(0, 255, 255, 0.2);
    }
    50% {
      box-shadow: 0 0 30px rgba(0, 255, 255, 0.7),
        inset 0 0 30px rgba(0, 255, 255, 0.2), 0 0 60px rgba(0, 255, 255, 0.4);
    }
  }

  @keyframes borderRotate {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(360deg);
    }
  }
`;

const BalanceSection = styled.div`
  background: rgba(0, 0, 0, 0.9);
  border: 2px solid #00ff00;
  border-radius: 0;
  padding: 1.5rem;
  margin-bottom: 2rem;
  box-shadow: 0 0 15px rgba(0, 255, 0, 0.4);
  position: relative;
  animation: balanceGlow 2s ease-in-out infinite alternate;

  &::before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: repeating-linear-gradient(
      45deg,
      transparent,
      transparent 10px,
      rgba(0, 255, 0, 0.1) 10px,
      rgba(0, 255, 0, 0.1) 11px
    );
    pointer-events: none;
  }

  &::after {
    content: "█";
    position: absolute;
    top: -10px;
    left: 50%;
    transform: translateX(-50%);
    color: #00ff00;
    font-size: 20px;
    background: #000;
    padding: 0 10px;
    animation: balanceBlink 1.5s infinite;
  }

  @keyframes balanceGlow {
    0% {
      box-shadow: 0 0 15px rgba(0, 255, 0, 0.4);
    }
    100% {
      box-shadow: 0 0 25px rgba(0, 255, 0, 0.8);
    }
  }

  @keyframes balanceBlink {
    0%,
    70% {
      opacity: 1;
    }
    71%,
    100% {
      opacity: 0.3;
    }
  }
`;

const BalanceTitle = styled.h3`
  font-size: 1.1rem;
  margin-bottom: 1rem;
  color: #00ff00;
  text-align: center;
  font-family: "Courier New", monospace;
  font-weight: bold;
  text-transform: uppercase;
  letter-spacing: 1px;
  text-shadow: 1px 1px 0px #000;
`;

const BalanceGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;
`;

const BalanceItem = styled.div`
  text-align: center;
`;

const BalanceLabel = styled.div`
  font-size: 0.9rem;
  color: var(--text-secondary);
  margin-bottom: 0.5rem;
`;

const BalanceValue = styled.div`
  font-size: 1.5rem;
  font-weight: 600;
  color: #ffff00;
  font-family: "Courier New", monospace;
  text-shadow: 1px 1px 0px #000;
`;

const InputGroup = styled.div`
  margin-bottom: 1.5rem;
`;

const Label = styled.label`
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  color: var(--text-primary);
`;

const Input = styled.input`
  width: 100%;
  padding: 0.75rem;
  border: 2px solid #00ffff;
  border-radius: 0;
  background: #000;
  color: #00ffff;
  font-size: 1rem;
  font-family: "Courier New", monospace;
  box-shadow: inset 0 0 10px rgba(0, 255, 255, 0.2);

  &:focus {
    outline: none;
    border-color: #ffff00;
    box-shadow: 0 0 0 2px rgba(255, 255, 0, 0.3),
      inset 0 0 15px rgba(255, 255, 0, 0.1);
  }
`;

const FeeSection = styled.div`
  background: var(--background-primary);
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1.5rem;
  border: 1px solid var(--border-color);
`;

const FeeRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;

  &:last-child {
    margin-bottom: 0;
    padding-top: 0.5rem;
    border-top: 1px solid var(--border-color);
    font-weight: 600;
  }
`;

const FeeLabel = styled.span`
  color: var(--text-secondary);
  font-size: 0.9rem;
`;

const FeeValue = styled.span`
  color: var(--text-primary);
  font-weight: 500;
`;

const ConvertButton = styled.button`
  width: 100%;
  padding: 1rem;
  background: linear-gradient(45deg, #ff0000, #ff8000);
  color: white;
  border: 3px solid #ffff00;
  border-radius: 0;
  font-size: 1.1rem;
  font-weight: 600;
  font-family: "Courier New", monospace;
  cursor: pointer;
  text-transform: uppercase;
  letter-spacing: 1px;
  text-shadow: 2px 2px 0px #000;
  box-shadow: 0 0 20px rgba(255, 0, 0, 0.5),
    inset 0 0 10px rgba(255, 255, 0, 0.2);
  transition: all 0.2s;
  position: relative;
  overflow: hidden;
  animation: buttonPulse 2s ease-in-out infinite;

  &::before {
    content: "";
    position: absolute;
    top: -50%;
    left: -50%;
    width: 200%;
    height: 200%;
    background: linear-gradient(
      45deg,
      transparent,
      rgba(255, 255, 255, 0.3),
      transparent
    );
    transform: rotate(45deg);
    animation: buttonShine 3s linear infinite;
  }

  &:hover {
    background: linear-gradient(45deg, #ff8000, #ff0000);
    box-shadow: 0 0 30px rgba(255, 0, 0, 0.7),
      inset 0 0 15px rgba(255, 255, 0, 0.3);
    transform: translateY(-2px);
    animation: buttonHover 0.5s ease-in-out infinite alternate;
  }

  &:disabled {
    background: #333;
    border-color: #666;
    box-shadow: none;
    cursor: not-allowed;
    transform: none;
    animation: none;
  }

  @keyframes buttonPulse {
    0%,
    100% {
      box-shadow: 0 0 20px rgba(255, 0, 0, 0.5),
        inset 0 0 10px rgba(255, 255, 0, 0.2);
    }
    50% {
      box-shadow: 0 0 30px rgba(255, 0, 0, 0.8),
        inset 0 0 15px rgba(255, 255, 0, 0.4);
    }
  }

  @keyframes buttonShine {
    0% {
      transform: translateX(-100%) translateY(-100%) rotate(45deg);
    }
    100% {
      transform: translateX(100%) translateY(100%) rotate(45deg);
    }
  }

  @keyframes buttonHover {
    0% {
      transform: translateY(-2px) scale(1);
    }
    100% {
      transform: translateY(-2px) scale(1.02);
    }
  }
`;

const Result = styled.div`
  background: var(--accent-color);
  color: white;
  padding: 1rem;
  border-radius: 6px;
  text-align: center;
  font-size: 1.1rem;
  font-weight: 600;
  margin-top: 1rem;
`;

const InfoText = styled.p`
  text-align: center;
  color: var(--text-secondary);
  margin-top: 1rem;
  font-size: 0.9rem;
`;

const BridgeInfo = styled.div`
  background: var(--background-primary);
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1.5rem;
  border: 1px solid var(--border-color);
  text-align: center;
`;

const BridgeTitle = styled.h4`
  font-size: 1rem;
  margin-bottom: 0.5rem;
  color: var(--text-primary);
`;

const BridgeDescription = styled.p`
  font-size: 0.9rem;
  color: var(--text-secondary);
  margin: 0;
`;

const Disclaimer = styled.div`
  background: #fff3cd;
  border: 1px solid #ffeaa7;
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1.5rem;
  text-align: center;
`;

const DisclaimerTitle = styled.h4`
  font-size: 1rem;
  margin-bottom: 0.5rem;
  color: #856404;
  font-weight: 600;
`;

const DisclaimerText = styled.p`
  font-size: 0.9rem;
  color: #856404;
  margin: 0;
  line-height: 1.4;
`;

const UnitConverter: React.FC = () => {
  const { activeAccount, algodClient, signTransactions } = useWallet();
  const [unitClassicBalance, setUnitClassicBalance] = useState<number>(0);
  const [unitBalance, setUnitBalance] = useState<number>(0);
  const [newUnitBalance, setNewUnitBalance] = useState<number>(0);
  const [convertAmount, setConvertAmount] = useState<string>("");
  const [conversionResult, setConversionResult] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [hasZeroPayment, setHasZeroPayment] = useState<boolean>(false);
  const [bypassGuard, setBypassGuard] = useState<boolean>(false);
  const [legalAcknowledged, setLegalAcknowledged] = useState<boolean>(false);
  const [bridgeMode, setBridgeMode] = useState<"full" | "classic-only">("full");
  const [gameMode, setGameMode] = useState<boolean>(false);
  const [gameDifficulty, setGameDifficulty] = useState<
    "easy" | "medium" | "hard"
  >("medium");
  const [snakeGame, setSnakeGame] = useState<{
    snake: number[][];
    food: number[];
    direction: string;
    grid: number[][];
    score: number;
    gameOver: boolean;
    tokensConsumed: { classic: number; unit: number };
    lastFoodEaten: number;
    lastGrowthTime: number;
    pendingGrowth: boolean;
    fakeUnitCount: number;
    fakeUnitPositions: number[][];
  } | null>(null);
  const [isRescuing, setIsRescuing] = useState<boolean>(false);
  const [rescueProgress, setRescueProgress] = useState<number>(0);
  const [rescueStatus, setRescueStatus] = useState<string>("");
  const [gameControlsExpanded, setGameControlsExpanded] = useState<boolean>(false);
  const [compactMode, setCompactMode] = useState<boolean>(false);

  // Aramid Bridge fee: 0.1%
  const BRIDGE_FEE_PERCENTAGE = 0.001;

  // Dynamic growth delay based on difficulty
  const difficultyGrowthDelays = {
    easy: 1500, // 1.5 seconds for easy
    medium: 2000, // 2 seconds for medium
    hard: 3000, // 3 seconds for hard
  };

  const fetchBalances = async () => {
    if (!activeAccount) {
      return;
    }
    const { indexerClient } = getAlgorandClients();
    // fetch note existance
    const txns = await indexerClient
      .searchForTransactions()
      .address(activeAccount.address)
      .notePrefix(new TextEncoder().encode("unit-converter-zero-payment"))
      .do();

    // fetch unit classic vsa balance
    const assetInfo = await algodClient
      .accountAssetInformation(activeAccount.address, 747374)
      .do()
      .catch(() => {});
    const assetBi = BigInt(assetInfo?.["asset-holding"]?.amount || 0);
    const assetAmount = new BigNumber(assetBi.toString())
      .div(new BigNumber(10).pow(8))
      .toNumber();
    // fetch unit balance
    const ci = new CONTRACT(420069, algodClient, undefined, abi.nt200, {
      addr: activeAccount.address,
      sk: new Uint8Array(),
    });
    const balanceR = await ci.arc200_balanceOf(activeAccount.address);
    const balance = new BigNumber(balanceR.returnValue.toString())
      .div(new BigNumber(10).pow(8))
      .toNumber();

    // fetch new unit balance (40266690)
    const newUnitAssetInfo = await algodClient
      .accountAssetInformation(activeAccount.address, 40266690)
      .do()
      .catch(() => {});
    const newUnitAssetBi = BigInt(
      newUnitAssetInfo?.["asset-holding"]?.amount || 0
    );
    const newUnitAssetAmount = new BigNumber(newUnitAssetBi.toString())
      .div(new BigNumber(10).pow(8))
      .toNumber();

    setUnitClassicBalance(assetAmount);
    setUnitBalance(balance);
    setNewUnitBalance(newUnitAssetAmount);
    setHasZeroPayment(txns.transactions.length > 0);
  };

  useEffect(() => {
    fetchBalances();
  }, []);

  // Auto-enable compact mode on large screens
  useEffect(() => {
    const handleResize = () => {
      if (window.innerHeight > 1000 && window.innerWidth > 1400) {
        setCompactMode(true);
      }
    };
    
    handleResize(); // Check on mount
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (gameMode && snakeGame && !snakeGame.gameOver && !isRescuing) {
      const gameLoop = setInterval(moveSnake, 200);
      return () => clearInterval(gameLoop);
    }
  }, [gameMode, snakeGame, isRescuing]);

  useEffect(() => {
    if (gameMode && !isRescuing) {
      document.addEventListener("keydown", handleKeyPress);
      return () => document.removeEventListener("keydown", handleKeyPress);
    }
  }, [gameMode, snakeGame, isRescuing]);

  // Calculate fee and total amounts
  const getFeeAmount = (amount: number): number => {
    return amount * BRIDGE_FEE_PERCENTAGE;
  };

  const getConvertedAmount = (amount: number): number => {
    // Fee is deducted from the transfer amount, so user receives amount - fee
    return amount - getFeeAmount(amount);
  };

  const getTotalAmount = (amount: number): number => {
    // Total amount charged is just the input amount (fee is deducted from it)
    return amount;
  };

  const initializeSnakeGame = () => {
    // Calculate total tokens and determine optimal grid size
    const totalTokens = unitClassicBalance + unitBalance;
    let gridSize = 20; // Default size

    // Adjust grid size based on token amount for optimal density (4x larger)
    if (totalTokens <= 25) {
      gridSize = 40; // Small grid for few tokens (was 10)
    } else if (totalTokens <= 100) {
      gridSize = 60; // Medium grid for moderate tokens (was 15)
    } else if (totalTokens <= 400) {
      gridSize = 80; // Standard grid for many tokens (was 20)
    } else if (totalTokens <= 900) {
      gridSize = 100; // Large grid for lots of tokens (was 25)
    } else {
      gridSize = 120; // Extra large grid for massive amounts (was 30)
    }

    const grid: number[][] = [];

    // Initialize empty grid
    for (let i = 0; i < gridSize; i++) {
      grid[i] = [];
      for (let j = 0; j < gridSize; j++) {
        grid[i][j] = 0; // 0 = empty, 1 = UNIT Classic, 2 = UNIT
      }
    }

    // Dynamic token distribution based on difficulty
    const difficultyDensities = {
      easy: 0.6, // 60% of grid filled
      medium: 0.5, // 50% of grid filled
      hard: 0.4, // 40% of grid filled
    };

    const targetDensity = difficultyDensities[gameDifficulty];
    const totalCells = gridSize * gridSize;
    const targetTokens = Math.floor(totalCells * targetDensity);

    let classicTokensPlaced = 0;
    let unitTokensPlaced = 0;
    let tokensPlaced = 0;

    // Place initial tokens in clusters for more realistic distribution
    // Limit total tokens to prevent unlimited spawning
    const maxTotalTokens = Math.min(
      Math.floor(totalCells * 0.8), // Maximum 80% of grid
      Math.floor(unitClassicBalance * 1000) + Math.floor(unitBalance * 1000) // Maximum based on actual balances
    );

    const actualTargetTokens = Math.min(targetTokens, maxTotalTokens);
    const initialClusters = Math.floor(actualTargetTokens / 20); // Create clusters of ~20 tokens each

    console.log(
      `Placing ${actualTargetTokens} tokens (limited from ${targetTokens}) on ${gridSize}x${gridSize} grid`
    );

    for (
      let cluster = 0;
      cluster < initialClusters && tokensPlaced < actualTargetTokens;
      cluster++
    ) {
      // Choose random cluster center
      const centerX = Math.floor(Math.random() * gridSize);
      const centerY = Math.floor(Math.random() * gridSize);

      // Place tokens around the center in a cluster pattern
      const clusterSize = Math.min(20, actualTargetTokens - tokensPlaced);

      for (
        let i = 0;
        i < clusterSize && tokensPlaced < actualTargetTokens;
        i++
      ) {
        // Random offset from center (closer to center = higher probability)
        const offsetX = Math.floor((Math.random() - 0.5) * 8);
        const offsetY = Math.floor((Math.random() - 0.5) * 8);

        const x = (centerX + offsetX + gridSize) % gridSize;
        const y = (centerY + offsetY + gridSize) % gridSize;

        // Only place if cell is empty
        if (grid[x][y] === 0) {
          // Choose token type based on remaining balances
          let tokenType = 0;
          if (
            classicTokensPlaced < unitClassicBalance &&
            unitTokensPlaced < unitBalance
          ) {
            // Both types available, choose randomly with slight bias towards UNIT Classic
            tokenType = Math.random() < 0.6 ? 1 : 2;
          } else if (classicTokensPlaced < unitClassicBalance) {
            // Only UNIT Classic available
            tokenType = 1;
          } else if (unitTokensPlaced < unitBalance) {
            // Only UNIT available
            tokenType = 2;
          } else {
            // All tokens placed, break
            break;
          }

          // Place the token
          grid[x][y] = tokenType;
          tokensPlaced++;

          if (tokenType === 1) {
            // Calculate proportional placement value based on total balance
            const placementValue = Math.max(0.001, unitClassicBalance * 0.01); // 1% of total balance, minimum 0.001
            classicTokensPlaced += placementValue;
          } else {
            // Calculate proportional placement value based on total balance
            const placementValue = Math.max(0.001, unitBalance * 0.01); // 1% of total balance, minimum 0.001
            unitTokensPlaced += placementValue;
          }
        }
      }
    }

    console.log(
      `Grid filled with ${tokensPlaced} tokens (${classicTokensPlaced.toFixed(
        8
      )} UNIT Classic, ${unitTokensPlaced.toFixed(
        8
      )} UNIT) on ${gridSize}x${gridSize} grid`
    );

    // Calculate center position for snake start
    const centerPos = Math.floor(gridSize / 2);
    const snake = [
      [centerPos, centerPos], // Head
      [centerPos - 1, centerPos], // Body segment 1
      [centerPos - 2, centerPos], // Body segment 2
    ];
    const food = [
      Math.floor(Math.random() * gridSize),
      Math.floor(Math.random() * gridSize),
    ];

    setSnakeGame({
      snake,
      food,
      direction: "right",
      grid,
      score: 0,
      gameOver: false,
      tokensConsumed: { classic: 0, unit: 0 },
      lastFoodEaten: Date.now(),
      lastGrowthTime: Date.now(),
      pendingGrowth: false,
      fakeUnitCount: 0,
      fakeUnitPositions: [],
    });
    setGameMode(true);
  };

  // No respawning system - tokens are placed once and consumed permanently

  const moveSnake = () => {
    if (!snakeGame || snakeGame.gameOver) return;

    // Safety check: prevent infinite loops
    if (snakeGame.snake.length <= 0) {
      console.log("Snake length <= 0, ending game");
      setSnakeGame((prev) => (prev ? { ...prev, gameOver: true } : null));
      return;
    }

    const newSnake = [...snakeGame.snake];
    const head = [...newSnake[0]];

    // Move head based on direction
    switch (snakeGame.direction) {
      case "up":
        head[1]--;
        break;
      case "down":
        head[1]++;
        break;
      case "left":
        head[0]--;
        break;
      case "right":
        head[0]++;
        break;
    }

    // Wrap around boundaries (classic Snake behavior)
    const gridSize = snakeGame.grid.length;
    if (head[0] < 0) head[0] = gridSize - 1;
    if (head[0] >= gridSize) head[0] = 0;
    if (head[1] < 0) head[1] = gridSize - 1;
    if (head[1] >= gridSize) head[1] = 0;

    // Check self collision
    if (
      newSnake.some(
        (segment) => segment[0] === head[0] && segment[1] === head[1]
      )
    ) {
      setSnakeGame((prev) => (prev ? { ...prev, gameOver: true } : null));
      return;
    }

    // Check if eating food or tokens BEFORE modifying snake
    let newTokensConsumed = { ...snakeGame.tokensConsumed };
    let newGrid = snakeGame.grid.map((row) => [...row]);
    let newFood = [...snakeGame.food];
    let scoreIncrease = 0;
    let ateFood = false;

    // Check if eating food
    if (head[0] === snakeGame.food[0] && head[1] === snakeGame.food[1]) {
      scoreIncrease += 1;
      ateFood = true;
      
      // Spawn fake UNIT when food is eaten
      const newFakeUnitCount = snakeGame.fakeUnitCount + 1;
      const newFakeUnitPositions = [...snakeGame.fakeUnitPositions];
      
      // Add new fake UNIT position (find empty spot)
      const gridSize = snakeGame.grid.length;
      let fakeUnitPos: number[];
      do {
        fakeUnitPos = [
          Math.floor(Math.random() * gridSize),
          Math.floor(Math.random() * gridSize),
        ];
      } while (newGrid[fakeUnitPos[0]][fakeUnitPos[1]] !== 0);
      
      newFakeUnitPositions.push(fakeUnitPos);
      newGrid[fakeUnitPos[0]][fakeUnitPos[1]] = 3; // 3 = fake UNIT
      
      console.log(`🚨 FAKE UNIT spawned at [${fakeUnitPos[0]}, ${fakeUnitPos[1]}]! Total: ${newFakeUnitCount}`);
      
      // Set pending growth instead of immediate growth
      setSnakeGame((prev) =>
        prev
          ? {
              ...prev,
              pendingGrowth: true,
              lastFoodEaten: Date.now(),
              fakeUnitCount: newFakeUnitCount,
              fakeUnitPositions: newFakeUnitPositions,
            }
          : null
      );
      
      // Generate new food in empty position
      do {
        newFood = [
          Math.floor(Math.random() * gridSize),
          Math.floor(Math.random() * gridSize),
        ];
      } while (newGrid[newFood[0]][newFood[1]] !== 0);
    }

    // Check if eating tokens on the grid
    const tokenType = newGrid[head[0]][head[1]];
    if (tokenType === 1) {
      // UNIT Classic
      // Calculate proportional consumption value based on total balance
      const consumptionValue = Math.max(0.001, unitClassicBalance * 0.01); // 1% of total balance, minimum 0.001
      newTokensConsumed.classic += consumptionValue;
      newGrid[head[0]][head[1]] = 0; // Remove token from grid
      scoreIncrease += 1;

      console.log(
        `Consumed UNIT Classic token: ${consumptionValue.toFixed(
          6
        )} (Total: ${newTokensConsumed.classic.toFixed(6)})`
      );

      // No respawning - tokens are consumed permanently
      // This creates a more strategic game where resources are truly limited
    } else if (tokenType === 2) {
      // UNIT
      // Calculate proportional consumption value based on total balance
      const consumptionValue = Math.max(0.001, unitBalance * 0.01); // 1% of total balance, minimum 0.001
      newTokensConsumed.unit += consumptionValue;
      newGrid[head[0]][head[1]] = 0; // Remove token from grid
      scoreIncrease += 1;

      console.log(
        `Consumed UNIT token: ${consumptionValue.toFixed(
          6
        )} (Total: ${newTokensConsumed.classic.toFixed(6)})`
      );

      // No respawning - tokens are consumed permanently
      // This creates a more strategic game where resources are truly limited
    } else if (tokenType === 3) {
      // FAKE UNIT - Apply penalty!
      console.log("🚨 FAKE UNIT CONSUMED! Applying 25% penalty...");
      
      // Calculate penalty: 25% of current tokens on grid
      const totalTokensOnGrid = newGrid.flat().filter(cell => cell === 1 || cell === 2).length;
      const penaltyAmount = Math.ceil(totalTokensOnGrid * 0.25);
      
      // Remove penalty amount of tokens from grid (randomly)
      let tokensRemoved = 0;
      const positionsToRemove: number[][] = [];
      
      // Find all token positions
      for (let x = 0; x < newGrid.length; x++) {
        for (let y = 0; y < newGrid.length; y++) {
          if (newGrid[x][y] === 1 || newGrid[x][y] === 2) {
            positionsToRemove.push([x, y]);
          }
        }
      }
      
      // Randomly remove penalty amount of tokens
      for (let i = 0; i < penaltyAmount && positionsToRemove.length > 0; i++) {
        const randomIndex = Math.floor(Math.random() * positionsToRemove.length);
        const [x, y] = positionsToRemove.splice(randomIndex, 1)[0];
        newGrid[x][y] = 0; // Remove token
        tokensRemoved++;
      }
      
      // Remove fake UNIT from grid and positions
      newGrid[head[0]][head[1]] = 0;
      const newFakeUnitPositions = snakeGame.fakeUnitPositions.filter(
        pos => !(pos[0] === head[0] && pos[1] === head[1])
      );
      
      console.log(`🚨 Penalty applied: ${tokensRemoved} tokens removed from grid`);
      
      // Update state with penalty applied
      setSnakeGame((prev) =>
        prev
          ? {
              ...prev,
              grid: newGrid,
              fakeUnitPositions: newFakeUnitPositions,
              fakeUnitCount: prev.fakeUnitCount - 1,
            }
          : null
      );
      
      // No score increase for fake UNIT - it's a penalty!
      return; // Exit early since we've updated the state
    }

    // Now handle snake growth based on delayed timing
    const currentTime = Date.now();
    const growthDelay = difficultyGrowthDelays[gameDifficulty];

    // Check if it's time for delayed growth
    if (
      snakeGame.pendingGrowth &&
      currentTime - snakeGame.lastGrowthTime >= growthDelay
    ) {
      // Time for delayed growth - add head and keep tail
      newSnake.unshift(head);
      setSnakeGame((prev) =>
        prev
          ? {
              ...prev,
              snake: newSnake,
              food: newFood,
              grid: newGrid,
              score: prev.score + scoreIncrease,
              tokensConsumed: newTokensConsumed,
              lastGrowthTime: currentTime,
              pendingGrowth: false,
            }
          : null
      );
    } else if (ateFood) {
      // Just ate food - set pending growth but don't grow yet
      setSnakeGame((prev) =>
        prev
          ? {
              ...prev,
              snake: newSnake,
              food: newFood,
              grid: newGrid,
              score: prev.score + scoreIncrease,
              tokensConsumed: newTokensConsumed,
            }
          : null
      );
    } else {
      // Not eating food - add head but remove tail (no growth)
      newSnake.unshift(head);
      newSnake.pop(); // Remove tail to maintain same size

      if (scoreIncrease > 0) {
        // Eating tokens - update grid and tokens
        console.log(
          `Updating game state after token consumption: Classic ${newTokensConsumed.classic.toFixed(
            6
          )}, UNIT ${newTokensConsumed.unit.toFixed(6)}`
        );
        setSnakeGame((prev) =>
          prev
            ? {
                ...prev,
                snake: newSnake,
                grid: newGrid,
                score: prev.score + scoreIncrease,
                tokensConsumed: newTokensConsumed,
              }
            : null
        );
        return; // Exit early since we've updated the state
      } else {
        // Check if snake should shrink due to hunger
        const currentTime = Date.now();
        const timeSinceLastFood = currentTime - snakeGame.lastFoodEaten;
        const shrinkInterval = 8000; // Shrink every 8 seconds without food
        const shrinkThreshold = 3000; // Start shrinking after 3 seconds

        if (timeSinceLastFood > shrinkThreshold) {
          // Calculate hunger cycles since threshold
          const hungerCycles = Math.floor(
            (timeSinceLastFood - shrinkThreshold) / shrinkInterval
          );

          // Safety check: prevent infinite hunger cycles
          if (hungerCycles > 100) {
            console.log("Hunger cycles > 100, ending game to prevent freeze");
            setSnakeGame((prev) => (prev ? { ...prev, gameOver: true } : null));
            return;
          }

          if (hungerCycles > 0 && newSnake.length > 1) {
            // Snake only loses segments when it reaches critical status
            if (hungerCycles >= newSnake.length - 1) {
              // Snake is critically hungry - remove segments rapidly
              const segmentsToRemove = Math.min(
                hungerCycles - (newSnake.length - 2),
                newSnake.length - 1
              );

              if (segmentsToRemove > 0) {
                // Remove segments rapidly at critical status
                for (let i = 0; i < segmentsToRemove; i++) {
                  if (newSnake.length > 1) {
                    newSnake.pop();
                  }
                }

                // Check if snake reached critical status (1 segment)
                if (newSnake.length === 1) {
                  // Only reset timer if this is the first time reaching critical
                  const timeSinceLastReset =
                    currentTime - snakeGame.lastFoodEaten;
                  if (timeSinceLastReset > shrinkThreshold + shrinkInterval) {
                    // Reset hunger timer when critical is reached for the first time
                    setSnakeGame((prev) =>
                      prev
                        ? {
                            ...prev,
                            snake: newSnake,
                            lastFoodEaten: currentTime, // Reset hunger timer
                          }
                        : null
                    );
                  } else {
                    // Keep current timer, snake will die soon
                    setSnakeGame((prev) =>
                      prev
                        ? {
                            ...prev,
                            snake: newSnake,
                          }
                        : null
                    );
                  }
                } else {
                  // Still critical but not dead - keep hunger timer
                  setSnakeGame((prev) =>
                    prev
                      ? {
                          ...prev,
                          snake: newSnake,
                        }
                      : null
                  );
                }
              } else {
                // Normal movement - no shrinking
                setSnakeGame((prev) =>
                  prev ? { ...prev, snake: newSnake } : null
                );
              }
            } else {
              // Snake is hungry but not critical - no shrinking yet
              setSnakeGame((prev) =>
                prev
                  ? {
                      ...prev,
                      snake: newSnake,
                    }
                  : null
              );
            }
          } else if (newSnake.length <= 1) {
            // Snake is too small and starving - game over
            console.log("Snake too small, ending game");
            setSnakeGame((prev) => (prev ? { ...prev, gameOver: true } : null));
            return;
          } else {
            // Normal movement - no shrinking
            setSnakeGame((prev) =>
              prev ? { ...prev, snake: newSnake } : null
            );
          }
        } else {
          // Normal movement - no shrinking
          setSnakeGame((prev) => (prev ? { ...prev, snake: newSnake } : null));
        }
      }
    }
  };

  const handleKeyPress = (e: KeyboardEvent) => {
    if (!snakeGame || snakeGame.gameOver) return;

    switch (e.key) {
      case "ArrowUp":
        if (snakeGame.direction !== "down") {
          setSnakeGame((prev) => (prev ? { ...prev, direction: "up" } : null));
        }
        break;
      case "ArrowDown":
        if (snakeGame.direction !== "up") {
          setSnakeGame((prev) =>
            prev ? { ...prev, direction: "down" } : null
          );
        }
        break;
      case "ArrowLeft":
        if (snakeGame.direction !== "right") {
          setSnakeGame((prev) =>
            prev ? { ...prev, direction: "left" } : null
          );
        }
        break;
      case "ArrowRight":
        if (snakeGame.direction !== "left") {
          setSnakeGame((prev) =>
            prev ? { ...prev, direction: "right" } : null
          );
        }
        break;
    }
  };

  const startRescueMission = async (amount: number) => {
    try {
      // Start rescue animation
      setRescueStatus("🚁 BUILDING RESCUE TRANSACTION...");
      setRescueProgress(20);

      // Use the same transaction flow as handleConvert
      if (!activeAccount) {
        throw new Error("No active account");
      }

      // Step 1: Build and submit bridge transactions (if needed)
      setRescueStatus("🔧 PREPARING BRIDGE TRANSACTIONS...");
      setRescueProgress(30);

      const ci = new CONTRACT(420069, algodClient, undefined, abi.custom, {
        addr: activeAccount.address,
        sk: new Uint8Array(),
      });

      const builder = {
        unit: new CONTRACT(
          420069,
          algodClient,
          undefined,
          abi.nt200,
          {
            addr: activeAccount.address,
            sk: new Uint8Array(),
          },
          true,
          false,
          true
        ),
        saw200: new CONTRACT(
          747368,
          algodClient,
          undefined,
          {
            name: "saw200",
            desc: "saw200",
            methods: [
              {
                name: "deposit",
                args: [
                  {
                    type: "uint64",
                  },
                ],
                returns: {
                  type: "void",
                },
              },
            ],
            events: [],
          },
          {
            addr: activeAccount.address,
            sk: new Uint8Array(),
          },
          true,
          false,
          true
        ),
      };

      const buildN = [];

      // Calculate how much of each balance to use based on bridge mode
      let unitClassicToUse: number;
      let unitToUse: number;

      if (bridgeMode === "classic-only") {
        unitClassicToUse = Math.min(amount, unitClassicBalance);
        unitToUse = 0;
      } else {
        unitClassicToUse = Math.min(amount, unitClassicBalance);
        unitToUse = Math.max(0, amount - unitClassicToUse);
      }

      // If we need to use UNIT tokens, add approval and withdrawal transactions
      if (unitToUse > 0) {
        setRescueStatus("🔐 APPROVING UNIT TOKENS...");
        setRescueProgress(40);

        // Approve UNIT tokens for conversion
        const txnO = (
          await builder.unit.arc200_approve(
            algosdk.getApplicationAddress(747368),
            BigInt(new BigNumber(unitToUse).times(10 ** 8).toFixed(0))
          )
        )?.obj;
        const msg = `Approving ${unitToUse} UNIT for conversion`;
        buildN.push({
          ...txnO,
          note: new TextEncoder().encode(msg),
        });

        // Deposit arc200 unit to saw200
        const depositTxn = (
          await builder.saw200.deposit(
            BigInt(new BigNumber(unitToUse).times(10 ** 8).toFixed(0))
          )
        ).obj;
        const assetOptin = {
          xaid: 747374,
          snd: activeAccount?.address || "",
          arcv: activeAccount?.address || "",
          xamt: 0,
        };
        buildN.push({
          ...depositTxn,
          ...assetOptin,
        });
      }

      if (buildN.length > 0) {
        setRescueStatus("📡 SUBMITTING BRIDGE TRANSACTIONS...");
        setRescueProgress(50);

        ci.setEnableGroupResourceSharing(true);
        ci.setExtraTxns(buildN);
        ci.setFee(2000);
        const customR = await ci.custom();
        console.log({ customR });

        setRescueStatus("✍️ REQUESTING SIGNATURE...");
        setRescueProgress(60);

        const stxns = await signTransactions(
          customR.txns.map(
            (txn: string) => new Uint8Array(Buffer.from(txn, "base64"))
          )
        );
        console.log({ stxns });

        setRescueStatus("📡 BROADCASTING TO BLOCKCHAIN...");
        setRescueProgress(70);

        const res = await algodClient
          .sendRawTransaction(stxns as Uint8Array[])
          .do();
        const txId = res.txId;

        setRescueStatus("⏳ WAITING FOR CONFIRMATION...");
        setRescueProgress(80);

        await algosdk.waitForConfirmation(algodClient, txId, 4);
      }

      // Step 2: Do same network transfer using Aramid
      setRescueStatus("🌉 INITIATING ARAMID BRIDGE TRANSFER...");
      setRescueProgress(85);

      const suggestedParams = await algodClient.getTransactionParams().do();

      // Calculate fee and destination amount
      const feeAmountRaw = Math.floor(amount * 0.001 * 1e8); // 0.1% fee in raw units
      const destinationAmountRaw = Math.floor(amount * 1e8) - feeAmountRaw; // 99.9% after fee in raw units
      const sourceAmountRaw = Math.floor(amount * 1e8); // Full amount in raw units

      // zero payment transaction with special node
      const zeroPaymentTxn =
        algosdk.makePaymentTxnWithSuggestedParamsFromObject({
          from: activeAccount.address,
          to: activeAccount.address,
          amount: 0,
          suggestedParams,
          note: new TextEncoder().encode("unit-converter-zero-payment"),
        });

      // optin to asset
      const optinTxn =
        algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
          from: activeAccount.address,
          to: activeAccount.address,
          assetIndex: 40266690,
          amount: 0,
          suggestedParams,
        });

      // Transfer to Aramid bridge with recipient address in the note
      const transferTxn =
        algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
          from: activeAccount.address,
          to: "ARAMIDFJYV2TOFB5MRNZJIXBSAVZCVAUDAPFGKR5PNX4MTILGAZABBTXQQ",
          assetIndex: 747374,
          amount: sourceAmountRaw,
          suggestedParams,
          note: new TextEncoder().encode(
            `aramid-transfer/v1:j{"destinationNetwork":416101,"destinationAddress":"${activeAccount.address}","destinationToken":"40266690","feeAmount":${feeAmountRaw},"destinationAmount":${destinationAmountRaw},"note":"aramid","sourceAmount":${destinationAmountRaw}}`
          ),
        });

      // make atomic
      algosdk.assignGroupID([zeroPaymentTxn, optinTxn, transferTxn]);

      setRescueStatus("✍️ SIGNING ARAMID TRANSFER...");
      setRescueProgress(90);

      // Sign and submit transfer transaction
      const transferSigned = await signTransactions([
        algosdk.encodeUnsignedTransaction(zeroPaymentTxn),
        algosdk.encodeUnsignedTransaction(optinTxn),
        algosdk.encodeUnsignedTransaction(transferTxn),
      ]);

      setRescueStatus("📡 BROADCASTING ARAMID TRANSFER...");
      setRescueProgress(95);

      const { txId } = await algodClient
        .sendRawTransaction(transferSigned as Uint8Array[])
        .do();

      setRescueStatus("⏳ WAITING FOR FINAL CONFIRMATION...");
      setRescueProgress(98);

      await algosdk.waitForConfirmation(algodClient, txId, 4);

      setRescueProgress(100);
      setRescueStatus("✅ RESCUE MISSION SUCCESSFUL!");

      // Complete the rescue
      setTimeout(() => {
        setIsRescuing(false);
        setRescueProgress(0);
        setRescueStatus("");
        setGameMode(false);
        setSnakeGame(null);

        // Set success message
        const convertedAmount = amount - amount * 0.001;
        const feeAmount = amount * 0.001;
        setConversionResult(
          `🎉 Rescue Mission Successful! ${amount} total tokens converted to ${convertedAmount.toFixed(
            4
          )} UNIT\n` +
            `Mode: ${
              bridgeMode === "classic-only" ? "Classic Only" : "Full Rescue"
            }\n` +
            `Deployed: ${Math.min(amount, unitClassicBalance).toFixed(
              4
            )} UNIT Classic soldiers${
              bridgeMode === "full" &&
              Math.max(0, amount - unitClassicBalance) > 0
                ? ` + ${Math.max(0, amount - unitClassicBalance).toFixed(
                    4
                  )} ARC200 UNIT troops`
                : ""
            }\n` +
            `Bridge tax: ${feeAmount.toFixed(
              4
            )} tokens (small price for freedom)\n` +
            `Total cost: ${amount.toFixed(4)} tokens`
        );

        // Update balances
        setUnitClassicBalance(
          (prev) => prev - Math.min(amount, unitClassicBalance)
        );
        setUnitBalance(
          (prev) => prev - Math.max(0, amount - unitClassicBalance)
        );
        setConvertAmount("");
      }, 2000);
    } catch (error) {
      console.error("Rescue mission failed:", error);
      setRescueStatus("❌ RESCUE MISSION FAILED!");
      setRescueProgress(0);
      setTimeout(() => {
        setIsRescuing(false);
        setRescueStatus("");
      }, 3000);
    }
  };

  const handleGameOver = () => {
    if (snakeGame) {
      const totalConsumed =
        snakeGame.tokensConsumed.classic + snakeGame.tokensConsumed.unit;
      if (totalConsumed > 0) {
        // Proceed with transaction using consumed tokens
        setConvertAmount(totalConsumed.toFixed(8));
        setGameMode(false);
        setSnakeGame(null);
        // Auto-trigger conversion
        setTimeout(() => {
          handleConvert();
        }, 1000);
      }
    }
  };

  const handleConvert = async () => {
    if (!convertAmount || isNaN(Number(convertAmount)) || !activeAccount) {
      return;
    }

    const amount = Number(convertAmount);
    const totalAvailable = unitClassicBalance + unitBalance;

    if (amount <= 0) {
      setConversionResult("Please enter a valid amount greater than 0");
      return;
    }

    if (amount > totalAvailable) {
      setConversionResult(
        "Insufficient balance. Amount exceeds total available (UNIT Classic + UNIT)"
      );
      return;
    }

    // For classic-only mode, check if we have enough UNIT Classic
    if (bridgeMode === "classic-only" && amount > unitClassicBalance) {
      setConversionResult(
        "Insufficient UNIT Classic balance for classic-only mode. Switch to full mode or reduce amount."
      );
      return;
    }

    setIsLoading(true);

    try {
      // build transaction and sign
      const ci = new CONTRACT(420069, algodClient, undefined, abi.custom, {
        addr: activeAccount.address,
        sk: new Uint8Array(),
      });
      const builder = {
        unit: new CONTRACT(
          420069,
          algodClient,
          undefined,
          abi.nt200,
          {
            addr: activeAccount.address,
            sk: new Uint8Array(),
          },
          true,
          false,
          true
        ),
        saw200: new CONTRACT(
          747368,
          algodClient,
          undefined,
          {
            name: "saw200",
            desc: "saw200",
            methods: [
              {
                name: "deposit",
                args: [
                  {
                    type: "uint64",
                  },
                ],
                returns: {
                  type: "void",
                },
              },
            ],
            events: [],
          },
          {
            addr: activeAccount.address,
            sk: new Uint8Array(),
          },
          true,
          false,
          true
        ),
      };
      const buildN = [];

      // Calculate how much of each balance to use based on bridge mode
      let unitClassicToUse: number;
      let unitToUse: number;

      if (bridgeMode === "classic-only") {
        // Only use UNIT Classic tokens
        unitClassicToUse = Math.min(amount, unitClassicBalance);
        unitToUse = 0;
      } else {
        // Full mode: use UNIT Classic first, then ARC200 if needed
        unitClassicToUse = Math.min(amount, unitClassicBalance);
        unitToUse = Math.max(0, amount - unitClassicToUse);
      }

      // Step 1: ensure unit classic balance

      // If we need to use UNIT tokens, add approval and withdrawal transactions
      if (unitToUse > 0) {
        // Approve UNIT tokens for conversion
        const txnO = (
          await builder.unit.arc200_approve(
            algosdk.getApplicationAddress(747368),
            BigInt(new BigNumber(unitToUse).times(10 ** 8).toFixed(0))
          )
        )?.obj;
        const msg = `Approving ${unitToUse} UNIT for conversion`;
        buildN.push({
          ...txnO,
          note: new TextEncoder().encode(msg),
        });

        // Deposit arc200 unit to saw200
        const depositTxn = (await builder.saw200.deposit(unitToUse * 1e8)).obj;
        const assetOptin = {
          xaid: 747374,
          snd: activeAccount?.address || "",
          arcv: activeAccount?.address || "",
          xamt: 0,
        };
        buildN.push({
          ...depositTxn,
          ...assetOptin,
        });
      }

      if (buildN.length > 0) {
        ci.setEnableGroupResourceSharing(true);
        ci.setExtraTxns(buildN);
        ci.setFee(2000);
        const customR = await ci.custom();
        console.log({ customR });
        const stxns = await signTransactions(
          customR.txns.map(
            (txn: string) => new Uint8Array(Buffer.from(txn, "base64"))
          )
        );
        console.log({ stxns });
        const res = await algodClient
          .sendRawTransaction(stxns as Uint8Array[])
          .do();
        const txId = res.txId;
        await algosdk.waitForConfirmation(algodClient, txId, 4);
      }

      // Step 2: Do same network transfer using Aramid
      const suggestedParams = await algodClient.getTransactionParams().do();

      // Calculate fee and destination amount
      const feeAmountRaw = Math.floor(amount * 0.001 * 1e8); // 0.1% fee in raw units
      const destinationAmountRaw = Math.floor(amount * 1e8) - feeAmountRaw; // 99.9% after fee in raw units
      const sourceAmountRaw = Math.floor(amount * 1e8); // Full amount in raw units

      // zero payment transaction with special node
      const zeroPaymentTxn =
        algosdk.makePaymentTxnWithSuggestedParamsFromObject({
          from: activeAccount.address,
          to: activeAccount.address,
          amount: 0,
          suggestedParams,
          note: new TextEncoder().encode("unit-converter-zero-payment"),
        });

      // optin to asset
      const optinTxn =
        algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
          from: activeAccount.address,
          to: activeAccount.address,
          assetIndex: 40266690,
          amount: 0,
          suggestedParams,
        });

      // Transfer to Aramid bridge with recipient address in the note
      const transferTxn =
        algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
          from: activeAccount.address,
          to: "ARAMIDFJYV2TOFB5MRNZJIXBSAVZCVAUDAPFGKR5PNX4MTILGAZABBTXQQ",
          assetIndex: 747374,
          amount: sourceAmountRaw,
          suggestedParams,
          note: new TextEncoder().encode(
            `aramid-transfer/v1:j{"destinationNetwork":416101,"destinationAddress":"${activeAccount.address}","destinationToken":"40266690","feeAmount":${feeAmountRaw},"destinationAmount":${destinationAmountRaw},"note":"aramid","sourceAmount":${destinationAmountRaw}}`
          ),
        });

      // make atomic
      algosdk.assignGroupID([zeroPaymentTxn, optinTxn, transferTxn]);

      // Sign and submit transfer transaction
      const transferSigned = await signTransactions([
        algosdk.encodeUnsignedTransaction(zeroPaymentTxn),
        algosdk.encodeUnsignedTransaction(optinTxn),
        algosdk.encodeUnsignedTransaction(transferTxn),
      ]);

      const { txId } = await algodClient
        .sendRawTransaction(transferSigned as Uint8Array[])
        .do();
      await algosdk.waitForConfirmation(algodClient, txId, 4);

      const convertedAmount = getConvertedAmount(amount);
      const feeAmount = getFeeAmount(amount);
      const totalAmount = getTotalAmount(amount);

      setConversionResult(
        `🎉 Rescue Mission Successful! ${amount} total tokens converted to ${convertedAmount.toFixed(
          4
        )} UNIT\n` +
          `Mode: ${
            bridgeMode === "classic-only" ? "Classic Only" : "Full Rescue"
          }\n` +
          `Deployed: ${unitClassicToUse.toFixed(4)} UNIT Classic soldiers${
            bridgeMode === "full" && unitToUse > 0
              ? ` + ${unitToUse.toFixed(4)} ARC200 UNIT troops`
              : ""
          }\n` +
          `Bridge tax: ${feeAmount.toFixed(
            4
          )} tokens (small price for freedom)\n` +
          `Total cost: ${totalAmount.toFixed(4)} tokens`
      );

      // Update balances (in real implementation, this would come from the blockchain)
      setUnitClassicBalance((prev) => prev - unitClassicToUse);
      setUnitBalance((prev) => prev - unitToUse);

      setConvertAmount("");
    } catch (error) {
      console.error(error);
      setConversionResult("Conversion failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleMaxAmount = () => {
    // Use the actual UNIT Classic balance from the wallet
    setConvertAmount((unitClassicBalance + unitBalance).toFixed(8));
  };

  const currentAmount = Number(convertAmount) || 0;
  const feeAmount = getFeeAmount(currentAmount);
  const totalAmount = getTotalAmount(currentAmount);
  const convertedAmount = getConvertedAmount(currentAmount);

  if (gameMode && snakeGame) {
    return (
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100vw",
          height: "100vh",
          background:
            "linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #16213e 100%)",
          zIndex: 9999,
          overflow: "hidden",
          fontFamily: "'Courier New', monospace",
        }}
      >
        <div
          style={{
            textAlign: "center",
            padding: "clamp(0.3rem, 1vw, 0.5rem)",
            background: "rgba(0, 0, 0, 0.9)",
            borderBottom: "2px solid #ff00ff",
            boxShadow: "0 0 20px rgba(255, 0, 255, 0.6)",
            position: "relative",
            minHeight: compactMode ? "clamp(60px, 6vh, 80px)" : "clamp(80px, 8vh, 120px)",
            maxHeight: compactMode ? "clamp(70px, 7vh, 90px)" : "clamp(100px, 12vh, 150px)",
          }}
        >
          <button
            onClick={() => {
              setGameMode(false);
              setSnakeGame(null);
            }}
            style={{
              position: "absolute",
              top: "1rem",
              right: "1rem",
              padding: "0.5rem 1rem",
              background: "linear-gradient(45deg, #ff0000, #800000)",
              color: "#fff",
              border: "2px solid #ffff00",
              borderRadius: "0",
              fontFamily: "'Courier New', monospace",
              fontWeight: "600",
              cursor: "pointer",
              textTransform: "uppercase",
              fontSize: "0.8rem",
              zIndex: 10000,
            }}
          >
            ❌ EXIT
          </button>
          <button
            onClick={() => setCompactMode(!compactMode)}
            style={{
              position: "absolute",
              top: "1rem",
              right: "5rem",
              padding: "0.5rem 0.8rem",
              background: compactMode ? "linear-gradient(45deg, #00ff00, #008000)" : "rgba(0, 0, 0, 0.7)",
              color: compactMode ? "#000" : "#00ff00",
              border: "2px solid #00ff00",
              borderRadius: "0",
              fontFamily: "'Courier New', monospace",
              fontWeight: "600",
              cursor: "pointer",
              textTransform: "uppercase",
              fontSize: "0.7rem",
              zIndex: 10000,
            }}
          >
            {compactMode ? "📱" : "🖥️"}
          </button>
          <div
            style={{
              fontSize: "clamp(1.2rem, 3vw, 2.5rem)",
              color: "#ff00ff",
              marginBottom: "clamp(0.2rem, 0.5vw, 0.5rem)",
              fontFamily: "'Courier New', monospace",
              fontWeight: "bold",
              textShadow: "2px 2px 0px #000, 0 0 20px rgba(255, 0, 255, 0.8)",
              animation: "titleGlow 1s ease-in-out infinite alternate",
            }}
          >
            🐍 SNAKE RESCUE MISSION 🐍
          </div>
          <div
            style={{
              fontSize: "clamp(0.7rem, 1.8vw, 1.2rem)",
              color: "#00ff00",
              marginBottom: "clamp(0.2rem, 0.4vw, 0.5rem)",
              lineHeight: "1.2",
            }}
          >
            Score: {snakeGame.score} | Classic: {snakeGame.tokensConsumed.classic.toFixed(4)} | UNIT: {snakeGame.tokensConsumed.unit.toFixed(4)} | 🔴 {snakeGame.fakeUnitCount}
          </div>
          {snakeGame.pendingGrowth && (
            <div
              style={{
                fontSize: "clamp(0.6rem, 1.5vw, 1rem)",
                color: "#ffff00",
                marginBottom: "clamp(0.1rem, 0.3vw, 0.5rem)",
                fontFamily: "'Courier New', monospace",
                fontWeight: "600",
                animation: "textGlow 1s ease-in-out infinite alternate",
              }}
            >
              🌱 GROWTH PENDING... {Math.max(0, Math.ceil((difficultyGrowthDelays[gameDifficulty] - (Date.now() - snakeGame.lastGrowthTime)) / 1000))}s
            </div>
          )}
          <div
            style={{
              fontSize: "clamp(0.6rem, 1.5vw, 1rem)",
              color: "#ffff00",
              marginBottom: "clamp(0.1rem, 0.3vw, 0.5rem)",
              lineHeight: "1.1",
            }}
          >
            Per Square: Classic {Math.max(0.001, unitClassicBalance * 0.01).toFixed(4)} | UNIT {Math.max(0.001, unitBalance * 0.01).toFixed(4)}
          </div>
          <div
            style={{
              fontSize: "clamp(0.6rem, 1.5vw, 1rem)",
              color: "#ffff00",
              marginBottom: "clamp(0.1rem, 0.3vw, 0.5rem)",
              lineHeight: "1.1",
            }}
          >
            Difficulty: {gameDifficulty.toUpperCase()} | Grid: {snakeGame.grid.length}x{snakeGame.grid.length} | 🟠 {snakeGame.grid.flat().filter((cell) => cell === 1).length} | 🔵 {snakeGame.grid.flat().filter((cell) => cell === 2).length} | 🔴 {snakeGame.fakeUnitCount}
          </div>
          {snakeGame.fakeUnitCount > 0 && (
            <div
              style={{
                fontSize: "clamp(0.6rem, 1.5vw, 1rem)",
                color: "#ff0000",
                marginBottom: "clamp(0.1rem, 0.3vw, 0.5rem)",
                fontFamily: "'Courier New', monospace",
                fontWeight: "600",
                animation: "textGlow 1s ease-in-out infinite alternate",
                textShadow: "1px 1px 0px #000",
              }}
            >
              ⚠️ WARNING: {snakeGame.fakeUnitCount} FAKE UNIT on grid! Eating them removes 25% of your tokens!
            </div>
          )}
          {(() => {
            const totalCells = snakeGame.grid.length * snakeGame.grid.length;
            const totalTokens = snakeGame.grid
              .flat()
              .filter((cell) => cell > 0).length;
            const tokenPercentage = ((totalTokens / totalCells) * 100).toFixed(
              1
            );
            const maxPercentage = 80;

            // Calculate balance-based limits
            const classicTokensOnGrid = snakeGame.grid
              .flat()
              .filter((cell) => cell === 1).length;
            const unitTokensOnGrid = snakeGame.grid
              .flat()
              .filter((cell) => cell === 2).length;
            const classicBalanceLimit = Math.floor(
              (unitClassicBalance - snakeGame.tokensConsumed.classic) * 1000
            );
            const unitBalanceLimit = Math.floor(
              (unitBalance - snakeGame.tokensConsumed.unit) * 1000
            );

            if (totalTokens >= totalCells * 0.8) {
                          return (
              <div
                style={{
                  fontSize: "clamp(0.5rem, 1.2vw, 0.8rem)",
                  color: "#ff0000",
                  marginBottom: "clamp(0.1rem, 0.2vw, 0.5rem)",
                  fontFamily: "'Courier New', monospace",
                  fontWeight: "600",
                  animation: "textGlow 1s ease-in-out infinite alternate",
                  lineHeight: "1.1",
                }}
              >
                🚫 GRID CAPACITY: {tokenPercentage}% filled (Max: {maxPercentage}%)
              </div>
            );
          } else if (
            classicTokensOnGrid >= classicBalanceLimit ||
            unitTokensOnGrid >= unitBalanceLimit
          ) {
            return (
              <div
                style={{
                  fontSize: "clamp(0.5rem, 1.2vw, 0.8rem)",
                  color: "#ff8000",
                  marginBottom: "clamp(0.1rem, 0.2vw, 0.5rem)",
                  fontFamily: "'Courier New', monospace",
                  fontWeight: "600",
                  animation: "textGlow 1s ease-in-out infinite alternate",
                  lineHeight: "1.1",
                }}
              >
                ⚠️ BALANCE LIMIT: Classic {classicTokensOnGrid}/{classicBalanceLimit} | UNIT {unitTokensOnGrid}/{unitBalanceLimit}
              </div>
            );
          } else {
            return (
              <div
                style={{
                  fontSize: "clamp(0.5rem, 1.2vw, 0.8rem)",
                  color: "#00ff00",
                  marginBottom: "clamp(0.1rem, 0.2vw, 0.5rem)",
                  fontFamily: "'Courier New', monospace",
                  lineHeight: "1.1",
                }}
              >
                📊 Grid: {tokenPercentage}% filled ({totalTokens}/{totalCells}) - NO RESPAWNING
              </div>
            );
          }
          })()}

          {/* Hunger Indicator */}
          <div
            style={{
              fontSize: "clamp(0.5rem, 1.2vw, 0.8rem)",
              color: "#ff8000",
              marginBottom: "clamp(0.1rem, 0.2vw, 0.5rem)",
              textAlign: "center",
              lineHeight: "1.1",
            }}
          >
            {(() => {
              const currentTime = Date.now();
              const timeSinceLastFood = currentTime - snakeGame.lastFoodEaten;
              const shrinkThreshold = 3000;
              const shrinkInterval = 8000;

              if (timeSinceLastFood < shrinkThreshold) {
                return "🟢 Snake is well-fed";
              } else if (timeSinceLastFood < shrinkThreshold + shrinkInterval) {
                return "🟡 Snake is getting hungry (1st cycle)";
              } else {
                const hungerCycles = Math.floor(
                  (timeSinceLastFood - shrinkThreshold) / shrinkInterval
                );
                const criticalThreshold = snakeGame.snake.length - 1;

                if (hungerCycles < criticalThreshold) {
                  // Snake is hungry but not critical yet
                  const cyclesUntilCritical = criticalThreshold - hungerCycles;
                  return `🟡 Hungry! ${cyclesUntilCritical} cycles until critical`;
                } else if (hungerCycles >= criticalThreshold) {
                  // Snake is in critical status - losing segments rapidly
                  const segmentsLost = Math.min(
                    hungerCycles - criticalThreshold + 1,
                    snakeGame.snake.length - 1
                  );
                  const segmentsRemaining =
                    snakeGame.snake.length - segmentsLost;

                  if (segmentsRemaining > 1) {
                    return `🟠 Critical! Lost ${segmentsLost} segments, ${segmentsRemaining} left`;
                  } else if (segmentsRemaining === 1) {
                    // Check if this is a fresh critical status (recently reset)
                    const timeSinceCritical =
                      currentTime - snakeGame.lastFoodEaten;
                    if (timeSinceCritical < shrinkThreshold) {
                      return `🔴 Critical but timer reset! Find food quick!`;
                    } else {
                      return `🔴 Critical! Only 1 segment left!`;
                    }
                  } else {
                    return `💀 Snake is dead!`;
                  }
                } else {
                  return `🟢 Snake is well-fed`;
                }
              }
            })()}
          </div>
        </div>

        <div
          style={{
            background: "rgba(0, 0, 0, 0.9)",
            border: "none",
            borderRadius: "0",
            padding: "0",
            textAlign: "center",
            boxShadow: "none",
            height: compactMode ? "calc(100vh - clamp(60px, 6vh, 80px))" : "calc(100vh - clamp(80px, 8vh, 120px))",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            overflow: "hidden",
          }}
        >
          {snakeGame.gameOver ? (
            <div>
              <div
                style={{
                  fontSize: "1.5rem",
                  color: "#ff0000",
                  marginBottom: "1rem",
                  fontFamily: "'Courier New', monospace",
                  fontWeight: "bold",
                }}
              >
                🚨 GAME OVER! 🚨
              </div>
              <div
                style={{
                  fontSize: "clamp(0.9rem, 2.5vw, 1.2rem)",
                  color: "#ffff00",
                  marginBottom: "2rem",
                }}
              >
                Final Score: {snakeGame.score}
                <br />
                Tokens Consumed: {snakeGame.tokensConsumed.classic.toFixed(
                  6
                )}{" "}
                UNIT Classic + {snakeGame.tokensConsumed.unit.toFixed(6)} UNIT
                <br />
                <span style={{ fontSize: "0.8rem", color: "#00ff00" }}>
                  Per Square: Classic{" "}
                  {Math.max(0.001, unitClassicBalance * 0.01).toFixed(6)} | UNIT{" "}
                  {Math.max(0.001, unitBalance * 0.01).toFixed(6)}
                </span>
              </div>

              {/* Rescue Unit Button - Only show if tokens were consumed */}
              {snakeGame.tokensConsumed.classic > 0 ||
              snakeGame.tokensConsumed.unit > 0 ? (
                <div
                  style={{
                    marginBottom: "2rem",
                    textAlign: "center",
                  }}
                >
                  <div
                    style={{
                      fontSize: "clamp(0.8rem, 2vw, 1.1rem)",
                      color: "#00ff00",
                      marginBottom: "1rem",
                      fontFamily: "'Courier New', monospace",
                      fontWeight: "600",
                    }}
                  >
                    🚁 MISSION ACCOMPLISHED! READY TO RESCUE!
                  </div>
                  <button
                    onClick={() => {
                      const totalConsumed =
                        snakeGame.tokensConsumed.classic +
                        snakeGame.tokensConsumed.unit;
                      console.log(
                        `Game Over Rescue button clicked! Total consumed: ${totalConsumed.toFixed(
                          6
                        )}`
                      );
                      console.log(
                        `Classic: ${snakeGame.tokensConsumed.classic.toFixed(
                          6
                        )}, UNIT: ${snakeGame.tokensConsumed.unit.toFixed(6)}`
                      );

                      setConvertAmount(totalConsumed.toFixed(3));
                      setIsRescuing(true);
                      setRescueProgress(0);
                      setRescueStatus("🚁 INITIATING RESCUE MISSION...");

                      // Start rescue animation and transaction
                      startRescueMission(totalConsumed);
                    }}
                    style={{
                      padding:
                        "clamp(1rem, 2.5vw, 1.5rem) clamp(2rem, 5vw, 3rem)",
                      background: "linear-gradient(45deg, #ff0000, #ff8000)",
                      color: "#fff",
                      border: "3px solid #ffff00",
                      borderRadius: "0",
                      fontFamily: "'Courier New', monospace",
                      fontWeight: "600",
                      cursor: "pointer",
                      textTransform: "uppercase",
                      fontSize: "clamp(1rem, 2.5vw, 1.4rem)",
                      textShadow: "2px 2px 0px #000",
                      boxShadow: "0 0 25px rgba(255, 0, 0, 0.7)",
                      transition: "all 0.2s",
                      marginBottom: "1rem",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = "translateY(-3px)";
                      e.currentTarget.style.boxShadow =
                        "0 0 35px rgba(255, 0, 0, 0.9)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = "translateY(0)";
                      e.currentTarget.style.boxShadow =
                        "0 0 25px rgba(255, 0, 0, 0.7)";
                    }}
                  >
                    🚁 RESCUE{" "}
                    {(
                      (snakeGame.tokensConsumed.classic +
                        snakeGame.tokensConsumed.unit) *
                      1000
                    ).toFixed(0)}{" "}
                    TOKENS!
                  </button>
                </div>
              ) : null}

              <div
                style={{
                  display: "flex",
                  gap: "1rem",
                  justifyContent: "center",
                  flexWrap: "wrap",
                }}
              >
                <button
                  onClick={() => {
                    setGameMode(false);
                    setSnakeGame(null);
                  }}
                  style={{
                    padding:
                      "clamp(0.8rem, 2vw, 1.5rem) clamp(1.5rem, 4vw, 2.5rem)",
                    background: "linear-gradient(45deg, #666666, #444444)",
                    color: "#fff",
                    border: "2px solid #888",
                    borderRadius: "0",
                    fontFamily: "'Courier New', monospace",
                    fontWeight: "600",
                    cursor: "pointer",
                    textTransform: "uppercase",
                    fontSize: "clamp(0.8rem, 2vw, 1.2rem)",
                  }}
                >
                  🏠 RETURN TO BASE
                </button>
                <button
                  onClick={initializeSnakeGame}
                  style={{
                    padding:
                      "clamp(0.8rem, 2vw, 1.5rem) clamp(1.5rem, 4vw, 2.5rem)",
                    background: "linear-gradient(45deg, #00ff00, #008000)",
                    color: "#000",
                    border: "2px solid #ffff00",
                    borderRadius: "0",
                    fontFamily: "'Courier New', monospace",
                    fontWeight: "600",
                    cursor: "pointer",
                    textTransform: "uppercase",
                    fontSize: "clamp(0.8rem, 2vw, 1.2rem)",
                  }}
                >
                  🐍 TRY AGAIN
                </button>
              </div>
            </div>
          ) : (
            <div style={{ position: "relative" }}>
              {/* Game Paused Indicator */}
              {isRescuing && (
                <div
                  style={{
                    position: "absolute",
                    top: "50%",
                    left: "50%",
                    transform: "translate(-50%, -50%)",
                    background: "rgba(0, 0, 0, 0.9)",
                    border: "3px solid #ff00ff",
                    borderRadius: "0",
                    padding: "2rem",
                    zIndex: 9999,
                    textAlign: "center",
                    boxShadow: "0 0 30px rgba(255, 0, 255, 0.8)",
                  }}
                >
                  <div
                    style={{
                      fontSize: "clamp(1.5rem, 4vw, 2.5rem)",
                      color: "#ff00ff",
                      marginBottom: "1rem",
                      fontFamily: "'Courier New', monospace",
                      fontWeight: "bold",
                      textShadow: "2px 2px 0px #000",
                    }}
                  >
                    ⏸️ GAME PAUSED
                  </div>
                  <div
                    style={{
                      fontSize: "clamp(1rem, 2.5vw, 1.2rem)",
                      color: "#00ff00",
                      fontFamily: "'Courier New', monospace",
                    }}
                  >
                    Rescue mission in progress...
                  </div>
                </div>
              )}

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: `repeat(${snakeGame.grid.length}, 1fr)`,
                  gap: "1px",
                  width: compactMode ? "min(95vw, calc(100vh - clamp(60px, 6vh, 80px)))" : "min(95vw, calc(100vh - clamp(80px, 8vh, 120px)))",
                  height: compactMode ? "min(95vw, calc(100vh - clamp(60px, 6vh, 80px)))" : "min(95vw, calc(100vh - clamp(80px, 8vh, 120px)))",
                  margin: "0 auto",
                  border: "2px solid #00ffff",
                  background: "#000",
                  boxShadow: "0 0 30px rgba(0, 255, 255, 0.6)",
                  maxWidth: "none",
                  maxHeight: "none",
                }}
              >
                {Array.from(
                  { length: snakeGame.grid.length * snakeGame.grid.length },
                  (_, i) => {
                    const x = i % snakeGame.grid.length;
                    const y = Math.floor(i / snakeGame.grid.length);
                    const cellType = snakeGame.grid[x][y];
                    const isSnake = snakeGame.snake.some(
                      (segment) => segment[0] === x && segment[1] === y
                    );
                    const isFood =
                      snakeGame.food[0] === x && snakeGame.food[1] === y;

                    let backgroundColor = "#000";
                    if (isSnake) {
                      // Check if this is the head and growth is pending
                      const isHead =
                        snakeGame.snake[0][0] === x &&
                        snakeGame.snake[0][1] === y;
                      if (isHead && snakeGame.pendingGrowth) {
                        backgroundColor = "#ffff00"; // Yellow head when growth pending
                      } else {
                        backgroundColor = "#00ff00"; // Normal green
                      }
                    } else if (isFood) backgroundColor = "#ffff00";
                    else if (cellType === 1)
                      backgroundColor = "#ff8000"; // UNIT Classic - Orange
                    else if (cellType === 2) backgroundColor = "#00ffff"; // UNIT - Cyan
                    else if (cellType === 3) backgroundColor = "#ff0000"; // FAKE UNIT - Red

                    return (
                      <div
                        key={i}
                        style={{
                          width: "100%",
                          height: "100%",
                          backgroundColor,
                          border: isSnake ? "1px solid #008000" : "none",
                          minWidth: "2px",
                          minHeight: "2px",
                        }}
                      />
                    );
                  }
                )}
              </div>

              {/* Rescue Animation Overlay */}
              {isRescuing && (
                <div
                  style={{
                    position: "fixed",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: "rgba(0, 0, 0, 0.85)",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    alignItems: "center",
                    zIndex: 10000,
                    border: "3px solid #ff00ff",
                    boxShadow: "0 0 30px rgba(255, 0, 255, 0.8)",
                  }}
                >
                  <div
                    style={{
                      fontSize: "clamp(1.5rem, 4vw, 2.5rem)",
                      color: "#ff00ff",
                      marginBottom: "2rem",
                      fontFamily: "'Courier New', monospace",
                      fontWeight: "bold",
                      textAlign: "center",
                      textShadow:
                        "2px 2px 0px #000, 0 0 20px rgba(255, 0, 255, 0.8)",
                      animation: "titleGlow 1s ease-in-out infinite alternate",
                    }}
                  >
                    🚁 RESCUE MISSION IN PROGRESS
                  </div>

                  <div
                    style={{
                      fontSize: "clamp(1rem, 2.5vw, 1.5rem)",
                      color: "#00ff00",
                      marginBottom: "2rem",
                      fontFamily: "'Courier New', monospace",
                      fontWeight: "600",
                      textAlign: "center",
                      textShadow: "1px 1px 0px #000",
                    }}
                  >
                    {rescueStatus}
                  </div>

                  <div
                    style={{
                      width: "80%",
                      maxWidth: "400px",
                      height: "30px",
                      background: "rgba(0, 0, 0, 0.8)",
                      border: "2px solid #00ffff",
                      borderRadius: "0",
                      overflow: "hidden",
                      marginBottom: "2rem",
                    }}
                  >
                    <div
                      style={{
                        width: `${rescueProgress}%`,
                        height: "100%",
                        transition: "width 0.5s ease-in-out",
                        boxShadow: "0 0 10px rgba(0, 255, 255, 0.6)",
                        background:
                          "linear-gradient(90deg, #00ff00, #00ffff, #00ff00)",
                      }}
                    />
                  </div>

                  <div
                    style={{
                      fontSize: "clamp(0.8rem, 2vw, 1.1rem)",
                      color: "#ffff00",
                      textAlign: "center",
                      fontFamily: "'Courier New', monospace",
                      fontStyle: "italic",
                    }}
                  >
                    {rescueProgress === 100
                      ? "Preparing to complete rescue..."
                      : "Please wait while we rescue your tokens..."}
                  </div>
                </div>
              )}

              <div
                style={{
                  marginTop: "1rem",
                  fontSize: "clamp(0.7rem, 1.5vw, 1rem)",
                  color: "#ffff00",
                  textAlign: "center",
                }}
              >
                <div>
                  🟠 UNIT Classic | 🔵 UNIT | 🟢 Snake | 🟡 Food | 🔴 FAKE UNIT | 🟡 Snake Head (Growth Pending)
                </div>
                <div style={{ marginTop: "0.5rem" }}>
                  Use arrow keys to control the snake and eat tokens!
                </div>
              </div>

              {/* Rescue Unit Button - Only show if tokens have been consumed */}
              {(() => {
                const hasTokens =
                  snakeGame.tokensConsumed.classic > 0 ||
                  snakeGame.tokensConsumed.unit > 0;
                console.log(
                  `Rescue button check: Classic ${snakeGame.tokensConsumed.classic.toFixed(
                    6
                  )}, UNIT ${snakeGame.tokensConsumed.unit.toFixed(
                    6
                  )}, Show: ${hasTokens}`
                );
                return hasTokens;
              })() ? (
                <div
                  style={{
                    marginTop: "1.5rem",
                    textAlign: "center",
                  }}
                >
                  <div
                    style={{
                      fontSize: "clamp(0.8rem, 2vw, 1.1rem)",
                      color: "#00ff00",
                      marginBottom: "1rem",
                      fontFamily: "'Courier New', monospace",
                      fontWeight: "600",
                    }}
                  >
                    🚁 READY TO RESCUE TOKENS!
                  </div>
                  <div
                    style={{
                      fontSize: "clamp(0.7rem, 1.8vw, 0.9rem)",
                      color: "#ffff00",
                      marginBottom: "1rem",
                    }}
                  >
                    Consumed: {snakeGame.tokensConsumed.classic.toFixed(6)} UNIT
                    Classic + {snakeGame.tokensConsumed.unit.toFixed(6)} UNIT
                  </div>
                  <button
                    onClick={() => {
                      const totalConsumed =
                        snakeGame.tokensConsumed.classic +
                        snakeGame.tokensConsumed.unit;
                      console.log(
                        `In-Game Rescue button clicked! Total consumed: ${totalConsumed.toFixed(
                          6
                        )}`
                      );
                      console.log(
                        `Classic: ${snakeGame.tokensConsumed.classic.toFixed(
                          6
                        )}, UNIT: ${snakeGame.tokensConsumed.unit.toFixed(6)}`
                      );

                      setConvertAmount(totalConsumed.toFixed(3));
                      setIsRescuing(true);
                      setRescueProgress(0);
                      setRescueStatus("🚁 INITIATING RESCUE MISSION...");

                      // Start rescue animation and transaction
                      startRescueMission(totalConsumed);
                    }}
                    style={{
                      padding:
                        "clamp(0.8rem, 2vw, 1.2rem) clamp(1.5rem, 4vw, 2.5rem)",
                      background: "linear-gradient(45deg, #ff0000, #ff8000)",
                      color: "#fff",
                      border: "3px solid #ffff00",
                      borderRadius: "0",
                      fontFamily: "'Courier New', monospace",
                      fontWeight: "600",
                      cursor: "pointer",
                      textTransform: "uppercase",
                      fontSize: "clamp(0.9rem, 2.2vw, 1.3rem)",
                      textShadow: "2px 2px 0px #000",
                      boxShadow: "0 0 20px rgba(255, 0, 0, 0.6)",
                      transition: "all 0.2s",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = "translateY(-3px)";
                      e.currentTarget.style.boxShadow =
                        "0 0 30px rgba(255, 0, 0, 0.8)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = "translateY(0)";
                      e.currentTarget.style.boxShadow =
                        "0 0 20px rgba(255, 0, 0, 0.6)";
                    }}
                  >
                    🚁 RESCUE{" "}
                    {(
                      (snakeGame.tokensConsumed.classic +
                        snakeGame.tokensConsumed.unit) *
                      1000
                    ).toFixed(0)}{" "}
                    TOKENS!
                  </button>
                  <div
                    style={{
                      fontSize: "clamp(0.6rem, 1.5vw, 0.8rem)",
                      color: "#00ff00",
                      marginTop: "0.5rem",
                      fontFamily: "'Courier New', monospace",
                      fontStyle: "italic",
                    }}
                  >
                    Continue playing or rescue your tokens now!
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <Container>
      <div
        style={{
          textAlign: "center",
          marginBottom: "2rem",
          position: "relative",
        }}
      >
        {/* Retro pixel decorations */}
        <div
          style={{
            position: "absolute",
            top: "-20px",
            left: "50%",
            transform: "translateX(-50%)",
            fontSize: "24px",
            color: "#00ffff",
            textShadow: "2px 2px 0px #000",
            animation: "pixelFloat 3s ease-in-out infinite",
          }}
        >
          ████
        </div>
        <div
          style={{
            position: "absolute",
            top: "20px",
            left: "20%",
            fontSize: "16px",
            color: "#00ff00",
            textShadow: "1px 1px 0px #000",
            animation: "pixelFloat 2s ease-in-out infinite 1s",
          }}
        >
          ██
        </div>
        <div
          style={{
            position: "absolute",
            top: "40px",
            right: "20%",
            fontSize: "20px",
            color: "#ffff00",
            textShadow: "1px 1px 0px #000",
            animation: "pixelFloat 2.5s ease-in-out infinite 0.5s",
          }}
        >
          ███
        </div>

        <img
          src="/img/rescue-monster.png"
          alt="Friendly rescue monster"
          style={{
            width: "150px",
            height: "auto",
            marginBottom: "1rem",
            filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.3))",
            animation: "monsterBounce 2s ease-in-out infinite",
          }}
        />

        {/* Bottom pixel decorations */}
        <div
          style={{
            position: "absolute",
            bottom: "-20px",
            left: "30%",
            fontSize: "18px",
            color: "#ff00ff",
            textShadow: "1px 1px 0px #000",
            animation: "pixelFloat 2.8s ease-in-out infinite 0.8s",
          }}
        >
          ██
        </div>
        <div
          style={{
            position: "absolute",
            bottom: "-10px",
            right: "30%",
            fontSize: "14px",
            color: "#00ffff",
            textShadow: "1px 1px 0px #000",
            animation: "pixelFloat 3.2s ease-in-out infinite 1.2s",
          }}
        >
          █
        </div>
        <Title style={{ marginBottom: "0.5rem" }}>UNIT Rescue Mission</Title>
        <div
          style={{
            fontSize: "1.1rem",
            color: "var(--text-secondary)",
            fontWeight: "500",
            maxWidth: "400px",
            margin: "0 auto",
          }}
        >
          Ready to rescue those stranded tokens? Let's get them back where they
          belong! 🚁
        </div>
        <div
          style={{
            fontSize: "0.9rem",
            color: "#00ff00",
            marginTop: "0.5rem",
            fontFamily: "'Courier New', monospace",
            fontWeight: "600",
            textShadow: "1px 1px 0px #000",
            animation: "textGlow 1.5s ease-in-out infinite alternate",
          }}
        >
          * BEEP * * BOOP * * RESCUE MISSION INITIATED *
        </div>
      </div>

      <ConverterCard>
        <BridgeInfo>
          <BridgeTitle>🔄 Aramid Bridge</BridgeTitle>
          <BridgeDescription>
            Got some worthless 747374 or 40266690 tokens stuck in the bridge? No
            worries! I'll help you rescue them and turn them into pure and
            beautiful 420069 tokens using Aramid Bridge. Just a tiny 0.1% fee
            for the rescue operation.
          </BridgeDescription>
        </BridgeInfo>

        <div style={{ margin: "2rem 0" }}>
          <Disclaimer>
            <DisclaimerTitle>💡 What This Tool Does</DisclaimerTitle>
            <DisclaimerText>
              This rescue tool is for those special 747374 and 40266690 tokens
              that got left behind when the bridge was built. Think of them as
              the forgotten soldiers that need extraction! Currently, we're
              doing a rescue to 40266690 tokens, which you can use on Aramid
              Bridge or HumbleSwap. At a future date, this tool will convert
              directly into beautiful 420069 tokens. If you've already rescued
              your tokens or have the good stuff, you're all set!
            </DisclaimerText>
          </Disclaimer>
        </div>

        <div style={{ margin: "2rem 0" }}>
          <Disclaimer
            style={{ background: "#fee2e2", border: "1px solid #fecaca" }}
          >
            <DisclaimerTitle style={{ color: "#dc2626" }}>
              ⚠️ Important Legal Notice
            </DisclaimerTitle>
            <DisclaimerText style={{ color: "#dc2626" }}>
              We are not responsible for any failures, including tokens that get
              stuck in the bridge, lost transactions, or any other issues that
              may occur during the rescue operation. Use this tool at your own
              risk. While we've designed it to be helpful, blockchain operations
              can be unpredictable and we cannot guarantee 100% success.
            </DisclaimerText>
            <label
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.75rem",
                fontSize: "1rem",
                fontWeight: "600",
                color: "#dc2626",
                marginTop: "1rem",
                paddingTop: "1rem",
                borderTop: "1px solid #fecaca",
              }}
            >
              <input
                type="checkbox"
                checked={legalAcknowledged}
                onChange={(e) => setLegalAcknowledged(e.target.checked)}
                style={{
                  margin: 0,
                  width: "18px",
                  height: "18px",
                  accentColor: "#dc2626",
                }}
              />
              I acknowledge and accept the risks associated with using this tool
            </label>
          </Disclaimer>
        </div>

        <div style={{ margin: "2rem 0" }}>
          <BalanceSection>
            <BalanceTitle>Your Token Inventory</BalanceTitle>
            <BalanceGrid>
              <BalanceItem>
                <BalanceLabel>Play UNIT</BalanceLabel>
                <BalanceValue>
                  {(unitClassicBalance + unitBalance).toLocaleString()}
                </BalanceValue>
              </BalanceItem>
            </BalanceGrid>

            {/* Rescue More Unit Button */}
            {unitClassicBalance + unitBalance < 1 ? (
              <div
                style={{
                  marginTop: "1.5rem",
                  textAlign: "center",
                  padding: "1rem",
                  background: "rgba(128, 128, 128, 0.2)",
                  border: "2px solid #666",
                  borderRadius: "0",
                }}
              >
                <div
                  style={{
                    fontSize: "0.9rem",
                    color: "#888",
                    fontFamily: "'Courier New', monospace",
                    fontStyle: "italic",
                  }}
                >
                  🚫 Need Play UNIT balance &gt; 1 to make playable
                </div>
              </div>
            ) : null}
            
            {/* Need More Play UNIT? Section */}
            <div style={{ 
              marginTop: "1.5rem", 
              padding: "1rem",
              background: "rgba(0, 0, 0, 0.7)",
              border: "2px solid #00ff00",
              borderRadius: "0",
              textAlign: "center"
            }}>
              <div style={{
                fontSize: "0.9rem",
                color: "#00ff00",
                marginBottom: "0.5rem",
                fontFamily: "'Courier New', monospace",
                fontWeight: "600",
                textShadow: "1px 1px 0px #000"
              }}>
                🚁 Need more Play UNIT?
              </div>
              <div style={{
                fontSize: "0.7rem",
                color: "#ffff00",
                fontFamily: "'Courier New', monospace",
                fontStyle: "italic",
                textShadow: "1px 1px 0px #000",
                lineHeight: "1.4"
              }}>
                <strong>Directions:</strong><br/>
                • Bridge UNIT from Algorand using Aramid Bridge<br/>
                • Swap tokens on HumbleSwap<br/>
                • Use the rescue mission below to convert stranded tokens<br/>
                • Check your wallet for any hidden UNIT balances
              </div>
              <div style={{
                fontSize: "0.7rem",
                color: "#00ffff",
                fontFamily: "'Courier New', monospace",
                fontStyle: "italic",
                textShadow: "1px 1px 0px #000",
                lineHeight: "1.4",
                marginTop: "0.5rem",
                padding: "0.5rem",
                background: "rgba(0, 255, 255, 0.1)",
                border: "1px solid #00ffff",
                borderRadius: "0"
              }}>
                <strong>💡 Pro tip:</strong> Sell UNIT for VOI and buy back, or exchange any token for UNIT on HumbleSwap!
              </div>
            </div>
          </BalanceSection>
        </div>

        <div
          id="rescue-section"
          style={{
            margin: "2rem 0",
            padding: "1.5rem",
            background: "rgba(0, 0, 0, 0.9)",
            borderRadius: "0",
            border: "3px solid #00ffff",
            textAlign: "center",
            boxShadow: "0 0 20px rgba(0, 255, 255, 0.4)",
            position: "relative",
          }}
        >
          <div
            style={{
              fontSize: "1.2rem",
              fontWeight: "600",
              color: "#00ffff",
              marginBottom: "1rem",
              fontFamily: "'Courier New', monospace",
              textTransform: "uppercase",
              letterSpacing: "1px",
              textShadow: "1px 1px 0px #000",
            }}
          >
            🚁 READY TO LAUNCH YOUR RESCUE MISSION?
          </div>

          <div
            style={{
              marginBottom: "1.5rem",
              textAlign: "center",
            }}
          >
            <div
              style={{
                fontSize: "1rem",
                color: "#00ff00",
                marginBottom: "0.5rem",
                fontFamily: "'Courier New', monospace",
                fontWeight: "600",
              }}
            >
              SELECT RESCUE MODE:
            </div>
            <div
              style={{
                display: "flex",
                gap: "1rem",
                justifyContent: "center",
                flexWrap: "wrap",
              }}
            >
              <button
                onClick={() => {
                  setBridgeMode("full");
                  setConvertAmount(
                    (unitClassicBalance + unitBalance).toFixed(8)
                  );
                }}
                style={{
                  padding: "0.75rem 1.5rem",
                  background:
                    bridgeMode === "full"
                      ? "linear-gradient(45deg, #00ff00, #008000)"
                      : "rgba(0, 0, 0, 0.7)",
                  color: bridgeMode === "full" ? "#000" : "#00ff00",
                  border: `2px solid ${
                    bridgeMode === "full" ? "#00ff00" : "#00ff00"
                  }`,
                  borderRadius: "0",
                  fontFamily: "'Courier New', monospace",
                  fontWeight: "600",
                  cursor: "pointer",
                  textTransform: "uppercase",
                  letterSpacing: "1px",
                  boxShadow:
                    bridgeMode === "full"
                      ? "0 0 15px rgba(0, 255, 0, 0.5)"
                      : "none",
                  transition: "all 0.2s",
                }}
              >
                🚁 FULL RESCUE
              </button>
              <button
                onClick={() => {
                  setBridgeMode("classic-only");
                  setConvertAmount(unitClassicBalance.toFixed(8));
                }}
                style={{
                  padding: "0.75rem 1.5rem",
                  background:
                    bridgeMode === "classic-only"
                      ? "linear-gradient(45deg, #00ffff, #0080ff)"
                      : "rgba(0, 0, 0, 0.7)",
                  color: bridgeMode === "full" ? "#00ffff" : "#000",
                  border: `2px solid ${
                    bridgeMode === "full" ? "#00ffff" : "#00ffff"
                  }`,
                  borderRadius: "0",
                  fontFamily: "'Courier New', monospace",
                  fontWeight: "600",
                  cursor: "pointer",
                  textTransform: "uppercase",
                  letterSpacing: "1px",
                  boxShadow:
                    bridgeMode === "classic-only"
                      ? "0 0 15px rgba(0, 255, 255, 0.5)"
                      : "none",
                  transition: "all 0.2s",
                }}
              >
                ⚡ CLASSIC ONLY
              </button>
            </div>
            <div
              style={{
                fontSize: "0.9rem",
                color: "#ffff00",
                marginTop: "0.5rem",
                fontFamily: "'Courier New', monospace",
              }}
            >
              {bridgeMode === "full"
                ? "Uses UNIT Classic first, then ARC200 if needed"
                : "Only bridges UNIT Classic tokens (no ARC200 conversion)"}
            </div>

            <div style={{ marginTop: "1.5rem" }}>
              {unitClassicBalance + unitBalance > 1 ? (
                <div>
                  {/* Collapsible Game Controls Header */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "1rem",
                      marginBottom: "1rem",
                      cursor: "pointer",
                      padding: "0.5rem",
                      background: "rgba(0, 255, 0, 0.1)",
                      border: "2px solid #00ff00",
                      borderRadius: "0",
                      transition: "all 0.2s"
                    }}
                    onClick={() => setGameControlsExpanded(!gameControlsExpanded)}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "rgba(0, 255, 0, 0.2)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "rgba(0, 255, 0, 0.1)";
                    }}
                  >
                    <div
                      style={{
                        fontSize: "1rem",
                        color: "#00ff00",
                        fontFamily: "'Courier New', monospace",
                        fontWeight: "600",
                        textShadow: "1px 1px 0px #000"
                      }}
                    >
                      🎮 GAME CONTROLS
                    </div>
                    <div
                      style={{
                        fontSize: "1.2rem",
                        color: "#00ff00",
                        transform: gameControlsExpanded ? "rotate(180deg)" : "rotate(0deg)",
                        transition: "transform 0.2s"
                      }}
                    >
                      ▼
                    </div>
                  </div>
                  
                  {/* Collapsible Game Controls Content */}
                  {gameControlsExpanded && (
                    <div>
                      <div
                        style={{
                          marginBottom: "1rem",
                          textAlign: "center",
                        }}
                      >
                        <div
                          style={{
                            fontSize: "0.9rem",
                            color: "#00ff00",
                            marginBottom: "0.5rem",
                            fontFamily: "'Courier New', monospace",
                            fontWeight: "600",
                          }}
                        >
                          SELECT DIFFICULTY:
                        </div>
                    <div
                      style={{
                        display: "flex",
                        gap: "0.5rem",
                        justifyContent: "center",
                        flexWrap: "wrap",
                      }}
                    >
                      <button
                        onClick={() => setGameDifficulty("easy")}
                        style={{
                          padding: "0.5rem 1rem",
                          background:
                            gameDifficulty === "easy"
                              ? "linear-gradient(45deg, #00ff00, #008000)"
                              : "rgba(0, 0, 0, 0.7)",
                          color: gameDifficulty === "easy" ? "#000" : "#00ff00",
                          border: "2px solid #00ff00",
                          borderRadius: "0",
                          fontFamily: "'Courier New', monospace",
                          fontWeight: "600",
                          cursor: "pointer",
                          textTransform: "uppercase",
                          fontSize: "0.8rem",
                        }}
                      >
                        🟢 EASY
                      </button>
                      <button
                        onClick={() => setGameDifficulty("medium")}
                        style={{
                          padding: "0.5rem 1rem",
                          background:
                            gameDifficulty === "medium"
                              ? "linear-gradient(45deg, #ffff00, #ff8000)"
                              : "rgba(0, 0, 0, 0.7)",
                          color:
                            gameDifficulty === "medium" ? "#000" : "#ffff00",
                          border: "2px solid #ffff00",
                          borderRadius: "0",
                          fontFamily: "'Courier New', monospace",
                          fontWeight: "600",
                          cursor: "pointer",
                          textTransform: "uppercase",
                          fontSize: "0.8rem",
                        }}
                      >
                        🟡 MEDIUM
                      </button>
                      <button
                        onClick={() => setGameDifficulty("hard")}
                        style={{
                          padding: "0.5rem 1rem",
                          background:
                            gameDifficulty === "hard"
                              ? "linear-gradient(45deg, #ff0000, #800000)"
                              : "rgba(0, 0, 0, 0.7)",
                          color: gameDifficulty === "hard" ? "#fff" : "#ff0000",
                          border: "2px solid #ff0000",
                          borderRadius: "0",
                          fontFamily: "'Courier New', monospace",
                          fontWeight: "600",
                          cursor: "pointer",
                          textTransform: "uppercase",
                          fontSize: "0.8rem",
                        }}
                      >
                        🔴 HARD
                      </button>
                    </div>
                    <div
                      style={{
                        fontSize: "0.7rem",
                        color: "#ffff00",
                        marginTop: "0.5rem",
                        fontFamily: "'Courier New', monospace",
                        fontStyle: "italic",
                      }}
                    >
                      {gameDifficulty === "easy"
                        ? "60% initial token density - NO RESPAWNING"
                        : gameDifficulty === "medium"
                        ? "50% initial token density - NO RESPAWNING"
                        : "40% initial token density - NO RESPAWNING"}
                    </div>
                  </div>

                  <button
                    onClick={initializeSnakeGame}
                    style={{
                      padding: "1rem 2rem",
                      background: "linear-gradient(45deg, #ff00ff, #8000ff)",
                      color: "#fff",
                      border: "3px solid #ffff00",
                      borderRadius: "0",
                      fontFamily: "'Courier New', monospace",
                      fontWeight: "600",
                      cursor: "pointer",
                      textTransform: "uppercase",
                      letterSpacing: "1px",
                      textShadow: "2px 2px 0px #000",
                      boxShadow: "0 0 25px rgba(255, 0, 255, 0.6)",
                      transition: "all 0.2s",
                      fontSize: "1.2rem",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = "translateY(-3px)";
                      e.currentTarget.style.boxShadow =
                        "0 0 35px rgba(255, 0, 255, 0.8)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = "translateY(0)";
                      e.currentTarget.style.boxShadow =
                        "0 0 25px rgba(255, 0, 255, 0.6)";
                    }}
                  >
                    🐍 PLAY SNAKE RESCUE!
                  </button>
                  <div
                    style={{
                      fontSize: "0.8rem",
                      color: "#ff00ff",
                      marginTop: "0.5rem",
                      fontFamily: "'Courier New', monospace",
                      fontStyle: "italic",
                    }}
                  >
                    Eat tokens to rescue them! Use arrow keys to play.
                  </div>
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <div
                    style={{
                      padding: "1rem 2rem",
                      background: "rgba(128, 128, 128, 0.3)",
                      color: "#888",
                      border: "2px solid #666",
                      borderRadius: "0",
                      fontFamily: "'Courier New', monospace",
                      fontWeight: "600",
                      textTransform: "uppercase",
                      letterSpacing: "1px",
                      fontSize: "1.2rem",
                      cursor: "not-allowed",
                    }}
                  >
                    🚫 INSUFFICIENT TOKENS
                  </div>
                  <div
                    style={{
                      fontSize: "0.8rem",
                      color: "#888",
                      marginTop: "0.5rem",
                      fontFamily: "'Courier New', monospace",
                      fontStyle: "italic",
                    }}
                  >
                    You need more than 1 combined UNIT balance to play Snake
                    Rescue.
                  </div>
                </div>
              )}
            </div>
          </div>

          <InputGroup>
            <Label>How Many Tokens to Rescue?</Label>
            <Input
              type="number"
              value={convertAmount}
              onChange={(e) => setConvertAmount(e.target.value)}
              placeholder="Enter amount"
              min="0"
              max={unitClassicBalance + unitBalance}
            />
            <button
              onClick={handleMaxAmount}
              style={{
                background: "none",
                border: "none",
                color: "var(--accent-color)",
                cursor: "pointer",
                fontSize: "0.9rem",
                marginTop: "0.5rem",
                textDecoration: "underline",
              }}
            >
              Rescue All Available
            </button>
          </InputGroup>

          {currentAmount > 0 && (
            <FeeSection>
              <FeeRow>
                <FeeLabel>Rescue Mission Details:</FeeLabel>
                <FeeValue>
                  {currentAmount.toLocaleString()} total tokens
                </FeeValue>
              </FeeRow>
              <FeeRow>
                <FeeLabel>Your Available Forces:</FeeLabel>
                <FeeValue>
                  {(unitClassicBalance + unitBalance).toLocaleString()} total
                </FeeValue>
              </FeeRow>
              <FeeRow>
                <FeeLabel>UNIT Classic Soldiers:</FeeLabel>
                <FeeValue>
                  {Math.min(currentAmount, unitClassicBalance).toFixed(4)}{" "}
                  tokens
                </FeeValue>
              </FeeRow>
              <FeeRow>
                <FeeLabel>ARC200 UNIT Troops:</FeeLabel>
                <FeeValue>
                  {bridgeMode === "classic-only"
                    ? "0.0000 tokens (Classic Only Mode)"
                    : `${Math.max(
                        0,
                        currentAmount - unitClassicBalance
                      ).toFixed(4)} tokens`}
                </FeeValue>
              </FeeRow>
              <FeeRow>
                <FeeLabel>Bridge Tax (0.1%):</FeeLabel>
                <FeeValue>{feeAmount.toFixed(4)} tokens</FeeValue>
              </FeeRow>
              <FeeRow>
                <FeeLabel>Your Reward:</FeeLabel>
                <FeeValue>{convertedAmount.toFixed(4)} UNIT</FeeValue>
              </FeeRow>
              <FeeRow>
                <FeeLabel>Total Deployment Cost:</FeeLabel>
                <FeeValue>{totalAmount.toLocaleString()} tokens</FeeValue>
              </FeeRow>
            </FeeSection>
          )}
        </div>

        <ConvertButton
          onClick={handleConvert}
          disabled={
            !convertAmount ||
            isLoading ||
            currentAmount <= 0 ||
            currentAmount > unitClassicBalance + unitBalance ||
            (hasZeroPayment && !bypassGuard) ||
            !legalAcknowledged
          }
        >
          {isLoading
            ? "🚁 Deploying Rescue Mission..."
            : `🚁 Launch ${
                bridgeMode === "classic-only" ? "Classic Only" : "Full"
              } Rescue Mission`}
        </ConvertButton>

        <div style={{ marginTop: "2rem" }}>
          {hasZeroPayment && !bypassGuard && (
            <div
              style={{
                background: "#fef3c7",
                border: "2px solid #f59e0b",
                borderRadius: "12px",
                padding: "1.5rem",
                marginBottom: "1.5rem",
                textAlign: "center",
                boxShadow: "0 4px 12px rgba(245, 158, 11, 0.2)",
              }}
            >
              <div
                style={{
                  marginBottom: "1rem",
                  fontWeight: "700",
                  color: "#92400e",
                  fontSize: "1.2rem",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                }}
              >
                🚨 Previous Conversion Detected
              </div>
              <div
                style={{
                  fontSize: "1rem",
                  color: "#92400e",
                  marginBottom: "1.5rem",
                  lineHeight: "1.5",
                  fontWeight: "500",
                }}
              >
                Looks like you've already converted some tokens! Don't worry, I
                can help you rescue more of those worthless 747374 or 40266690
                tokens and turn them into pure and beautiful 420069 here. Just
                acknowledge below if you want to proceed with another rescue
                mission.
              </div>
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.75rem",
                  fontSize: "1rem",
                  fontWeight: "600",
                  color: "#92400e",
                }}
              >
                <input
                  type="checkbox"
                  checked={bypassGuard}
                  onChange={(e) => setBypassGuard(e.target.checked)}
                  style={{
                    margin: 0,
                    width: "18px",
                    height: "18px",
                    accentColor: "#f59e0b",
                  }}
                />
                I want to rescue more tokens! Let's do another conversion
              </label>
            </div>
          )}
        </div>

        {conversionResult && (
          <>
            <Result>{conversionResult}</Result>

            <div
              style={{
                marginTop: "1.5rem",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  fontSize: "1rem",
                  color: "#00ff00",
                  marginBottom: "1rem",
                  fontFamily: "'Courier New', monospace",
                  fontWeight: "600",
                  textTransform: "uppercase",
                }}
              >
                🚀 NEXT MISSION:
              </div>
              <div
                style={{
                  display: "flex",
                  gap: "1rem",
                  justifyContent: "center",
                  flexWrap: "wrap",
                }}
              >
                <button
                  onClick={() =>
                    window.open(
                      "https://voi.humble.sh/#/swap?poolId=429999",
                      "_blank"
                    )
                  }
                  style={{
                    padding: "1rem 1.5rem",
                    background: "linear-gradient(45deg, #ff6b35, #f7931e)",
                    color: "#000",
                    border: "2px solid #ffff00",
                    borderRadius: "0",
                    fontFamily: "'Courier New', monospace",
                    fontWeight: "600",
                    cursor: "pointer",
                    textTransform: "uppercase",
                    letterSpacing: "1px",
                    textShadow: "1px 1px 0px rgba(255, 255, 255, 0.5)",
                    boxShadow: "0 0 20px rgba(255, 107, 53, 0.5)",
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-3px)";
                    e.currentTarget.style.boxShadow =
                      "0 0 30px rgba(255, 107, 53, 0.8)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow =
                      "0 0 20px rgba(255, 107, 53, 0.5)";
                  }}
                >
                  🦈 HUMBLESWAP
                </button>
                <button
                  onClick={() =>
                    window.open(
                      "https://beta.k8s.aramid.finance/bridge/Voi/Algorand/UNIT/UNIT",
                      "_blank"
                    )
                  }
                  style={{
                    padding: "1rem 1.5rem",
                    background: "linear-gradient(45deg, #6366f1, #8b5cf6)",
                    color: "#fff",
                    border: "2px solid #00ffff",
                    borderRadius: "0",
                    fontFamily: "'Courier New', monospace",
                    fontWeight: "600",
                    cursor: "pointer",
                    textTransform: "uppercase",
                    letterSpacing: "1px",
                    textShadow: "2px 2px 0px #000",
                    boxShadow: "0 0 20px rgba(99, 102, 241, 0.5)",
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-3px)";
                    e.currentTarget.style.boxShadow =
                      "0 0 30px rgba(99, 102, 241, 0.8)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow =
                      "0 0 20px rgba(99, 102, 241, 0.5)";
                  }}
                >
                  🌉 ARAMID BRIDGE
                </button>
              </div>
              <div
                style={{
                  fontSize: "0.9rem",
                  color: "#ffff00",
                  marginTop: "1rem",
                  fontFamily: "'Courier New', monospace",
                  fontStyle: "italic",
                }}
              >
                Your rescued tokens are ready for action! Choose your next
                mission.
              </div>
            </div>
          </>
        )}

        <InfoText>
          Ready to rescue those stranded tokens? This tool will extract your
          UNIT Classic (Asset #747374) and Unbridged UNIT tokens and transform
          them into 40266690 tokens (which you can use on Aramid Bridge or
          HumbleSwap). It's a one-way rescue mission: (UNIT Classic + Unbridged
          UNIT) → 40266690. At a future date, this tool will convert directly
          into beautiful 420069 tokens! The bridge takes a tiny 0.1% tax for the
          rescue operation, so you'll get slightly less than what you deploy,
          but hey, rescued tokens are better than stranded ones!
        </InfoText>
      </ConverterCard>
    </Container>
  );
};

export default UnitConverter;
