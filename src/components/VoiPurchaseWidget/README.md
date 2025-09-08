# VoiPurchaseWidget Component

A reusable React component that provides a VOI token purchase widget with an attractive banner teaser and integrated iframe widget.

## Features

- **Banner Teaser**: Beautiful animated banner that expands to show the purchase widget
- **Theme Support**: Automatically adapts to light/dark theme
- **Customizable**: Configurable text, dimensions, and wallet address
- **Responsive**: Works well on different screen sizes
- **Styled Components**: Uses styled-components for consistent styling

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `walletAddress` | `string` | `undefined` | Wallet address to receive purchased VOI tokens |
| `title` | `string` | `"Need VOI?"` | Main title text on the banner |
| `subtitle` | `string` | `"Purchase VOI tokens to participate in auctions"` | Subtitle text on the banner |
| `clickText` | `string` | `"Click to open purchase widget"` | Instruction text on the banner |
| `width` | `number` | `480` | Width of the iframe widget |
| `height` | `number` | `600` | Height of the iframe widget |
| `showBanner` | `boolean` | `true` | Whether to show the banner teaser or directly show the widget |
| `className` | `string` | `undefined` | Additional CSS class name |
| `sx` | `object` | `undefined` | Additional Material-UI sx props |

## Usage Examples

### Basic Usage

```tsx
import VoiPurchaseWidget from '@/components/VoiPurchaseWidget';

function MyComponent() {
  return (
    <VoiPurchaseWidget 
      walletAddress="YOUR_WALLET_ADDRESS_HERE"
    />
  );
}
```

### Custom Text and Dimensions

```tsx
<VoiPurchaseWidget 
  walletAddress="YOUR_WALLET_ADDRESS_HERE"
  title="Buy VOI Tokens"
  subtitle="Get VOI to participate in NFT auctions and trading"
  clickText="Click here to purchase"
  width={600}
  height={700}
/>
```

### Direct Widget (No Banner)

```tsx
<VoiPurchaseWidget 
  walletAddress="YOUR_WALLET_ADDRESS_HERE"
  showBanner={false}
  width={400}
  height={500}
/>
```

### With Custom Styling

```tsx
<VoiPurchaseWidget 
  walletAddress="YOUR_WALLET_ADDRESS_HERE"
  className="my-custom-class"
  sx={{ 
    margin: 2,
    maxWidth: '100%'
  }}
/>
```

## Integration with Wallet

The component automatically uses the connected wallet address when available:

```tsx
import { useWallet } from '@txnlab/use-wallet-react';
import VoiPurchaseWidget from '@/components/VoiPurchaseWidget';

function AuctionPage() {
  const { activeAccount } = useWallet();
  
  return (
    <VoiPurchaseWidget 
      walletAddress={activeAccount?.address}
    />
  );
}
```

## Styling

The component uses styled-components and automatically adapts to the app's theme:

- **Light Theme**: Purple gradients with darker text
- **Dark Theme**: Purple gradients with lighter text
- **Hover Effects**: Subtle animations and transforms
- **Responsive**: Adapts to different screen sizes

## Dependencies

- React
- Material-UI (Box, Button)
- styled-components
- Redux (for theme state)

## Notes

- The widget uses the ibuyvoi.com service for VOI token purchases
- The iframe automatically adjusts its theme based on the app's theme setting
- The component handles the toggle between banner and widget states internally
- All text and dimensions are customizable through props
