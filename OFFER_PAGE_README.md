# Offer Detail Page

A new page has been added to the application that allows direct linking to offers using a transaction ID.

## Features

- **Direct Linking**: Access offers directly via URL with transaction ID parameter
- **Comprehensive Offer Display**: Shows all offer details including price, timestamps, and status
- **Token Information**: Displays associated NFT metadata and images
- **Navigation**: Easy navigation to related collection and token pages
- **Responsive Design**: Works on both desktop and mobile devices
- **Dark/Light Theme Support**: Respects the user's theme preference

## Usage

### URL Format
```
/offer/:txid
```

Where `:txid` is either:
- The transaction ID of the offer
- The marketplace listing ID (mpListingId) as a fallback

### Examples
```
/offer/ABCD1234EFGH5678...  (transaction ID)
/offer/12345                 (marketplace listing ID)
```

### Features Displayed

1. **Offer Status**: Active/Expired status with color coding
2. **Price Information**: Formatted price with currency (VOI/other)
3. **Participant Details**: Offerer address (truncated for display)
4. **Token Information**: Collection ID, Token ID
5. **Timestamps**: Creation and expiration dates
6. **Token Metadata**: NFT name, image, and description (if available)

### Navigation Options

- **View Token**: Navigate to the specific token page
- **View Collection**: Navigate to the collection page
- **All Offers**: Navigate to the general offers listing page

## Implementation Details

### API Integration
The page uses the following endpoints:
- `${ARC72_INDEXER_API}/nft-indexer/v1/mp/offers` - For fetching offer data
- `${NFT_NAVIGATOR_API}/nft-indexer/v1/tokens` - For fetching token metadata

### Offer Lookup Strategy
1. First attempts to find offer by transaction ID
2. Falls back to marketplace listing ID if transaction ID not found
3. Displays appropriate error message if offer cannot be found

### Error Handling
- Loading states with spinner
- Error messages for missing offers
- Graceful fallback for missing token metadata
- Image error handling for broken NFT images

## Technical Implementation

### Route Configuration
Added to `src/App.tsx`:
```jsx
<Route path="/offer/:txid" element={<OfferDetail />} />
```

### Component Location
- Main component: `src/pages/OfferDetail/index.tsx`
- Exported from: `src/pages/index.tsx`

### Dependencies
- React Router for URL parameters
- Material-UI for UI components
- Styled Components for custom styling
- Axios for API calls
- Redux for theme state management

## Future Enhancements

Potential improvements that could be added:
1. **Direct Transaction Lookup**: Enhanced API support for direct transaction ID queries
2. **Offer Actions**: Allow users to accept/cancel offers directly from the page
3. **Related Offers**: Show other offers for the same token/collection
4. **Share Functionality**: Easy sharing of offer links
5. **Price History**: Historical price data for the token
6. **Offer Notifications**: Alert system for offer status changes

## Testing

To test the new page:
1. Start the development server: `npm run dev`
2. Navigate to `/offer/[some-offer-id]` in your browser
3. Verify that offer details are displayed correctly
4. Test with both valid and invalid offer IDs
5. Test navigation to related pages

The page handles various edge cases including missing offers, invalid transaction IDs, and missing token metadata.
