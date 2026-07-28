export interface CommunityBrandConfig {
  bg: string;
  panel: string;
  line: string;
  text: string;
  accent: string;
  accent2: string;
  alert: string;
  categories: string[];
}

export interface CommunityInfo {
  id: number;
  slug: string;
  name: string;
  brandConfig: CommunityBrandConfig | null;
}
