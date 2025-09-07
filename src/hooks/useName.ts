import { useEffect, useState, useCallback } from "react";
import { getAlgorandClients } from "@/wallets";
import { CONTRACT } from "ulujs";
import { stringToUint8Array, stripTrailingZeroBytes } from "@/utils/string";
import { namehash } from "@/utils/namehash";

const resolverSpec = {
  name: "vns public resolver",
  description: "vns public resolver",
  methods: [
    // name(byte[32])byte[256]
    {
      name: "name",
      description: "get name from resolver",
      args: [
        {
          type: "byte[32]",
        },
      ],
      returns: {
        type: "byte[256]",
      },
    },
    // text(byte[32],byte[22])byte[256]
    {
      name: "text",
      description: "get text from resolver",
      args: [
        {
          type: "byte[32]",
        },
        {
          type: "byte[22]",
        },
      ],
      returns: {
        type: "byte[256]",
      },
    },
  ],
  events: [],
};

const nameInfoCache: Record<string, string> = {};

const nameAvatarCache: Record<string, string> = {};

const nameTextCache: Record<string, string> = {};

const fetchCollectionName = async (id: string) => {
  const name = `${id}.collection.reverse`;
  console.log("fetching collection name for", name);
  const node = await namehash(name);
  console.log({
    name,
    node,
  });
  const { algodClient } = getAlgorandClients();
  const ci = new CONTRACT(797608, algodClient, undefined, resolverSpec, {
    addr: "G3MSA75OZEJTCCENOJDLDJK7UD7E2K5DNC7FVHCNOV7E3I4DTXTOWDUIFQ",
    sk: new Uint8Array(),
  });
  const nameR = await ci.name(node);
  if (nameR.success) {
    return stripTrailingZeroBytes(nameR.returnValue);
  }
  return "";
};

const fetchName = async (address: string) => {
  try {
    const cacheKey = address;
    if (nameInfoCache[cacheKey]) {
      return nameInfoCache[cacheKey];
    }
    console.log("fetching name for", address);
    let name = address?.slice(0, 4) + "..." + address?.slice(-4);
    const { algodClient } = getAlgorandClients();
    const ci = new CONTRACT(797608, algodClient, undefined, resolverSpec, {
      addr: address,
      sk: new Uint8Array(),
    });
    const node = await namehash(`${address}.addr.reverse`);
    const nameR = await ci.name(node);
    console.log("nameR", nameR);
    if (nameR.success) {
      const nameStr = stripTrailingZeroBytes(nameR.returnValue);
      if (nameStr.length > 0 && nameStr.length <= 256) {
        name = nameStr;
      }
    }
    console.log("name for", address, "is", name);
    
    // ✅ CACHE THE RESULT
    nameInfoCache[cacheKey] = name;
    return name;
  } catch (error) {
    console.error(error);
    const fallbackName = address?.slice(0, 4) + "..." + address?.slice(-4);
    
    // ✅ CACHE THE FALLBACK RESULT TOO
    nameInfoCache[address] = fallbackName;
    return fallbackName;
  }
};

const fetchAvatar = async (address: string, name: string) => {
  const cacheKey = `${address}-${name}`;
  if (nameAvatarCache[cacheKey]) {
    return nameAvatarCache[cacheKey];
  }
  const { algodClient } = getAlgorandClients();
  const ci = new CONTRACT(797608, algodClient, undefined, resolverSpec, {
    addr: address,
    sk: new Uint8Array(),
  });
  console.log("name", name);
  const node = await namehash(name);
  const avatarR = await ci.text(node, stringToUint8Array("avatar", 22));
  console.log("avatarR", avatarR);
  if (avatarR.success) {
    const avatar = stripTrailingZeroBytes(avatarR.returnValue);
    nameAvatarCache[cacheKey] = avatar;
    return avatar;
  }
  return "";
};

const fetchText = async (name: string, key: string) => {
  const cacheKey = `$${name}-${key}`;
  if (nameTextCache[cacheKey]) {
    return nameTextCache[cacheKey];
  }
  const { algodClient } = getAlgorandClients();
  const ci = new CONTRACT(797608, algodClient, undefined, resolverSpec, {
    addr: "G3MSA75OZEJTCCENOJDLDJK7UD7E2K5DNC7FVHCNOV7E3I4DTXTOWDUIFQ",
    sk: new Uint8Array(),
  });
  const node = await namehash(name);
  const textR = await ci.text(node, stringToUint8Array(key, 22));
  if (textR.success) {
    const text = stripTrailingZeroBytes(textR.returnValue);
    nameTextCache[cacheKey] = text;
    return text;
  }
  return "";
};

export const useName = (address?: string) => {
  const [name, setName] = useState<string>("");
  const [avatar, setAvatar] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    if (!address) return;
    fetchName(address).then((name: string) => {
      setName(name);
      fetchAvatar(address, name).then((avatar: string) => {
        console.log("avatar for", address, "is", avatar);
        setAvatar(avatar);
        setLoading(false);
      });
    });
  }, [address]);

  const memoizedFetchName = useCallback(fetchName, []);
  const memoizedFetchCollectionName = useCallback(fetchCollectionName, []);
  const memoizedFetchText = useCallback(fetchText, []);

  return {
    name,
    avatar,
    loading,
    error,
    fetchName: memoizedFetchName,
    fetchCollectionName: memoizedFetchCollectionName,
    fetchText: memoizedFetchText,
  };
};
