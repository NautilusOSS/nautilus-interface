import React, { useState } from 'react';
import styled from 'styled-components';

const DiceContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2rem;
  padding: 2rem;
  color: var(--text-primary);
`;

const DiceWrapper = styled.div`
  font-size: 6rem;
  min-height: 150px;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: ${props => props.isRolling ? 'roll 0.5s ease-in-out' : 'none'};

  @keyframes roll {
    0% { 
      transform: rotate(0deg) scale(1);
      opacity: 1;
    }
    50% { 
      transform: rotate(360deg) scale(1.2);
      opacity: 0.5;
    }
    100% { 
      transform: rotate(720deg) scale(1);
      opacity: 1;
    }
  }
`;

const Result = styled.div<{ show: boolean }>`
  opacity: ${props => props.show ? 1 : 0};
  transition: opacity 0.3s ease-in;
`;

const Controls = styled.div`
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  justify-content: center;
`;

const Button = styled.button`
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  border: none;
  background: var(--primary-color);
  color: var(--text-on-primary);
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s ease, background 0.2s ease;

  &:hover {
    transform: translateY(-2px);
    background: var(--primary-color-dark);
  }

  &:active {
    transform: translateY(0);
  }

  &:disabled {
    background: var(--disabled-color);
    cursor: not-allowed;
    transform: none;
  }
`;

const DiceRoll: React.FC = () => {
  const [result, setResult] = useState<number>(1);
  const [isRolling, setIsRolling] = useState(false);
  const [sides, setSides] = useState(6);

  const rollDice = () => {
    setIsRolling(true);
    setTimeout(() => {
      const newResult = Math.floor(Math.random() * sides) + 1;
      setResult(newResult);
      setIsRolling(false);
    }, 500);
  };

  const diceTypes = [4, 6, 8, 10, 12, 20, 50];

  return (
    <DiceContainer>
      <h2>Roll a D{sides}</h2>
      <DiceWrapper isRolling={isRolling}>
        {isRolling ? '🎲' : (
          <Result show={!isRolling}>
            {result}
          </Result>
        )}
      </DiceWrapper>
      <Controls>
        {diceTypes.map((diceType) => (
          <Button
            key={diceType}
            onClick={() => setSides(diceType)}
            style={{
              background: sides === diceType ? 'var(--primary-color-dark)' : undefined
            }}
          >
            D{diceType}
          </Button>
        ))}
      </Controls>
      <Button onClick={rollDice} disabled={isRolling}>
        {isRolling ? 'Rolling...' : 'Roll Dice'}
      </Button>
    </DiceContainer>
  );
};

export default DiceRoll; 