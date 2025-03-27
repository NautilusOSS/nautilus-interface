import React, { useState } from "react";
import "./Calculator.css";

const Calculator: React.FC = () => {
  const [display, setDisplay] = useState<string>("");

  const handleNumber = (num: string) => {
    setDisplay(display + num);
  };

  const handleOperator = (op: string) => {
    if (display !== "") {
      setDisplay(display + op);
    }
  };

  const handleCalculate = () => {
    try {
      // Using Function constructor instead of eval for safer evaluation
      const result = new Function('return ' + display)();
      setDisplay(String(result));
    } catch (error) {
      setDisplay("Error");
    }
  };

  const handleClear = () => {
    setDisplay("");
  };

  return (
    <div className="tool-card">
      <h3>Calculator</h3>
      <div className="calculator">
        <input
          type="text"
          value={display}
          readOnly
          className="calculator-display"
        />
        <div className="calculator-buttons">
          {[7, 8, 9, 4, 5, 6, 1, 2, 3, 0].map((num) => (
            <button
              key={num}
              onClick={() => handleNumber(String(num))}
              className="calc-btn"
            >
              {num}
            </button>
          ))}
          <button onClick={() => handleOperator("+")} className="calc-btn">+</button>
          <button onClick={() => handleOperator("-")} className="calc-btn">-</button>
          <button onClick={() => handleOperator("*")} className="calc-btn">×</button>
          <button onClick={() => handleOperator("/")} className="calc-btn">÷</button>
          <button onClick={handleCalculate} className="calc-btn">=</button>
          <button onClick={handleClear} className="calc-btn">C</button>
        </div>
      </div>
    </div>
  );
};

export default Calculator; 