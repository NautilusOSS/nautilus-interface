import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import algosdk from "algosdk";
import crypto from "crypto";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const formatAmount = (
  amount: string | number,
  decimals: number = 6
): string => {
  const value = typeof amount === "string" ? parseFloat(amount) : amount;
  const formatted = (value / Math.pow(10, decimals)).toFixed(decimals);
  return formatted.replace(/\.?0+$/, ""); // Remove trailing zeros
};

export async function sha256(data: Uint8Array): Promise<Uint8Array> {
  const hashBuffer = await window.crypto.subtle.digest("SHA-256", data);
  return new Uint8Array(hashBuffer);
}

export function uint8ArrayToBigInt(uint8Array: Uint8Array) {
  let result = BigInt(0); // Initialize the BigInt result
  for (let i = 0; i < uint8Array.length; i++) {
    result = (result << BigInt(8)) + BigInt(uint8Array[i]); // Shift 8 bits and add the current byte
  }
  return result;
}

export function isAlgorandAddress(address: string): boolean {
  // Check if the address length is correct
  if (address.length !== 58) {
    return false;
  }

  // Check if the address uses valid Base32 characters
  const base32Regex = /^[A-Z2-7]+$/;
  if (!base32Regex.test(address)) {
    return false;
  }

  return true;
}

export function bigIntToUint8Array(bigInt: bigint, prefix?: Uint8Array) {
  const uint8Array = new Uint8Array(32);
  let tempBigInt = bigInt;
  // Find the highest non-zero byte
  for (let i = 31; i >= 0; i--) {
    uint8Array[i] = Number(tempBigInt & BigInt(0xff));
    tempBigInt >>= BigInt(8);
  }

  if (prefix) {
    const combined = new Uint8Array(prefix.length + uint8Array.length);
    combined.set(prefix);
    combined.set(uint8Array, prefix.length);
    return combined;
  }

  return uint8Array;
}

export async function namehash(name: string): Promise<Uint8Array> {
  if (!name) {
    return new Uint8Array(32); // Return 32 bytes of zeros for empty name
  }

  // Split the name into labels and reverse them
  const labels = name.split(".").reverse();

  // Start with empty hash (32 bytes of zeros)
  let node = new Uint8Array(32);

  // Hash each label
  for (const label of labels) {
    if (label) {
      // Skip empty labels
      // Hash the label
      const labelBytes = new TextEncoder().encode(label);
      const isNumber = !isNaN(Number(label));
      const labelHash = !isAlgorandAddress(label)
        ? !isNumber
          ? await sha256(labelBytes)
          : await sha256(bigIntToUint8Array(BigInt(label)))
        : await sha256(algosdk.decodeAddress(label).publicKey);

      // Concatenate current node hash with label hash and hash again
      const combined = new Uint8Array(labelHash.length + node.length);
      combined.set(node);
      combined.set(labelHash, node.length);
      node = await sha256(combined);
    }
  }

  return node;
}
