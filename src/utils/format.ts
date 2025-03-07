export const formatAmount = (amount: number): string => {
  return (amount / 1_000_000).toLocaleString(undefined, {
    minimumFractionDigits: 6,
    maximumFractionDigits: 6
  });
}; 