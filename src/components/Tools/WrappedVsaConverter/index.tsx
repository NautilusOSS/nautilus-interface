import { useWallet } from "@txnlab/use-wallet-react";
import algosdk, { Algodv2 } from "algosdk";
import BigNumber from "bignumber.js";
import React, { useState, useEffect, useMemo, useCallback } from "react";
import styled from "styled-components";
import { CONTRACT, abi } from "ulujs";

const Container = styled.div`
  max-width: 600px;
  margin: 0 auto;
  padding: 2rem;
`;

const InputGroup = styled.div`
  margin-bottom: 1.5rem;
`;

const Label = styled.label`
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
`;

const Input = styled.input`
  width: 100%;
  padding: 0.75rem;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  background: var(--background-secondary);
  color: var(--text-primary);
  font-size: 1rem;

  &:focus {
    outline: none;
    border-color: var(--primary-color);
  }
`;

const Button = styled.button`
  background: var(--primary-color);
  color: white;
  border: none;
  border-radius: 4px;
  padding: 0.75rem 1.5rem;
  font-size: 1rem;
  cursor: pointer;
  transition: background-color 0.2s ease;

  &:hover {
    background: var(--primary-color-dark);
  }

  &:disabled {
    background: var(--background-tertiary);
    cursor: not-allowed;
  }
`;

const Result = styled.div`
  margin-top: 1.5rem;
  padding: 1rem;
  background: var(--background-secondary);
  border-radius: 4px;
  word-break: break-all;
`;

