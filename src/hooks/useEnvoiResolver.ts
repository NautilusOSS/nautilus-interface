import envoiSDK from "@xarmian/envoi-sdk";
import { create } from "zustand";

// Initialize with Mainnet Algod node configuration
const resolver = envoiSDK.init({
  token: "",
  url: "https://mainnet-api.voi.nodely.dev",
  port: 443,
});

interface ProfileState {
  activeProfile: any;
  setActiveProfile: (profile: any) => void;
}

const useProfileStore = create<ProfileState>((set) => ({
  activeProfile: null,
  setActiveProfile: (profile) => set({ activeProfile: profile }),
}));

export const useEnvoiResolver = () => {
  const { activeProfile, setActiveProfile } = useProfileStore();

  const getProfileFromName = async (name: string) => {
    try {
      const profileResponse = await resolver.http.search(name);
      return profileResponse[0];
    } catch (error) {
      console.error("Error fetching profile:", error);
      return null;
    }
  };

  const getProfileFromAddress = async (address: string) => {
    try {
      const nameResponse = await resolver.http.getNameFromAddress(address);
      const profileResponse = await resolver.http.search(nameResponse);
      return profileResponse[0];
    } catch (error) {
      console.error("Error fetching profile:", error);
      return null;
    }
  };

  return {
    resolver,
    activeProfile,
    getProfileFromAddress,
    getProfileFromName,
    setActiveProfile,
  };
};
