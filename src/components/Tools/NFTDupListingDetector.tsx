import { MIMIR_API } from "@/config/arc72-idx";
import React, { useState } from "react";
import styled from "styled-components";

const Container = styled.div`
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem;
  background: var(--background-secondary);
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
`;

const Title = styled.h2`
  color: var(--text-primary);
  margin-bottom: 1.5rem;
  font-size: 1.8rem;
  text-align: center;
`;

const Description = styled.p`
  color: var(--text-secondary);
  margin-bottom: 2rem;
  text-align: center;
  line-height: 1.6;
`;

const InputSection = styled.div`
  margin-bottom: 2rem;
`;

const Label = styled.label`
  display: block;
  margin-bottom: 0.5rem;
  color: var(--text-primary);
  font-weight: 600;
`;

const TextArea = styled.textarea`
  width: 100%;
  min-height: 120px;
  padding: 1rem;
  border: 2px solid var(--border-color);
  border-radius: 8px;
  background: var(--background-primary);
  color: var(--text-primary);
  font-family: monospace;
  resize: vertical;
  transition: border-color 0.2s ease;

  &:focus {
    outline: none;
    border-color: var(--accent-color);
  }
`;

const Button = styled.button`
  background: var(--accent-color);
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s ease;
  width: 100%;
  margin-bottom: 1rem;

  &:hover {
    background: var(--accent-color-hover);
  }

  &:disabled {
    background: var(--text-tertiary);
    cursor: not-allowed;
  }
`;

const ResultsSection = styled.div`
  margin-top: 2rem;
`;

const ResultCard = styled.div<{ isDuplicate: boolean }>`
  background: ${(props) =>
    props.isDuplicate ? "rgba(239, 68, 68, 0.1)" : "rgba(34, 197, 94, 0.1)"};
  border: 2px solid ${(props) => (props.isDuplicate ? "#ef4444" : "#22c55e")};
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1rem;
`;

const ResultTitle = styled.h4<{ isDuplicate: boolean }>`
  color: ${(props) => (props.isDuplicate ? "#ef4444" : "#22c55e")};
  margin: 0 0 0.5rem 0;
  font-size: 1.1rem;
`;

const ResultDetails = styled.div`
  font-family: monospace;
  font-size: 0.9rem;
  color: var(--text-secondary);
`;

const StatsContainer = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
`;

const StatCard = styled.div`
  background: var(--background-primary);
  padding: 1rem;
  border-radius: 8px;
  text-align: center;
  border: 1px solid var(--border-color);
`;

const StatNumber = styled.div`
  font-size: 2rem;
  font-weight: bold;
  color: var(--accent-color);
`;

const StatLabel = styled.div`
  font-size: 0.9rem;
  color: var(--text-secondary);
  margin-top: 0.25rem;
`;

const DeleteButton = styled.button`
  background: #dc2626;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s ease;
  font-size: 0.9rem;
  margin-top: 0.5rem;

  &:hover {
    background: #b91c1c;
  }

  &:disabled {
    background: var(--text-tertiary);
    cursor: not-allowed;
  }
`;

const DeleteConfirmation = styled.div`
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid #ef4444;
  border-radius: 6px;
  padding: 0.75rem;
  margin-top: 0.5rem;
  font-size: 0.9rem;
`;

const ViewNFTLink = styled.a`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--accent-color);
  text-decoration: none;
  font-weight: 600;
  padding: 0.5rem 0.75rem;
  border-radius: 6px;
  background: rgba(var(--accent-color-rgb, 59, 130, 246), 0.1);
  border: 1px solid rgba(var(--accent-color-rgb, 59, 130, 246), 0.2);
  transition: all 0.2s ease;
  font-size: 0.9rem;
  margin-top: 0.5rem;

  &:hover {
    background: rgba(var(--accent-color-rgb, 59, 130, 246), 0.2);
    border-color: rgba(var(--accent-color-rgb, 59, 130, 246), 0.4);
    transform: translateY(-1px);
  }

  svg {
    width: 16px;
    height: 16px;
  }
