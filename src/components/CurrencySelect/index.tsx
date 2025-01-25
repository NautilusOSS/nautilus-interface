import React, { useState, useEffect, useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Avatar,
  Typography,
  useTheme,
  Box,
  Button,
  Grid,
  useMediaQuery,
  Card,
  CardContent,
  Skeleton,
  IconButton,
  Dialog,
  DialogContent,
  Link,
} from "@mui/material";
import { PaymentToken } from "@/types";
import BigNumber from "bignumber.js";
import ConfirmationModal from "../modals/ConfirmationModal";
import { simulateTokenToVoi } from "@/utils/dex";
import { useWallet } from "@txnlab/use-wallet-react";
import { TOKEN_WVOI } from "@/contants/tokens";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import SettingsIcon from "@mui/icons-material/Settings";
import UserSettings from "../UserSettings";
import RefreshIcon from "@mui/icons-material/Refresh";
import { DEFAULT_ENABLED_TOKENS } from "../UserSettings";
import { useSelector } from "react-redux";
import { RootState } from "@/store/store";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";

interface CurrencySelectProps {
  value: number;
  onChange: (tokenId: number) => void;
  tokens: PaymentToken[];
  balances?: Record<
    string,
    {
      balance: string;
      loading: boolean;
      error: string | null;
      decimals: number;
    }
  >;
  price?: string;
  onBuy?: (token: PaymentToken) => void;
  canBuy?: (tokenId: number) => boolean;
  simulationResults?: Record<
    number,
    {
      outputAmount: string;
      priceImpact: string;
    }
  >;
  listingCurrency?: number;
  currency?: any;
}

