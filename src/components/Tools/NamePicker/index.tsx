import React, { useState, useEffect, useMemo } from "react";
import styled from "styled-components";

const Container = styled.div`
  max-width: 600px;
  margin: 0 auto;
`;

const InputArea = styled.textarea`
  width: 100%;
  min-height: 150px;
  padding: 1rem;
  margin-bottom: 1rem;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--background-secondary);
  color: var(--text-primary);
  font-size: 1rem;
  resize: vertical;

  &:focus {
    outline: none;
    border-color: var(--primary-color);
  }
`;

const Button = styled.button`
  background: var(--primary-color);
  color: var(--background-secondary);
  border: none;
  border-radius: 8px;
  padding: 0.75rem 1.5rem;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: var(--primary-color-dark);
    color: var(--background-secondary);
    transform: translateY(-1px);
  }

  &:disabled {
    background: var(--background-tertiary);
    color: var(--text-secondary);
    cursor: not-allowed;
    transform: none;
  }
`;

const Result = styled.div`
  margin-top: 2rem;
  padding: 1.5rem;
  background: var(--background-secondary);
  border-radius: 8px;
  text-align: center;

  h3 {
    margin: 0 0 1rem 0;
    color: var(--text-primary);
  }

  .picked-name {
    font-size: 1.5rem;
    font-weight: bold;
    color: var(--primary-color);
  }
`;

const Instructions = styled.div`
  margin-bottom: 1.5rem;
  color: var(--text-secondary);
  font-size: 0.9rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const ViewIcon = styled.span`
  cursor: pointer;
  color: var(--primary-color);
  &:hover {
    opacity: 0.8;
  }
`;

const Modal = styled.div<{ isOpen: boolean }>`
  display: ${(props) => (props.isOpen ? "block" : "none")};
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.8);
  z-index: 1000;
`;

const ModalContent = styled.div`
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: var(--background-secondary);
  padding: 2rem;
  border-radius: 8px;
  max-width: 80%;
  max-height: 80vh;
  overflow-y: auto;
  z-index: 1001;
`;

const NameList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;

  li {
    padding: 0.5rem 0;
    border-bottom: 1px solid var(--border-color);
  }
`;

const FilterInput = styled.input`
  width: 100%;
  padding: 0.75rem;
  margin-bottom: 1rem;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--background-secondary);
  color: var(--text-primary);
  font-size: 1rem;

  &:focus {
    outline: none;
    border-color: var(--primary-color);
  }
`;

const Spinner = styled.div`
  border: 4px solid var(--background-tertiary);
  border-top: 4px solid var(--primary-color);
  border-radius: 50%;
  width: 40px;
  height: 40px;
  animation: spin 1s linear infinite;
  margin: 1rem auto;

  @keyframes spin {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(360deg);
    }
  }
`;

const SpinningWheel = styled.div`
  position: relative;
  height: 200px;
  overflow: hidden;
  margin: 1rem 0;
`;

const SpinningName = styled.div<{ index: number }>`
  position: absolute;
  width: 100%;
  text-align: center;
  font-size: 1.5rem;
  color: var(--text-primary);
  opacity: 0.3;
  transform: translateY(${(props) => props.index * 50}px);
  transition: all 0.3s ease;

  &.active {
    opacity: 1;
    color: var(--primary-color);
    transform: translateY(80px);
    font-size: 2rem;
    font-weight: bold;
  }
`;

interface VoiToken {
  tokenId: string;
  metadata: string;
  owner: string;
}

