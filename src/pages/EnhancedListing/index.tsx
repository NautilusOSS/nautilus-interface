import React, { useState, useEffect, useMemo } from "react";
import Layout from "../../layouts/Default";
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  Stack,
  Chip,
  TextField,
  InputAdornment,
  IconButton,
  Tooltip,
  useTheme,
  useMediaQuery,
  Alert,
  CircularProgress,
  Divider,
} from "@mui/material";
import {
  Add as AddIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  ViewList as ViewListIcon,
  GridView as GridViewIcon,
  Sort as SortIcon,
  Info as InfoIcon,
  TrendingUp as TrendingUpIcon,
  History as HistoryIcon,
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import CartNftCard from "../../components/CartNFTCard";
import EnhancedListModal from "../../components/modals/EnhancedListModal";
import { NFTIndexerTokenI } from "../../types";
import axios from "axios";
import { useSmartTokens } from "@/components/Navbar/hooks/collections";
import { formatter } from "../../utils/number";

interface EnhancedListingProps {}

// Extended interface for our use case
interface ExtendedNFTIndexerTokenI extends Omit<NFTIndexerTokenI, 'metadata' | 'owner'> {
  name?: string;
  collectionName?: string;
  metadata?: string;
  owner?: string;
}

const EnhancedListing: React.FC<EnhancedListingProps> = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const navigate = useNavigate();

  // State management
  const [selectedNFTs, setSelectedNFTs] = useState<ExtendedNFTIndexerTokenI[]>([]);
  const [userNFTs, setUserNFTs] = useState<ExtendedNFTIndexerTokenI[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [sortBy, setSortBy] = useState<"name" | "date" | "value">("name");
  const [filterCollection, setFilterCollection] = useState<string>("all");
  const [showListModal, setShowListModal] = useState(false);
  const [listModalLoading, setListModalLoading] = useState(false);

  // Smart tokens hook
  const { isLoading: isLoadingSmartTokens, data: smartTokens } = useSmartTokens();

  // Fetch user's NFTs
  useEffect(() => {
    const fetchUserNFTs = async () => {
      try {
        setLoading(true);
        // This would typically fetch from your backend or blockchain
        // For now, we'll use a mock implementation
        const response = await axios.get("/api/user/nfts");
        setUserNFTs(response.data.nfts || []);
      } catch (error) {
        console.error("Error fetching user NFTs:", error);
        // Mock data for demonstration
        setUserNFTs([
          {
            contractId: 123,
            tokenId: 1,
            name: "Cool NFT #1",
            metadata: JSON.stringify({
              image: "https://via.placeholder.com/300x300",
              attributes: [{ trait_type: "Rarity", value: "Legendary" }],
            }),
            collectionName: "Cool Collection",
            owner: "user123",
            approved: "user123",
            metadataURI: "https://example.com/metadata/1",
            "mint-round": 1,
          },
          {
            contractId: 123,
            tokenId: 2,
            name: "Cool NFT #2",
            metadata: JSON.stringify({
              image: "https://via.placeholder.com/300x300",
              attributes: [{ trait_type: "Rarity", value: "Rare" }],
            }),
            collectionName: "Cool Collection",
            owner: "user123",
            approved: "user123",
            metadataURI: "https://example.com/metadata/2",
            "mint-round": 1,
          },
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchUserNFTs();
  }, []);

  // Filter and sort NFTs
  const filteredAndSortedNFTs = useMemo(() => {
    let filtered = userNFTs.filter((nft) => {
      const matchesSearch = nft.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           nft.tokenId.toString().includes(searchTerm) ||
                           nft.collectionName?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesCollection = filterCollection === "all" || nft.collectionName === filterCollection;
      
      return matchesSearch && matchesCollection;
    });

    // Sort NFTs
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "name":
          return (a.name || `#${a.tokenId}`).localeCompare(b.name || `#${b.tokenId}`);
        case "date":
          // This would typically use actual mint date or acquisition date
          return 0;
        case "value":
          // This would typically use actual NFT value
          return 0;
        default:
          return 0;
      }
    });

    return filtered;
  }, [userNFTs, searchTerm, filterCollection, sortBy]);

  // Get unique collections
  const collections = useMemo(() => {
    const uniqueCollections = Array.from(new Set(userNFTs.map(nft => nft.collectionName).filter(Boolean)));
    return uniqueCollections;
  }, [userNFTs]);

  // Handle NFT selection
  const handleNFTSelect = (nft: ExtendedNFTIndexerTokenI) => {
    setSelectedNFTs(prev => {
      const isSelected = prev.some(selected => 
        selected.contractId === nft.contractId && selected.tokenId === nft.tokenId
      );
      
      if (isSelected) {
        return prev.filter(selected => 
          !(selected.contractId === nft.contractId && selected.tokenId === nft.tokenId)
        );
      } else {
        return [...prev, nft];
      }
    });
  };

  // Handle listing
  const handleListNFTs = async (price: string, currency: string, token: any) => {
    try {
      setListModalLoading(true);
      // This would typically call your listing API
      console.log("Listing NFTs:", selectedNFTs, "for price:", price, "currency:", currency);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Clear selection after successful listing
      setSelectedNFTs([]);
      setShowListModal(false);
    } catch (error) {
      console.error("Error listing NFTs:", error);
    } finally {
      setListModalLoading(false);
    }
  };

  // Handle bulk selection
  const handleSelectAll = () => {
    if (selectedNFTs.length === filteredAndSortedNFTs.length) {
      setSelectedNFTs([]);
    } else {
      setSelectedNFTs([...filteredAndSortedNFTs]);
    }
  };

  return (
    <Layout>
      <Box sx={{ py: 4 }}>
        {/* Header */}
        <Box sx={{ mb: 4 }}>
          <Typography 
            variant="h3" 
            sx={{ 
              fontWeight: 800, 
              mb: 1,
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              backgroundClip: "text",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              textAlign: { xs: "center", sm: "left" }
            }}
          >
            List Your NFTs
          </Typography>
          <Typography variant="body1" sx={{ color: "text.secondary", mb: 3, textAlign: { xs: "center", sm: "left" } }}>
            Select the NFTs you want to list for sale and set your desired prices
          </Typography>
          
          {/* Stats */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} sm={4}>
              <Card sx={{ 
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                color: "white",
                borderRadius: "16px",
                boxShadow: "0 8px 32px rgba(102, 126, 234, 0.3)",
                transition: "all 0.3s ease-in-out",
                "&:hover": {
                  transform: "translateY(-4px)",
                  boxShadow: "0 12px 40px rgba(102, 126, 234, 0.4)",
                }
              }}>
                <CardContent sx={{ textAlign: "center", py: 3 }}>
                  <Typography variant="h3" sx={{ fontWeight: 700, mb: 1 }}>
                    {userNFTs.length}
                  </Typography>
                  <Typography variant="body1" sx={{ opacity: 0.9 }}>Total NFTs</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Card sx={{ 
                background: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
                color: "white",
                borderRadius: "16px",
                boxShadow: "0 8px 32px rgba(240, 147, 251, 0.3)",
                transition: "all 0.3s ease-in-out",
                "&:hover": {
                  transform: "translateY(-4px)",
                  boxShadow: "0 12px 40px rgba(240, 147, 251, 0.4)",
                }
              }}>
                <CardContent sx={{ textAlign: "center", py: 3 }}>
                  <Typography variant="h3" sx={{ fontWeight: 700, mb: 1 }}>
                    {selectedNFTs.length}
                  </Typography>
                  <Typography variant="body1" sx={{ opacity: 0.9 }}>Selected for Listing</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Card sx={{ 
                background: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
                color: "white",
                borderRadius: "16px",
                boxShadow: "0 8px 32px rgba(79, 172, 254, 0.3)",
                transition: "all 0.3s ease-in-out",
                "&:hover": {
                  transform: "translateY(-4px)",
                  boxShadow: "0 12px 40px rgba(79, 172, 254, 0.4)",
                }
              }}>
                <CardContent sx={{ textAlign: "center", py: 3 }}>
                  <Typography variant="h3" sx={{ fontWeight: 700, mb: 1 }}>
                    {collections.length}
                  </Typography>
                  <Typography variant="body1" sx={{ opacity: 0.9 }}>Collections</Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Box>

        {/* Controls */}
        <Card sx={{ 
          mb: 3,
          background: "linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%)",
          border: "1px solid rgba(255, 255, 255, 0.1)",
          borderRadius: "16px",
          backdropFilter: "blur(10px)",
          boxShadow: "0 8px 32px rgba(0, 0, 0, 0.1)",
        }}>
          <CardContent sx={{ p: 3 }}>
            <Grid container spacing={3} alignItems="center">
              {/* Search */}
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  placeholder="Search NFTs..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon sx={{ color: "rgba(255, 255, 255, 0.7)" }} />
                      </InputAdornment>
                    ),
                  }}
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      borderRadius: "12px",
                      backgroundColor: "rgba(255, 255, 255, 0.05)",
                      "& fieldset": {
                        borderColor: "rgba(255, 255, 255, 0.2)",
                      },
                      "&:hover fieldset": {
                        borderColor: "rgba(255, 255, 255, 0.3)",
                      },
                      "&.Mui-focused fieldset": {
                        borderColor: "#667eea",
                      },
                    },
                    "& .MuiInputBase-input": {
                      color: "white",
                      "&::placeholder": {
                        color: "rgba(255, 255, 255, 0.5)",
                        opacity: 1,
                      },
                    },
                  }}
                />
              </Grid>

              {/* Collection Filter */}
              <Grid item xs={12} sm={3}>
                <TextField
                  select
                  fullWidth
                  label="Collection"
                  value={filterCollection}
                  onChange={(e) => setFilterCollection(e.target.value)}
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      borderRadius: "12px",
                      backgroundColor: "rgba(255, 255, 255, 0.05)",
                      "& fieldset": {
                        borderColor: "rgba(255, 255, 255, 0.2)",
                      },
                      "&:hover fieldset": {
                        borderColor: "rgba(255, 255, 255, 0.3)",
                      },
                      "&.Mui-focused fieldset": {
                        borderColor: "#667eea",
                      },
                    },
                    "& .MuiInputLabel-root": {
                      color: "rgba(255, 255, 255, 0.7)",
                    },
                    "& .MuiInputBase-input": {
                      color: "white",
                    },
                  }}
                >
                  <option value="all">All Collections</option>
                  {collections.map((collection) => (
                    <option key={collection} value={collection}>
                      {collection}
                    </option>
                  ))}
                </TextField>
              </Grid>

              {/* Sort */}
              <Grid item xs={12} sm={2}>
                <TextField
                  select
                  fullWidth
                  label="Sort By"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as "name" | "date" | "value")}
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      borderRadius: "12px",
                      backgroundColor: "rgba(255, 255, 255, 0.05)",
                      "& fieldset": {
                        borderColor: "rgba(255, 255, 255, 0.2)",
                      },
                      "&:hover fieldset": {
                        borderColor: "rgba(255, 255, 255, 0.3)",
                      },
                      "&.Mui-focused fieldset": {
                        borderColor: "#667eea",
                      },
                    },
                    "& .MuiInputLabel-root": {
                      color: "rgba(255, 255, 255, 0.7)",
                    },
                    "& .MuiInputBase-input": {
                      color: "white",
                    },
                  }}
                >
                  <option value="name">Name</option>
                  <option value="date">Date</option>
                  <option value="value">Value</option>
                </TextField>
              </Grid>

              {/* View Mode */}
              <Grid item xs={12} sm={2}>
                <Stack direction="row" spacing={1}>
                  <IconButton
                    onClick={() => setViewMode("grid")}
                    sx={{
                      color: viewMode === "grid" ? "#667eea" : "rgba(255, 255, 255, 0.7)",
                      bgcolor: viewMode === "grid" ? "rgba(102, 126, 234, 0.2)" : "rgba(255, 255, 255, 0.1)",
                      borderRadius: "12px",
                      "&:hover": {
                        bgcolor: viewMode === "grid" ? "rgba(102, 126, 234, 0.3)" : "rgba(255, 255, 255, 0.2)",
                        transform: "scale(1.1)",
                      },
                      transition: "all 0.2s ease-in-out",
                    }}
                  >
                    <GridViewIcon />
                  </IconButton>
                  <IconButton
                    onClick={() => setViewMode("list")}
                    sx={{
                      color: viewMode === "list" ? "#667eea" : "rgba(255, 255, 255, 0.7)",
                      bgcolor: viewMode === "list" ? "rgba(102, 126, 234, 0.2)" : "rgba(255, 255, 255, 0.1)",
                      borderRadius: "12px",
                      "&:hover": {
                        bgcolor: viewMode === "list" ? "rgba(102, 126, 234, 0.3)" : "rgba(255, 255, 255, 0.2)",
                        transform: "scale(1.1)",
                      },
                      transition: "all 0.2s ease-in-out",
                    }}
                  >
                    <ViewListIcon />
                  </IconButton>
                </Stack>
              </Grid>

              {/* Select All */}
              <Grid item xs={12} sm={1}>
                <Button
                  variant="outlined"
                  onClick={handleSelectAll}
                  disabled={filteredAndSortedNFTs.length === 0}
                  sx={{
                    borderRadius: "12px",
                    borderColor: "rgba(255, 255, 255, 0.3)",
                    color: "white",
                    background: "rgba(255, 255, 255, 0.05)",
                    backdropFilter: "blur(10px)",
                    transition: "all 0.3s ease-in-out",
                    "&:hover": {
                      borderColor: "white",
                      backgroundColor: "rgba(255, 255, 255, 0.1)",
                      transform: "translateY(-2px)",
                      boxShadow: "0 8px 25px rgba(0, 0, 0, 0.3)",
                    },
                    "&:disabled": {
                      borderColor: "rgba(255, 255, 255, 0.1)",
                      color: "rgba(255, 255, 255, 0.3)",
                    },
                  }}
                >
                  {selectedNFTs.length === filteredAndSortedNFTs.length ? "Deselect All" : "Select All"}
                </Button>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Selected NFTs Summary */}
        {selectedNFTs.length > 0 && (
          <Card sx={{ 
            mb: 3, 
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            color: "white",
            borderRadius: "16px",
            boxShadow: "0 8px 32px rgba(102, 126, 234, 0.3)",
            border: "1px solid rgba(255, 255, 255, 0.2)",
          }}>
            <CardContent sx={{ p: 3 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  {selectedNFTs.length} NFT{selectedNFTs.length > 1 ? "s" : ""} Selected
                </Typography>
                <Stack direction="row" spacing={2}>
                  <Button
                    variant="outlined"
                    onClick={() => setSelectedNFTs([])}
                    sx={{ 
                      color: "white", 
                      borderColor: "rgba(255, 255, 255, 0.5)",
                      borderRadius: "12px",
                      background: "rgba(255, 255, 255, 0.1)",
                      backdropFilter: "blur(10px)",
                      transition: "all 0.3s ease-in-out",
                      "&:hover": {
                        borderColor: "white",
                        backgroundColor: "rgba(255, 255, 255, 0.2)",
                        transform: "translateY(-2px)",
                        boxShadow: "0 8px 25px rgba(0, 0, 0, 0.3)",
                      },
                    }}
                  >
                    Clear Selection
                  </Button>
                  <Button
                    variant="contained"
                    onClick={() => setShowListModal(true)}
                    startIcon={<AddIcon />}
                    sx={{ 
                      bgcolor: "white", 
                      color: "#667eea",
                      borderRadius: "12px",
                      fontWeight: 600,
                      boxShadow: "0 8px 25px rgba(0, 0, 0, 0.2)",
                      transition: "all 0.3s ease-in-out",
                      "&:hover": {
                        transform: "translateY(-2px)",
                        boxShadow: "0 12px 35px rgba(0, 0, 0, 0.3)",
                        bgcolor: "rgba(255, 255, 255, 0.95)",
                      },
                    }}
                  >
                    List Selected
                  </Button>
                </Stack>
              </Stack>
            </CardContent>
          </Card>
        )}

        {/* NFTs Grid/List */}
        {loading ? (
          <Box sx={{ 
            display: "flex", 
            justifyContent: "center", 
            alignItems: "center", 
            py: 8,
            flexDirection: "column",
            gap: 2
          }}>
            <CircularProgress 
              size={60} 
              sx={{
                color: "#667eea",
                "& .MuiCircularProgress-circle": {
                  strokeLinecap: "round",
                },
              }}
            />
            <Typography variant="body1" sx={{ color: "rgba(255, 255, 255, 0.7)" }}>
              Loading your NFTs...
            </Typography>
          </Box>
        ) : filteredAndSortedNFTs.length === 0 ? (
          <Card sx={{ 
            background: "linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.02) 100%)",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            borderRadius: "16px",
            backdropFilter: "blur(10px)",
          }}>
            <CardContent sx={{ textAlign: "center", py: 6 }}>
              <Box sx={{ mb: 2 }}>
                <Typography variant="h4" sx={{ fontWeight: 700, mb: 1, color: "white" }}>
                  No NFTs Found
                </Typography>
                <Typography variant="body1" sx={{ color: "rgba(255, 255, 255, 0.7)" }}>
                  {searchTerm || filterCollection !== "all" 
                    ? "Try adjusting your search or filter criteria"
                    : "You don't have any NFTs to list yet"
                  }
                </Typography>
              </Box>
              {!searchTerm && filterCollection === "all" && (
                <Button
                  variant="contained"
                  sx={{
                    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                    borderRadius: "12px",
                    px: 4,
                    py: 1.5,
                    textTransform: "none",
                    fontWeight: 600,
                    boxShadow: "0 8px 25px rgba(102, 126, 234, 0.3)",
                    transition: "all 0.3s ease-in-out",
                    "&:hover": {
                      transform: "translateY(-2px)",
                      boxShadow: "0 12px 35px rgba(102, 126, 234, 0.4)",
                    },
                  }}
                >
                  Browse Collections
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <Grid container spacing={2}>
            {filteredAndSortedNFTs.map((nft) => {
              const isSelected = selectedNFTs.some(selected => 
                selected.contractId === nft.contractId && selected.tokenId === nft.tokenId
              );
              
              return (
                <Grid item xs={12} sm={6} md={4} lg={3} key={`${nft.contractId}-${nft.tokenId}`}>
                  <Card
                    sx={{
                      cursor: "pointer",
                      transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                      border: isSelected ? "2px solid" : "1px solid",
                      borderColor: isSelected ? "#667eea" : "rgba(255, 255, 255, 0.1)",
                      background: isSelected 
                        ? "linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)"
                        : "linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.02) 100%)",
                      borderRadius: "16px",
                      backdropFilter: "blur(10px)",
                      boxShadow: isSelected 
                        ? "0 12px 40px rgba(102, 126, 234, 0.3), 0 0 0 1px rgba(102, 126, 234, 0.2)"
                        : "0 8px 32px rgba(0, 0, 0, 0.1)",
                      transform: isSelected ? "scale(1.02) translateY(-4px)" : "scale(1)",
                      "&:hover": {
                        transform: "scale(1.02) translateY(-4px)",
                        boxShadow: "0 16px 48px rgba(0, 0, 0, 0.2), 0 0 0 1px rgba(255, 255, 255, 0.2)",
                        borderColor: isSelected ? "#667eea" : "rgba(255, 255, 255, 0.3)",
                      },
                    }}
                    onClick={() => handleNFTSelect(nft)}
                  >
                    <CardContent sx={{ p: 0 }}>
                      <Box sx={{ position: "relative" }}>
                        <CartNftCard
                          token={nft as any}
                          imageOnly={true}
                          hideOverlay={true}
                          size="small"
                          sx={{
                            height: "100%",
                            width: "100%",
                            "& img": {
                              objectFit: "cover",
                              width: "100%",
                              height: "200px",
                              borderRadius: "16px 16px 0 0",
                            },
                          }}
                        />
                        {isSelected && (
                          <Box
                            sx={{
                              position: "absolute",
                              top: 12,
                              right: 12,
                              bgcolor: "#667eea",
                              borderRadius: "50%",
                              width: 36,
                              height: 36,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              color: "white",
                              boxShadow: "0 4px 12px rgba(102, 126, 234, 0.4)",
                              animation: "pulse 2s infinite",
                              "@keyframes pulse": {
                                "0%": {
                                  boxShadow: "0 4px 12px rgba(102, 126, 234, 0.4)",
                                },
                                "50%": {
                                  boxShadow: "0 4px 20px rgba(102, 126, 234, 0.6)",
                                },
                                "100%": {
                                  boxShadow: "0 4px 12px rgba(102, 126, 234, 0.4)",
                                },
                              },
                            }}
                          >
                            ✓
                          </Box>
                        )}
                      </Box>
                      <Box sx={{ p: 2.5 }}>
                        <Typography variant="h6" sx={{ fontWeight: 700, mb: 1, color: "white" }}>
                          {nft.name || `#${nft.tokenId}`}
                        </Typography>
                        <Typography variant="body2" sx={{ color: "rgba(255, 255, 255, 0.7)", mb: 1.5 }}>
                          {nft.collectionName || "Unknown Collection"}
                        </Typography>
                        <Stack direction="row" spacing={1}>
                          <Chip
                            label={`#${nft.tokenId}`}
                            size="small"
                            variant="outlined"
                            sx={{
                              borderColor: "rgba(255, 255, 255, 0.3)",
                              color: "rgba(255, 255, 255, 0.8)",
                              borderRadius: "8px",
                            }}
                          />
                          {nft.metadata && (
                            <Chip
                              label="Has Metadata"
                              size="small"
                              sx={{
                                bgcolor: "rgba(102, 126, 234, 0.2)",
                                color: "#667eea",
                                borderRadius: "8px",
                                fontWeight: 500,
                              }}
                            />
                          )}
                        </Stack>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        )}

        {/* Enhanced List Modal */}
        {selectedNFTs.length > 0 && (
          <EnhancedListModal
            open={showListModal}
            loading={listModalLoading}
            onCloseModal={() => setShowListModal(false)}
            onSave={handleListNFTs}
            nft={selectedNFTs[0] as any} // For now, we'll use the first selected NFT
            clearSelection={() => setSelectedNFTs([])}
          />
        )}
      </Box>
    </Layout>
  );
};

export default EnhancedListing; 