const WrappedVsaConverter: React.FC = () => {
  const { algodClient, activeAccount, signTransactions } = useWallet();
  const [vsaAmount, setVsaAmount] = useState<string>("");
  const [wvsaAmount, setWvsaAmount] = useState<string>("");
  const [direction, setDirection] = useState<"vsaToWvsa" | "wvsaToVsa">(
    "vsaToWvsa"
  );
  const [contractId, setContractId] = useState<string>("");
  const [arc200Balance, setArc200Balance] = useState<string>("");
  const [vsaBalance, setVsaBalance] = useState<string>("");
  const [isConverting, setIsConverting] = useState<boolean>(false);

  useEffect(() => {
    const fetchBalances = async () => {
      if (!contractId || !activeAccount) {
        setArc200Balance("");
        setVsaBalance("");
        return;
      }

      try {
        // Replace these with actual API calls to fetch balances
        const arc200Result = await fetchArc200Balance(
          algodClient,
          contractId,
          activeAccount.address
        );
        const vsaResult = await fetchVsaBalance(
          algodClient,
          contractId,
          activeAccount.address
        );

        setArc200Balance(arc200Result);
        setVsaBalance(vsaResult);
      } catch (error) {
        console.error("Error fetching balances:", error);
      }
    };

    fetchBalances();
  }, [contractId, activeAccount]);

  const handleConvert = useCallback(async () => {
    if (!activeAccount) {
      return;
    }

    // Validate input amounts
    const currentAmount = direction === "vsaToWvsa" ? vsaAmount : wvsaAmount;
    if (!currentAmount || isNaN(Number(currentAmount)) || Number(currentAmount) <= 0) {
      console.error("Invalid amount provided");
      return;
    }

    setIsConverting(true);
    try {
      // The conversion rate is 1:1
      if (direction === "vsaToWvsa") {
        const accInfo = await algodClient
          .accountInformation(algosdk.getApplicationAddress(Number(contractId)))
          .do();
        if (accInfo.assets.length !== 1) {
          throw new Error("VSA contract not found");
        }
        const vsaAsset = accInfo.assets.map(
          (asset: any) => asset["asset-id"]
        )[0];
        const ci = new CONTRACT(
          Number(contractId),
          algodClient,
          undefined,
          abi.custom,
          { addr: activeAccount.address, sk: new Uint8Array() }
        );
        const ci200 = new CONTRACT(
          Number(contractId),
          algodClient,
          undefined,
          abi.nt200,
          { addr: activeAccount.address, sk: new Uint8Array() }
        );
        const builder = {
          tok: new CONTRACT(
            Number(contractId),
            algodClient,
            undefined,
            abi.nt200,
            { addr: activeAccount.address, sk: new Uint8Array() },
            true,
            false,
            true
          ),
        };
        const decimalsR = await ci200.arc200_decimals();
        if (!decimalsR.success) {
          throw new Error("Failed to fetch ARC200 decimals");
        }
        const decimals = Number(decimalsR.returnValue);
        ci.setFee(2000);
        const amount = BigInt(
          new BigNumber(vsaAmount || 0).times(10 ** decimals).toFixed()
        );
        const buildN = [];
        {
          const txnO = (await builder.tok.deposit(amount)).obj;
          buildN.push({
            ...txnO,
            xaid: vsaAsset,
            aamt: amount,
            payment: 28500,
          });
        }
        ci.setEnableGroupResourceSharing(true);
        ci.setExtraTxns(buildN);
        const customR = await ci.custom();
        if (!customR.success) {
          console.log({ customR });
          throw new Error("Failed to build custom");
        }
        const stxns = await signTransactions(
          customR.txns.map(
            (txn: string) => new Uint8Array(Buffer.from(txn, "base64"))
          )
        );
        const txId = await algodClient
          .sendRawTransaction(stxns as Uint8Array[])
          .do();
        console.log({ txId });

        // Fetch updated balances
        const arc200Result = await fetchArc200Balance(
          algodClient,
          contractId,
          activeAccount.address
        );
        const vsaResult = await fetchVsaBalance(
          algodClient,
          contractId,
          activeAccount.address
        );
        setArc200Balance(arc200Result);
        setVsaBalance(vsaResult);
      } else {
        // withdraw wvsa (arc200) to vsa
        const ci = new CONTRACT(
          Number(contractId),
          algodClient,
          undefined,
          abi.nt200,
          { addr: activeAccount.address, sk: new Uint8Array() }
        );
        const decimalsR = await ci.arc200_decimals();
        if (!decimalsR.success) {
          throw new Error("Failed to fetch ARC200 decimals");
        }
        const decimals = Number(decimalsR.returnValue);
        ci.setFee(2000);
        const amount = BigInt(
          new BigNumber(wvsaAmount || 0).times(10 ** decimals).toFixed(0)
        );
        const withdrawR = await ci.withdraw(amount);
        if (!withdrawR.success) {
          console.error({ withdrawR });
          throw new Error("Failed to withdraw");
        }
        console.log({ withdrawR });
        const stxns = await signTransactions(
          withdrawR.txns.map(
            (txn: string) => new Uint8Array(Buffer.from(txn, "base64"))
          )
        );
        const { txId } = await algodClient
          .sendRawTransaction(stxns as Uint8Array[])
          .do();
        console.log({ txId });

        // wait for confirmation1
        await algosdk.waitForConfirmation(algodClient, txId, 4);

        // Fetch updated balances
        const arc200Result = await fetchArc200Balance(
          algodClient,
          contractId,
          activeAccount.address
        );
        const vsaResult = await fetchVsaBalance(
          algodClient,
          contractId,
          activeAccount.address
        );
        setArc200Balance(arc200Result);
        setVsaBalance(vsaResult);
      }
    } catch (error) {
      console.error("Conversion error:", error);
    } finally {
      setIsConverting(false);
    }
  }, [contractId, activeAccount, direction, vsaAmount]);

  return (
    <Container>
      <h2>Wrapped VSA Converter</h2>
      <p>Convert between VSA and Wrapped VSA tokens.</p>

      <InputGroup>
        <Label>Contract ID</Label>
        <Input
          type="text"
          value={contractId}
          onChange={(e) => setContractId(e.target.value)}
          placeholder="Enter contract ID"
        />
      </InputGroup>

      {contractId && (
        <InputGroup>
          <Label>Current Balances</Label>
          <div style={{ marginBottom: "0.5rem" }}>
            <strong>ARC200 Balance:</strong> {arc200Balance || "Loading..."}
          </div>
          <div>
            <strong>VSA Balance:</strong> {vsaBalance || "Loading..."}
          </div>
        </InputGroup>
      )}

      <InputGroup>
        <Label>Conversion Direction</Label>
        <select
          value={direction}
          onChange={(e) =>
            setDirection(e.target.value as "vsaToWvsa" | "wvsaToVsa")
          }
          style={{
            width: "100%",
            padding: "0.75rem",
            marginBottom: "1rem",
            background: "var(--background-secondary)",
            border: "1px solid var(--border-color)",
            borderRadius: "4px",
            color: "var(--text-primary)",
          }}
        >
          <option value="vsaToWvsa">VSA to Wrapped VSA</option>
          <option value="wvsaToVsa">Wrapped VSA to VSA</option>
        </select>
      </InputGroup>

      <InputGroup>
        <Label>
          {direction === "vsaToWvsa" ? "VSA Amount" : "Wrapped VSA Amount"}
        </Label>
        <Input
          type="number"
          value={direction === "vsaToWvsa" ? vsaAmount : wvsaAmount}
          onChange={(e) => {
            if (direction === "vsaToWvsa") {
              setVsaAmount(e.target.value);
            } else {
              setWvsaAmount(e.target.value);
            }
          }}
          placeholder="Enter amount"
          min="0"
        />
      </InputGroup>

      <Button
        onClick={handleConvert}
        disabled={
          !contractId || 
          isConverting || 
          (direction === "vsaToWvsa" && (!vsaAmount || Number(vsaAmount) <= 0)) ||
          (direction === "wvsaToVsa" && (!wvsaAmount || Number(wvsaAmount) <= 0))
        }
      >
        {isConverting ? "Converting..." : "Convert"}
      </Button>

      {((direction === "vsaToWvsa" && wvsaAmount) ||
        (direction === "wvsaToVsa" && vsaAmount)) && (
        <Result>
          <strong>Result:</strong>
          <br />
          {direction === "vsaToWvsa"
            ? `${vsaAmount} VSA = ${wvsaAmount} Wrapped VSA`
            : `${wvsaAmount} Wrapped VSA = ${vsaAmount} VSA`}
        </Result>
      )}
    </Container>
  );
};

