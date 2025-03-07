import algosdk from "algosdk";
import CryptoJS from "crypto-js";

// declare global {
//   interface Window {
//     crypto: Crypto;
//   }
// }

async function sha256(data: Uint8Array): Promise<Uint8Array> {
  // Convert input Uint8Array to WordArray that CryptoJS can understand
  const wordArray = CryptoJS.lib.WordArray.create(data);
  // Calculate hash
  const hash = CryptoJS.SHA256(wordArray);
  // Convert hash to hex string
  const hashHex = hash.toString(CryptoJS.enc.Hex);
  // Convert hex string to Uint8Array
  const hashBytes = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    hashBytes[i] = parseInt(hashHex.substr(i * 2, 2), 16);
  }
  return hashBytes;
}

export function bigIntToUint8Array(bigInt: bigint) {
  const uint8Array = new Uint8Array(32);
  let tempBigInt = bigInt;
  // Find the highest non-zero byte
  for (let i = 31; i >= 0; i--) {
    uint8Array[i] = Number(tempBigInt & BigInt(0xff));
    tempBigInt >>= BigInt(8);
  }
  return uint8Array;
}

export function uint8ArrayToBigInt(uint8Array: Uint8Array) {
  let result = BigInt(0); // Initialize the BigInt result
  for (let i = 0; i < uint8Array.length; i++) {
    result = (result << BigInt(8)) + BigInt(uint8Array[i]); // Shift 8 bits and add the current byte
  }
  return result;
}

function isAlgorandAddress(address: string): boolean {
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
      // const labelHash = !isAlgorandAddress(label)
      //   ? await sha256(labelBytes)
      //   : await sha256(algosdk.decodeAddress(label).publicKey);
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

export function stringToUint8Array(str: string, length = 256): Uint8Array {
  const bytes = new Uint8Array(length);
  const encoded = new TextEncoder().encode(str);
  bytes.set(encoded, 0);
  return bytes;
}

export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function bytesToBase64(bytes: Uint8Array): string {
  return window.btoa(String.fromCharCode.apply(null, Array.from(bytes)));
}
