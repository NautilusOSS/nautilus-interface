import { useState } from "react";

interface UseNSFWReturn {
  isNSFW: (nftId: any) => boolean;
}

/**
 * NSFW collection blacklist
 */
export const NSFW_BLACKLIST = [
  8384545, // Virtual Babes Voi Season 1
] as const;

export type NSFWBlacklist = (typeof NSFW_BLACKLIST)[number];

/**
 * A custom hook for managing NSFW content visibility
 * @param initialState - Optional initial visibility state (default: false)
 * @returns Object containing NSFW visibility state and control functions
 */
const useNSFW = (): UseNSFWReturn => {
  return {
    isNSFW: (nftId: any) => NSFW_BLACKLIST.includes(nftId),
  };
};

export default useNSFW;
