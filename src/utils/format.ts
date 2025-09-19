export const formatAmount = (amount: number): string => {
  return (amount / 1_000_000).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 6,
  });
};
