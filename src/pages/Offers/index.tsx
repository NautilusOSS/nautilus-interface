import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
  Chip,
  Button,
  IconButton,
} from "@mui/material";
import { Cancel as CancelIcon } from "@mui/icons-material";
import Layout from "@/layouts/Default";
import { useSelector } from "react-redux";
import { RootState } from "@/store/store";
import { useWallet } from "@txnlab/use-wallet-react";
import { getAlgorandClients } from "@/wallets";
import {
  getDeleteEvent,
  getListingEvent,
  makeContract,
  offerABI,
} from "@/components/Tools/OffersManager";
import CancelOfferDialog from "@/components/modals/CancelOfferDialog";
import { CONTRACT, abi } from "ulujs";
import { toast } from "react-toastify";
import algosdk, { waitForConfirmation } from "algosdk";

interface Offer {
  listingId: number;
  contractId: number;
  tokenId: string;
  offerer: string;
  price: number;
  currency: number;
  createTimestamp: number;
  createRound: number;
}

interface OfferRowProps {
  offer: Offer;
  isDarkTheme: boolean;
  activeAccount: any;
  onCancelOffer: (offer: Offer) => void;
}

const OfferRow: React.FC<OfferRowProps> = ({
  offer,
  isDarkTheme,
  activeAccount,
  onCancelOffer,
  manager,
}) => {
  const formatPrice = (price: number) => {
    return (price / 1e6).toFixed(2);
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString();
  };

  const isOwner = activeAccount?.address === offer.offerer;
  const canCancel = isOwner || activeAccount?.address === manager;

  return (
    <TableRow sx={{ backgroundColor: isDarkTheme ? "#2a2a2a" : "#fff" }}>
      <TableCell sx={{ color: isDarkTheme ? "#fff" : "#000" }}>
        {offer.contractId}
      </TableCell>
      <TableCell sx={{ color: isDarkTheme ? "#fff" : "#000" }}>
        {offer.tokenId}
      </TableCell>
      <TableCell sx={{ color: isDarkTheme ? "#fff" : "#000" }}>
        {offer.offerer}
      </TableCell>
      <TableCell sx={{ color: isDarkTheme ? "#fff" : "#000" }}>
        {formatPrice(offer.price)}{" "}
        {offer.currency === 8324600 ? "VOI" : offer.currency}
      </TableCell>
      <TableCell sx={{ color: isDarkTheme ? "#fff" : "#000" }}>
        {formatDate(offer.createTimestamp)}
      </TableCell>
      <TableCell>
        <Chip label="Active" color="success" size="small" />
      </TableCell>
      <TableCell>
        {canCancel ? (
          <Button
            variant="outlined"
            color="error"
            size="small"
            startIcon={<CancelIcon />}
            onClick={() => onCancelOffer(offer)}
            sx={{
              color: "#f44336",
              borderColor: "#f44336",
              "&:hover": {
                borderColor: "#d32f2f",
                backgroundColor: "rgba(244, 67, 54, 0.04)",
              },
            }}
          >
            Cancel
          </Button>
        ) : (
          <Typography
            variant="caption"
            sx={{ color: isDarkTheme ? "#666" : "#999" }}
          >
            Not your offer
          </Typography>
        )}
      </TableCell>
    </TableRow>
  );
};

const MemoizedOfferRow = React.memo(OfferRow);

