import { CONTRACT, abi } from "ulujs";
import algosdk from "algosdk";
import { getAlgorandClients } from "@/wallets";
import { offerABI } from "@/components/Tools/OffersManager";

// Interface for event fetching results
export interface EventFetchResult {
  success: boolean;
  events: any[];
  totalEvents: number;
  blockRange: { minRound: number; maxRound: number };
  batchesProcessed: number;
  contractId: number;
  error?: string;
}

// Interface for specific event fetching results
export interface SpecificEventFetchResult {
  success: boolean;
  events: Record<string, any[]>;
  summary: {
    totalEvents: number;
    eventsByType: Record<string, number>;
    blockRange: { minRound: number; maxRound: number };
    batchesProcessed: number;
    contractId: number;
  };
  error?: string;
}

// Interface for progress tracking
export interface ProgressInfo {
  current: number;
  total: number;
  batch: number;
  percentage: number;
}

// Function to create contract instance
export const makeContract = (
  contractId: number,
  address: string,
  algodClient: any,
  indexerClient: any
) =>
  new CONTRACT(contractId, algodClient, indexerClient, offerABI, {
    addr: address,
    sk: new Uint8Array(0),
  });

// Main function to fetch events from the last 2M blocks
export const fetchEventsFromLast2MBlocks = async (
  contractId: number = 8329112,
  address?: string,
  eventTypes?: string[],
  batchSize: number = 100000, // Process in batches to avoid memory issues
  progressCallback?: (progress: ProgressInfo) => void
): Promise<EventFetchResult> => {
  try {
    const { algodClient, indexerClient } = getAlgorandClients();
    
    // Get current block height
    const status = await algodClient.status().do();
    const lastRound = status["last-round"];
    const minRound = Math.max(lastRound - 2e6, 0);
    const totalBlocks = lastRound - minRound;
    
    console.log(`Fetching events from block ${minRound} to ${lastRound} (${totalBlocks} blocks)`);
    
    // Create contract instance
    const ci = makeContract(
      contractId,
      address || algosdk.getApplicationAddress(contractId),
      algodClient,
      indexerClient
    );
    
    const allEvents: any[] = [];
    let currentMinRound = minRound;
    let totalEvents = 0;
    let batchCount = 0;
    
    // Process in batches to handle large data sets
    while (currentMinRound < lastRound) {
      const currentMaxRound = Math.min(currentMinRound + batchSize, lastRound);
      batchCount++;
      
      const progress: ProgressInfo = {
        current: currentMinRound - minRound,
        total: totalBlocks,
        batch: batchCount,
        percentage: Math.round(((currentMinRound - minRound) / totalBlocks) * 100)
      };
      
      if (progressCallback) {
        progressCallback(progress);
      }
      
      console.log(`Processing batch ${batchCount}: blocks ${currentMinRound} to ${currentMaxRound} (${progress.percentage}%)`);
      
      try {
        const batchEvents = await ci.getEvents({
          minRound: currentMinRound,
          maxRound: currentMaxRound,
        });
        
        // Filter by event types if specified
        const filteredEvents = eventTypes 
          ? batchEvents.filter((event: any) => eventTypes.includes(event.name))
          : batchEvents;
        
        allEvents.push(...filteredEvents);
        totalEvents += filteredEvents.length;
        
        console.log(`Batch ${batchCount} completed: ${filteredEvents.length} events found`);
        
        // Add small delay to avoid overwhelming the indexer
        if (currentMaxRound < lastRound) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
      } catch (batchError) {
        console.warn(`Error in batch ${batchCount}:`, batchError);
        // Continue with next batch instead of failing completely
      }
      
      currentMinRound = currentMaxRound + 1;
    }
    
    console.log(`Event fetching completed: ${totalEvents} total events found across ${batchCount} batches`);
    
    return {
      success: true,
      events: allEvents,
      totalEvents,
      blockRange: { minRound, maxRound: lastRound },
      batchesProcessed: batchCount,
      contractId,
    };
    
  } catch (error) {
    console.error("Error fetching events from last 2M blocks:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      events: [],
      totalEvents: 0,
      blockRange: { minRound: 0, maxRound: 0 },
      batchesProcessed: 0,
      contractId,
    };
  }
};

