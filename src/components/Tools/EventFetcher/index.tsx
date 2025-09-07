import React, { useState, useCallback } from "react";
import {
  Box,
  Typography,
  Button,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  Grid,
  Chip,
  LinearProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
} from "@mui/material";
import { useSelector } from "react-redux";
import { RootState } from "@/store/store";
import styled from "styled-components";
import { toast } from "react-toastify";
import {
  fetchEventsFromLast2MBlocks,
  fetchSpecificEventsFromLast2MBlocks,
  fetchMarketplaceEventsFromLast2MBlocks,
  calculate2MBlockRange,
  ProgressInfo,
  EventFetchResult,
  SpecificEventFetchResult,
} from "@/utils/eventFetcher";

const StyledCard = styled(Card)<{ $isDark?: boolean }>`
  background: ${(props) =>
    props.$isDark ? "rgba(40, 40, 40, 0.85)" : "rgba(255, 255, 255, 0.95)"};
  backdrop-filter: blur(20px);
  border: 1px solid
    ${(props) =>
      props.$isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)"};
  border-radius: 16px;
  margin-bottom: 16px;
`;

const StyledButton = styled(Button)<{ $isDark?: boolean }>`
  background: ${(props) =>
    props.$isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.05)"};
  border: 1px solid
    ${(props) =>
      props.$isDark ? "rgba(255, 255, 255, 0.2)" : "rgba(0, 0, 0, 0.1)"};
  color: ${(props) => (props.$isDark ? "#fff" : "#000")};
  border-radius: 12px;
  text-transform: none;
  font-weight: 500;
  margin: 4px;

  &:hover {
    background: ${(props) =>
      props.$isDark ? "rgba(255, 255, 255, 0.15)" : "rgba(0, 0, 0, 0.08)"};
  }
`;

