// Example usage of the Event Fetcher utility
import {
  fetchEventsFromLast2MBlocks,
  fetchSpecificEventsFromLast2MBlocks,
  fetchMarketplaceEventsFromLast2MBlocks,
  calculate2MBlockRange,
  marketplaceEventProcessors,
  ProgressInfo,
} from "@/utils/eventFetcher";

// Example 1: Fetch all events from marketplace contract
export const exampleFetchAllMarketplaceEvents = async () => {
  console.log("=== Example 1: Fetch All Marketplace Events ===");
  
  const progressCallback = (progress: ProgressInfo) => {
    console.log(`Progress: ${progress.percentage}% (Batch ${progress.batch})`);
  };

  try {
    const result = await fetchMarketplaceEventsFromLast2MBlocks(
      undefined, // Use contract address
      progressCallback
    );

    if (result.success) {
      console.log("✅ Success!");
      console.log(`Total events: ${result.summary.totalEvents}`);
      console.log(`Events by type:`, result.summary.eventsByType);
      console.log(`Block range: ${result.summary.blockRange.minRound} to ${result.summary.blockRange.maxRound}`);
      
      // Access specific event types
      const listings = result.events["e_offer_ListEvent"] || [];
      const accepts = result.events["e_offer_AcceptEvent"] || [];
      const deletions = result.events["e_offer_DeleteListingEvent"] || [];
      
      console.log(`Found ${listings.length} listings, ${accepts.length} accepts, ${deletions.length} deletions`);
      
      // Example: Show first few listings
      if (listings.length > 0) {
        console.log("First few listings:");
        listings.slice(0, 3).forEach((listing, index) => {
          console.log(`  ${index + 1}. Contract: ${listing.contractId}, Token: ${listing.tokenId}, Price: ${listing.price}`);
        });
      }
    } else {
      console.error("❌ Failed:", result.error);
    }
  } catch (error) {
    console.error("❌ Error:", error);
  }
};

// Example 2: Get block range information
export const exampleGetBlockRange = async () => {
  console.log("=== Example 2: Get Block Range ===");
  
  try {
    const range = await calculate2MBlockRange();
    console.log(`Current block height: ${range.maxRound}`);
    console.log(`2M blocks ago: ${range.minRound}`);
    console.log(`Total blocks to process: ${range.maxRound - range.minRound}`);
    console.log(`Estimated time span: ${((range.maxRound - range.minRound) * 4.5 / 60 / 60 / 24).toFixed(1)} days`);
  } catch (error) {
    console.error("❌ Error:", error);
  }
};

// Run examples
export const runAllExamples = async () => {
  console.log("🚀 Starting Event Fetcher Examples...\n");
  
  try {
    await exampleGetBlockRange();
    console.log("\n");
    
    await exampleFetchAllMarketplaceEvents();
    console.log("\n");
    
    console.log("✅ All examples completed!");
  } catch (error) {
    console.error("❌ Error running examples:", error);
  }
};

export default {
  exampleFetchAllMarketplaceEvents,
  exampleGetBlockRange,
  runAllExamples,
};
