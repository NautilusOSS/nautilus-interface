export function stringToColorCode(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }

  const color = Math.floor(
    Math.abs(((Math.sin(hash) * 10000) % 1) * 16777216)
  ).toString(16);

  return "#" + Array(6 - color.length + 1).join("0") + color;
}

export function intToColorCode(n: number): string {
  // Ensure n is within the range of valid colors (0-16777215)
  n = (n * n) % 16777216; // 16777216 is 2^24, the number of possible color codes

  // Convert integer to hex and format it as a color code
  let hexColor = n.toString(16).padStart(6, "0");

  return `#${hexColor}`;
}

export const stripTrailingZeroBytes = (str: string) => {
  const index = str.indexOf("\x00");
  if (index >= 0) {
    return str.slice(0, str.indexOf("\x00"));
  } else {
    return str;
  }
};

export function stringToUint8Array(str: string, length: number): Uint8Array {
  const bytes = new Uint8Array(length);
  bytes.set(new Uint8Array(Buffer.from(str, "utf8")), 0);
  return bytes;
}

export const shortenAddress = (address: string): string => {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};