const EventFetcher: React.FC = () => {
  const isDarkTheme = useSelector((state: RootState) => state.theme.isDarkTheme);
  
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<ProgressInfo | null>(null);
  const [result, setResult] = useState<EventFetchResult | SpecificEventFetchResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [contractId, setContractId] = useState<string>("8329112");
  const [address, setAddress] = useState<string>("");
  const [batchSize, setBatchSize] = useState<string>("100000");
  const [fetchType, setFetchType] = useState<"all" | "marketplace" | "specific">("marketplace");

  const handleProgress = useCallback((progressInfo: ProgressInfo) => {
    setProgress(progressInfo);
  }, []);

  const fetchAllEvents = useCallback(async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    setProgress(null);

    try {
      const result = await fetchEventsFromLast2MBlocks(
        parseInt(contractId),
        address || undefined,
        undefined,
        parseInt(batchSize),
        handleProgress
      );
      
      setResult(result);
      
      if (result.success) {
        toast.success(`Successfully fetched ${result.totalEvents} events!`);
      } else {
        toast.error(`Failed to fetch events: ${result.error}`);
        setError(result.error || "Unknown error");
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      setError(errorMessage);
      toast.error(`Error: ${errorMessage}`);
    } finally {
      setLoading(false);
      setProgress(null);
    }
  }, [contractId, address, batchSize, handleProgress]);

  const fetchMarketplaceEvents = useCallback(async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    setProgress(null);

    try {
      const result = await fetchMarketplaceEventsFromLast2MBlocks(
        address || undefined,
        handleProgress
      );
      
      setResult(result);
      
      if (result.success) {
        toast.success(`Successfully fetched ${result.summary.totalEvents} marketplace events!`);
      } else {
        toast.error(`Failed to fetch marketplace events: ${result.error}`);
        setError(result.error || "Unknown error");
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      setError(errorMessage);
      toast.error(`Error: ${errorMessage}`);
    } finally {
      setLoading(false);
      setProgress(null);
    }
  }, [address, handleProgress]);

  const fetchSpecificEvents = useCallback(async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    setProgress(null);

    try {
      // Define specific event processors
      const eventProcessors = {
        "e_offer_ListEvent": (event: any[]) => ({
          transactionId: event[0],
          createRound: Number(event[1]),
          createTimestamp: Number(event[2]),
          mpListingId: Number(event[3]),
          contractId: Number(event[4]),
          tokenId: event[5],
          offerer: event[6],
          price: event[7] ? Number(event[7]) : 0,
          currency: event[8] ? Number(event[8]) : 0,
        }),
        "e_offer_AcceptEvent": (event: any[]) => ({
          transactionId: event[0],
          createRound: Number(event[1]),
          createTimestamp: Number(event[2]),
          listingId: Number(event[3]),
          accepter: event[4],
        }),
      };

      const result = await fetchSpecificEventsFromLast2MBlocks(
        parseInt(contractId),
        address || undefined,
        eventProcessors,
        {
          batchSize: parseInt(batchSize),
          includeMetadata: false,
          progressCallback: handleProgress,
        }
      );
      
      setResult(result);
      
      if (result.success) {
        toast.success(`Successfully fetched ${result.summary.totalEvents} specific events!`);
      } else {
        toast.error(`Failed to fetch specific events: ${result.error}`);
        setError(result.error || "Unknown error");
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      setError(errorMessage);
      toast.error(`Error: ${errorMessage}`);
    } finally {
      setLoading(false);
      setProgress(null);
    }
  }, [contractId, address, batchSize, handleProgress]);

  const handleFetch = useCallback(() => {
    switch (fetchType) {
      case "all":
        fetchAllEvents();
        break;
      case "marketplace":
        fetchMarketplaceEvents();
        break;
      case "specific":
        fetchSpecificEvents();
        break;
    }
  }, [fetchType, fetchAllEvents, fetchMarketplaceEvents, fetchSpecificEvents]);

  const getBlockRange = useCallback(async () => {
    try {
      const range = await calculate2MBlockRange();
      toast.info(`2M Block Range: ${range.minRound} to ${range.maxRound} (${range.maxRound - range.minRound} blocks)`);
    } catch (err) {
      toast.error("Failed to get block range");
    }
  }, []);

  return (
    <Box sx={{ p: 3 }}>
      <Typography
        variant="h4"
        sx={{ color: isDarkTheme ? "#fff" : "#000", mb: 3 }}
      >
        Event Fetcher - Last 2M Blocks
      </Typography>

      <Grid container spacing={3}>
        {/* Controls */}
        <Grid item xs={12} md={6}>
          <StyledCard $isDark={isDarkTheme}>
            <CardContent>
              <Typography
                variant="h6"
                sx={{ color: isDarkTheme ? "#fff" : "#000", mb: 2 }}
              >
                Fetch Configuration
              </Typography>

              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Fetch Type</InputLabel>
                <Select
                  value={fetchType}
                  onChange={(e) => setFetchType(e.target.value as any)}
                  label="Fetch Type"
                >
                  <MenuItem value="marketplace">Marketplace Events</MenuItem>
                  <MenuItem value="all">All Events</MenuItem>
                  <MenuItem value="specific">Specific Events</MenuItem>
                </Select>
              </FormControl>

              <TextField
                fullWidth
                label="Contract ID"
                value={contractId}
                onChange={(e) => setContractId(e.target.value)}
                sx={{ mb: 2 }}
                disabled={fetchType === "marketplace"}
              />

              <TextField
                fullWidth
                label="Address (optional)"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                sx={{ mb: 2 }}
                placeholder="Leave empty for contract address"
              />

              <TextField
                fullWidth
                label="Batch Size"
                value={batchSize}
                onChange={(e) => setBatchSize(e.target.value)}
                sx={{ mb: 2 }}
                type="number"
                helperText="Number of blocks to process per batch"
              />

              <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                <StyledButton
                  $isDark={isDarkTheme}
                  variant="contained"
                  onClick={handleFetch}
                  disabled={loading}
                >
                  {loading ? "Fetching..." : "Fetch Events"}
                </StyledButton>

                <StyledButton
                  $isDark={isDarkTheme}
                  variant="outlined"
                  onClick={getBlockRange}
                  disabled={loading}
                >
                  Get Block Range
                </StyledButton>
              </Box>
            </CardContent>
          </StyledCard>
        </Grid>

        {/* Progress */}
        <Grid item xs={12} md={6}>
          <StyledCard $isDark={isDarkTheme}>
            <CardContent>
              <Typography
                variant="h6"
                sx={{ color: isDarkTheme ? "#fff" : "#000", mb: 2 }}
              >
                Progress
              </Typography>

              {loading && progress && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    Batch {progress.batch} - {progress.percentage}%
                  </Typography>
                  <LinearProgress 
                    variant="determinate" 
                    value={progress.percentage}
                    sx={{ mb: 1 }}
                  />
                  <Typography variant="caption">
                    Processing blocks {progress.current} of {progress.total}
                  </Typography>
                </Box>
              )}

              {loading && !progress && (
                <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                  <CircularProgress size={24} />
                  <Typography variant="body2">
                    Initializing fetch...
                  </Typography>
                </Box>
              )}

              {!loading && !progress && (
                <Typography variant="body2" sx={{ color: isDarkTheme ? "#ccc" : "#666" }}>
                  Ready to fetch events
                </Typography>
              )}
            </CardContent>
          </StyledCard>
        </Grid>

        {/* Results */}
        <Grid item xs={12}>
          <StyledCard $isDark={isDarkTheme}>
            <CardContent>
              <Typography
                variant="h6"
                sx={{ color: isDarkTheme ? "#fff" : "#000", mb: 2 }}
              >
                Results
              </Typography>

              {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {error}
                </Alert>
              )}

              {result && result.success && (
                <Box>
                  <Typography variant="h6" sx={{ mb: 2 }}>
                    Fetch Successful! 🎉
                  </Typography>
                  
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6} md={3}>
                      <Box sx={{ textAlign: "center" }}>
                        <Typography variant="h4" sx={{ color: isDarkTheme ? "#4caf50" : "#2e7d32" }}>
                          {result.summary?.totalEvents || result.totalEvents}
                        </Typography>
                        <Typography variant="body2">
                          Total Events
                        </Typography>
                      </Box>
                    </Grid>

                    <Grid item xs={12} sm={6} md={3}>
                      <Box sx={{ textAlign: "center" }}>
                        <Typography variant="h4" sx={{ color: isDarkTheme ? "#2196f3" : "#1976d2" }}>
                          {result.summary?.batchesProcessed || result.batchesProcessed}
                        </Typography>
                        <Typography variant="body2">
                          Batches Processed
                        </Typography>
                      </Box>
                    </Grid>

                    <Grid item xs={12} sm={6} md={3}>
                      <Box sx={{ textAlign: "center" }}>
                        <Typography variant="h4" sx={{ color: isDarkTheme ? "#ff9800" : "#f57c00" }}>
                          {result.summary?.blockRange?.maxRound ? 
                            (result.summary.blockRange.maxRound - result.summary.blockRange.minRound).toLocaleString() :
                            (result.blockRange.maxRound - result.blockRange.minRound).toLocaleString()
                          }
                        </Typography>
                        <Typography variant="body2">
                          Blocks Processed
                        </Typography>
                      </Box>
                    </Grid>

                    <Grid item xs={12} sm={6} md={3}>
                      <Box sx={{ textAlign: "center" }}>
                        <Typography variant="h4" sx={{ color: isDarkTheme ? "#9c27b0" : "#7b1fa2" }}>
                          {result.summary?.contractId || result.contractId}
                        </Typography>
                        <Typography variant="body2">
                          Contract ID
                        </Typography>
                      </Box>
                    </Grid>
                  </Grid>

                  {result.summary?.eventsByType && (
                    <Box sx={{ mt: 3 }}>
                      <Typography variant="h6" sx={{ mb: 2 }}>
                        Events by Type
                      </Typography>
                      <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                        {Object.entries(result.summary.eventsByType).map(([type, count]) => (
                          <Chip
                            key={type}
                            label={`${type}: ${count}`}
                            color="primary"
                            variant="outlined"
                          />
                        ))}
                      </Box>
                    </Box>
                  )}

                  <Box sx={{ mt: 3 }}>
                    <Typography variant="body2" sx={{ color: isDarkTheme ? "#ccc" : "#666" }}>
                      Block Range: {result.summary?.blockRange?.minRound || result.blockRange.minRound} to {result.summary?.blockRange?.maxRound || result.blockRange.maxRound}
                    </Typography>
                  </Box>
                </Box>
              )}

              {result && !result.success && (
                <Alert severity="error">
                  Fetch failed: {result.error}
                </Alert>
              )}

              {!result && !error && !loading && (
                <Typography variant="body2" sx={{ color: isDarkTheme ? "#ccc" : "#666" }}>
                  No results yet. Click "Fetch Events" to start.
                </Typography>
              )}
            </CardContent>
          </StyledCard>
        </Grid>
      </Grid>
    </Box>
  );
};

export default EventFetcher;
