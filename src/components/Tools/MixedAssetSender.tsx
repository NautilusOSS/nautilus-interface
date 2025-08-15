import React, { useState, useRef } from "react";
import styled from "styled-components";
import algosdk from "algosdk";
import { getAlgorandClients } from "@/wallets";
import { useWallet } from "@txnlab/use-wallet-react";
import { abi, CONTRACT } from "ulujs";
import BigNumber from "bignumber.js";

const Container = styled.div`
  max-width: 800px;
  margin: 0 auto;
  padding: 1rem;
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  background: var(--background-secondary);
  padding: 2rem;
  border-radius: 8px;
  border: 1px solid var(--border-color);
`;

const Section = styled.div`
  border: 1px solid var(--border-color);
  border-radius: 6px;
  padding: 1.5rem;
  background: var(--background-tertiary);
`;

const SectionTitle = styled.h3`
  margin: 0 0 1rem 0;
  color: var(--text-primary);
  font-size: 1.1rem;
  font-weight: 600;
`;

const Input = styled.input`
  padding: 0.75rem;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  background: var(--background-primary);
  color: var(--text-primary);
  width: 100%;
  outline: none;
  font-family: monospace;

  &:focus {
    border-color: var(--accent-color);
    box-shadow: 0 0 0 1px var(--accent-color);
  }

  &::placeholder {
    color: var(--text-secondary);
    opacity: 0.7;
  }
`;

const TextArea = styled.textarea`
  padding: 0.75rem;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  background: var(--background-primary);
  color: var(--text-primary);
  width: 100%;
  min-height: 200px;
  outline: none;
  font-family: monospace;
  resize: vertical;

  &:focus {
    border-color: var(--accent-color);
    box-shadow: 0 0 0 1px var(--accent-color);
  }

  &::placeholder {
    color: var(--text-secondary);
    opacity: 0.7;
  }
`;

const Select = styled.select`
  padding: 0.75rem;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  background: var(--background-primary);
  color: var(--text-primary);
  width: 100%;
  outline: none;
  cursor: pointer;

  &:focus {
    border-color: var(--accent-color);
    box-shadow: 0 0 0 1px var(--accent-color);
  }
`;

const Button = styled.button`
  padding: 0.75rem 1.5rem;
  background: var(--primary-color);
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.2s ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);

  &:hover {
    opacity: 0.9;
    transform: translateY(-1px);
  }

  &:active {
    transform: translateY(0);
  }

  &:disabled {
    background: var(--background-tertiary);
    color: var(--text-secondary);
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }
`;

const AssetItem = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: var(--background-primary);
  border: 1px solid var(--border-color);
  border-radius: 4px;
  margin-bottom: 0.5rem;
`;

const RemoveButton = styled.button`
  background: #dc2626;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 0.25rem 0.5rem;
  cursor: pointer;
  font-size: 0.75rem;
  transition: opacity 0.2s ease;

  &:hover {
    opacity: 0.8;
  }
`;

const AddButton = styled.button`
  background: var(--accent-color);
  color: white;
  border: none;
  border-radius: 4px;
  padding: 0.5rem 1rem;
  cursor: pointer;
  font-weight: 500;
  transition: opacity 0.2s ease;

  &:hover {
    opacity: 0.8;
  }
`;

const ImportButton = styled.button`
  background: var(--accent-color);
  color: white;
  border: none;
  border-radius: 4px;
  padding: 0.5rem 1rem;
  cursor: pointer;
  font-weight: 500;
  transition: opacity 0.2s ease;
  margin-left: 0.5rem;

  &:hover {
    opacity: 0.8;
  }
`;

const ResultContainer = styled.div`
  margin-top: 1rem;
  padding: 1rem;
  background: var(--background-secondary);
  border-radius: 4px;
  border: 1px solid var(--border-color);
`;

const ErrorMessage = styled.div`
  color: #dc2626;
  background: rgba(220, 38, 38, 0.1);
  padding: 0.75rem;
  border-radius: 4px;
  margin-top: 0.5rem;
`;

const SuccessMessage = styled.div`
  color: #059669;
  background: rgba(5, 150, 105, 0.1);
  padding: 0.75rem;
  border-radius: 4px;
  margin-top: 0.5rem;