// Helper functions to fetch balances (implement these according to your API)
async function fetchArc200Balance(
  algodClient: Algodv2,
  contractId: string,
  account: string
): Promise<string> {
  const ci = new CONTRACT(
    Number(contractId),
    algodClient,
    undefined,
    abi.arc200,
    {
      addr: account,
      sk: new Uint8Array(),
    }
  );
  const decimalsR = await ci.arc200_decimals();
  if (!decimalsR.success) {
    throw new Error("Failed to fetch ARC200 decimals");
  }
  const decimals = decimalsR.returnValue;
  const balanceR = await ci.arc200_balanceOf(account);
  if (!balanceR.success) {
    throw new Error("Failed to fetch ARC200 balance");
  }
  return BigNumber(balanceR.returnValue)
    .div(new BigNumber(10).pow(decimals))
    .toString();
}

async function fetchVsaBalance(
  algodClient: Algodv2,
  contractId: string,
  account: string
): Promise<string> {
  const ci = new CONTRACT(
    Number(contractId),
    algodClient,
    undefined,
    abi.arc200,
    {
      addr: account,
      sk: new Uint8Array(),
    }
  );
  const decimalsR = await ci.arc200_decimals();
  if (!decimalsR.success) {
    throw new Error("Failed to fetch ARC200 decimals");
  }
  const decimals = Number(decimalsR.returnValue);
  const accInfo = await algodClient
    .accountInformation(algosdk.getApplicationAddress(Number(contractId)))
    .do();
  if (accInfo.assets.length !== 1) {
    throw new Error("VSA contract not found");
  }
  const vsaAsset = accInfo.assets.map((asset: any) => asset["asset-id"])[0];
  const accountAssets = await algodClient
    .accountAssetInformation(account, vsaAsset)
    .do();
  const asset = accountAssets?.["asset-holding"]?.["amount"] || "0";
  const balance = BigNumber(asset).div(new BigNumber(10).pow(decimals));
  return balance.toFixed(decimals);
}

export default WrappedVsaConverter;
