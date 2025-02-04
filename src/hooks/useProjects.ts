import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

interface Project {
  applicationID: number;
  coverImageURL: string;
  description: string;
  earlyAccessDateTime: string;
  indexerState: {
    state: {
      launchPaused: number;
      launchStart: number;
      maxSupply: number;
      nextMintID: number;
      totalMinted: number;
      wlLaunchStart: number;
    }
  };
  lastNFTSoldAt: string;
  mintTotal: number;
  nsfw: boolean;
  publicLaunchDateTime: string;
  title: string;
}

interface ProjectsResponse {
  nftGamesProjects: Project[];
  recentlyCreated: Project[];
  recentlyLaunched: Project[];
  recentlyMinted: Project[];
  trending: Project[];
  upcoming: Project[];
}

const fetchProjects = async (): Promise<ProjectsResponse> => {
  const { data } = await axios.get('https://prod-voi.api.highforge.io/v2/projects');
  return data;
};

export const useProjects = () => {
  return useQuery({
    queryKey: ['projects'],
    queryFn: fetchProjects,
    staleTime: 24 * 60 * 60 * 1000, // 24 hours
    cacheTime: 24 * 60 * 60 * 1000, // 24 hours
  });
}; 