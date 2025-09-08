import React from 'react';
import { useWallet } from '@txnlab/use-wallet-react';
import VoiPurchaseWidget from './index';

/**
 * Example showing how to integrate VoiPurchaseWidget into existing pages
 * This replaces the inline implementation in Auction page
 */
const AuctionPageIntegration: React.FC = () => {
  const { activeAccount } = useWallet();

  return (
    <div>
      {/* Replace the existing VOI purchase section with this single component */}
      <VoiPurchaseWidget 
        walletAddress={activeAccount?.address}
        title="Need VOI?"
        subtitle="Purchase VOI tokens to participate in auctions"
        clickText="Click to open purchase widget"
      />
    </div>
  );
};

export default AuctionPageIntegration;
