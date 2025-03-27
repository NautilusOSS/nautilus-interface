import React, { useState, useEffect } from 'react';
import styled from 'styled-components';

const GameContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2rem;
  padding: 2rem;
  color: var(--text-primary);
`;

const NumberDisplay = styled.div`
  font-size: 4rem;
  font-weight: bold;
  min-height: 100px;
  display: flex;
  align-items: center;
  justify-content: center;
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

const Message = styled.div<{ type: 'success' | 'error' | 'info' }>`
  padding: 1rem;
  border-radius: 8px;
  text-align: center;
  background: ${props => 
    props.type === 'success' ? 'var(--success-color)' :
    props.type === 'error' ? 'var(--error-color)' :
    'var(--info-color)'};
  color: var(--text-on-primary);
`;

const Stats = styled.div`
  display: flex;
  gap: 2rem;
  margin-top: 1rem;
  font-size: 0.9rem;
  color: var(--text-secondary);
`;

const HigherLower: React.FC = () => {
  const [targetNumber, setTargetNumber] = useState<number>(0);
  const [currentNumber, setCurrentNumber] = useState<number>(50);
  const [minRange, setMinRange] = useState<number>(1);
  const [maxRange, setMaxRange] = useState<number>(100);
  const [message, setMessage] = useState<string>('');
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('info');
  const [attempts, setAttempts] = useState<number>(0);
  const [bestScore, setBestScore] = useState<number>(() => {
    const saved = localStorage.getItem('higherlower_bestscore');
    return saved ? parseInt(saved) : Infinity;
  });

  const initGame = () => {
    const newTarget = Math.floor(Math.random() * 100) + 1;
    setTargetNumber(newTarget);
    setCurrentNumber(50);
    setMinRange(1);
    setMaxRange(100);
    setMessage('Guess if the number is higher or lower than 50');
    setMessageType('info');
    setAttempts(0);
  };

  useEffect(() => {
    initGame();
  }, []);

  const handleGuess = (guess: 'higher' | 'lower') => {
    const newAttempts = attempts + 1;
    setAttempts(newAttempts);

    if ((guess === 'higher' && targetNumber > currentNumber) ||
        (guess === 'lower' && targetNumber < currentNumber)) {
      // Correct guess - update range
      if (guess === 'higher') {
        setMinRange(currentNumber + 1);
        const nextNumber = Math.ceil((currentNumber + maxRange) / 2);
        setCurrentNumber(nextNumber);
        
        if (nextNumber === targetNumber) {
          handleWin(newAttempts);
        } else {
          setMessage(`Correct! Is it higher or lower than ${nextNumber}?`);
          setMessageType('info');
        }
      } else {
        setMaxRange(currentNumber - 1);
        const nextNumber = Math.floor((minRange + currentNumber - 1) / 2);
        setCurrentNumber(nextNumber);
        
        if (nextNumber === targetNumber) {
          handleWin(newAttempts);
        } else {
          setMessage(`Correct! Is it higher or lower than ${nextNumber}?`);
          setMessageType('info');
        }
      }
    } else {
      // Wrong guess
      setMessage('Wrong guess! Try again.');
      setMessageType('error');
    }
  };

  const handleWin = (newAttempts: number) => {
    setMessage(`You won! The number was ${targetNumber}`);
    setMessageType('success');
    if (newAttempts < bestScore) {
      setBestScore(newAttempts);
      localStorage.setItem('higherlower_bestscore', newAttempts.toString());
    }
  };

  // Add keyboard support
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (messageType === 'success') return;
      
      if (e.key === 'ArrowUp' || e.key === 'h') {
        handleGuess('higher');
      } else if (e.key === 'ArrowDown' || e.key === 'l') {
        handleGuess('lower');
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [currentNumber, targetNumber, messageType, attempts, minRange, maxRange]);

  return (
    <GameContainer>
      <h2>Higher or Lower</h2>
      <NumberDisplay>{currentNumber}</NumberDisplay>
      <Message type={messageType}>{message}</Message>
      <Controls>
        <Button 
          onClick={() => handleGuess('lower')}
          disabled={messageType === 'success'}
          title="Press Arrow Down or L"
        >
          Lower
        </Button>
        <Button 
          onClick={() => handleGuess('higher')}
          disabled={messageType === 'success'}
          title="Press Arrow Up or H"
        >
          Higher
        </Button>
        {messageType === 'success' && (
          <Button onClick={initGame}>Play Again</Button>
        )}
      </Controls>
      <Stats>
        <span>Attempts: {attempts}</span>
        <span>Best Score: {bestScore === Infinity ? '-' : bestScore}</span>
      </Stats>
    </GameContainer>
  );
};

export default HigherLower; 