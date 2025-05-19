import React, { useState, useEffect } from "react";
import styled from "styled-components";
import algosdk from "algosdk";
import { getAlgorandClients } from "@/wallets";
import { CONTRACT, abi } from "ulujs";
import { useWallet } from "@txnlab/use-wallet-react";
import { useSelector } from "react-redux";
import { RootState } from "@/store/store";
import { useSearchParams } from "react-router-dom";

const Container = styled.div`
  padding: 1rem;
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  max-width: 500px;
  margin: 0 auto;
`;

const Input = styled.input`
  padding: 0.5rem;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  background: var(--background-secondary);
  color: var(--text-primary);
  width: 100%;
  outline: none;

  &:focus {
    border-color: var(--accent-color);
    box-shadow: 0 0 0 1px var(--accent-color);
  }

  &::placeholder {
    color: var(--text-secondary);
    opacity: 0.7;
  }
`;

const Button = styled.button`
  padding: 0.75rem 1rem;
  background: var(--accent-color);
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
  transition: opacity 0.2s ease;

  &:hover {
    opacity: 0.9;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const ResultContainer = styled.div`
  margin-top: 1rem;
  padding: 1rem;
  background: var(--background-secondary);
  border-radius: 4px;
  white-space: pre-wrap;
`;

const Modal = styled.div<{ isDark: boolean }>`
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: ${(props) => (props.isDark ? "#000" : "#ffffff")};
  padding: 2rem;
  border-radius: 8px;
  box-shadow: 0 4px 6px
    rgba(0, 0, 0, ${(props) => (props.isDark ? "0.3" : "0.1")});
  z-index: 1000;
  max-height: 90vh;
  overflow-y: auto;
  max-width: 90vw;
  width: 500px;
`;

const Overlay = styled.div<{ isDark: boolean }>`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, ${(props) => (props.isDark ? "0.7" : "0.5")});
  z-index: 999;
`;

const TransactionModal = styled(Modal)`
  text-align: center;

  p {
    margin: 1rem 0;
  }
`;

const TransactionLink = styled.a`
  color: var(--accent-color);
  text-decoration: none;
  &:hover {
    text-decoration: underline;
  }