const CurrencySelect: React.FC<CurrencySelectProps> = ({
  value,
  onChange,
  tokens,
  balances,
  price = "0",
  onBuy,
  canBuy,
  simulationResults = {},
  listingCurrency = 0,
}) => {
  const { activeAccount } = useWallet();
  const theme = useTheme();
  const isDarkMode = useSelector((state: RootState) => state.theme.isDarkTheme);
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const [confirmationModal, setConfirmationModal] = useState<{
    open: boolean;
    token: PaymentToken | null;
  }>({
    open: false,
    token: null,
  });

  const [tokenPrices, setTokenPrices] = useState<
    Record<
      number,
      {
        price: string;
        priceImpact: string;
      }
    >
  >({});

  const [enabledTokens, setEnabledTokens] = useLocalStorage<number[]>(
    "enabled-payment-tokens",
    DEFAULT_ENABLED_TOKENS
  );

  const [settingsOpen, setSettingsOpen] = useState(false);

  const [settingsVersion, setSettingsVersion] = useState(0);

  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleBuyClick = (token: PaymentToken) => {
    setConfirmationModal({
      open: true,
      token,
    });
  };

  const handleConfirmBuy = () => {
    if (confirmationModal.token) {
      onBuy?.(confirmationModal.token);
    }
    setConfirmationModal({ open: false, token: null });
  };

  const formatBalance = (token: PaymentToken) => {
    if (!balances || !balances[token.tokenId]) {
      return new BigNumber(0).toFormat(6, {
        groupSize: 3,
        groupSeparator: ",",
        decimalSeparator: ".",
      });
    }
    const balance = balances[token.tokenId];
    if (balance.loading) return "Loading...";
    if (balance.error) return "Error loading balance";
    const displayDecimals = Math.min(balance.decimals, 6);
    return new BigNumber(balance.balance)
      .shiftedBy(-balance.decimals)
      .toFormat(displayDecimals, {
        groupSize: 3,
        groupSeparator: ",",
        decimalSeparator: ".",
      });
  };

  const formatPrice = (token: PaymentToken) => {
    if (!price || !token.decimals) return "";
    if (token.tokenId === 390001)
      return new BigNumber(price).dividedBy(10 ** 6).toString();
    // Show loading state if simulation is not yet available
    if (!simulationResults[token.tokenId]) return null;
    return new BigNumber(simulationResults[token.tokenId].outputAmount)
      .shiftedBy(-token.decimals)
      .toFormat(Math.min(token.decimals, 6));
  };

  const renderPrice = (token: PaymentToken) => {
    const formattedPrice = formatPrice(token);
    if (formattedPrice === null) {
      return <Skeleton width={80} />;
    }
    return (
      <Typography>
        {formattedPrice} {token.symbol}
      </Typography>
    );
  };

  const getTokenIconUrl = (tokenId: number) => {
    const iconId = tokenId === 390001 ? 0 : tokenId;
    return `https://asset-verification.nautilus.sh/icons/${iconId}.png`;
  };

  const simulatePrice = async (token: PaymentToken) => {
    if (
      token.tokenId === 390001 ||
      !token.pool ||
      !activeAccount?.address ||
      !enabledTokens.includes(token.tokenId)
    )
      return;

    try {
      const result = await simulateTokenToVoi(
        price || "0",
        token.pool,
        activeAccount.address
      );

      setTokenPrices((prev) => ({
        ...prev,
        [token.tokenId]: {
          price: result.outputAmount,
          priceImpact: result.priceImpact,
        },
      }));

      return result;
    } catch (error) {
      console.error("Error simulating price:", error);
      throw error;
    }
  };

  useEffect(() => {
    tokens.forEach((token) => {
      if (enabledTokens.includes(token.tokenId)) {
        simulatePrice(token);
      }
    });
  }, [tokens, price, enabledTokens]);

  const getFinalPrice = (token: PaymentToken) => {
    if (token.tokenId === 390001) return formatPrice(token);

    const simulation = simulationResults[token.tokenId];
    if (!simulation) return formatPrice(token);

    return new BigNumber(simulation.outputAmount)
      .shiftedBy(-token.decimals)
      .toFormat(Math.min(token.decimals, 6));
  };

  const getPriceImpact = (token: PaymentToken) => {
    if (token.tokenId === 390001) return "0";
    return simulationResults[token.tokenId]?.priceImpact || "0";
  };

  const isTokenBuyable = (token: PaymentToken) => {
    // VOI can be bought immediately
    if (token.tokenId === 390001) return canBuy?.(token.tokenId);

    // Other tokens need simulation results first
    if (!simulationResults[token.tokenId]) return false;

    return canBuy?.(token.tokenId);
  };

  const isValidToken = (token: PaymentToken) => {
    // VOI is always valid
    if (token.tokenId === 390001) return true;

    // If it's the listing currency, it's valid
    if (token.tokenId === listingCurrency) return true;

    // For other tokens, check if it's enabled in settings
    if (!enabledTokens.includes(token.tokenId)) return false;

    // Check simulation results only for non-VOI tokens that are enabled
    const simulation = simulationResults[token.tokenId];
    if (!simulation) return true; // Show token while waiting for simulation

    // Hide only if simulation explicitly shows zero values
    return !(simulation.outputAmount === "0" && simulation.priceImpact === "0");
  };

  const handleSettingsChange = (newEnabledTokens: number[]) => {
    // Update local enabled tokens state
    setEnabledTokens(newEnabledTokens);

    // Force re-render
    setSettingsVersion((prev) => prev + 1);

    // Run simulations for newly enabled tokens
    tokens.forEach((token) => {
      // Run simulation for newly enabled tokens that weren't previously enabled
      if (
        newEnabledTokens.includes(token.tokenId) &&
        !enabledTokens.includes(token.tokenId)
      ) {
        simulatePrice(token);
      }
    });
  };

  const filteredTokens = useMemo(() => {
    return tokens.filter((token) => {
      // Always show VOI
      if (token.tokenId === 390001) return true;

      // Always show listing currency if specified
      if (listingCurrency !== 0 && token.tokenId === listingCurrency)
        return true;

      // For other tokens, must be enabled in settings
      const isEnabled = enabledTokens.includes(token.tokenId);

      // Only show enabled tokens that are valid
      return isEnabled && isValidToken(token);
    });
  }, [
    tokens,
    simulationResults,
    enabledTokens,
    listingCurrency,
    settingsVersion,
  ]);

  const isLoading = (token: PaymentToken) => {
    if (token.tokenId === 390001) return false;
    return !simulationResults[token.tokenId];
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    setSettingsVersion((prev) => prev + 1);

    // Clear existing simulation results
    setTokenPrices({});

    try {
      // Run simulations for all enabled tokens
      await Promise.all(
        tokens
          .filter((token) => enabledTokens.includes(token.tokenId))
          .map((token) => simulatePrice(token))
      );
    } catch (error) {
      console.error("Error refreshing prices:", error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const renderSettingsButtons = () => (
    <Box
      sx={{
        position: "absolute",
        right: theme.spacing(2),
        top: theme.spacing(2),
        display: "flex",
        gap: 1,
        "& .MuiIconButton-root": {
          color: isDarkMode
            ? "rgba(255, 255, 255, 0.85)"
            : "rgba(0, 0, 0, 0.54)",
          backgroundColor: isDarkMode
            ? "rgba(255, 255, 255, 0.1)"
            : "transparent",
          "&:hover": {
            backgroundColor: isDarkMode
              ? "rgba(255, 255, 255, 0.2)"
              : "rgba(0, 0, 0, 0.04)",
          },
        },
      }}
    >
      <IconButton
        onClick={handleRefresh}
        size="small"
        disabled={isRefreshing}
        sx={{
          animation: isRefreshing ? "spin 1s linear infinite" : "none",
          "@keyframes spin": {
            "0%": {
              transform: "rotate(0deg)",
            },
            "100%": {
              transform: "rotate(360deg)",
            },
          },
        }}
      >
        <RefreshIcon fontSize="small" />
      </IconButton>
      <IconButton onClick={() => setSettingsOpen(true)} size="small">
        <SettingsIcon fontSize="small" />
      </IconButton>
    </Box>
  );

  const handleSettingsClose = () => {
    setSettingsOpen(false);

    // Force re-render
    setSettingsVersion((prev) => prev + 1);

    // Run simulations for all currently enabled tokens
    tokens.forEach((token) => {
      if (enabledTokens.includes(token.tokenId)) {
        simulatePrice(token);
      }
    });
  };

  const getDexUrl = (tokenId: number) => {
    // Get pool ID for the token
    const pool = tokens.find((t) => t.tokenId === tokenId)?.pool;

    console.log("pool", pool);

    // If we have a pool ID, use it for direct swap link
    if (pool) {
      return `https://voi.humble.sh/#/swap?poolId=${pool.contractId}`;
    }
    // Fallback to nothing
    return ``;
  };

  if (isMobile) {
    return (
      <>
        <Box sx={{ position: "relative", mb: 2 }}>
          {renderSettingsButtons()}
        </Box>
        <Grid container spacing={2}>
          {filteredTokens.length === 0 &&
          tokens.some((t) => t.tokenId !== 390001) ? (
            <Grid item xs={12}>
              <Card variant="outlined">
                <CardContent>
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      py: 2,
                    }}
                  >
                    <Typography
                      color={isDarkMode ? "#FFFFFF" : "text.secondary"}
                    >
                      Loading payment options...
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ) : (
            filteredTokens.map((token) => (
              <Grid item xs={12} key={token.tokenId}>
                <Card
                  variant="outlined"
                  sx={{
                    backgroundColor: isDarkMode
                      ? "rgba(255, 255, 255, 0.08)"
                      : "transparent",
                    borderColor: isDarkMode
                      ? "rgba(255, 255, 255, 0.15)"
                      : "rgba(0, 0, 0, 0.1)",
                    borderRadius: "16px",
                    "& .MuiCardContent-root": {
                      backgroundColor: "transparent",
                    },
                    "& .MuiTypography-root": {
                      color: isDarkMode ? "#FFFFFF !important" : undefined,
                    },
                    "& .MuiTypography-caption, & .MuiTypography-body2": {
                      color: isDarkMode
                        ? "rgba(255, 255, 255, 0.7) !important"
                        : undefined,
                    },
                    "& .MuiButton-contained": {
                      color: isDarkMode ? "#FFFFFF !important" : undefined,
                      backgroundColor: isDarkMode
                        ? "rgba(255, 255, 255, 0.15)"
                        : undefined,
                      "&:hover": {
                        backgroundColor: isDarkMode
                          ? "rgba(255, 255, 255, 0.25)"
                          : undefined,
                      },
                      "&.Mui-disabled": {
                        backgroundColor: isDarkMode
                          ? "rgba(255, 255, 255, 0.05)"
                          : undefined,
                        color: isDarkMode
                          ? "rgba(255, 255, 255, 0.3) !important"
                          : undefined,
                      },
                    },
                    "& .MuiSkeleton-root": {
                      backgroundColor: isDarkMode
                        ? "rgba(255, 255, 255, 0.15)"
                        : undefined,
                    },
                  }}
                >
                  <CardContent>
                    <Grid container spacing={2} alignItems="center">
                      <Grid item xs={12}>
                        <Box
                          sx={{ display: "flex", alignItems: "center", gap: 1 }}
                        >
                          <Avatar
                            src={getTokenIconUrl(token.tokenId)}
                            alt={token.symbol}
                            sx={{ width: 24, height: 24 }}
                          >
                            {token.symbol[0]}
                          </Avatar>
                          <Typography>{token.symbol}</Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="caption" color="text.secondary">
                          Balance
                        </Typography>
                        <Typography>{formatBalance(token)}</Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="caption" color="text.secondary">
                          Price
                        </Typography>
                        {renderPrice(token)}
                      </Grid>
                      <Grid item xs={12}>
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 1,
                            justifyContent: "flex-end",
                          }}
                        >
                          {!isTokenBuyable(token) && !isLoading(token) && (
                            <Link
                              href={getDexUrl(token.tokenId)}
                              target="_blank"
                              rel="noopener noreferrer"
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 0.5,
                                color: isDarkMode
                                  ? "rgba(255, 255, 255, 0.7)"
                                  : "inherit",
                                textDecoration: "none",
                                "&:hover": {
                                  color: isDarkMode
                                    ? "#FFFFFF"
                                    : "primary.main",
                                },
                              }}
                            >
                              Get {token.symbol}
                              <OpenInNewIcon sx={{ fontSize: 16 }} />
                            </Link>
                          )}
                          <Button
                            variant="contained"
                            fullWidth
                            onClick={() => handleBuyClick(token)}
                            disabled={!isTokenBuyable(token)}
                            sx={{
                              minWidth: "80px",
                              maxWidth: "120px",
                              borderRadius: "12px",
                            }}
                          >
                            {token.tokenId === 390001 ? (
                              "Buy"
                            ) : isLoading(token) ? (
                              <Skeleton
                                width={40}
                                sx={{ bgcolor: "rgba(255,255,255,0.1)" }}
                              />
                            ) : (
                              "Buy"
                            )}
                          </Button>
                        </Box>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>
            ))
          )}
        </Grid>
        <ConfirmationModal
          open={confirmationModal.open}
          onClose={() => setConfirmationModal({ open: false, token: null })}
          onConfirm={handleConfirmBuy}
          tokenSymbol={confirmationModal.token?.symbol || ""}
          price={
            confirmationModal.token
              ? formatPrice(confirmationModal.token) || "0"
              : "0"
          }
          priceImpact={
            confirmationModal.token
              ? getPriceImpact(confirmationModal.token)
              : "0"
          }
          finalPrice={
            confirmationModal.token
              ? getFinalPrice(confirmationModal.token)
              : "0"
          }
        />
        <Dialog
          open={settingsOpen}
          onClose={handleSettingsClose}
          maxWidth="sm"
          fullWidth
          PaperProps={{
            sx: {
              backgroundColor: isDarkMode
                ? "rgba(30, 30, 30, 0.95)"
                : "rgba(255, 255, 255, 0.95)",
              backdropFilter: "blur(10px)",
              borderRadius: "16px",
              "& .MuiTypography-root": {
                color: isDarkMode ? "#FFFFFF !important" : undefined,
              },
              "& .MuiTypography-body2": {
                color: isDarkMode
                  ? "rgba(255, 255, 255, 0.7) !important"
                  : undefined,
              },
            },
          }}
        >
          <DialogContent>
            <UserSettings
              availableTokens={tokens}
              onSettingsChange={handleSettingsChange}
            />
          </DialogContent>
        </Dialog>
      </>
    );
  }

  console.log({ filteredTokens });

  return (
    <>
      <Box sx={{ position: "relative" }}>
        {renderSettingsButtons()}
        <TableContainer
          component={Paper}
          sx={{
            backgroundColor: isDarkMode
              ? "rgba(18, 18, 18, 0.95)"
              : "transparent",
            borderRadius: "16px",
            overflow: "hidden",
            border: isDarkMode
              ? "1px solid rgba(255, 255, 255, 0.15)"
              : "1px solid rgba(0, 0, 0, 0.1)",
            "& .MuiTable-root": {
              backgroundColor: "transparent",
              color: isDarkMode ? "#FFFFFF" : undefined,
            },
            "& .MuiTableCell-root": {
              borderColor: isDarkMode
                ? "rgba(255, 255, 255, 0.1)"
                : "rgba(0, 0, 0, 0.1)",
              color: isDarkMode ? "#FFFFFF" : undefined,
              padding: "16px",
              "& > *": {
                // Force all child elements to be white
                color: isDarkMode ? "#FFFFFF !important" : undefined,
              },
            },
            "& .MuiTableCell-head": {
              color: isDarkMode ? "#FFFFFF !important" : undefined,
              fontWeight: 600,
              backgroundColor: isDarkMode ? "rgba(0, 0, 0, 0.4)" : undefined,
              fontSize: "0.875rem",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            },
            "& .MuiTableBody-root": {
              "& .MuiTableRow-root": {
                backgroundColor: isDarkMode
                  ? "rgba(255, 255, 255, 0.02)"
                  : undefined,
                "&:nth-of-type(odd)": {
                  backgroundColor: isDarkMode
                    ? "rgba(255, 255, 255, 0.03)"
                    : undefined,
                },
                "&:hover": {
                  backgroundColor: isDarkMode
                    ? "rgba(255, 255, 255, 0.05)"
                    : "rgba(0, 0, 0, 0.04)",
                },
                "&.Mui-selected": {
                  backgroundColor: isDarkMode
                    ? "rgba(25, 118, 210, 0.15) !important"
                    : undefined,
                  "&:hover": {
                    backgroundColor: isDarkMode
                      ? "rgba(25, 118, 210, 0.25) !important"
                      : undefined,
                  },
                },
                "& .MuiTypography-root": {
                  color: isDarkMode ? "#FFFFFF !important" : undefined,
                },
              },
              "& .MuiTypography-root": {
                color: isDarkMode ? "#FFFFFF !important" : undefined,
                fontSize: "0.875rem",
              },
              "& .MuiTypography-caption, & .MuiTypography-body2": {
                color: isDarkMode
                  ? "rgba(255, 255, 255, 0.7) !important"
                  : undefined,
              },
            },
            "& .MuiButton-contained": {
              color: isDarkMode ? "#FFFFFF !important" : undefined,
              backgroundColor: isDarkMode
                ? "rgba(255, 255, 255, 0.1)"
                : undefined,
              "&:hover": {
                backgroundColor: isDarkMode
                  ? "rgba(255, 255, 255, 0.15)"
                  : undefined,
              },
              "&.Mui-disabled": {
                backgroundColor: isDarkMode
                  ? "rgba(255, 255, 255, 0.05)"
                  : undefined,
                color: isDarkMode
                  ? "rgba(255, 255, 255, 0.3) !important"
                  : undefined,
              },
            },
            "& .MuiSkeleton-root": {
              backgroundColor: isDarkMode
                ? "rgba(255, 255, 255, 0.1)"
                : undefined,
            },
          }}
        >
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Token</TableCell>
                <TableCell align="right">Balance</TableCell>
                <TableCell align="right">Price</TableCell>
                <TableCell align="right">&nbsp;</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredTokens.length === 0 &&
              tokens.some((t) => t.tokenId !== 390001) ? (
                <TableRow>
                  <TableCell colSpan={4} align="center">
                    <Box sx={{ py: 2 }}>
                      <Typography
                        color={isDarkMode ? "#FFFFFF" : "text.secondary"}
                      >
                        Loading payment options...
                      </Typography>
                    </Box>
                  </TableCell>
                </TableRow>
              ) : (
                filteredTokens.map((token) => (
                  <TableRow
                    key={token.tokenId}
                    selected={value === token.tokenId}
                    hover
                    sx={{
                      cursor: "pointer",
                      "&.Mui-selected": {
                        backgroundColor: isDarkMode
                          ? "rgba(25, 118, 210, 0.12)"
                          : "rgba(25, 118, 210, 0.08)",
                      },
                      "&.Mui-selected:hover": {
                        backgroundColor: isDarkMode
                          ? "rgba(25, 118, 210, 0.2)"
                          : "rgba(25, 118, 210, 0.12)",
                      },
                    }}
                  >
                    <TableCell onClick={() => onChange(token.tokenId)}>
                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 1 }}
                      >
                        <Avatar
                          src={getTokenIconUrl(token.tokenId)}
                          alt={token.symbol}
                          sx={{ width: 24, height: 24 }}
                        >
                          {token.symbol[0]}
                        </Avatar>
                        <Typography>{token.symbol}</Typography>
                      </Box>
                    </TableCell>
                    <TableCell
                      align="right"
                      onClick={() => onChange(token.tokenId)}
                    >
                      <Typography>{formatBalance(token)}</Typography>
                    </TableCell>
                    <TableCell
                      align="right"
                      onClick={() => onChange(token.tokenId)}
                    >
                      {renderPrice(token)}
                    </TableCell>
                    <TableCell align="right">
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 1,
                          justifyContent: "flex-end",
                        }}
                      >
                        {!isTokenBuyable(token) && !isLoading(token) && (
                          <Link
                            href={getDexUrl(token.tokenId)}
                            target="_blank"
                            rel="noopener noreferrer"
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 0.5,
                              color: isDarkMode
                                ? "rgba(255, 255, 255, 0.7)"
                                : "inherit",
                              textDecoration: "none",
                              "&:hover": {
                                color: isDarkMode ? "#FFFFFF" : "primary.main",
                              },
                            }}
                          >
                            Get {token.symbol}
                            <OpenInNewIcon sx={{ fontSize: 16 }} />
                          </Link>
                        )}
                        <Button
                          variant="contained"
                          size="small"
                          onClick={() => handleBuyClick(token)}
                          disabled={!isTokenBuyable(token)}
                          sx={{
                            minWidth: "80px",
                            borderRadius: "12px",
                          }}
                        >
                          {token.tokenId === 390001 ? (
                            "Buy"
                          ) : isLoading(token) ? (
                            <Skeleton
                              width={40}
                              sx={{ bgcolor: "rgba(255,255,255,0.1)" }}
                            />
                          ) : (
                            "Buy"
                          )}
                        </Button>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <Dialog
          open={settingsOpen}
          onClose={handleSettingsClose}
          maxWidth="sm"
          fullWidth
          PaperProps={{
            sx: {
              backgroundColor: isDarkMode
                ? "rgba(30, 30, 30, 0.95)"
                : "rgba(255, 255, 255, 0.95)",
              backdropFilter: "blur(10px)",
              borderRadius: "16px",
              "& .MuiTypography-root": {
                color: isDarkMode ? "#FFFFFF !important" : undefined,
              },
              "& .MuiTypography-body2": {
                color: isDarkMode
                  ? "rgba(255, 255, 255, 0.7) !important"
                  : undefined,
              },
            },
          }}
        >
          <DialogContent>
            <UserSettings
              availableTokens={tokens}
              onSettingsChange={handleSettingsChange}
            />
          </DialogContent>
        </Dialog>
      </Box>
      <ConfirmationModal
        open={confirmationModal.open}
        onClose={() => setConfirmationModal({ open: false, token: null })}
        onConfirm={handleConfirmBuy}
        tokenSymbol={confirmationModal.token?.symbol || ""}
        price={
          confirmationModal.token
            ? formatPrice(confirmationModal.token) || "0"
            : "0"
        }
        priceImpact={
          confirmationModal.token
            ? getPriceImpact(confirmationModal.token)
            : "0"
        }
        finalPrice={
          confirmationModal.token ? getFinalPrice(confirmationModal.token) : "0"
        }
      />
    </>
  );
};

export default CurrencySelect;