`;

// Modal styled components
const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

const ModalContent = styled.div`
  background: var(--background-secondary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 2rem;
  max-width: 600px;
  width: 90%;
  max-height: 80vh;
  overflow-y: auto;
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
`;

const ModalTitle = styled.h3`
  margin: 0;
  color: var(--text-primary);
  font-size: 1.2rem;
  font-weight: 600;
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  color: var(--text-secondary);
  font-size: 1.5rem;
  cursor: pointer;
  padding: 0;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;

  &:hover {
    background: var(--background-tertiary);
    color: var(--text-primary);
  }
`;

const ModalActions = styled.div`
  display: flex;
  gap: 1rem;
  margin-top: 1.5rem;
  justify-content: flex-end;
`;

const FileUploadArea = styled.div`
  border: 2px dashed var(--border-color);
  border-radius: 8px;
  padding: 2rem;
  text-align: center;
  background: var(--background-primary);
  margin-bottom: 1rem;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    border-color: var(--accent-color);
    background: var(--background-tertiary);
  }

  &.drag-over {
    border-color: var(--accent-color);
    background: var(--background-tertiary);
  }
`;

const FileUploadText = styled.div`
  color: var(--text-secondary);
  margin-bottom: 0.5rem;
`;

const FileUploadButton = styled.button`
  background: var(--accent-color);
  color: white;
  border: none;
  border-radius: 4px;
  padding: 0.5rem 1rem;
  cursor: pointer;
  font-weight: 500;
  transition: opacity 0.2s ease;

  &:hover {
    opacity: 0.8;
  }
`;

const TabContainer = styled.div`
  display: flex;
  margin-bottom: 1.5rem;
  border-bottom: 1px solid var(--border-color);
`;

const Tab = styled.button<{ active: boolean }>`
  background: none;
  border: none;
  padding: 0.75rem 1.5rem;
  cursor: pointer;
  color: ${(props) =>
    props.active ? "var(--accent-color)" : "var(--text-secondary)"};
  border-bottom: 2px solid
    ${(props) => (props.active ? "var(--accent-color)" : "transparent")};
  font-weight: ${(props) => (props.active ? "600" : "400")};
  transition: all 0.2s ease;

  &:hover {
    color: var(--accent-color);
  }