`;

interface Participation {
  selectionParticipationKey: string;
  stateProofKey: string;
  voteFirstValid: number;
  voteKeyDilution: number;
  voteLastValid: number;
  voteParticipationKey: string;
}

const wvoiABI = {
  name: "WrappedVOI",
  desc: "Wrapped VOI",
  methods: [
    {
      name: "manager",
      args: [],
      returns: {
        type: "address",
      },
    },
    {
      name: "touch",
      args: [],
      returns: {
        type: "uint64",
      },
    },
    {
      name: "register",
      desc: "",
      args: [
        { name: "votekey", type: "byte[32]" },
        { name: "selkey", type: "byte[32]" },
        { name: "spkey", type: "byte[64]" },
        { name: "votefst", type: "uint64" },
        { name: "votelst", type: "uint64" },
        { name: "votekd", type: "uint64" },
      ],
      returns: { type: "byte" },
    },
    {
      name: "grant",
      desc: "",
      args: [{ name: "addr", type: "address" }],
      returns: { type: "void" },
    },
  ],
  events: [],
};

const WrappedVoiManager: React.FC = () => {
  const isDarkTheme = useSelector(
    (state: RootState) => state.theme.isDarkTheme
  );
  const { activeAccount, signTransactions } = useWallet();
  const [address, setAddress] = useState("");
  const [searchParams, setSearchParams] = useSearchParams();
  const [appId, setAppId] = useState(searchParams.get("appId") || "");
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [availableBalance, setAvailableBalance] = useState<number>(0);
  const [participation, setParticipation] = useState<Participation | null>(
    null
  );
  const [manager, setManager] = useState<string | null>(null);
  const [withdrawableAmount, setWithdrawableAmount] = useState<number>(0);
  const [withdrawing, setWithdrawing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [txId, setTxId] = useState("");
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [participationForm, setParticipationForm] = useState<Participation>({
    selectionParticipationKey: "",
    stateProofKey: "",
    voteFirstValid: 0,
    voteKeyDilution: 0,
    voteLastValid: 0,
    voteParticipationKey: "",
  });
  const [isTextAreaMode, setIsTextAreaMode] = useState(false);
  const [participationText, setParticipationText] = useState("");
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [grantAddress, setGrantAddress] = useState("");
  const [isGranting, setIsGranting] = useState(false);
  const [showTxModal, setShowTxModal] = useState(false);
  const [showGrantConfirmation, setShowGrantConfirmation] = useState(false);

  const handleGrant = async () => {
    try {
      setIsGranting(true);
      if (!activeAccount) {
        throw new Error("No active account");
      }
      if (activeAccount.address !== manager) {
        throw new Error("You are not the manager");
      }
      if (!grantAddress) {
        throw new Error("Grant address is required");
      }
      const { algodClient } = getAlgorandClients();
      const appIdNumber = Number(appId);
      const ci = new CONTRACT(appIdNumber, algodClient, undefined, wvoiABI, {
        addr: activeAccount.address,
        sk: new Uint8Array(0),
      });
      ci.setFee(3000);
      const grantR = await ci.grant(grantAddress);
      if (!grantR.success) {
        throw new Error("Failed to grant");
      }
      const stxns = await signTransactions(
        grantR.txns.map((t: string) => new Uint8Array(Buffer.from(t, "base64")))
      );
      const res = await algodClient
        .sendRawTransaction(stxns as Uint8Array[])
        .do();
      if (res.txId) {
        setTxId(res.txId);
        setShowModal(false);
        setShowTxModal(true);
        setManager(grantAddress);
        setGrantAddress("");
        setResult("Grant successful!");
      }
    } catch (error) {
      setResult("Error granting. Please try again.");
    } finally {
      setIsGranting(false);
    }
  };
  const handlePartkeyChange = async () => {
    try {
      if (!activeAccount) {
        throw new Error("No active account");
      }
      if (activeAccount.address !== manager) {
        throw new Error("You are not the manager");
      }
      const { algodClient } = getAlgorandClients();
      const appIdNumber = Number(appId);
      const builder = {
        wnt: new CONTRACT(
          appIdNumber,
          algodClient,
          undefined,
          wvoiABI,
          {
            addr: activeAccount.address,
            sk: new Uint8Array(0),
          },
          true,
          false,
          true
        ),
      };
      const ci = new CONTRACT(appIdNumber, algodClient, undefined, abi.custom, {
        addr: activeAccount.address,
        sk: new Uint8Array(0),
      });
      const votekey = participationForm.voteParticipationKey;
      const selkey = participationForm.selectionParticipationKey;
      const spkey = participationForm.stateProofKey;
      const votefst = participationForm.voteFirstValid;
      const votelst = participationForm.voteLastValid;
      const votekd = participationForm.voteKeyDilution;
      const ki = {
        votekey,
        selkey,
        spkey,
        votefst,
        votelst,
        votekd,
      };
      const txnO = {
        ...(
          await builder.wnt.register(
            new Uint8Array(Buffer.from(ki.votekey, "base64")),
            new Uint8Array(Buffer.from(ki.selkey, "base64")),
            new Uint8Array(Buffer.from(ki.spkey, "base64")),
            ki.votefst,
            ki.votelst,
            ki.votekd
          )
        ).obj,
        payment: 28500,
        note: new Uint8Array(Buffer.from(`register wnt new partkeyinfo`)),
      };
      ci.setFee(2000);
      ci.setEnableGroupResourceSharing(true);
      ci.setExtraTxns([txnO]);
      const customR = await ci.custom();
      if (!customR.success) {
        throw new Error("Failed to register");
      }
      const stxns = await signTransactions(
        customR.txns.map(
          (t: string) => new Uint8Array(Buffer.from(t, "base64"))
        )
      );
      const res = await algodClient
        .sendRawTransaction(stxns as Uint8Array[])
        .do();
      if (res.txId) {
        setTxId(res.txId);
        setShowTxModal(true);
        setResult("Registration successful!");
      } else {
        throw new Error("Failed to send transaction");
      }
    } catch (error) {
      setResult("Error registering. Please try again.");
    } finally {
      setLoading(false);
    }
  };
  const handleWithdraw = async () => {
    try {
      setWithdrawing(true);
      if (!activeAccount) {
        throw new Error("No active account");
      }
      if (activeAccount.address !== manager) {
        throw new Error("You are not the manager");
      }
      if (withdrawableAmount === 0) {
        throw new Error("Unable to withdraw");
      }
      const { algodClient } = getAlgorandClients();
      const appIdNumber = Number(appId);

      const ci = new CONTRACT(appIdNumber, algodClient, undefined, abi.custom, {
        addr: activeAccount.address,
        sk: new Uint8Array(),
      });
      const builder = {
        wvoi: new CONTRACT(
          appIdNumber,
          algodClient,
          undefined,
          wvoiABI,
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
      {
        const txnO = (await builder.wvoi.touch()).obj;
        buildN.push({
          ...txnO,
          note: new Uint8Array(
            Buffer.from(
              `withdraw wvoi available balance ${withdrawableAmount} VOI to ${activeAccount.address}`
            )
          ),
        });
      }
      ci.setFee(2000);
      ci.setEnableGroupResourceSharing(true);
      ci.setExtraTxns(buildN);
      const customR = await ci.custom();
      if (!customR.success) {
        throw new Error("Failed to touch");
      }
      const stxns = await signTransactions(
        customR.txns.map(
          (t: string) => new Uint8Array(Buffer.from(t, "base64"))
        )
      );
      const res = await algodClient
        .sendRawTransaction(stxns as Uint8Array[])
        .do();
      if (res.txId) {
        setTxId(res.txId);
        setShowTxModal(true);
        setResult("Withdrawal successful!");
      } else {
        throw new Error("Failed to send transaction");
      }
      setWithdrawableAmount(0);
    } catch (error) {
      setResult("Error withdrawing. Please try again.");
    } finally {
      setWithdrawing(false);
    }
  };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!appId) return;
    setLoading(true);
    try {
      const { algodClient } = getAlgorandClients();
      const appIdNumber = Number(appId);
      if (isNaN(appIdNumber)) {
        throw new Error("Invalid appId");
      }
      const appAddress = algosdk.getApplicationAddress(appIdNumber);
      setAddress(appAddress);
      const accInfo = await algodClient.accountInformation(appAddress).do();
      const availableBalance = (accInfo.amount - accInfo["min-balance"]) / 1e6;
      setAvailableBalance(availableBalance);
      const participation = {
        selectionParticipationKey:
          accInfo?.participation?.["selection-participation-key"] || "",
        stateProofKey: accInfo?.participation?.["state-proof-key"] || "",
        voteFirstValid: accInfo?.participation?.["vote-first-valid"] || 0,
        voteKeyDilution: accInfo?.participation?.["vote-key-dilution"] || 0,
        voteLastValid: accInfo?.participation?.["vote-last-valid"] || 0,
        voteParticipationKey:
          accInfo?.participation?.["vote-participation-key"] || "",
      };
      setParticipation(participation);
      const ci = new CONTRACT(appIdNumber, algodClient, undefined, wvoiABI, {
        addr: activeAccount?.address || appAddress,
        sk: new Uint8Array(),
      });
      const managerR = await ci.manager();
      if (!managerR.success) {
        throw new Error("Failed to get manager");
      }
      const manager = managerR.returnValue;
      setManager(manager);
      ci.setFee(2000);
      const touchR = await ci.touch();
      if (!touchR.success) {
        throw new Error("Failed to touch");
      }
      setWithdrawableAmount(Number(touchR.returnValue) / 1e6);
      setResult(`
 __      ____      _______ 
 \\ \\    / /\\ \\    / / ____|
  \\ \\  / /  \\ \\  / / |     
   \\ \\/ /    \\ \\/ /| |     
    \\  /      \\  / | |____ 
     \\/        \\/   \\_____|