const NamePicker: React.FC = () => {
  const [names, setNames] = useState<string>("");
  const [pickedName, setPickedName] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [filter, setFilter] = useState<string>("");
  const [nameCount, setNameCount] = useState<number>(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPicking, setIsPicking] = useState(false);
  const [spinningNames, setSpinningNames] = useState<string[]>([]);

  useEffect(() => {
    const fetchVoiDomains = async () => {
      setIsLoading(true);
      setError("");
      try {
        const response = await fetch(
          "https://mainnet-idx.nautilus.sh/nft-indexer/v1/tokens?contractId=797609"
        );
        if (!response.ok) throw new Error("Failed to fetch domain names");

        const data = await response.json();
        const domainNames = data.tokens
          .filter(
            (token: VoiToken) =>
              token.owner !==
              "BRB3JP4LIW5Q755FJCGVAOA4W3THJ7BR3K6F26EVCGMETLEAZOQRHHJNLQ"
          )
          .map((token: VoiToken) => JSON.parse(token.metadata)?.name || "")
          .filter((name: string) => name !== "")
          .join("\n");

        setNames(domainNames);
        setNameCount(
          domainNames.split("\n").filter((name) => name.trim().length > 0)
            .length
        );
      } catch (err) {
        setError("Failed to load domain names. Please try again later.");
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchVoiDomains();
  }, []);

  const filteredNames = useMemo(() => {
    return names
      .split("\n")
      .map((name) => name.trim())
      .filter((name) => name.length > 0)
      .filter((name) =>
        filter ? name.toLowerCase().includes(filter.toLowerCase()) : true
      );
  }, [names, filter]);

  const pickRandomName = () => {
    if (filteredNames.length > 0) {
      setIsPicking(true);
      setPickedName(""); // Clear previous pick

      // Create spinning animation sequence
      let spins = 0;
      const spinInterval = setInterval(() => {
        const randomNames = Array.from(
          { length: 5 },
          () => filteredNames[Math.floor(Math.random() * filteredNames.length)]
        );
        setSpinningNames(randomNames);
        spins++;

        if (spins >= 20) {
          // Stop after 20 spins (about 4 seconds)
          clearInterval(spinInterval);
          setTimeout(() => {
            const finalName =
              filteredNames[Math.floor(Math.random() * filteredNames.length)];
            setPickedName(finalName);
            setIsPicking(false);
            setSpinningNames([]);
          }, 1000); // Final delay before showing result
        }
      }, 200); // Update every 200ms
    }
  };

  return (
    <Container>
      <Instructions>
        {isLoading
          ? "Loading .voi domain names..."
          : error
          ? error
          : `Total domains: ${nameCount}${
              filter ? ` (Filtered: ${filteredNames.length} domains)` : ""
            }`}
        {!isLoading && !error && (
          <ViewIcon
            onClick={() => setIsModalOpen(true)}
            title="View filtered names"
          >
            👁️
          </ViewIcon>
        )}
      </Instructions>

      <FilterInput
        type="text"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        placeholder="Filter domains (optional)"
        aria-label="Filter input"
        disabled={isLoading}
      />

      <Button
        onClick={pickRandomName}
        disabled={!names.trim() || isLoading}
        aria-label="Pick random name"
      >
        {isLoading ? "Loading..." : "Pick Random Name"}
      </Button>

      <Modal isOpen={isModalOpen} onClick={() => setIsModalOpen(false)}>
        <ModalContent onClick={(e) => e.stopPropagation()}>
          <h3>Filtered Domains ({filteredNames.length})</h3>
          <NameList>
            {filteredNames.map((name, index) => (
              <li key={index}>{name}</li>
            ))}
          </NameList>
          <Button
            onClick={() => setIsModalOpen(false)}
            style={{ marginTop: "1rem" }}
          >
            Close
          </Button>
        </ModalContent>
      </Modal>

      {(isPicking || pickedName) && (
        <Result>
          <h3>Selected Domain:</h3>
          {isPicking ? (
            <SpinningWheel>
              {spinningNames.map((name, index) => (
                <SpinningName
                  key={`${name}-${index}`}
                  index={index}
                  className={index === 2 ? "active" : ""}
                >
                  {name}
                </SpinningName>
              ))}
            </SpinningWheel>
          ) : (
            <div className="picked-name">{pickedName}</div>
          )}
        </Result>
      )}
    </Container>
  );
};

export default NamePicker;