// Enhanced function to fetch specific event types with detailed processing
export const fetchSpecificEventsFromLast2MBlocks = async (
  contractId: number = 8329112,
  address?: string,
  eventTypeMap: Record<string, (event: any) => any> = {},
  options: {
    batchSize?: number;
    includeMetadata?: boolean;
    progressCallback?: (progress: ProgressInfo) => void;
  } = {}
): Promise<SpecificEventFetchResult> => {
  const { batchSize = 100000, includeMetadata = false, progressCallback } = options;
  
  try {
    const { algodClient, indexerClient } = getAlgorandClients();
    
    const status = await algodClient.status().do();
    const lastRound = status["last-round"];
    const minRound = Math.max(lastRound - 2e6, 0);
    const totalBlocks = lastRound - minRound;
    
    console.log(`Fetching specific events from ${totalBlocks} blocks (${minRound} to ${lastRound})`);
    
    const ci = makeContract(
      contractId,
      address || algosdk.getApplicationAddress(contractId),
      algodClient,
      indexerClient
    );
    
    const processedEvents: Record<string, any[]> = {};
    const eventTypes = Object.keys(eventTypeMap);
    
    // Initialize result arrays for each event type
    eventTypes.forEach(eventType => {
      processedEvents[eventType] = [];
    });
    
    let currentMinRound = minRound;
    let batchCount = 0;
    let totalEventsFound = 0;
    
    while (currentMinRound < lastRound) {
      const currentMaxRound = Math.min(currentMinRound + batchSize, lastRound);
      batchCount++;
      
      const progress: ProgressInfo = {
        current: currentMinRound - minRound,
        total: totalBlocks,
        batch: batchCount,
        percentage: Math.round(((currentMinRound - minRound) / totalBlocks) * 100)
      };
      
      if (progressCallback) {
        progressCallback(progress);
      }
      
      try {
        const batchEvents = await ci.getEvents({
          minRound: currentMinRound,
          maxRound: currentMaxRound,
        });
        
        // Process each event type
        eventTypes.forEach(eventType => {
          const eventsOfType = batchEvents.find((event: any) => event.name === eventType)?.events || [];
          const processedEventsOfType = eventsOfType.map(eventTypeMap[eventType]);
          processedEvents[eventType].push(...processedEventsOfType);
          totalEventsFound += processedEventsOfType.length;
        });
        
        console.log(`Batch ${batchCount}: Found ${batchEvents.length} event groups`);
        
        // Rate limiting
        if (currentMaxRound < lastRound) {
          await new Promise(resolve => setTimeout(resolve, 50));
        }
        
      } catch (batchError) {
        console.warn(`Error processing batch ${batchCount}:`, batchError);
      }
      
      currentMinRound = currentMaxRound + 1;
    }
    
    // Add metadata if requested
    if (includeMetadata) {
      console.log("Adding metadata to events...");
      // This would involve fetching additional data for each event
      // Implementation depends on specific requirements
    }
    
    console.log(`Completed: ${totalEventsFound} events processed across ${batchCount} batches`);
    
    return {
      success: true,
      events: processedEvents,
      summary: {
        totalEvents: totalEventsFound,
        eventsByType: Object.fromEntries(
          Object.entries(processedEvents).map(([type, events]) => [type, events.length])
        ),
        blockRange: { minRound, maxRound: lastRound },
        batchesProcessed: batchCount,
        contractId,
      }
    };
    
  } catch (error) {
    console.error("Error in fetchSpecificEventsFromLast2MBlocks:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      events: {},
      summary: {
        totalEvents: 0,
        eventsByType: {},
        blockRange: { minRound: 0, maxRound: 0 },
        batchesProcessed: 0,
        contractId,
      }
    };
  }
};

// Utility function to get current block height
export const getCurrentBlockHeight = async (): Promise<number> => {
  try {
    const { algodClient } = getAlgorandClients();
    const status = await algodClient.status().do();
    return status["last-round"];
  } catch (error) {
    console.error("Error getting current block height:", error);
    throw error;
  }
};

// Utility function to calculate block range for 2M blocks
export const calculate2MBlockRange = async (): Promise<{ minRound: number; maxRound: number }> => {
  try {
    const currentHeight = await getCurrentBlockHeight();
    const minRound = Math.max(currentHeight - 2e6, 0);
    return { minRound, maxRound: currentHeight };
  } catch (error) {
    console.error("Error calculating 2M block range:", error);
    throw error;
  }
};

// Predefined event processors for common marketplace events
export const marketplaceEventProcessors = {
  // Process listing events
  e_offer_ListEvent: (event: any[]) => ({
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
  
  // Process accept events
  e_offer_AcceptEvent: (event: any[]) => ({
    transactionId: event[0],
    createRound: Number(event[1]),
    createTimestamp: Number(event[2]),
    listingId: Number(event[3]),
    accepter: event[4],
  }),
  
  // Process delete events
  e_offer_DeleteListingEvent: (event: any[]) => ({
    transactionId: event[0],
    createRound: Number(event[1]),
    createTimestamp: Number(event[2]),
    listingId: Number(event[3]),
  }),
};

// Convenience function to fetch marketplace events
export const fetchMarketplaceEventsFromLast2MBlocks = async (
  address?: string,
  progressCallback?: (progress: ProgressInfo) => void
): Promise<SpecificEventFetchResult> => {
  return fetchSpecificEventsFromLast2MBlocks(
    8329112, // Marketplace contract ID
    address,
    marketplaceEventProcessors,
    {
      batchSize: 100000,
      includeMetadata: false,
      progressCallback,
    }
  );
};