export const Offers: React.FC = () => {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null);
  const [isCanceling, setIsCanceling] = useState(false);
  const [manager, setManager] = useState<string | null>(null);

  const isDarkTheme = useSelector(
    (state: RootState) => state.theme.isDarkTheme
  );
  const { activeAccount, signTransactions } = useWallet();

  useEffect(() => {
    const fetchOffers = async () => {
      console.log("Fetching offers using blockchain events...");
      try {
        const { algodClient, indexerClient } = getAlgorandClients();
        const ctcInfoMP213 = 8329112;

        const ci = makeContract(
          8329112,
          algosdk.getApplicationAddress(ctcInfoMP213),
          algodClient,
          indexerClient
        );

        const status = await algodClient.status().do();
        const lastRound = status["last-round"];

        const events = await ci.getEvents({
          maxRound: Math.max(lastRound - 2e6, 0),
        });

        const events2 = await ci.getEvents({
          minRound: Math.max(lastRound - 2e6, 0),
        });

        const listingEvents = (
          events?.find((event: any) => event.name === "e_offer_ListEvent")
            ?.events || []
        ).map(getListingEvent);

        // Sort listing events by timestamp for proper ordering
        const sortedListingEvents = listingEvents.sort((a: any, b: any) => {
          return b.createRound - a.createRound;
        });

        const deleteEvents = (
          events?.find(
            (event: any) => event.name === "e_offer_DeleteListingEvent"
          )?.events || []
        )
          .map(getDeleteEvent)
          .filter((event: any) =>
            listingEvents.some((e: any) => e.listingId === event.listingId)
          );

        const deleteEvents2 = (
          events2?.find(
            (event: any) => event.name === "e_offer_DeleteListingEvent"
          )?.events || []
        )
          .map(getDeleteEvent)
          .filter((event: any) =>
            listingEvents.some((e: any) => e.listingId === event.listingId)
          );

        const acceptEvents = (
          events?.find((event: any) => event.name === "e_offer_AcceptEvent")
            ?.events || []
        )
          .map(getDeleteEvent)
          .filter((event: any) =>
            listingEvents.some((e: any) => e.listingId === event.listingId)
          );

        const acceptEvents2 = (
          events2?.find((event: any) => event.name === "e_offer_AcceptEvent")
            ?.events || []
        )
          .map(getDeleteEvent)
          .filter((event: any) =>
            listingEvents.some((e: any) => e.listingId === event.listingId)
          );

        console.log({ deleteEvents, acceptEvents, listingEvents });

        const activeOffers = listingEvents.filter(
          (event: any) =>
            ![...deleteEvents, ...deleteEvents2].some(
              (e: any) => e.listingId === event.listingId
            ) &&
            ![...acceptEvents, ...acceptEvents2].some(
              (e: any) => e.listingId === event.listingId
            )
        );

        console.log({ activeOffers });

        console.log({
          totalListingEvents: listingEvents.length,
          deleteEvents: deleteEvents.length,
          acceptEvents: acceptEvents.length,
          activeOffers: activeOffers.length,
        });

        setOffers(activeOffers);
      } catch (error) {
        console.error("Error fetching offers:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchOffers();
  }, []);

  // fetch manager
  useEffect(() => {
    if (!activeAccount) return;
    const { algodClient, indexerClient } = getAlgorandClients();
    const ci = new CONTRACT(
      8329112,
      algodClient,
      indexerClient,
      {
        name: "",
        symbol: "",
        methods: [
          // manager()address
          {
            name: "manager",
            desc: "Returns the manager address",
            args: [],
            returns: {
              type: "address",
              name: "manager",
            },
          },
        ],
        events: [],
      },
      { addr: activeAccount.address, sk: new Uint8Array(0) }
    );
    ci.manager().then((res: any) => setManager(res.returnValue));
  }, [activeAccount]);

  const handleCancelOffer = (offer: Offer) => {
    setSelectedOffer(offer);
    setCancelDialogOpen(true);
  };

  const handleConfirmCancel = async () => {
    if (!selectedOffer || !activeAccount) {
      toast.error("Please connect your wallet");
      return;
    }

    setIsCanceling(true);
    try {
      const ctcInfoMP213 = 8329112; // mp213 offers
      const ctcInfoNV = 8324600; // Nautilus Voi NV
      const { algodClient, indexerClient } = getAlgorandClients();

      const ci = new CONTRACT(
        ctcInfoMP213,
        algodClient,
        indexerClient,
        abi.custom,
        { addr: activeAccount.address, sk: new Uint8Array(0) }
      );

      const builder = {
        mp: new CONTRACT(
          ctcInfoMP213,
          algodClient,
          indexerClient,
          offerABI,
          {
            addr: activeAccount.address,
            sk: new Uint8Array(0),
          },
          true,
          false,
          true
        ),
        arc200: new CONTRACT(
          ctcInfoNV,
          algodClient,
          indexerClient,
          abi.nt200,
          {
            addr: activeAccount.address,
            sk: new Uint8Array(0),
          },
          true,
          false,
          true
        ),
      };

      const buildN = [];

      // Cancel offer transaction
      {
        const txnO = (
          await builder.mp.a_offer_deleteListing(
            BigInt(selectedOffer.listingId)
          )
        ).obj;
        buildN.push(txnO);
      }

      console.log({ buildN });

      ci.setFee(2000);
      ci.setExtraTxns(buildN);
      ci.setEnableGroupResourceSharing(true);

      const customR = await ci.custom();

      console.log({ customR });

      if (!customR.success) {
        toast.error("Failed to cancel offer: " + customR.error);
        return;
      }

      const stxns = await signTransactions(
        customR.txns.map(
          (txn: string) => new Uint8Array(Buffer.from(txn, "base64"))
        )
      );

      const res = await algodClient
        .sendRawTransaction(stxns as Uint8Array[])
        .do();

      await waitForConfirmation(algodClient, res.txId, 3);

      // Remove from local state
      setOffers((prevOffers) =>
        prevOffers.filter((o) => o.listingId !== selectedOffer.listingId)
      );

      toast.success("Offer cancelled successfully!");
      setCancelDialogOpen(false);
      setSelectedOffer(null);
    } catch (error: any) {
      console.error("Error cancelling offer:", error);
      toast.error("Failed to cancel offer: " + error.message);
    } finally {
      setIsCanceling(false);
    }
  };

  const handleCloseCancelDialog = () => {
    setCancelDialogOpen(false);
    setSelectedOffer(null);
  };

  return (
    <Layout>
      <Box sx={{ mb: 4 }}>
        <Typography
          variant="h4"
          sx={{ color: isDarkTheme ? "#fff" : "#000", mb: 2 }}
        >
          Active Offers
        </Typography>
        <Typography
          variant="body1"
          sx={{ color: isDarkTheme ? "#ccc" : "#666", mb: 4 }}
        >
          Browse all active offers on the marketplace (fetched from blockchain
          events)
        </Typography>
      </Box>

      {isLoading ? (
        <Box
          display="flex"
          justifyContent="center"
          alignItems="center"
          minHeight="200px"
        >
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer
          component={Paper}
          sx={{ backgroundColor: isDarkTheme ? "#1a1a1a" : "#fff" }}
        >
          <Table>
            <TableHead>
              <TableRow>
                <TableCell
                  sx={{
                    color: isDarkTheme ? "#fff" : "#000",
                    fontWeight: "bold",
                  }}
                >
                  Collection ID
                </TableCell>
                <TableCell
                  sx={{
                    color: isDarkTheme ? "#fff" : "#000",
                    fontWeight: "bold",
                  }}
                >
                  Token ID
                </TableCell>
                <TableCell
                  sx={{
                    color: isDarkTheme ? "#fff" : "#000",
                    fontWeight: "bold",
                  }}
                >
                  Offerer
                </TableCell>
                <TableCell
                  sx={{
                    color: isDarkTheme ? "#fff" : "#000",
                    fontWeight: "bold",
                  }}
                >
                  Price
                </TableCell>
                <TableCell
                  sx={{
                    color: isDarkTheme ? "#fff" : "#000",
                    fontWeight: "bold",
                  }}
                >
                  Created
                </TableCell>
                <TableCell
                  sx={{
                    color: isDarkTheme ? "#fff" : "#000",
                    fontWeight: "bold",
                  }}
                >
                  Status
                </TableCell>
                <TableCell
                  sx={{
                    color: isDarkTheme ? "#fff" : "#000",
                    fontWeight: "bold",
                  }}
                >
                  Actions
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {offers.map((offer) => (
                <MemoizedOfferRow
                  key={offer.listingId}
                  offer={offer}
                  isDarkTheme={isDarkTheme}
                  activeAccount={activeAccount}
                  onCancelOffer={handleCancelOffer}
                  manager={manager}
                />
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <CancelOfferDialog
        open={cancelDialogOpen}
        handleClose={handleCloseCancelDialog}
        onConfirm={handleConfirmCancel}
        loading={isCanceling}
        offer={
          selectedOffer
            ? {
                mpListingId: selectedOffer.listingId,
                contractId: selectedOffer.contractId,
                tokenId: parseInt(selectedOffer.tokenId),
                price: selectedOffer.price,
                currency: selectedOffer.currency,
              }
            : undefined
        }
      />
    </Layout>
  );
};

export default Offers;
