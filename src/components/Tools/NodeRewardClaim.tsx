import React, { useState, useEffect, useCallback, useMemo } from "react";
import styled, { keyframes } from "styled-components";
import { Alert, Snackbar, Modal, Box, CircularProgress } from "@mui/material";
import { useWallet } from "@txnlab/use-wallet-react";
import { CONTRACT, abi } from "ulujs";
import algosdk from "algosdk";
import BigNumber from "bignumber.js";

// 8-bit pixel font import
const pixelFont = "'Press Start 2P', 'Courier New', monospace";

// Retro game animations
const scanline = keyframes`
  0% { transform: translateY(-100%); }
  100% { transform: translateY(100vh); }
`;

const glitch = keyframes`
  0% { transform: translate(0); }
  20% { transform: translate(-2px, 2px); }
  40% { transform: translate(-2px, -2px); }
  60% { transform: translate(2px, 2px); }
  80% { transform: translate(2px, -2px); }
  100% { transform: translate(0); }
`;

const pulse = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
`;

const blink = keyframes`
  0%, 50% { opacity: 1; }
  51%, 100% { opacity: 0; }
`;

const fadeIn = keyframes`
  0% { opacity: 0; transform: scale(0.8); }
  100% { opacity: 1; transform: scale(1); }
`;

const slideIn = keyframes`
  0% { transform: translateX(-100%); }
  100% { transform: translateX(0); }
`;

const bounce = keyframes`
  0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
  40% { transform: translateY(-10px); }
  60% { transform: translateY(-5px); }
`;

// Starter Screen Components
const StarterScreen = styled.div<{ isVisible: boolean }>`
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: linear-gradient(135deg, #000000 0%, #001100 50%, #000000 100%);
  display: ${props => props.isVisible ? 'flex' : 'none'};
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  animation: ${fadeIn} 1s ease-out;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 2px;
    background: linear-gradient(90deg, transparent, #00ff00, transparent);
    animation: ${scanline} 4s linear infinite;
    pointer-events: none;
  }
`;

const GameTitle = styled.h1`
  font-family: ${pixelFont};
  color: #00ff00;
  font-size: 2.5rem;
  text-align: center;
  margin-bottom: 40px;
  text-shadow: 
    3px 3px 0px #000,
    0 0 20px #00ff00;
  letter-spacing: 4px;
  animation: ${bounce} 2s ease-in-out infinite;
`;

const RaceTrack = styled.div`
  width: 100%;
  height: 200px;
  background: linear-gradient(90deg, #228b22 0%, #32cd32 50%, #228b22 100%);
  border: 4px solid #ffffff;
  position: relative;
  margin: 40px 0;
  animation: ${slideIn} 1.5s ease-out 0.5s both;
  overflow: hidden;

  /* Track lines */
  &::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 0;
    right: 0;
    height: 4px;
    background: repeating-linear-gradient(
      90deg,
      #ffffff 0px,
      #ffffff 20px,
      transparent 20px,
      transparent 40px
    );
  }

  /* Track borders */
  &::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    border: 2px solid #ffffff;
    pointer-events: none;
  }
`;

const Horse = styled.div<{ position: number; color: string; delay: number }>`
  position: absolute;
  bottom: 20px;
  left: ${props => props.position}%;
  width: 60px;
  height: 40px;
  animation: horseRun 2s linear infinite;
  animation-delay: ${props => props.delay}s;

  @keyframes horseRun {
    0% {
      transform: translateX(-100px);
    }
    100% {
      transform: translateX(calc(100vw + 100px));
    }
  }

  /* Horse body */
  &::before {
    content: '';
    position: absolute;
    bottom: 0;
    left: 10px;
    width: 40px;
    height: 20px;
    background: ${props => props.color};
    border: 2px solid #ffffff;
  }

  /* Horse head */
  &::after {
    content: '';
    position: absolute;
    bottom: 15px;
    left: 0;
    width: 15px;
    height: 12px;
    background: ${props => props.color};
    border: 2px solid #ffffff;
  }

  /* Legs */
  & > .leg-1 {
    position: absolute;
    bottom: -8px;
    left: 15px;
    width: 3px;
    height: 12px;
    background: #8b4513;
    border: 1px solid #ffffff;
    animation: legMove 0.3s linear infinite;
  }

  & > .leg-2 {
    position: absolute;
    bottom: -8px;
    left: 25px;
    width: 3px;
    height: 12px;
    background: #8b4513;
    border: 1px solid #ffffff;
    animation: legMove 0.3s linear infinite 0.15s;
  }

  & > .leg-3 {
    position: absolute;
    bottom: -8px;
    left: 35px;
    width: 3px;
    height: 12px;
    background: #8b4513;
    border: 1px solid #ffffff;
    animation: legMove 0.3s linear infinite 0.3s;
  }

  & > .leg-4 {
    position: absolute;
    bottom: -8px;
    left: 45px;
    width: 3px;
    height: 12px;
    background: #8b4513;
    border: 1px solid #ffffff;
    animation: legMove 0.3s linear infinite 0.45s;
  }

  @keyframes legMove {
    0%, 50% {
      transform: translateY(0);
    }
    25%, 75% {
      transform: translateY(-4px);
    }
  }

  /* Tail */
  & > .tail {
    position: absolute;
    bottom: 10px;
    right: -5px;
    width: 8px;
    height: 6px;
    background: ${props => props.color};
    border: 1px solid #ffffff;
    animation: tailWag 0.5s ease-in-out infinite;
  }

  @keyframes tailWag {
    0%, 100% {
      transform: rotate(0deg);
    }
    50% {
      transform: rotate(15deg);
    }
  }

  /* Mane */
  & > .mane {
    position: absolute;
    top: -2px;
    left: 5px;
    width: 8px;
    height: 4px;
    background: #8b4513;
    border: 1px solid #ffffff;
  }