`;

const NFTDupListingDetector: React.FC = () => {
  const [inputData, setInputData] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [stats, setStats] = useState({
    totalListings: 0,
    duplicates: 0,
    unique: 0,
    potentialDups: 0,
  });
  const [currentRound, setCurrentRound] = useState<number | null>(null);
  const [lastFetchTime, setLastFetchTime] = useState<string | null>(null);
  const [deletingListings, setDeletingListings] = useState<Set<string>>(
    new Set()
  );

  const sampleData = `[
  {
    "id": "listing1",
    "nftId": "12345",
    "price": "100",
    "seller": "seller1",
    "collection": "Bored Ape"
  },
  {
    "id": "listing2", 
    "nftId": "12345",
    "price": "95",
    "seller": "seller2",
    "collection": "Bored Ape"
  },
  {
    "id": "listing3",
    "nftId": "67890",
    "price": "200",
    "seller": "seller3",
    "collection": "CryptoPunks"
  }
]`;

  const detectDuplicates = () => {
    if (!inputData.trim()) return;

    setIsAnalyzing(true);

    try {
      const listings = JSON.parse(inputData);
      const nftGroups = new Map();
      const duplicates: any[] = [];
      const unique: any[] = [];
      let potentialDups = 0;

      // Group listings by NFT ID
      listings.forEach((listing: any) => {
        const nftId = listing.nftId;
        if (!nftGroups.has(nftId)) {
          nftGroups.set(nftId, []);
        }
        nftGroups.get(nftId).push(listing);
      });

      // Analyze each group
      nftGroups.forEach((groupListings: any[], nftId: string) => {
        if (groupListings.length > 1) {
          // Multiple listings for same NFT
          const sortedListings = groupListings.sort(
            (a: any, b: any) => parseFloat(a.price) - parseFloat(b.price)
          );

          duplicates.push({
            nftId,
            listings: sortedListings,
            isDuplicate: true,
            lowestPrice: sortedListings[0].price,
            highestPrice: sortedListings[sortedListings.length - 1].price,
            priceDifference: (
              parseFloat(sortedListings[sortedListings.length - 1].price) -
              parseFloat(sortedListings[0].price)
            ).toFixed(2),
          });

          potentialDups += groupListings.length - 1;
        } else {
          // Single listing
          unique.push({
            nftId,
            listing: groupListings[0],
            isDuplicate: false,
          });
        }
      });

      setResults([...duplicates, ...unique]);
      setStats({
        totalListings: listings.length,
        duplicates: duplicates.length,
        unique: unique.length,
        potentialDups,
      });
    } catch (error) {
      alert("Invalid JSON format. Please check your input data.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSampleData = () => {
    setInputData(sampleData);
  };

  const fetchListingsFromAPI = async () => {
    setIsFetching(true);
    try {
      const response = await fetch(
        `${MIMIR_API}/nft-indexer/v1/mp/listings?active=true`
      );
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const listings = data.listings || [];

      // Store current round and fetch time
      setCurrentRound(data["current-round"] || null);
      setLastFetchTime(new Date().toLocaleString());

      // Transform the API data to match our expected format
      const transformedListings = listings.map((listing: any) => {
        let parsedMetadata = null;
        try {
          if (listing.token?.metadata) {
            // Handle the escaped quotes in the metadata string
            const cleanMetadata = listing.token.metadata.replace(/\\"/g, '"');
            parsedMetadata = JSON.parse(cleanMetadata);
          }
        } catch (error) {
          console.warn(
            "Failed to parse metadata for listing:",
            listing.mpListingId
          );
        }

        return {
          id: listing.mpListingId,
          nftId: `${listing.collectionId}-${listing.tokenId}`,
          price: (listing.price / 1000000).toString(), // Convert from microAlgos to VOI
          priceMicroAlgos: listing.price,
          seller: listing.seller,
          collection: listing.collectionId,
          contractId: listing.token?.contractId,
          transactionId: listing.transactionId,
          createRound: listing.createRound,
          createTimestamp: listing.createTimestamp,
          royalty: listing.royalty,
          escrowAddr: listing.escrowAddr,
          metadata: parsedMetadata,
          metadataURI: listing.token?.metadataURI,
        };
      });

      setInputData(JSON.stringify(transformedListings, null, 2));

      // Auto-analyze the fetched data
      setTimeout(() => {
        detectDuplicatesFromData(transformedListings);
      }, 100);
    } catch (error) {
      console.error("Error fetching listings:", error);
      alert(
        `Error fetching listings: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    } finally {
      setIsFetching(false);
    }
  };

  const detectDuplicatesFromData = (listings: any[]) => {
    if (!listings || listings.length === 0) return;

    setIsAnalyzing(true);

    try {
      const nftGroups = new Map();
      const duplicates: any[] = [];
      const unique: any[] = [];
      let potentialDups = 0;

      // Group listings by NFT ID
      listings.forEach((listing: any) => {
        const nftId = listing.nftId;
        if (!nftGroups.has(nftId)) {
          nftGroups.set(nftId, []);
        }
        nftGroups.get(nftId).push(listing);
      });

      // Analyze each group
      nftGroups.forEach((groupListings: any[], nftId: string) => {
        if (groupListings.length > 1) {
          // Multiple listings for same NFT
          const sortedListings = groupListings.sort(
            (a: any, b: any) => parseFloat(a.price) - parseFloat(b.price)
          );

          duplicates.push({
            nftId,
            listings: sortedListings,
            isDuplicate: true,
            lowestPrice: sortedListings[0].price,
            highestPrice: sortedListings[sortedListings.length - 1].price,
            priceDifference: (
              parseFloat(sortedListings[sortedListings.length - 1].price) -
              parseFloat(sortedListings[0].price)
            ).toFixed(2),
          });

          potentialDups += groupListings.length - 1;
        } else {
          // Single listing
          unique.push({
            nftId,
            listing: groupListings[0],
            isDuplicate: false,
          });
        }
      });

      setResults([...duplicates, ...unique]);
      setStats({
        totalListings: listings.length,
        duplicates: duplicates.length,
        unique: unique.length,
        potentialDups,
      });
    } catch (error) {
      alert("Error analyzing data. Please check your input data.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const deleteOlderListing = async (listingId: string, nftId: string) => {
    if (
      !confirm(
        `Are you sure you want to delete listing ${listingId} for NFT ${nftId}? This action cannot be undone.`
      )
    ) {
      return;
    }

    setDeletingListings((prev) => new Set(prev).add(listingId));

    try {
      // Here you would implement the actual deletion logic
      // For now, we'll simulate the deletion by removing it from the results

      // Remove the listing from the input data
      const currentListings = JSON.parse(inputData);
      const updatedListings = currentListings.filter(
        (listing: any) => listing.id !== listingId
      );
      setInputData(JSON.stringify(updatedListings, null, 2));

      // Re-analyze the data to update results
      setTimeout(() => {
        detectDuplicatesFromData(updatedListings);
      }, 100);

      alert(`Listing ${listingId} has been deleted successfully.`);
    } catch (error) {
      console.error("Error deleting listing:", error);
      alert(
        `Error deleting listing: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    } finally {
      setDeletingListings((prev) => {
        const newSet = new Set(prev);
        newSet.delete(listingId);
        return newSet;
      });
    }
  };

  const getOlderListings = (listings: any[]) => {
    // Sort by creation round (older first) and return all but the newest
    return listings
      .sort((a: any, b: any) => a.createRound - b.createRound)
      .slice(0, -1);
  };

  const clearData = () => {
    setInputData("");
    setResults([]);
    setStats({
      totalListings: 0,
      duplicates: 0,
      unique: 0,
      potentialDups: 0,
    });
  };

  return (
    <Container>
      <Title>NFT Dup Listing Detector</Title>
      <Description>
        Detect duplicate NFT listings across different marketplaces and sellers.
        Fetch live listings from the Voi Network or upload your own data in JSON
        format to identify potential duplicates and price variations. You can
        also delete older duplicate listings to keep only the most recent one.
      </Description>

      <InputSection>
        <Label htmlFor="listingData">Listing Data (JSON Format)</Label>
        <TextArea
          id="listingData"
          value={inputData}
          onChange={(e) => setInputData(e.target.value)}
          placeholder="Paste your NFT listing data in JSON format here..."
        />
      </InputSection>

      <div style={{ display: "flex", gap: "1rem", marginBottom: "1rem" }}>
        <Button
          onClick={fetchListingsFromAPI}
          disabled={isAnalyzing || isFetching}
        >
          {isFetching ? "Fetching..." : "Fetch Live Listings"}
        </Button>
        <Button onClick={handleSampleData} disabled={isAnalyzing || isFetching}>
          Load Sample Data
        </Button>
        <Button onClick={clearData} disabled={isAnalyzing || isFetching}>
          Clear Data
        </Button>
      </div>

      <Button
        onClick={detectDuplicates}
        disabled={!inputData.trim() || isAnalyzing}
      >
        {isAnalyzing ? "Analyzing..." : "Detect Duplicates"}
      </Button>

      {stats.totalListings > 0 && (
        <>
          {(currentRound || lastFetchTime) && (
            <div
              style={{
                background: "var(--background-primary)",
                padding: "1rem",
                borderRadius: "8px",
                marginBottom: "1rem",
                border: "1px solid var(--border-color)",
                textAlign: "center",
              }}
            >
              {currentRound && (
                <div style={{ marginBottom: "0.5rem" }}>
                  <strong>Current Round:</strong>{" "}
                  {currentRound.toLocaleString()}
                </div>
              )}
              {lastFetchTime && (
                <div>
                  <strong>Last Updated:</strong> {lastFetchTime}
                </div>
              )}
            </div>
          )}
          <StatsContainer>
            <StatCard>
              <StatNumber>{stats.totalListings}</StatNumber>
              <StatLabel>Total Listings</StatLabel>
            </StatCard>
            <StatCard>
              <StatNumber>{stats.duplicates}</StatNumber>
              <StatLabel>Duplicate NFTs</StatLabel>
            </StatCard>
            <StatCard>
              <StatNumber>{stats.unique}</StatNumber>
              <StatLabel>Unique NFTs</StatLabel>
            </StatCard>
            <StatCard>
              <StatNumber>{stats.potentialDups}</StatNumber>
              <StatLabel>Potential Dups</StatLabel>
            </StatCard>
          </StatsContainer>
        </>
      )}

      {results.length > 0 && (
        <ResultsSection>
          <h3>Analysis Results</h3>
          {results.map((result, index) => (
            <ResultCard key={index} isDuplicate={result.isDuplicate}>
              <ResultTitle isDuplicate={result.isDuplicate}>
                {result.isDuplicate
                  ? "🚨 Duplicate Detected"
                  : "✅ Unique Listing"}
              </ResultTitle>
              <ResultDetails>
                {result.isDuplicate ? (
                  <>
                    <div>
                      <strong>NFT ID:</strong> {result.nftId}
                    </div>
                    <div>
                      <strong>Contract ID:</strong>{" "}
                      {result.listings[0].contractId}
                    </div>
                    <div>
                      <strong>Listings Found:</strong> {result.listings.length}
                    </div>
                    <div>
                      <strong>Price Range:</strong> {result.lowestPrice} -{" "}
                      {result.highestPrice} VOI
                    </div>
                    <div>
                      <strong>Price Difference:</strong>{" "}
                      {result.priceDifference} VOI
                    </div>
                    <div>
                      <strong>Listings:</strong>
                    </div>
                    {result.listings.map((listing: any, idx: number) => (
                      <div
                        key={idx}
                        style={{
                          marginLeft: "1rem",
                          marginTop: "0.5rem",
                          padding: "0.5rem",
                          background: "rgba(0,0,0,0.05)",
                          borderRadius: "4px",
                        }}
                      >
                        <div>
                          <strong>Listing ID:</strong> {listing.id}
                        </div>
                        <div>
                          <strong>Seller:</strong>{" "}
                          {listing.seller.substring(0, 8)}...
                          {listing.seller.substring(-8)}
                        </div>
                        <div>
                          <strong>Price:</strong> {listing.price} VOI (
                          {listing.priceMicroAlgos} microAlgos)
                        </div>
                        <div>
                          <strong>Collection:</strong> {listing.collection}
                        </div>
                        <div>
                          <strong>Created:</strong> Round {listing.createRound}{" "}
                          (
                          {new Date(
                            listing.createTimestamp * 1000
                          ).toLocaleDateString()}
                          )
                        </div>
                        <div>
                          <strong>Royalty:</strong>{" "}
                          {parseInt(listing.royalty) / 100}%
                        </div>
                        {listing.metadata?.name && (
                          <div>
                            <strong>Name:</strong> {listing.metadata.name}
                          </div>
                        )}
                        {listing.metadata?.description && (
                          <div>
                            <strong>Description:</strong>{" "}
                            {listing.metadata.description.substring(0, 100)}...
                          </div>
                        )}
                        {listing.metadata?.properties && (
                          <div>
                            <strong>Properties:</strong>{" "}
                            {Object.entries(listing.metadata.properties)
                              .slice(0, 3)
                              .map(([key, value]) => `${key}: ${value}`)
                              .join(", ")}
                            ...
                          </div>
                        )}

                        {/* View NFT Link */}
                        <ViewNFTLink
                          href={`#/collection/${listing.collection}/token/${
                            listing.nftId.split("-")[1]
                          }`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                            <circle cx="12" cy="12" r="3" />
                          </svg>
                          View NFT
                        </ViewNFTLink>
                      </div>
                    ))}

                    {/* Delete older listings section */}
                    {result.listings.length > 1 && (
                      <div
                        style={{
                          marginTop: "1rem",
                          padding: "1rem",
                          background: "rgba(239, 68, 68, 0.05)",
                          borderRadius: "6px",
                          border: "1px solid rgba(239, 68, 68, 0.2)",
                        }}
                      >
                        <div
                          style={{
                            marginBottom: "0.5rem",
                            fontWeight: "600",
                            color: "#dc2626",
                          }}
                        >
                          🗑️ Delete Older Listings
                        </div>
                        <div
                          style={{
                            fontSize: "0.9rem",
                            color: "var(--text-secondary)",
                            marginBottom: "1rem",
                          }}
                        >
                          Keep only the newest listing and delete older
                          duplicates to clean up your marketplace.
                        </div>

                        {getOlderListings(result.listings).map(
                          (listing: any) => (
                            <div
                              key={listing.id}
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                padding: "0.5rem",
                                background: "rgba(0,0,0,0.05)",
                                borderRadius: "4px",
                                marginBottom: "0.5rem",
                              }}
                            >
                              <div>
                                <div>
                                  <strong>Listing {listing.id}</strong> - Round{" "}
                                  {listing.createRound}
                                </div>
                                <div
                                  style={{
                                    fontSize: "0.8rem",
                                    color: "var(--text-secondary)",
                                  }}
                                >
                                  {new Date(
                                    listing.createTimestamp * 1000
                                  ).toLocaleDateString()}
                                </div>
                              </div>
                              <DeleteButton
                                onClick={() =>
                                  deleteOlderListing(listing.id, result.nftId)
                                }
                                disabled={deletingListings.has(listing.id)}
                              >
                                {deletingListings.has(listing.id)
                                  ? "Deleting..."
                                  : "Delete"}
                              </DeleteButton>
                            </div>
                          )
                        )}

                        <div
                          style={{
                            fontSize: "0.8rem",
                            color: "var(--text-secondary)",
                            fontStyle: "italic",
                          }}
                        >
                          💡 Tip: The newest listing (Round{" "}
                          {Math.max(
                            ...result.listings.map((l: any) => l.createRound)
                          )}
                          ) will be kept.
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <div>
                      <strong>NFT ID:</strong> {result.nftId}
                    </div>
                    <div>
                      <strong>Contract ID:</strong> {result.listing.contractId}
                    </div>
                    <div>
                      <strong>Listing ID:</strong> {result.listing.id}
                    </div>
                    <div>
                      <strong>Seller:</strong>{" "}
                      {result.listing.seller.substring(0, 8)}...
                      {result.listing.seller.substring(-8)}
                    </div>
                    <div>
                      <strong>Price:</strong> {result.listing.price} VOI (
                      {result.listing.priceMicroAlgos} microAlgos)
                    </div>
                    <div>
                      <strong>Collection:</strong> {result.listing.collection}
                    </div>
                    <div>
                      <strong>Created:</strong> Round{" "}
                      {result.listing.createRound} (
                      {new Date(
                        result.listing.createTimestamp * 1000
                      ).toLocaleDateString()}
                      )
                    </div>
                    <div>
                      <strong>Royalty:</strong>{" "}
                      {parseInt(result.listing.royalty) / 100}%
                    </div>
                    {result.listing.metadata?.name && (
                      <div>
                        <strong>Name:</strong> {result.listing.metadata.name}
                      </div>
                    )}
                    {result.listing.metadata?.description && (
                      <div>
                        <strong>Description:</strong>{" "}
                        {result.listing.metadata.description.substring(0, 100)}
                        ...
                      </div>
                    )}
                    {result.listing.metadata?.properties && (
                      <div>
                        <strong>Properties:</strong>{" "}
                        {Object.entries(result.listing.metadata.properties)
                          .slice(0, 3)
                          .map(([key, value]) => `${key}: ${value}`)
                          .join(", ")}
                        ...
                      </div>
                    )}

                    {/* View NFT Link for unique listings */}
                    <ViewNFTLink
                      href={`#/collection/${result.listing.collection}/token/${
                        result.nftId.split("-")[1]
                      }`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                      View NFT
                    </ViewNFTLink>
                  </>
                )}
              </ResultDetails>
            </ResultCard>
          ))}
        </ResultsSection>
      )}
    </Container>
  );
};

export default NFTDupListingDetector;
