import React, { useState, useEffect } from "react";
import styled from "styled-components";
import algosdk from "algosdk";
import { getAlgorandClients } from "@/wallets";
import { CONTRACT, abi } from "ulujs";
import { useWallet } from "@txnlab/use-wallet-react";
import { useSelector } from "react-redux";
import { RootState } from "@/store/store";
import { useSearchParams } from "react-router-dom";
import { APP_SPEC as AirdropAppSpec } from "@/clients/AirdropClient";

const Container = styled.div`
  padding: 1rem;
`;

const Form = styled.form<{ isDark: boolean }>`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  max-width: 500px;
  margin: 0 auto;
  padding: 1rem;
  background: ${(props) => (props.isDark ? "#2D3748" : "#F7FAFC")};
  border-radius: 8px;
  border: 1px solid ${(props) => (props.isDark ? "#4A5568" : "#E2E8F0")};
`;

const ModalForm = styled(Form)`
  margin: 0;
  padding: 0;
  background: none;
  border: none;
`;

const Input = styled.input<{ isDark: boolean }>`
  padding: 0.5rem;
  border: 1px solid ${(props) => (props.isDark ? "#4A5568" : "#E2E8F0")};
  border-radius: 4px;
  background: ${(props) => (props.isDark ? "#1A202C" : "#FFFFFF")};
  color: ${(props) => (props.isDark ? "#F7FAFC" : "#2D3748")};
  width: 100%;
  outline: none;

  &:focus {
    border-color: var(--accent-color);
    box-shadow: 0 0 0 1px var(--accent-color);
  }

  &::placeholder {
    color: ${(props) => (props.isDark ? "#A0AEC0" : "#718096")};
    opacity: 0.7;
  }
`;

const Button = styled.button<{ isDark: boolean }>`
  padding: 0.75rem 1.25rem;
  background: ${(props) => (props.isDark ? "#2D3748" : "#EDF2F7")};
  color: ${(props) => (props.isDark ? "#F7FAFC" : "#2D3748")};
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.2s ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);

  &:hover {
    background: ${(props) => (props.isDark ? "#4A5568" : "#E2E8F0")};
    transform: translateY(-1px);
  }

  &:active {
    transform: translateY(0);
  }

  &:disabled {
    background: ${(props) => (props.isDark ? "#1A202C" : "#CBD5E0")};
    color: ${(props) => (props.isDark ? "#4A5568" : "#A0AEC0")};
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
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
  background: ${(props) => (props.isDark ? "#1A202C" : "#ffffff")};
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

const Label = styled.label`
  color: var(--text-primary);
  margin-bottom: 0.25rem;
  font-weight: 500;
`;

const FormGroup = styled.div<{ isDark: boolean }>`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  background: ${(props) => (props.isDark ? "#1A202C" : "#F7FAFC")};
  padding: 0.75rem;
  border-radius: 6px;