`);
    } catch (error) {
      setResult("Error checking VOI status. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateParticipation = (e: React.FormEvent) => {
    e.preventDefault();
    setShowConfirmation(true);
  };

  const handleConfirmUpdate = async () => {
    try {
      setLoading(true);
      await handlePartkeyChange();
      setShowConfirmation(false);
      setShowUpdateModal(false);
      setResult("Participation keys updated successfully!");
    } catch (error) {
      setResult("Error updating participation keys. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleParticipationTextChange = (text: string) => {
    setParticipationText(text);
    try {
      const lines = text.split("\n");

      const selectionKey =
        lines
          .find((l) => l.includes("Selection key"))
          ?.split(":")[1]
          ?.trim() || "";
      const stateProofKey =
        lines
          .find((l) => l.includes("State proof key"))
          ?.split(":")[1]
          ?.trim() || "";
      const firstRound = parseInt(
        lines
          .find((l) => l.includes("First round"))
          ?.split(":")[1]
          ?.trim() || "0"
      );
      const lastRound = parseInt(
        lines
          .find((l) => l.includes("Last round"))
          ?.split(":")[1]
          ?.trim() || "0"
      );
      const keyDilution = parseInt(
        lines
          .find((l) => l.includes("Key dilution"))
          ?.split(":")[1]
          ?.trim() || "0"
      );
      const votingKey =
        lines
          .find((l) => l.includes("Voting key"))
          ?.split(":")[1]
          ?.trim() || "";

      setParticipationForm({
        selectionParticipationKey: selectionKey,
        stateProofKey: stateProofKey,
        voteFirstValid: firstRound,
        voteKeyDilution: keyDilution,
        voteLastValid: lastRound,
        voteParticipationKey: votingKey,
      });
    } catch (error) {
      console.error("Failed to parse participation text:", error);
    }
  };

  const handleGrantSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowGrantConfirmation(true);
  };

  return (
    <Container>
      <h2>Wrapped VOI Manager</h2>
      <p>
        Check and manage your wrapped VOI status. Enter a specific address
        (optional) and the contract appId below.
      </p>

      <Form onSubmit={handleSubmit}>
        <Input
          type="number"
          placeholder="Enter application id..."
          value={appId}
          onChange={(e) => setAppId(e.target.value)}
          required
        />
        <Button type="submit" disabled={loading || !appId}>
          {loading ? "Checking..." : "Check Status"}
        </Button>
      </Form>

      {result && (
        <ResultContainer>
          <pre>{result}</pre>
          <pre>AppId: {appId}</pre>
          <pre>Address: {address}</pre>
          <pre>Manager: {manager}</pre>
          <pre>Available balance: {availableBalance} VOI</pre>
          <pre>Withdrawable amount: {withdrawableAmount} VOI</pre>
          <pre>
            Participation:{" "}
            {participation && (
              <div style={{ marginLeft: "1rem" }}>
                {JSON.stringify(participation, null, 2)}
              </div>
            )}
          </pre>
          {activeAccount?.address === manager && (
            <div style={{ marginTop: "1rem" }}>
              {withdrawableAmount > 0 && (
                <Button
                  onClick={handleWithdraw}
                  style={{ marginRight: "1rem" }}
                  disabled={withdrawing}
                >
                  {withdrawing ? "Withdrawing..." : "Withdraw"}
                </Button>
              )}
              <Button
                onClick={() => setShowUpdateModal(true)}
                style={{ marginRight: "1rem" }}
              >
                Update Participation
              </Button>
              <Button onClick={() => setShowModal(true)}>
                Transfer Manager
              </Button>
            </div>
          )}
        </ResultContainer>
      )}

      {showModal && (
        <>
          <Overlay isDark={isDarkTheme} onClick={() => setShowModal(false)} />
          <Modal isDark={isDarkTheme}>
            <h3>Transfer Manager</h3>
            {!showGrantConfirmation ? (
              <Form onSubmit={handleGrantSubmit}>
                <Input
                  type="text"
                  placeholder="Enter new manager address..."
                  value={grantAddress}
                  onChange={(e) => setGrantAddress(e.target.value)}
                  required
                  disabled={isGranting}
                />
                <div
                  style={{ display: "flex", gap: "1rem", marginTop: "1rem" }}
                >
                  <Button type="submit" disabled={isGranting}>
                    Continue
                  </Button>
                  <Button
                    type="button"
                    onClick={() => setShowModal(false)}
                    disabled={isGranting}
                  >
                    Cancel
                  </Button>
                </div>
              </Form>
            ) : (
              <div>
                <p style={{ color: "red", marginBottom: "1rem" }}>
                  Warning: This action is irreversible! The new manager will
                  have full control over the contract.
                </p>
                <p style={{ marginBottom: "1rem" }}>
                  New manager address: <strong>{grantAddress}</strong>
                </p>
                <div style={{ display: "flex", gap: "1rem" }}>
                  <Button onClick={handleGrant} disabled={isGranting}>
                    {isGranting ? "Transferring..." : "Confirm Transfer"}
                  </Button>
                  <Button
                    onClick={() => setShowGrantConfirmation(false)}
                    disabled={isGranting}
                  >
                    Back
                  </Button>
                  <Button
                    onClick={() => {
                      setShowGrantConfirmation(false);
                      setShowModal(false);
                    }}
                    disabled={isGranting}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </Modal>
        </>
      )}

      {showUpdateModal && (
        <>
          <Overlay
            isDark={isDarkTheme}
            onClick={() => setShowUpdateModal(false)}
          />
          <Modal isDark={isDarkTheme}>
            {!showConfirmation ? (
              <>
                <h3>Update Participation</h3>
                <div style={{ marginBottom: "1rem" }}>
                  <Button
                    type="button"
                    onClick={() => setIsTextAreaMode(!isTextAreaMode)}
                    style={{ marginBottom: "1rem" }}
                  >
                    {isTextAreaMode ? "Switch to Form" : "Switch to Text Input"}
                  </Button>
                </div>
                <Form onSubmit={handleUpdateParticipation}>
                  {isTextAreaMode ? (
                    <textarea
                      value={participationText}
                      onChange={(e) =>
                        handleParticipationTextChange(e.target.value)
                      }
                      placeholder="Paste participation information here..."
                      style={{
                        width: "100%",
                        minHeight: "200px",
                        padding: "0.5rem",
                        marginBottom: "1rem",
                        background: "var(--background-secondary)",
                        color: "var(--text-primary)",
                        border: "1px solid var(--border-color)",
                        borderRadius: "4px",
                      }}
                    />
                  ) : (
                    <>
                      <Input
                        type="text"
                        placeholder="Selection Participation Key"
                        value={participationForm.selectionParticipationKey}
                        onChange={(e) =>
                          setParticipationForm({
                            ...participationForm,
                            selectionParticipationKey: e.target.value,
                          })
                        }
                        required
                      />
                      <Input
                        type="text"
                        placeholder="State Proof Key"
                        value={participationForm.stateProofKey}
                        onChange={(e) =>
                          setParticipationForm({
                            ...participationForm,
                            stateProofKey: e.target.value,
                          })
                        }
                        required
                      />
                      <Input
                        type="number"
                        placeholder="Vote First Valid"
                        value={participationForm.voteFirstValid}
                        onChange={(e) =>
                          setParticipationForm({
                            ...participationForm,
                            voteFirstValid: Number(e.target.value),
                          })
                        }
                        required
                      />
                      <Input
                        type="number"
                        placeholder="Vote Key Dilution"
                        value={participationForm.voteKeyDilution}
                        onChange={(e) =>
                          setParticipationForm({
                            ...participationForm,
                            voteKeyDilution: Number(e.target.value),
                          })
                        }
                        required
                      />
                      <Input
                        type="number"
                        placeholder="Vote Last Valid"
                        value={participationForm.voteLastValid}
                        onChange={(e) =>
                          setParticipationForm({
                            ...participationForm,
                            voteLastValid: Number(e.target.value),
                          })
                        }
                        required
                      />
                      <Input
                        type="text"
                        placeholder="Vote Participation Key"
                        value={participationForm.voteParticipationKey}
                        onChange={(e) =>
                          setParticipationForm({
                            ...participationForm,
                            voteParticipationKey: e.target.value,
                          })
                        }
                        required
                      />
                    </>
                  )}
                  <Button type="submit">Update</Button>
                  <Button
                    type="button"
                    onClick={() => setShowUpdateModal(false)}
                  >
                    Cancel
                  </Button>
                </Form>
              </>
            ) : (
              <>
                <h3>Confirm Update</h3>
                <div style={{ marginBottom: "1rem" }}>
                  <p>Please review the participation details:</p>
                  <pre
                    style={{
                      background: "var(--background-secondary)",
                      padding: "1rem",
                      borderRadius: "4px",
                      overflow: "auto",
                      maxHeight: "300px",
                    }}
                  >
                    {JSON.stringify(participationForm, null, 2)}
                  </pre>
                </div>
                <div style={{ display: "flex", gap: "1rem" }}>
                  <Button
                    type="button"
                    onClick={handleConfirmUpdate}
                    disabled={loading}
                  >
                    {loading ? "Updating..." : "Confirm Update"}
                  </Button>
                  <Button
                    type="button"
                    onClick={() => setShowConfirmation(false)}
                    disabled={loading}
                  >
                    Back to Edit
                  </Button>
                  <Button
                    type="button"
                    onClick={() => {
                      setShowConfirmation(false);
                      setShowUpdateModal(false);
                    }}
                    disabled={loading}
                  >
                    Cancel
                  </Button>
                </div>
              </>
            )}
          </Modal>
        </>
      )}

      {showTxModal && (
        <>
          <Overlay isDark={isDarkTheme} onClick={() => setShowTxModal(false)} />
          <TransactionModal isDark={isDarkTheme}>
            <h3>Transaction Submitted!</h3>
            <p>Your transaction has been submitted successfully.</p>
            <p>
              Transaction ID:{" "}
              <TransactionLink
                href={`https://voiager.xyz/transaction/${txId}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                {txId}
              </TransactionLink>
            </p>
            <Button onClick={() => setShowTxModal(false)}>Close</Button>
          </TransactionModal>
        </>
      )}
    </Container>
  );
};

export default WrappedVoiManager;
