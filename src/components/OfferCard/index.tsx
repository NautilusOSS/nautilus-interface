import React from "react";
import { Card, CardContent, Typography, Button, Skeleton } from "@mui/material";
import styled from "styled-components";
import { formatAmount } from "../../utils/format";
import { shortenAddress } from "../../utils/string";
import { NFT_NAVIGATOR_API } from "@/config/arc72-idx";
import { toast } from "react-toastify";
import { useWallet } from "@txnlab/use-wallet-react";
import { getAlgorandClients } from "@/wallets";
import { abi, CONTRACT } from "ulujs";
import algosdk from "algosdk";
import BigNumber from "bignumber.js";

const OfferCardWrapper = styled(Card)<{ $isDark?: boolean }>`
  &.MuiCard-root {
    background: ${({ $isDark }) =>
      $isDark ? "rgba(25, 25, 25, 0.95)" : "#fafafa"};
    border: 1px solid
      ${({ $isDark }) => ($isDark ? "rgba(255, 255, 255, 0.1)" : "#e0e0e0")};
    transition: all 0.2s ease-in-out;
    &:hover {
      transform: translateY(-4px);
      background: ${({ $isDark }) =>
        $isDark ? "rgba(35, 35, 35, 0.95)" : "#fafafa"};
      box-shadow: 0 4px 12px
        rgba(0, 0, 0, ${({ $isDark }) => ($isDark ? "0.5" : "0.1")});
    }
  }
`;

const StyledTypography = styled(Typography)<{ $isDark?: boolean }>`
  && {
    color: ${({ $isDark }) => ($isDark ? "#ffffff" : "#000000")};
  }
`;

const StyledButton = styled(Button)<{ $isDark?: boolean }>`
  && {
    color: ${({ $isDark }) => ($isDark ? "#ffffff" : "#000000")};
    border-color: ${({ $isDark }) => ($isDark ? "#ffffff" : "#000000")};
    margin-top: 1rem;
    &:hover {
      border-color: ${({ $isDark }) => ($isDark ? "#ffffff" : "#000000")};
      background: ${({ $isDark }) =>
        $isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)"};
    }
  }
`;

interface Offer {
  mpListingId: number;
  transactionId: string;
  tokenId: string;
  price: number;
  collectionId: number;
  createTimestamp: number;
  offerer: string;
  currency: number;
  active: number;
}

interface TokenInfo {
  name?: string;
  image?: string;
}

interface OfferCardProps {
  offer: Offer;
  isDarkTheme: boolean;
  onCancel?: (offerId: number) => void;
}