`;

const TextArea = styled.textarea<{ isDark: boolean }>`
  width: 100%;
  min-height: 200px;
  padding: 0.5rem;
  margin-bottom: 1rem;
  background: ${(props) => (props.isDark ? "#1A202C" : "#FFFFFF")};
  color: ${(props) => (props.isDark ? "#F7FAFC" : "#2D3748")};
  border: 1px solid ${(props) => (props.isDark ? "#4A5568" : "#E2E8F0")};
  border-radius: 4px;

  &:focus {
    border-color: var(--accent-color);
    box-shadow: 0 0 0 1px var(--accent-color);
  }

  &::placeholder {
    color: ${(props) => (props.isDark ? "#A0AEC0" : "#718096")};
    opacity: 0.7;
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 1rem;
  margin-top: 1rem;
`;

const CompactFormGroup = styled(FormGroup)`
  padding: 0.5rem;
  gap: 0.15rem;
`;

const CompactInput = styled(Input)`
  padding: 0.35rem;
  font-size: 0.9rem;
`;

const CompactLabel = styled(Label)`
  font-size: 0.85rem;
  margin-bottom: 0.1rem;
`;

interface Participation {
  selectionParticipationKey: string;
  stateProofKey: string;
  voteFirstValid: number;
  voteKeyDilution: number;
  voteLastValid: number;
  voteParticipationKey: string;
}

const airdropABI = {
  name: "Airdrop",
  desc: "Airdrop",
  methods: AirdropAppSpec.contract.methods,
  // {
  //   "name": "participate",
  //   "args": [
  //     {
  //       "type": "byte[32]",
  //       "name": "vote_k"
  //     },
  //     {
  //       "type": "byte[32]",
  //       "name": "sel_k"
  //     },
  //     {
  //       "type": "uint64",
  //       "name": "vote_fst"
  //     },
  //     {
  //       "type": "uint64",
  //       "name": "vote_lst"
  //     },
  //     {
  //       "type": "uint64",
  //       "name": "vote_kd"
  //     },
  //     {
  //       "type": "byte[64]",
  //       "name": "sp_key"
  //     }
  events: [],
};

const StakeableManager: React.FC = () => {
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
  const [globalState, setGlobalState] = useState<Record<string, any>>({});

  useEffect(() => {
    const fetchGlobalState = async () => {
      if (!appId) return;

      try {
        const { algodClient } = getAlgorandClients();
        const appInfo = await algodClient
          .getApplicationByID(Number(appId))
          .do();

        const state: Record<string, any> = {};
        for (const kvPair of appInfo.params["global-state"] || []) {
          const key = Buffer.from(kvPair.key, "base64").toString();
          const value = kvPair.value;

          if (value.type === 1) {
            // bytes
            switch (key) {
              case "delegate":
              case "owner":
                state[key] = algosdk.encodeAddress(
                  new Uint8Array(Buffer.from(value.bytes, "base64"))
                );
                break;
              default:
                state[key] = Buffer.from(value.bytes, "base64").toString();
                break;
            }
          } else {
            // uint
            state[key] = value.uint;
          }
        }

        setGlobalState(state);
      } catch (error) {
        console.error("Error fetching global state:", error);
      }
    };

    fetchGlobalState();
  }, [appId]);

  const handlePartkeyChange = async () => {
    try {
      if (!activeAccount) {
        throw new Error("No active account");
      }
      const { algodClient } = getAlgorandClients();
      const appIdNumber = Number(appId);
      const builder = {
        stakeable: new CONTRACT(
          appIdNumber,
          algodClient,
          undefined,
          airdropABI,
          {
            addr: activeAccount.address,
            sk: new Uint8Array(0),
          },
          true,
          false,
          true
        ),
      };
      console.log(AirdropAppSpec.contract.methods);
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
          await builder.stakeable.participate(
            new Uint8Array(Buffer.from(ki.votekey, "base64")),
            new Uint8Array(Buffer.from(ki.selkey, "base64")),
            ki.votefst,
            ki.votelst,
            ki.votekd,
            new Uint8Array(Buffer.from(ki.spkey, "base64"))
          )
        ).obj,
        payment: 1000,
        note: new Uint8Array(Buffer.from(`update participation`)),
      };
      ci.setFee(2e6);
      ci.setEnableGroupResourceSharing(true);
      ci.setExtraTxns([txnO]);
      const customR = await ci.custom();
      console.log({ customR });
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
      const ci = new CONTRACT(appIdNumber, algodClient, undefined, airdropABI, {
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
      //setResult("Error checking VOI status. Please try again.");
      setManager("");
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
      <h2>Stakeable Manager</h2>
      <p>
        Check and manage your stakeable contract. Enter a specific contract
        appId below.
      </p>

      <Form
        style={{
          marginTop: "1rem",
        }}
        onSubmit={handleSubmit}
        isDark={isDarkTheme}
      >
        <FormGroup isDark={isDarkTheme}>
          <Label htmlFor="appId">Application ID</Label>
          <Input
            isDark={isDarkTheme}
            id="appId"
            type="number"
            placeholder="Enter application id..."
            value={appId}
            onChange={(e) => setAppId(e.target.value)}
            required
          />
        </FormGroup>
        <Button type="submit" disabled={loading || !appId} isDark={isDarkTheme}>
          {loading ? "Checking..." : "Check Status"}
        </Button>
      </Form>

      {result && (
        <ResultContainer>
          <pre>{result}</pre>
          <pre>AppId: {appId}</pre>
          <pre>Address: {address}</pre>
          {/*<pre>
            Manager:
            <br />
            {globalState.owner}
            <br />
            {globalState.delegate}
          </pre>*/}
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
          {
            /*[globalState.owner, globalState.delegate].includes(
            activeAccount?.address
          ) && (*/
            <div style={{ marginTop: "1rem" }}>
              {/*withdrawableAmount > 0 && (
                <Button
                  isDark={isDarkTheme}
                  onClick={handleWithdraw}
                  style={{ marginRight: "1rem" }}
                  disabled={withdrawing}
                >
                  {withdrawing ? "Withdrawing..." : "Withdraw"}
                </Button>
              )*/}
              <Button
                isDark={isDarkTheme}
                onClick={() => setShowUpdateModal(true)}
                style={{ marginRight: "1rem" }}
              >
                Update Participation
              </Button>
              {/*<Button isDark={isDarkTheme} onClick={() => setShowModal(true)}>
                Transfer Manager
              </Button>*/}
            </div>
            /*)*/
          }
        </ResultContainer>
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
                <Button
                  type="button"
                  onClick={() => setIsTextAreaMode(!isTextAreaMode)}
                  style={{ marginBottom: "1rem" }}
                  isDark={isDarkTheme}
                >
                  {isTextAreaMode ? "Switch to Form" : "Switch to Text Input"}
                </Button>
                <ModalForm
                  isDark={isDarkTheme}
                  onSubmit={handleUpdateParticipation}
                >
                  {!isTextAreaMode ? (
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: "0.5rem",
                      }}
                    >
                      <CompactFormGroup isDark={isDarkTheme}>
                        <CompactLabel htmlFor="selectionKey">
                          Selection Key
                        </CompactLabel>
                        <CompactInput
                          isDark={isDarkTheme}
                          id="selectionKey"
                          type="text"
                          placeholder="Selection Key"
                          value={participationForm.selectionParticipationKey}
                          onChange={(e) =>
                            setParticipationForm({
                              ...participationForm,
                              selectionParticipationKey: e.target.value,
                            })
                          }
                          required
                        />
                      </CompactFormGroup>
                      <CompactFormGroup isDark={isDarkTheme}>
                        <CompactLabel htmlFor="stateProofKey">
                          State Proof Key
                        </CompactLabel>
                        <CompactInput
                          isDark={isDarkTheme}
                          id="stateProofKey"
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
                      </CompactFormGroup>
                      <CompactFormGroup isDark={isDarkTheme}>
                        <CompactLabel htmlFor="voteFirstValid">
                          First Valid
                        </CompactLabel>
                        <CompactInput
                          isDark={isDarkTheme}
                          id="voteFirstValid"
                          type="number"
                          placeholder="First Valid"
                          value={participationForm.voteFirstValid}
                          onChange={(e) =>
                            setParticipationForm({
                              ...participationForm,
                              voteFirstValid: Number(e.target.value),
                            })
                          }
                          required
                        />
                      </CompactFormGroup>
                      <CompactFormGroup isDark={isDarkTheme}>
                        <CompactLabel htmlFor="voteLastValid">
                          Last Valid
                        </CompactLabel>
                        <CompactInput
                          isDark={isDarkTheme}
                          id="voteLastValid"
                          type="number"
                          placeholder="Last Valid"
                          value={participationForm.voteLastValid}
                          onChange={(e) =>
                            setParticipationForm({
                              ...participationForm,
                              voteLastValid: Number(e.target.value),
                            })
                          }
                          required
                        />
                      </CompactFormGroup>
                      <CompactFormGroup isDark={isDarkTheme}>
                        <CompactLabel htmlFor="voteKeyDilution">
                          Key Dilution
                        </CompactLabel>
                        <CompactInput
                          isDark={isDarkTheme}
                          id="voteKeyDilution"
                          type="number"
                          placeholder="Key Dilution"
                          value={participationForm.voteKeyDilution}
                          onChange={(e) =>
                            setParticipationForm({
                              ...participationForm,
                              voteKeyDilution: Number(e.target.value),
                            })
                          }
                          required
                        />
                      </CompactFormGroup>
                      <CompactFormGroup isDark={isDarkTheme}>
                        <CompactLabel htmlFor="voteParticipationKey">
                          Vote Key
                        </CompactLabel>
                        <CompactInput
                          isDark={isDarkTheme}
                          id="voteParticipationKey"
                          type="text"
                          placeholder="Vote Key"
                          value={participationForm.voteParticipationKey}
                          onChange={(e) =>
                            setParticipationForm({
                              ...participationForm,
                              voteParticipationKey: e.target.value,
                            })
                          }
                          required
                        />
                      </CompactFormGroup>
                    </div>
                  ) : (
                    <FormGroup isDark={isDarkTheme}>
                      <Label htmlFor="participationText">
                        Participation Information
                      </Label>
                      <TextArea
                        isDark={isDarkTheme}
                        id="participationText"
                        value={participationText}
                        onChange={(e) =>
                          handleParticipationTextChange(e.target.value)
                        }
                        placeholder="Paste participation information here..."
                      />
                    </FormGroup>
                  )}
                  <ButtonGroup>
                    <Button type="submit" isDark={isDarkTheme}>
                      Update
                    </Button>
                    <Button
                      type="button"
                      onClick={() => setShowUpdateModal(false)}
                      isDark={isDarkTheme}
                    >
                      Cancel
                    </Button>
                  </ButtonGroup>
                </ModalForm>
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
                    isDark={isDarkTheme}
                    type="button"
                    onClick={handleConfirmUpdate}
                    disabled={loading}
                  >
                    {loading ? "Updating..." : "Confirm Update"}
                  </Button>
                  <Button
                    isDark={isDarkTheme}
                    type="button"
                    onClick={() => setShowConfirmation(false)}
                    disabled={loading}
                  >
                    Back to Edit
                  </Button>
                  <Button
                    isDark={isDarkTheme}
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
            <Button onClick={() => setShowTxModal(false)} isDark={isDarkTheme}>
              Close
            </Button>
          </TransactionModal>
        </>
      )}
    </Container>
  );
};

export default StakeableManager;