`;

const Jockey = styled.div<{ color: string }>`
  position: absolute;
  top: -15px;
  left: 20px;
  width: 12px;
  height: 15px;
  background: ${props => props.color};
  border: 1px solid #ffffff;

  /* Jockey head */
  &::before {
    content: '';
    position: absolute;
    top: -5px;
    left: 2px;
    width: 8px;
    height: 8px;
    background: #ffdbac;
    border: 1px solid #ffffff;
  }

  /* Jockey hat */
  &::after {
    content: '';
    position: absolute;
    top: -8px;
    left: 1px;
    width: 10px;
    height: 4px;
    background: #ff0000;
    border: 1px solid #ffffff;
    border-radius: 2px 2px 0 0;
  }
`;

const FinishLine = styled.div`
  position: absolute;
  top: 0;
  right: 50px;
  width: 20px;
  height: 100%;
  background: repeating-linear-gradient(
    90deg,
    #ffffff 0px,
    #ffffff 4px,
    #000000 4px,
    #000000 8px
  );
  border: 2px solid #ffffff;
  animation: ${pulse} 1s ease-in-out infinite;
`;

const RaceStats = styled.div`
  display: flex;
  justify-content: space-around;
  margin: 20px 0;
  font-family: ${pixelFont};
  color: #00ff00;
  font-size: 0.6rem;
  text-shadow: 2px 2px 0px #000;
`;

const StatItem = styled.div`
  text-align: center;
  padding: 10px;
  background: rgba(0, 0, 0, 0.5);
  border: 2px solid #00ff00;
  border-radius: 0;
  min-width: 80px;
`;

const FloatingCoins = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
`;

const Coin = styled.div<{ delay: number; left: number }>`
  position: absolute;
  top: -20px;
  left: ${props => props.left}%;
  width: 12px;
  height: 12px;
  background: #ffd700;
  border: 2px solid #ffffff;
  border-radius: 50%;
  animation: coinFall 3s linear infinite;
  animation-delay: ${props => props.delay}s;

  @keyframes coinFall {
    0% {
      transform: translateY(-20px) rotate(0deg);
      opacity: 1;
    }
    100% {
      transform: translateY(100vh) rotate(360deg);
      opacity: 0;
    }
  }

  &::before {
    content: 'N';
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    font-family: ${pixelFont};
    font-size: 0.5rem;
    color: #000000;
    font-weight: bold;
  }
`;

const PressAnyKey = styled.div`
  font-family: ${pixelFont};
  color: #00ff00;
  font-size: 1rem;
  text-align: center;
  margin-top: 60px;
  text-shadow: 2px 2px 0px #000;
  letter-spacing: 2px;
  animation: ${blink} 1.5s ease-in-out infinite;
`;

const Subtitle = styled.div`
  font-family: ${pixelFont};
  color: #ffff00;
  font-size: 0.8rem;
  text-align: center;
  margin-top: 20px;
  text-shadow: 2px 2px 0px #000;
  letter-spacing: 1px;
  opacity: 0.8;
`;

const Container = styled.div`
  max-width: 600px;
  margin: 0 auto;
  background: #0a0a0a;
  border: 3px solid #00ff00;
  border-radius: 0;
  padding: 20px;
  box-shadow: 
    0 0 20px #00ff00,
    inset 0 0 20px rgba(0, 255, 0, 0.1);
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 2px;
    background: linear-gradient(90deg, transparent, #00ff00, transparent);
    animation: ${scanline} 3s linear infinite;
    pointer-events: none;
  }

  h3 {
    font-family: ${pixelFont};
    color: #00ff00;
    text-align: center;
    margin-bottom: 20px;
    text-shadow: 2px 2px 0px #000;
    font-size: 1.2rem;
    letter-spacing: 2px;
  }

  p {
    font-family: ${pixelFont};
    color: #00ff00;
    text-align: center;
    margin-bottom: 20px;
    font-size: 0.7rem;
    line-height: 1.4;
    text-shadow: 1px 1px 0px #000;
  }
`;

const InputArea = styled.input`
  width: 100%;
  padding: 15px;
  margin-bottom: 20px;
  border: 3px solid #00ff00;
  border-radius: 0;
  background: #000;
  color: #00ff00;
  font-family: ${pixelFont};
  font-size: 0.8rem;
  text-align: center;
  box-shadow: inset 0 0 10px rgba(0, 255, 0, 0.3);
  outline: none;

  &::placeholder {
    color: #008000;
    opacity: 0.7;
  }

  &:focus {
    border-color: #ffff00;
    box-shadow: 
      inset 0 0 10px rgba(255, 255, 0, 0.3),
      0 0 15px rgba(255, 255, 0, 0.5);
  }
`;

const progressAnimation = keyframes`
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
`;

const Button = styled.button`
  background: linear-gradient(45deg, #ff0000, #ff6600);
  color: #ffffff;
  border: 3px solid #ffffff;
  padding: 15px 25px;
  border-radius: 0;
  cursor: pointer;
  font-family: ${pixelFont};
  font-weight: bold;
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 1px;
  transition: all 0.2s ease;
  box-shadow: 
    0 4px 0 #cc0000,
    0 0 10px rgba(255, 0, 0, 0.5);
  text-shadow: 2px 2px 0px #000;

  &:hover {
    background: linear-gradient(45deg, #ff6600, #ff0000);
    transform: translateY(-2px);
    box-shadow: 
      0 6px 0 #cc0000,
      0 0 20px rgba(255, 0, 0, 0.8);
  }

  &:active {
    transform: translateY(0);
    box-shadow: 
      0 2px 0 #cc0000,
      0 0 10px rgba(255, 0, 0, 0.5);
  }

  &:disabled {
    background: #666666;
    border-color: #999999;
    cursor: not-allowed;
    box-shadow: none;
    transform: none;
  }
`;

const LoadingButton = styled(Button)`
  position: relative;
  overflow: hidden;

  &::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
    animation: ${progressAnimation} 1.5s infinite;
  }
`;

const LoadingOverlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
  border-radius: 0;
`;

const SkeletonLoader = styled.div`
  background: linear-gradient(90deg, #00ff00 25%, #008000 50%, #00ff00 75%);
  background-size: 200% 100%;
  animation: loading 1.5s infinite;
  border-radius: 0;
  height: 20px;
  margin: 8px 0;
  border: 1px solid #00ff00;

  @keyframes loading {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }
`;

const ErrorMessage = styled.div`
  background: #000;
  border: 3px solid #ff0000;
  color: #ff0000;
  padding: 15px;
  border-radius: 0;
  margin: 20px 0;
  display: flex;
  align-items: center;
  gap: 10px;
  font-family: ${pixelFont};
  font-size: 0.7rem;
  box-shadow: 0 0 15px rgba(255, 0, 0, 0.5);
  animation: ${glitch} 0.3s ease-in-out;
`;

const SuccessMessage = styled.div`
  background: #000;
  border: 3px solid #00ff00;
  color: #00ff00;
  padding: 15px;
  border-radius: 0;
  margin: 20px 0;
  display: flex;
  align-items: center;
  gap: 10px;
  font-family: ${pixelFont};
  font-size: 0.7rem;
  box-shadow: 0 0 15px rgba(0, 255, 0, 0.5);
  animation: ${pulse} 2s ease-in-out;
`;

const ButtonContainer = styled.div`
  display: flex;
  gap: 15px;
  margin-bottom: 20px;
`;

const AboutButton = styled.button`
  background: linear-gradient(45deg, #0000ff, #0066ff);
  color: #ffffff;
  border: 3px solid #ffffff;
  padding: 15px 20px;
  border-radius: 0;
  cursor: pointer;
  font-family: ${pixelFont};
  font-weight: bold;
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 1px;
  transition: all 0.2s ease;
  flex: 1;
  box-shadow: 
    0 4px 0 #0000cc,
    0 0 10px rgba(0, 0, 255, 0.5);
  text-shadow: 2px 2px 0px #000;

  &:hover {
    background: linear-gradient(45deg, #0066ff, #0000ff);
    transform: translateY(-2px);
    box-shadow: 
      0 6px 0 #0000cc,
      0 0 20px rgba(0, 0, 255, 0.8);
  }
`;

const HowToEarnButton = styled.button`
  background: linear-gradient(45deg, #ff00ff, #cc00cc);
  color: #ffffff;
  border: 3px solid #ffffff;
  padding: 15px 20px;
  border-radius: 0;
  cursor: pointer;
  font-family: ${pixelFont};
  font-weight: bold;
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 1px;
  transition: all 0.2s ease;
  flex: 1;
  box-shadow: 
    0 4px 0 #990099,
    0 0 10px rgba(255, 0, 255, 0.5);
  text-shadow: 2px 2px 0px #000;

  &:hover {
    background: linear-gradient(45deg, #cc00cc, #ff00ff);
    transform: translateY(-2px);
    box-shadow: 
      0 6px 0 #990099,
      0 0 20px rgba(255, 0, 255, 0.8);
  }
`;

const ResultsContainer = styled.div`
  background: #000;
  padding: 20px;
  border-radius: 0;
  margin-top: 20px;
  border: 3px solid #00ff00;
  box-shadow: 
    0 0 20px rgba(0, 255, 0, 0.3),
    inset 0 0 20px rgba(0, 255, 0, 0.1);

  h4 {
    font-family: ${pixelFont};
    color: #00ff00;
    text-align: center;
    margin-bottom: 20px;
    font-size: 1rem;
    text-shadow: 2px 2px 0px #000;
    letter-spacing: 1px;
  }
`;

const InfoCard = styled.div`
  background: #000;
  padding: 20px;
  border-radius: 0;
  margin-bottom: 20px;
  border-left: 5px solid #ffff00;
  border-top: 2px solid #ffff00;
  border-right: 2px solid #ffff00;
  border-bottom: 2px solid #ffff00;
  box-shadow: 0 0 15px rgba(255, 255, 0, 0.3);

  h4 {
    font-family: ${pixelFont};
    color: #ffff00;
    margin-bottom: 15px;
    font-size: 0.9rem;
    text-shadow: 2px 2px 0px #000;
    letter-spacing: 1px;
  }

  ul {
    list-style: none;
    padding: 0;
    margin: 0;
  }

  li {
    font-family: ${pixelFont};
    color: #00ff00;
    padding: 8px 0;
    font-size: 0.7rem;
    text-shadow: 1px 1px 0px #000;
    
    &:before {
      content: "▶";
      color: #ffff00;
      margin-right: 10px;
      font-size: 0.8rem;
    }
  }
`;

const ModalContent = styled.div`
  background: #000;
  padding: 30px;
  border-radius: 0;
  max-width: 600px;
  width: 90vw;
  max-height: 80vh;
  overflow-y: auto;
  color: #00ff00;
  border: 5px solid #00ff00;
  box-shadow: 
    0 0 30px rgba(0, 255, 0, 0.8),
    inset 0 0 30px rgba(0, 255, 0, 0.1);

  h2 {
    font-family: ${pixelFont};
    color: #00ff00;
    text-align: center;
    margin-bottom: 30px;
    font-size: 1.3rem;
    text-shadow: 3px 3px 0px #000;
    letter-spacing: 2px;
  }

  h4 {
    font-family: ${pixelFont};
    color: #ffff00;
    margin-bottom: 15px;
    font-size: 0.9rem;
    text-shadow: 2px 2px 0px #000;
    letter-spacing: 1px;
  }

  p {
    font-family: ${pixelFont};
    color: #00ff00;
    line-height: 1.6;
    margin-bottom: 15px;
    font-size: 0.7rem;
    text-shadow: 1px 1px 0px #000;
  }
`;

const TokenomicsGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 15px;
  margin: 20px 0;
`;

const TokenomicsItem = styled.div`
  background: #000;
  padding: 15px;
  border-radius: 0;
  text-align: center;
  border: 2px solid #00ff00;
  box-shadow: 0 0 10px rgba(0, 255, 0, 0.3);
`;

const TokenomicsValue = styled.div`
  font-family: ${pixelFont};
  font-size: 1.2rem;
  font-weight: bold;
  color: #ffff00;
  margin-bottom: 5px;
  text-shadow: 2px 2px 0px #000;
`;

const TokenomicsLabel = styled.div`
  font-family: ${pixelFont};
  font-size: 0.6rem;
  color: #00ff00;
  text-shadow: 1px 1px 0px #000;
`;

const FeatureList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 15px 0;
`;

const FeatureItem = styled.li`
  padding: 8px 0;
  display: flex;
  align-items: center;
  font-family: ${pixelFont};
  font-size: 0.7rem;
  color: #00ff00;
  text-shadow: 1px 1px 0px #000;
  
  &:before {
    content: "⚡";
    margin-right: 10px;
    font-size: 0.8rem;
    color: #ffff00;
  }
`;

const Section = styled.div`
  margin: 20px 0;
`;

const CollapsibleSection = styled.div`
  margin: 15px 0;
  border: 2px solid #00ff00;
  border-radius: 0;
  overflow: hidden;
  background: #000;
`;

const SectionHeader = styled.div`
  background: linear-gradient(45deg, #000, #001100);
  padding: 15px;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
  transition: all 0.2s ease;
  border-bottom: 2px solid #00ff00;
  
  &:hover {
    background: linear-gradient(45deg, #001100, #000);
    box-shadow: 0 0 10px rgba(0, 255, 0, 0.3);
  }
  
  h4 {
    margin: 0;
    color: #ffff00;
    font-family: ${pixelFont};
    font-size: 0.8rem;
    text-shadow: 2px 2px 0px #000;
  }
`;

const SectionContent = styled.div<{ isOpen: boolean }>`
  padding: ${props => props.isOpen ? '15px' : '0 15px'};
  max-height: ${props => props.isOpen ? '1000px' : '0'};
  overflow: hidden;
  transition: all 0.3s ease;
  opacity: ${props => props.isOpen ? '1' : '0'};
`;

const ExpandIcon = styled.span<{ isOpen: boolean }>`
  font-size: 1rem;
  transition: transform 0.3s ease;
  transform: ${props => props.isOpen ? 'rotate(180deg)' : 'rotate(0deg)'};
  color: #ffff00;
  font-weight: bold;
`;

const LinkSection = styled.div`
  margin: 20px 0;
  padding: 20px;
  background: rgba(0, 255, 0, 0.1);
  border-radius: 0;
  border: 2px solid #00ff00;
  box-shadow: 0 0 15px rgba(0, 255, 0, 0.2);
`;

const ExternalLink = styled.a`
  color: #00ffff;
  text-decoration: none;
  display: flex;
  align-items: center;
  padding: 12px;
  margin: 8px 0;
  background: rgba(0, 255, 255, 0.1);
  border-radius: 0;
  transition: all 0.2s ease;
  font-family: ${pixelFont};
  font-size: 0.7rem;
  border: 1px solid #00ffff;
  
  &:hover {
    background: rgba(0, 255, 255, 0.2);
    box-shadow: 0 0 15px rgba(0, 255, 255, 0.5);
    transform: translateX(5px);
  }
  
  &:before {
    content: "🔗";
    margin-right: 10px;
    font-size: 0.8rem;
  }
`;

const CloseButton = styled.button`
  background: linear-gradient(45deg, #ff0000, #cc0000);
  color: white;
  border: 3px solid #ffffff;
  padding: 15px 25px;
  border-radius: 0;
  cursor: pointer;
  font-family: ${pixelFont};
  font-weight: bold;
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 1px;
  transition: all 0.2s ease;
  margin-top: 20px;
  width: 100%;
  box-shadow: 
    0 4px 0 #990000,
    0 0 10px rgba(255, 0, 0, 0.5);
  text-shadow: 2px 2px 0px #000;

  &:hover {
    background: linear-gradient(45deg, #cc0000, #ff0000);
    transform: translateY(-2px);
    box-shadow: 
      0 6px 0 #990000,
      0 0 20px rgba(255, 0, 0, 0.8);
  }
`;

const RewardInfo = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid #00ff00;
  font-family: ${pixelFont};
  font-size: 0.7rem;

  &:last-child {
    border-bottom: none;
  }
`;

const Label = styled.span`
  font-weight: bold;
  color: #ffff00;
  text-shadow: 1px 1px 0px #000;
`;

const Value = styled.span`
  font-weight: bold;
  color: #00ff00;
  text-shadow: 1px 1px 0px #000;
`;

interface NodeRewardInfo {
  nodeAddress: string;
  totalRewards: number;
  claimableRewards: number;
  lastClaimDate: string;
  nextClaimDate: string;
  status: "active" | "inactive" | "pending";
}

const NodeRewardClaim: React.FC = () => {
  const { activeAccount, algodClient, signTransactions } = useWallet();
  const [showStarterScreen, setShowStarterScreen] = useState(true);
  const [nodeAddress, setNodeAddress] = useState(activeAccount?.address || "");
  const [loading, setLoading] = useState(false);
  const [rewardInfo, setRewardInfo] = useState<NodeRewardInfo | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [howToEarnModalOpen, setHowToEarnModalOpen] = useState(false);
  const [isCheckingRewards, setIsCheckingRewards] = useState(false);
  const [isClaimingRewards, setIsClaimingRewards] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [openSections, setOpenSections] = useState<{ [key: string]: boolean }>({
    validator: true,
    staking: false,
    defi: false,
    wrapped: false,
    emissions: false,
    requirements: false
  });
  const [aboutOpenSections, setAboutOpenSections] = useState<{ [key: string]: boolean }>({
    what: true,
    tokenomics: false,
    allocation: false,
    buyback: false,
    sellFee: false,
    whyMatters: false
  });

  // Handle starter screen key press
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (showStarterScreen) {
        setShowStarterScreen(false);
      }
    };

    const handleClick = () => {
      if (showStarterScreen) {
        setShowStarterScreen(false);
      }
    };

    if (showStarterScreen) {
      document.addEventListener('keydown', handleKeyPress);
      document.addEventListener('click', handleClick);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyPress);
      document.removeEventListener('click', handleClick);
    };
  }, [showStarterScreen]);

  // Reset component state when active account changes
  useEffect(() => {
    if (activeAccount?.address) {
      setNodeAddress(activeAccount.address);
      // Reset all component state
      setRewardInfo(null);
      setBalance(null);
      setModalOpen(false);
      setHowToEarnModalOpen(false);
      setOpenSections({
        validator: true,
        staking: false,
        defi: false,
        wrapped: false,
        emissions: false,
        requirements: false
      });
      setAboutOpenSections({
        what: true,
        tokenomics: false,
        allocation: false,
        buyback: false,
        sellFee: false,
        whyMatters: false
      });
      setToast({
        open: false,
        message: "",
        severity: "error",
      });
      setError(null);
      setSuccess(null);
    }
  }, [activeAccount?.address]);

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

  const handleOpenModal = () => {
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
  };

  const handleOpenHowToEarnModal = () => {
    setHowToEarnModalOpen(true);
  };

  const handleCloseHowToEarnModal = () => {
    setHowToEarnModalOpen(false);
  };

  const toggleSection = (sectionKey: string) => {
    setOpenSections(prev => ({
      ...prev,
      [sectionKey]: !prev[sectionKey]
    }));
  };

  const toggleAboutSection = (sectionKey: string) => {
    setAboutOpenSections(prev => ({
      ...prev,
      [sectionKey]: !prev[sectionKey]
    }));
  };

  const handleCheckRewards = useCallback(async () => {
    if (!activeAccount) {
      setError("Please connect your wallet");
      return;
    }
    if (!nodeAddress) {
      setError("Please enter a node address");
      return;
    }

    setIsCheckingRewards(true);
    setError(null);
    setSuccess(null);

    try {
      const ci = new CONTRACT(410811, algodClient, undefined, abi.nt200, {
        addr: activeAccount.address,
        sk: new Uint8Array(),
      });
      
      const allowanceR = await ci.arc200_allowance(
        "XKAA4VTY4QDPYI6DCCTKTCTVJ3X3WHX636GNZJZCNGBLQH366LWRJUF5UI",
        activeAccount.address
      );
      const allowance = allowanceR.returnValue;
      console.log({ allowance });

      // Get balance
      const balanceR = await ci.arc200_balanceOf(activeAccount.address);
      const balanceValue = balanceR.returnValue;
      const balanceInTokens = Number(
        new BigNumber(balanceValue).div(1e6).toFixed(6)
      );
      setBalance(balanceInTokens);
      console.log({ balance: balanceInTokens });

      // Simulate API call - replace with actual endpoint
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Mock data - replace with actual API response
      const mockRewardInfo: NodeRewardInfo = {
        nodeAddress: nodeAddress,
        totalRewards: 1250.75,
        claimableRewards: Number(new BigNumber(allowance).div(1e6).toFixed(6)),
        lastClaimDate: "2024-01-15",
        nextClaimDate: "2024-02-15",
        status: "active",
      };

      setRewardInfo(mockRewardInfo);
      setSuccess("Reward information retrieved successfully");
    } catch (error) {
      console.error('Error checking rewards:', error);
      setError(error instanceof Error ? error.message : "Failed to fetch reward information");
    } finally {
      setIsCheckingRewards(false);
    }
  }, [activeAccount, nodeAddress, algodClient]);

  const handleClaimRewards = useCallback(async () => {
    if (!activeAccount) {
      setError("Please connect your wallet");
      return;
    }
    if (!rewardInfo || rewardInfo.claimableRewards <= 0) {
      setError("No rewards available to claim");
      return;
    }

    setIsClaimingRewards(true);
    setError(null);
    setSuccess(null);

    try {
      const ci = new CONTRACT(410811, algodClient, undefined, abi.nt200, {
        addr: activeAccount.address,
        sk: new Uint8Array(),
      });
      
      const allowanceR = await ci.arc200_allowance(
        "XKAA4VTY4QDPYI6DCCTKTCTVJ3X3WHX636GNZJZCNGBLQH366LWRJUF5UI",
        activeAccount.address
      );
      const allowance = allowanceR.returnValue;
      console.log({ allowance });

      const arc200_transferFromR = await ci.arc200_transferFrom(
        "XKAA4VTY4QDPYI6DCCTKTCTVJ3X3WHX636GNZJZCNGBLQH366LWRJUF5UI",
        activeAccount.address,
        allowance
      );
      
      if (!arc200_transferFromR.success) {
        console.log({ arc200_transferFromR });
        throw new Error("Failed to claim rewards: " + arc200_transferFromR.error);
      }
      
      const stxns = await signTransactions(
        arc200_transferFromR.txns.map((txn: string) =>
          Uint8Array.from(Buffer.from(txn, "base64"))
        )
      );
      await algodClient.sendRawTransaction(stxns as Uint8Array[]).do();

      // Update balance after successful claim
      const newBalanceR = await ci.arc200_balanceOf(activeAccount.address);
      const newBalanceValue = newBalanceR.returnValue;
      const newBalanceInTokens = Number(
        new BigNumber(newBalanceValue).div(1e6).toFixed(6)
      );
      setBalance(newBalanceInTokens);

      setSuccess(`Successfully claimed ${rewardInfo.claimableRewards} NODE rewards!`);

      // Update reward info after successful claim
      setRewardInfo({
        ...rewardInfo,
        claimableRewards: 0,
        lastClaimDate: new Date().toISOString().split("T")[0],
      });
    } catch (error) {
      console.error('Error claiming rewards:', error);
      setError(error instanceof Error ? error.message : "Failed to claim rewards");
    } finally {
      setIsClaimingRewards(false);
    }
  }, [activeAccount, rewardInfo, algodClient, signTransactions]);

  return (
    <>
      {/* Starter Screen */}
      <StarterScreen isVisible={showStarterScreen}>
        <GameTitle>NODE REWARDS</GameTitle>
        
        <RaceTrack>
          <FloatingCoins>
            <Coin delay={0} left={10} />
            <Coin delay={0.5} left={20} />
            <Coin delay={1} left={30} />
            <Coin delay={1.5} left={40} />
            <Coin delay={2} left={50} />
            <Coin delay={2.5} left={60} />
            <Coin delay={3} left={70} />
            <Coin delay={3.5} left={80} />
            <Coin delay={4} left={90} />
          </FloatingCoins>
          
          <Horse position={10} color="#8b4513" delay={0}>
            <div className="leg-1"></div>
            <div className="leg-2"></div>
            <div className="leg-3"></div>
            <div className="leg-4"></div>
            <div className="tail"></div>
            <div className="mane"></div>
            <Jockey color="#ff0000" />
          </Horse>
          
          <Horse position={30} color="#000080" delay={0.3}>
            <div className="leg-1"></div>
            <div className="leg-2"></div>
            <div className="leg-3"></div>
            <div className="leg-4"></div>
            <div className="tail"></div>
            <div className="mane"></div>
            <Jockey color="#00ff00" />
          </Horse>
          
          <Horse position={50} color="#800080" delay={0.6}>
            <div className="leg-1"></div>
            <div className="leg-2"></div>
            <div className="leg-3"></div>
            <div className="leg-4"></div>
            <div className="tail"></div>
            <div className="mane"></div>
            <Jockey color="#ffff00" />
          </Horse>
          
          <Horse position={70} color="#ff4500" delay={0.9}>
            <div className="leg-1"></div>
            <div className="leg-2"></div>
            <div className="leg-3"></div>
            <div className="leg-4"></div>
            <div className="tail"></div>
            <div className="mane"></div>
            <Jockey color="#00ffff" />
          </Horse>
          
          <FinishLine />
        </RaceTrack>
        

        
        <Subtitle>VOI NETWORK VALIDATOR REWARDS</Subtitle>
        
        <PressAnyKey>PRESS ANY KEY TO CONTINUE</PressAnyKey>
      </StarterScreen>

      {/* Main Component */}
      <Container>
        <h3>⚡ NODE Token Reward Claim</h3>
        <p>Claim your NODE token rewards for running a validator node on VOI Network.</p>

      <ButtonContainer>
        <AboutButton onClick={handleOpenModal}>
          ℹ️ About NODE
        </AboutButton>
        <HowToEarnButton onClick={handleOpenHowToEarnModal}>
          💰 How to Earn
        </HowToEarnButton>
      </ButtonContainer>

      <InfoCard>
        <h4>How it works:</h4>
        <ul>
          <li>Enter your node address to check available NODE rewards</li>
          <li>View your current balance and claimable amounts</li>
          <li>Claim rewards directly to your wallet</li>
          <li>Rewards are distributed weekly based on performance and uptime</li>
        </ul>
      </InfoCard>

      <InputArea
        type="text"
        placeholder="Enter node address..."
        value={nodeAddress}
        onChange={(e) => setNodeAddress(e.target.value)}
      />

      {isCheckingRewards ? (
        <LoadingButton disabled>
          <CircularProgress size={16} style={{ marginRight: 8, color: 'white' }} />
          Checking Rewards...
        </LoadingButton>
      ) : (
        <Button onClick={handleCheckRewards} disabled={!nodeAddress}>
          Check Rewards
        </Button>
      )}

      {error && (
        <ErrorMessage>
          ⚠️ {error}
        </ErrorMessage>
      )}

      {success && (
        <SuccessMessage>
          ✅ {success}
        </SuccessMessage>
      )}

      {isCheckingRewards && !rewardInfo && (
        <ResultsContainer>
          <h4>Loading Reward Information...</h4>
          <SkeletonLoader />
          <SkeletonLoader />
          <SkeletonLoader />
        </ResultsContainer>
      )}

      {rewardInfo && (
        <ResultsContainer>
          <h4>Reward Information</h4>

          <RewardInfo>
            <Label>Beneficiary Address:</Label>
            <Value>
              {rewardInfo.nodeAddress.slice(0, 6)}...
              {rewardInfo.nodeAddress.slice(-4)}
            </Value>
          </RewardInfo>

          {balance !== null && (
            <RewardInfo>
              <Label>Current Balance:</Label>
              <Value style={{ color: "#3b82f6" }}>{balance} NODE</Value>
            </RewardInfo>
          )}

          <RewardInfo>
            <Label>Claimable Rewards:</Label>
            <Value
              style={{
                color: rewardInfo.claimableRewards > 0 ? "#10b981" : "#ef4444",
              }}
            >
              {rewardInfo.claimableRewards} NODE
            </Value>
          </RewardInfo>

          {rewardInfo.claimableRewards > 0 && (
            isClaimingRewards ? (
              <LoadingButton
                disabled
                style={{ marginTop: "1rem", width: "100%" }}
              >
                <CircularProgress size={16} style={{ marginRight: 8, color: 'white' }} />
                Claiming Rewards...
              </LoadingButton>
            ) : (
              <Button
                onClick={handleClaimRewards}
                style={{ marginTop: "1rem", width: "100%" }}
              >
                Claim Rewards
              </Button>
            )
          )}
        </ResultsContainer>
      )}

      {/* About NODE Modal */}
      <Modal
        open={modalOpen}
        onClose={handleCloseModal}
        aria-labelledby="node-token-modal"
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          p: 2,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          zIndex: 9999
        }}
      >
        <ModalContent>
          <h2>🪙 About NODE Token</h2>
          
          <CollapsibleSection>
            <SectionHeader onClick={() => toggleAboutSection('what')}>
              <h4>What is NODE?</h4>
              <ExpandIcon isOpen={aboutOpenSections.what}>▼</ExpandIcon>
            </SectionHeader>
            <SectionContent isOpen={aboutOpenSections.what}>
              <p>
                NODE is an additional reward token specifically created to further incentivize node runners on VOI Network. 
                It rewards you for supporting decentralization while introducing a deflationary, sustainable token model to the ecosystem.
              </p>
              <p>
                <strong>Key Point:</strong> NODE is not replacing VOI rewards. It is another reward layer designed to give 
                node operators more value for their contribution.
              </p>
            </SectionContent>
          </CollapsibleSection>

          <CollapsibleSection>
            <SectionHeader onClick={() => toggleAboutSection('tokenomics')}>
              <h4>📊 Tokenomics Overview</h4>
              <ExpandIcon isOpen={aboutOpenSections.tokenomics}>▼</ExpandIcon>
            </SectionHeader>
            <SectionContent isOpen={aboutOpenSections.tokenomics}>
              <TokenomicsGrid>
                <TokenomicsItem>
                  <TokenomicsValue>10B</TokenomicsValue>
                  <TokenomicsLabel>Total Supply</TokenomicsLabel>
                </TokenomicsItem>
                <TokenomicsItem>
                  <TokenomicsValue>6</TokenomicsValue>
                  <TokenomicsLabel>Decimals</TokenomicsLabel>
                </TokenomicsItem>
                <TokenomicsItem>
                  <TokenomicsValue>60%</TokenomicsValue>
                  <TokenomicsLabel>Node Rewards</TokenomicsLabel>
                </TokenomicsItem>
                <TokenomicsItem>
                  <TokenomicsValue>~11.5M</TokenomicsValue>
                  <TokenomicsLabel>Weekly Emissions</TokenomicsLabel>
                </TokenomicsItem>
              </TokenomicsGrid>
            </SectionContent>
          </CollapsibleSection>

          <CollapsibleSection>
            <SectionHeader onClick={() => toggleAboutSection('allocation')}>
              <h4>📈 Token Allocation</h4>
              <ExpandIcon isOpen={aboutOpenSections.allocation}>▼</ExpandIcon>
            </SectionHeader>
            <SectionContent isOpen={aboutOpenSections.allocation}>
              <FeatureList>
                <FeatureItem>60% – Node Rewards (6B NODE over ~10 years)</FeatureItem>
                <FeatureItem>15% – Liquidity & Buybacks</FeatureItem>
                <FeatureItem>20% – Community & Partnerships</FeatureItem>
                <FeatureItem>5% – Reserve & Treasury</FeatureItem>
              </FeatureList>
            </SectionContent>
          </CollapsibleSection>

          <CollapsibleSection>
            <SectionHeader onClick={() => toggleAboutSection('buyback')}>
              <h4>🔥 Sustainable Buyback & Burn Mechanism</h4>
              <ExpandIcon isOpen={aboutOpenSections.buyback}>▼</ExpandIcon>
            </SectionHeader>
            <SectionContent isOpen={aboutOpenSections.buyback}>
              <p>Here's what makes NODE unique:</p>
              <FeatureList>
                <FeatureItem>All protocol fees (collected in aUSDC, VOI, or stablecoins) are used weekly to buy NODE from the market</FeatureItem>
                <FeatureItem>100% of purchased NODE tokens are burned, permanently reducing the circulating supply</FeatureItem>
              </FeatureList>
            </SectionContent>
          </CollapsibleSection>

          <CollapsibleSection>
            <SectionHeader onClick={() => toggleAboutSection('sellFee')}>
              <h4>💸 2% Sell Fee</h4>
              <ExpandIcon isOpen={aboutOpenSections.sellFee}>▼</ExpandIcon>
            </SectionHeader>
            <SectionContent isOpen={aboutOpenSections.sellFee}>
              <p>
                Whenever NODE is sold, a 2% sell fee is collected to further support protocol sustainability 
                and buyback burns, ensuring the token remains deflationary as trading volume grows.
              </p>
            </SectionContent>
          </CollapsibleSection>

          <CollapsibleSection>
            <SectionHeader onClick={() => toggleAboutSection('whyMatters')}>
              <h4>🚀 Why NODE Matters</h4>
              <ExpandIcon isOpen={aboutOpenSections.whyMatters}>▼</ExpandIcon>
            </SectionHeader>
            <SectionContent isOpen={aboutOpenSections.whyMatters}>
              <FeatureList>
                <FeatureItem>Adds extra rewards for running your node on VOI</FeatureItem>
                <FeatureItem>Uses protocol revenue and sell fees for weekly buybacks</FeatureItem>
                <FeatureItem>Burns tokens, reducing supply over time and supporting price</FeatureItem>
                <FeatureItem>Keeps tokenomics simple, fair, and deflationary</FeatureItem>
              </FeatureList>
            </SectionContent>
          </CollapsibleSection>

          <LinkSection>
            <h4>📚 Learn More</h4>
            <ExternalLink 
              href="https://medium.com/@okgivemeasecond/introducing-node-an-extra-reward-token-for-node-runners-on-voi-55c1ec1245c6" 
              target="_blank" 
              rel="noopener noreferrer"
            >
              Read the Official NODE Token Announcement
            </ExternalLink>
            <ExternalLink 
              href="https://voiager.xyz/token/410811" 
              target="_blank" 
              rel="noopener noreferrer"
            >
              View NODE Token on Voiager Explorer
            </ExternalLink>
          </LinkSection>

          <CloseButton onClick={handleCloseModal}>
            Close
          </CloseButton>
        </ModalContent>
      </Modal>

      {/* How to Earn Modal */}
      <Modal
        open={howToEarnModalOpen}
        onClose={handleCloseHowToEarnModal}
        aria-labelledby="how-to-earn-modal"
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          p: 2,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          zIndex: 9999
        }}
      >
        <ModalContent>
          <h2>💰 How to Earn NODE Tokens</h2>
          
          <CollapsibleSection>
            <SectionHeader onClick={() => toggleSection('validator')}>
              <h4>🏗️ Run Validator Node</h4>
              <ExpandIcon isOpen={openSections.validator}>▼</ExpandIcon>
            </SectionHeader>
            <SectionContent isOpen={openSections.validator}>
              <p>
                Run a validator node with one or more accounts producing at least 1 block during epoch or 1 week period.
              </p>
              <FeatureList>
                <FeatureItem>Set up and maintain a validator node</FeatureItem>
                <FeatureItem>Ensure your node produces at least 1 block per epoch/week</FeatureItem>
                <FeatureItem>Use one or more accounts for node operation</FeatureItem>
                <FeatureItem>Earn NODE rewards based on block production</FeatureItem>
              </FeatureList>
            </SectionContent>
          </CollapsibleSection>

          <CollapsibleSection>
            <SectionHeader onClick={() => toggleSection('staking')}>
              <h4>📋 Staking Contract (Node as a Service)</h4>
              <ExpandIcon isOpen={openSections.staking}>▼</ExpandIcon>
            </SectionHeader>
            <SectionContent isOpen={openSections.staking}>
              <p>
                Own a staking contract subscribed to node as a service provided by Nautilus that earns block rewards.
              </p>
              <FeatureList>
                <FeatureItem>Subscribe to Nautilus node-as-a-service</FeatureItem>
                <FeatureItem>Own a staking contract for the service</FeatureItem>
                <FeatureItem>Earn block rewards through the service</FeatureItem>
                <FeatureItem>Receive NODE tokens as additional rewards</FeatureItem>
              </FeatureList>
            </SectionContent>
          </CollapsibleSection>

          <CollapsibleSection>
            <SectionHeader onClick={() => toggleSection('defi')}>
              <h4>💧 DeFi Protocol Liquidity</h4>
              <ExpandIcon isOpen={openSections.defi}>▼</ExpandIcon>
            </SectionHeader>
            <SectionContent isOpen={openSections.defi}>
              <p>
                Own share of liquidity on DeFi protocol of your choice earning block rewards.
              </p>
              <FeatureList>
                <FeatureItem>Provide liquidity to supported DeFi protocols</FeatureItem>
                <FeatureItem>Earn block rewards from your liquidity position</FeatureItem>
                <FeatureItem>Receive NODE tokens as additional incentives</FeatureItem>
                <FeatureItem>Choose from various supported DeFi protocols</FeatureItem>
              </FeatureList>
            </SectionContent>
          </CollapsibleSection>

          <CollapsibleSection>
            <SectionHeader onClick={() => toggleSection('wrapped')}>
              <h4>🔄 Wrapped VOI</h4>
              <ExpandIcon isOpen={openSections.wrapped}>▼</ExpandIcon>
            </SectionHeader>
            <SectionContent isOpen={openSections.wrapped}>
              <p>
                Own share of wrapped VOI earning block rewards.
              </p>
              <FeatureList>
                <FeatureItem>Hold wrapped VOI tokens</FeatureItem>
                <FeatureItem>Earn block rewards from wrapped VOI holdings</FeatureItem>
                <FeatureItem>Receive NODE tokens as additional rewards</FeatureItem>
                <FeatureItem>Benefit from both VOI and NODE tokenomics</FeatureItem>
              </FeatureList>
            </SectionContent>
          </CollapsibleSection>

          <CollapsibleSection>
            <SectionHeader onClick={() => toggleSection('emissions')}>
              <h4>⚡ Weekly Emissions</h4>
              <ExpandIcon isOpen={openSections.emissions}>▼</ExpandIcon>
            </SectionHeader>
            <SectionContent isOpen={openSections.emissions}>
              <p>
                Approximately <strong>11.5 million NODE tokens</strong> are distributed every week across all earning methods. 
                The distribution is proportional to your contribution and participation in the network.
              </p>
            </SectionContent>
          </CollapsibleSection>

          <CollapsibleSection>
            <SectionHeader onClick={() => toggleSection('requirements')}>
              <h4>💡 Key Requirements</h4>
              <ExpandIcon isOpen={openSections.requirements}>▼</ExpandIcon>
            </SectionHeader>
            <SectionContent isOpen={openSections.requirements}>
              <FeatureList>
                <FeatureItem>For validator nodes: Produce at least 1 block per epoch/week</FeatureItem>
                <FeatureItem>For staking contracts: Maintain active subscription</FeatureItem>
                <FeatureItem>For DeFi liquidity: Keep liquidity in supported protocols</FeatureItem>
                <FeatureItem>For wrapped VOI: Hold tokens to earn rewards</FeatureItem>
              </FeatureList>
            </SectionContent>
          </CollapsibleSection>

          <LinkSection>
            <h4>🔗 Additional Resources</h4>
            <ExternalLink 
              href="https://voi.network/validators" 
              target="_blank" 
              rel="noopener noreferrer"
            >
              VOI Network Validator Documentation
            </ExternalLink>
            <ExternalLink 
              href="https://voi.network/staking" 
              target="_blank" 
              rel="noopener noreferrer"
            >
              Staking Guide and Requirements
            </ExternalLink>
          </LinkSection>

          <CloseButton onClick={handleCloseHowToEarnModal}>
            Close
          </CloseButton>
        </ModalContent>
      </Modal>

      <Snackbar
        open={toast.open}
        autoHideDuration={6000}
        onClose={handleCloseToast}
      >
        <Alert onClose={handleCloseToast} severity={toast.severity}>
          {toast.message}
        </Alert>
      </Snackbar>
    </Container>
    </>
  );
};

export default NodeRewardClaim;