const OfferCard: React.FC<OfferCardProps> = ({ offer, isDarkTheme, onCancel }) => {
  const [tokenInfo, setTokenInfo] = React.useState<TokenInfo>();
  const [loading, setLoading] = React.useState(true);
  const [manager, setManager] = React.useState<string>("");
  const { activeAccount, signTransactions } = useWallet();

  React.useEffect(() => {
    // Fetch manager address
    const fetchManager = async () => {
      try {
        const { algodClient, indexerClient } = getAlgorandClients();
        const ctcInfoMP213 = 8329112; // mp213 offers
        const ci = new CONTRACT(ctcInfoMP213, algodClient, indexerClient, abi.mp, {
          addr: algosdk.getApplicationAddress(ctcInfoMP213),
          sk: new Uint8Array(0),
        });
        const managerResponse = await ci.manager();
        setManager(managerResponse.returnValue);
      } catch (error) {
        console.error("Error fetching manager:", error);
      }
    };

    fetchManager();
  }, []);

  React.useEffect(() => {
    if (!offer.collectionId || !offer.tokenId || tokenInfo) return;
    const fetchTokenInfo = async () => {
      setLoading(true);
      try {
        const response = await fetch(
          `${NFT_NAVIGATOR_API}/nft-indexer/v1/tokens?contractId=${offer.collectionId}&tokenId=${offer.tokenId}`
        );
        const data = await response.json();
        if (data.tokens.length > 0) {
          const metadata = JSON.parse(data.tokens[0].metadata);
          setTokenInfo({
            name: metadata.name,
            image: metadata.image,
          });
        }
      } catch (error) {
        console.error("Error fetching token info:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchTokenInfo();
  }, [offer.collectionId, offer.tokenId]);

  const handleCancelOffer = async (
    offerId: number,
    offerer: string,
    offerAmount: number,
    simulate?: boolean
  ) => {
    try {
      if (!activeAccount) {
        toast.info("Please connect wallet!");
        return;
      }

      const feeAmountBI = BigInt(
        new BigNumber(offerAmount).multipliedBy(0.1).toFixed(0)
      );
      const offerAmountBI = BigInt(offerAmount);
      const totalAmount = offerAmountBI + feeAmountBI;

      const { algodClient, indexerClient } = getAlgorandClients();
      const ctcInfoMP213 = 8329112; // mp213 offers
      const ctcInfoNV = 8324600; // Nautilus Voi NV

      const builder = {
        arc200: new CONTRACT(
          ctcInfoNV,
          algodClient,
          indexerClient,
          abi.nt200,
          {
            addr: offerer,
            sk: new Uint8Array(0),
          },
          true,
          false,
          true
        ),
        mp: new CONTRACT(
          ctcInfoMP213,
          algodClient,
          indexerClient,
          {
            name: "mp213",
            desc: "mp213",
            methods: [
              {
                name: "a_offer_deleteListing",
                args: [{ type: "uint256", name: "offerId" }],
                returns: { type: "void" },
              },
            ],
            events: [],
          },
          {
            addr: offerer,
            sk: new Uint8Array(0),
          },
          true,
          false,
          true
        ),
      };

      const buildN = [];
      
      // Delete listing transaction
      const txnO = (await builder.mp.a_offer_deleteListing(BigInt(offerId)))?.obj;
      buildN.push({
        ...txnO,
        note: new TextEncoder().encode(`a_offer_deleteListing:${offerId}`),
        foreignApps: [ctcInfoNV, offer.collectionId],
        accounts: ["RTKWX3FTDNNIHMAWHK5SDPKH3VRPPW7OS5ZLWN6RFZODF7E22YOBK2OGPE"],
      });

      // Withdraw transaction
      const withdrawTxn = (await builder.arc200.withdraw(totalAmount))?.obj;
      buildN.push({
        ...withdrawTxn,
        note: new TextEncoder().encode(`withdraw:${totalAmount}`),
      });

      // Create and send transaction group
      const ci = new CONTRACT(
        ctcInfoMP213,
        algodClient,
        indexerClient,
        abi.custom,
        { addr: offerer, sk: new Uint8Array(0) }
      );
      
      ci.setEnableGroupResourceSharing(true);
      ci.setExtraTxns(buildN);
      ci.setFee(3000);
      
      const customR = await ci.custom();
      
      if (simulate && customR.success) {
        if (onCancel) onCancel(offerId);
        toast.success("Offer cancelled successfully!");
        return;
      }

      if (!customR.success) {
        toast.error("Offer cancellation failed!", customR.error);
        return;
      }

      const stxns = await signTransactions(
        customR.txns.map((el: any) => new Uint8Array(Buffer.from(el, "base64")))
      );
      
      const txn = await algodClient
        .sendRawTransaction(stxns as Uint8Array[])
        .do();
      
      await algosdk.waitForConfirmation(algodClient, txn.txId, 4);
      
      if (onCancel) onCancel(offerId);
      toast.success("Offer cancelled successfully!");
    } catch (e: any) {
      console.error("Cancel offer error:", e);
      toast.error(e.message || "Failed to cancel offer");
    }
  };

  const handleViewToken = () => {
    window.open(
      `/#/collection/${offer.collectionId}/token/${offer.tokenId}`,
      "_blank"
    );
  };

  return (
    <OfferCardWrapper $isDark={isDarkTheme}>
      <CardContent>
        {loading ? (
          <>
            <Skeleton 
              variant="rectangular" 
              width="100%" 
              height={200} 
              sx={{ bgcolor: isDarkTheme ? 'grey.800' : 'grey.200', marginBottom: '1rem' }} 
            />
            <Skeleton 
              variant="text" 
              width="60%" 
              sx={{ bgcolor: isDarkTheme ? 'grey.800' : 'grey.200' }} 
            />
            <Skeleton 
              variant="text" 
              width="40%" 
              sx={{ bgcolor: isDarkTheme ? 'grey.800' : 'grey.200' }} 
            />
            <Skeleton 
              variant="rectangular" 
              width="100%" 
              height={36} 
              sx={{ bgcolor: isDarkTheme ? 'grey.800' : 'grey.200', marginTop: '1rem' }} 
            />
          </>
        ) : (
          <>
            {tokenInfo?.name && (
              <StyledTypography variant="h6" $isDark={isDarkTheme}>
                {tokenInfo.name}
              </StyledTypography>
            )}
            {tokenInfo?.image && (
              <img
                style={{ width: "100%", marginBottom: "1rem" }}
                src={tokenInfo.image}
                alt={tokenInfo.name || "Token"}
              />
            )}
            {/*<StyledTypography variant="h6" $isDark={isDarkTheme}>
              Token ID: {offer.tokenId}
            </StyledTypography>*/}
            <StyledTypography $isDark={isDarkTheme}>
              Offer: {formatAmount(offer.price)} VOI
            </StyledTypography>
            {/*<StyledTypography $isDark={isDarkTheme}>
              Collection ID: {offer.collectionId}
            </StyledTypography>*/}
            <StyledTypography $isDark={isDarkTheme}>
              Created: {new Date(offer.createTimestamp * 1000).toLocaleString()}
            </StyledTypography>
            {/*<StyledTypography $isDark={isDarkTheme}>
              Transaction ID: {shortenAddress(offer.transactionId)}
            </StyledTypography>*/}
            
            {(offer.offerer === activeAccount?.address ||
              manager === activeAccount?.address) && (
              <StyledButton
                variant="contained"
                $isDark={isDarkTheme}
                onClick={() =>
                  handleCancelOffer(
                    offer.mpListingId,
                    offer.offerer,
                    offer.price,
                    false
                  )
                }
                disabled={!activeAccount}
              >
                Cancel Offer
              </StyledButton>
            )}
            
            <StyledButton
              variant="outlined"
              $isDark={isDarkTheme}
              onClick={handleViewToken}
              fullWidth
            >
              View Token Page
            </StyledButton>
          </>
        )}
      </CardContent>
    </OfferCardWrapper>
  );
};

export default OfferCard;