`;

interface Asset {
  type: "arc200";
  amount?: string;
  tokenId?: string;
}

interface AssetItemProps {
  asset: Asset;
  index: number;
  onRemove: (index: number) => void;
  onUpdate: (index: number, asset: Asset) => void;
}

const AssetItemComponent: React.FC<AssetItemProps> = ({
  asset,
  index,
  onRemove,
  onUpdate,
}) => {
  const handleTypeChange = (type: "arc200") => {
    onUpdate(index, { type });
  };

  const handleAmountChange = (amount: string) => {
    onUpdate(index, { ...asset, amount });
  };

  const handleTokenIdChange = (tokenId: string) => {
    onUpdate(index, { ...asset, tokenId });
  };

  return (
    <AssetItem>
      <Select
        value={asset.type}
        onChange={(e) => handleTypeChange(e.target.value as "arc200")}
      >
        <option value="arc200">ARC200 Token</option>
      </Select>

      <Input
        placeholder="Token ID"
        value={asset.tokenId || ""}
        onChange={(e) => handleTokenIdChange(e.target.value)}
      />
      <Input
        type="number"
        placeholder="Amount"
        value={asset.amount || ""}
        onChange={(e) => handleAmountChange(e.target.value)}
      />

      <RemoveButton onClick={() => onRemove(index)}>Remove</RemoveButton>
    </AssetItem>
  );
};

const MixedAssetSender: React.FC = () => {
  const [recipient, setRecipient] = useState("");
  const [assets, setAssets] = useState<Asset[]>([{ type: "arc200" }]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");
  const [showImportModal, setShowImportModal] = useState(false);
  const [importText, setImportText] = useState("");
  const [activeTab, setActiveTab] = useState<"text" | "csv">("text");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { activeAccount, signTransactions } = useWallet();

  const addAsset = () => {
    setAssets([...assets, { type: "arc200" }]);
  };

  const removeAsset = (index: number) => {
    if (assets.length > 1) {
      setAssets(assets.filter((_, i) => i !== index));
    }
  };

  const updateAsset = (index: number, asset: Asset) => {
    const newAssets = [...assets];
    newAssets[index] = asset;
    setAssets(newAssets);
  };

  const parseImportText = (text: string): Asset[] => {
    const lines = text
      .trim()
      .split("\n")
      .filter((line) => line.trim());
    const parsedAssets: Asset[] = [];

    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine) continue;

      // Try to parse different formats
      // Format 1: type,amount,tokenId,collectionId,assetId
      const parts = trimmedLine.split(",").map((part) => part.trim());

      if (parts.length >= 1) {
        const type = parts[0].toLowerCase();

        if (type === "arc200" && parts.length >= 3) {
          parsedAssets.push({
            type: "arc200",
            tokenId: parts[1],
            amount: parts[2],
          });
        }
      }
    }

    return parsedAssets;
  };

  const parseCSV = (csvText: string): Asset[] => {
    const lines = csvText
      .trim()
      .split("\n")
      .filter((line) => line.trim());
    const parsedAssets: Asset[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Skip header row if it exists
      if (
        i === 0 &&
        (line.toLowerCase().includes("type") ||
          line.toLowerCase().includes("asset"))
      ) {
        continue;
      }

      const parts = line
        .split(",")
        .map((part) => part.trim().replace(/"/g, ""));

      if (parts.length >= 1) {
        const type = parts[0].toLowerCase();

        if (type === "arc200" && parts.length >= 3) {
          parsedAssets.push({
            type: "arc200",
            tokenId: parts[1],
            amount: parts[2],
          });
        }
      }
    }

    return parsedAssets;
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      try {
        const parsedAssets = parseCSV(text);

        if (parsedAssets.length === 0) {
          setError(
            "No valid ARC200 tokens found in the CSV file. Please check the format."
          );
          return;
        }

        setAssets(parsedAssets);
        setShowImportModal(false);
        setSuccess(
          `Successfully imported ${parsedAssets.length} ARC200 token(s) from CSV`
        );
      } catch (err) {
        setError("Failed to parse CSV file. Please check the format.");
      }
    };
    reader.readAsText(file);
  };

  const handleImport = () => {
    try {
      const parsedAssets = parseImportText(importText);

      if (parsedAssets.length === 0) {
        setError(
          "No valid ARC200 tokens found in the import text. Please check the format."
        );
        return;
      }

      setAssets(parsedAssets);
      setShowImportModal(false);
      setImportText("");
      setSuccess(
        `Successfully imported ${parsedAssets.length} ARC200 token(s)`
      );
    } catch (err) {
      setError("Failed to parse import text. Please check the format.");
    }
  };

  const validateAssets = (): boolean => {
    for (const asset of assets) {
      if (asset.type === "arc200") {
        if (!asset.tokenId || !asset.amount || parseFloat(asset.amount) <= 0) {
          setError("Please enter valid token ID and amount for ARC200 token");
          return false;
        }
      }
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setResult("");

    if (!activeAccount) {
      setError("Please connect your wallet first");
      return;
    }

    if (!recipient) {
      setError("Please enter a recipient address");
      return;
    }

    if (!validateAssets()) {
      return;
    }

    setLoading(true);

    try {
      const { algodClient, indexerClient } = getAlgorandClients();

      const ci = new CONTRACT(0, algodClient, indexerClient, abi.custom, {
        addr: activeAccount.address,
        sk: new Uint8Array(),
      });

      const buildN = [];
      let i = 0;

      // Add ARC200 token transfers
      const arc200Assets = assets.filter((asset) => asset.type === "arc200");
      for (const asset of arc200Assets) {
        const contractId = Number(asset.tokenId);
        const amount = Number(asset.amount);
        if (contractId && amount) {
          const ci = new CONTRACT(
            contractId,
            algodClient,
            indexerClient,
            abi.nt200,
            {
              addr: activeAccount.address,
              sk: new Uint8Array(),
            },
            true,
            false,
            true
          );
          const decimalsR = await ci.arc200_decimals();
          const decimals = Number(decimalsR.returnValue);
          const amountBigInt = BigInt(
            new BigNumber(amount).multipliedBy(10 ** decimals).toFixed(0)
          );
          const txnO = (await ci.arc200_transfer(recipient, amountBigInt)).obj;
          buildN.push({
            ...txnO,
            note: new TextEncoder().encode(
              `arc200_transfer_${asset.tokenId}_${asset.amount}`
            ),
            payment: 28500 + i++,
          });
        }
      }

      ci.setEnableGroupResourceSharing(true);
      ci.setExtraTxns(buildN);

      const customR = await ci.custom();
      console.log({ customR });

      if (!customR.success) {
        setError(customR.error);
        return;
      }

      const signedTxs = await signTransactions(
        customR.txns.map((tx: string) =>
          Uint8Array.from(Buffer.from(tx, "base64"))
        )
      );

      const { txId } = await algodClient
        .sendRawTransaction(signedTxs as Uint8Array[])
        .do();

      // Wait for confirmation
      const confirmedTxn = await algosdk.waitForConfirmation(
        algodClient,
        txId,
        4
      );

      setSuccess(`Transaction successful! Transaction ID: ${txId}`);
      setResult(JSON.stringify(confirmedTxn, null, 2));

      // Reset form
      setAssets([{ type: "arc200" }]);
      setRecipient("");
    } catch (err) {
      console.error("Error sending assets:", err);
      setError(err instanceof Error ? err.message : "Failed to send assets");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container>
      <h2>Mixed Asset Sender</h2>
      <p>Send multiple ARC200 tokens in a single transaction.</p>

      <Form onSubmit={handleSubmit}>
        <Section>
          <SectionTitle>Recipient Address</SectionTitle>
          <Input
            type="text"
            placeholder="Enter recipient address"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            required
          />
        </Section>

        <Section>
          <SectionTitle>ARC200 Tokens to Send</SectionTitle>
          {assets.map((asset, index) => (
            <AssetItemComponent
              key={index}
              asset={asset}
              index={index}
              onRemove={removeAsset}
              onUpdate={updateAsset}
            />
          ))}
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <AddButton type="button" onClick={addAsset}>
              Add Token
            </AddButton>
            <ImportButton
              type="button"
              onClick={() => setShowImportModal(true)}
            >
              Import Tokens
            </ImportButton>
          </div>
        </Section>

        <Button type="submit" disabled={loading || !activeAccount}>
          {loading ? "Sending..." : "Send Tokens"}
        </Button>
      </Form>

      {error && <ErrorMessage>{error}</ErrorMessage>}
      {success && <SuccessMessage>{success}</SuccessMessage>}

      {result && (
        <ResultContainer>
          <h4>Transaction Result:</h4>
          <pre>{result}</pre>
        </ResultContainer>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <ModalOverlay onClick={() => setShowImportModal(false)}>
          <ModalContent onClick={(e) => e.stopPropagation()}>
            <ModalHeader>
              <ModalTitle>Import ARC200 Tokens</ModalTitle>
              <CloseButton onClick={() => setShowImportModal(false)}>
                ×
              </CloseButton>
            </ModalHeader>

            <TabContainer>
              <Tab
                active={activeTab === "text"}
                onClick={() => setActiveTab("text")}
              >
                Text Input
              </Tab>
              <Tab
                active={activeTab === "csv"}
                onClick={() => setActiveTab("csv")}
              >
                CSV Upload
              </Tab>
            </TabContainer>

            {activeTab === "text" && (
              <div>
                <p
                  style={{
                    marginBottom: "1rem",
                    color: "var(--text-secondary)",
                  }}
                >
                  Paste your ARC200 tokens in the following format (one per
                  line):
                </p>
                <div
                  style={{
                    background: "var(--background-primary)",
                    padding: "1rem",
                    borderRadius: "4px",
                    marginBottom: "1rem",
                    fontFamily: "monospace",
                    fontSize: "0.875rem",
                  }}
                >
                  <div>arc200,123,500</div>
                </div>

                <TextArea
                  placeholder="Paste your ARC200 tokens here..."
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                />
              </div>
            )}

            {activeTab === "csv" && (
              <div>
                <p
                  style={{
                    marginBottom: "1rem",
                    color: "var(--text-secondary)",
                  }}
                >
                  Upload a CSV file with your ARC200 tokens. The file should
                  have the following format:
                </p>
                <div
                  style={{
                    background: "var(--background-primary)",
                    padding: "1rem",
                    borderRadius: "4px",
                    marginBottom: "1rem",
                    fontFamily: "monospace",
                    fontSize: "0.875rem",
                  }}
                >
                  <div>type,tokenId,amount</div>
                  <div>arc200,123,500</div>
                </div>

                <FileUploadArea onClick={() => fileInputRef.current?.click()}>
                  <FileUploadText>
                    Click to select a CSV file or drag and drop
                  </FileUploadText>
                  <FileUploadButton type="button">Choose File</FileUploadButton>
                </FileUploadArea>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  style={{ display: "none" }}
                />
              </div>
            )}

            <ModalActions>
              <Button
                type="button"
                onClick={() => setShowImportModal(false)}
                style={{
                  background: "var(--background-tertiary)",
                  color: "var(--text-primary)",
                }}
              >
                Cancel
              </Button>
              {activeTab === "text" && (
                <Button type="button" onClick={handleImport}>
                  Import
                </Button>
              )}
            </ModalActions>
          </ModalContent>
        </ModalOverlay>
      )}
    </Container>
  );
};

export default MixedAssetSender;
