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

// Safe fallback theme. A room whose brandConfig is missing/partial/malformed
// (e.g. Case Builder & Builder Revolution shipped with only {order, tagline})
// used to crash the whole app at `[...brand.categories]`. normalizeBrand()
// guarantees every field is present so the room renders instead of throwing.
export const DEFAULT_BRAND: CommunityBrandConfig = {
  bg: '#0d1117',
  panel: '#161b22',
  line: 'rgba(255,255,255,.12)',
  text: '#e8eef5',
  accent: '#ffc400',
  accent2: '#39d98a',
  alert: '#e23b3b',
  categories: [],
};

// Merge whatever the DB gave us over the safe default. Tolerates null,
// non-objects, and a `categories` value that isn't an array.
export function normalizeBrand(raw: unknown): CommunityBrandConfig {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_BRAND };
  const partial = raw as Partial<CommunityBrandConfig>;
  return {
    bg: partial.bg ?? DEFAULT_BRAND.bg,
    panel: partial.panel ?? DEFAULT_BRAND.panel,
    line: partial.line ?? DEFAULT_BRAND.line,
    text: partial.text ?? DEFAULT_BRAND.text,
    accent: partial.accent ?? DEFAULT_BRAND.accent,
    accent2: partial.accent2 ?? DEFAULT_BRAND.accent2,
    alert: partial.alert ?? DEFAULT_BRAND.alert,
    categories: Array.isArray(partial.categories) ? partial.categories : DEFAULT_BRAND.categories,
  };
}
