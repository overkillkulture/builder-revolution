// The three rooms of Main Chat — the "servers" a member switches between
// (Commander S467: "Build Guild, Case Builder and Builder Revolution are
// supposed to be like different whole Discord servers"). ONE list; MenuBar,
// MobileHeader and the /main server rail all render from here.
export interface RoomDef {
  slug: string;
  label: string;
  short: string;
  // accent = the room's paint (rail button, channel highlights, labels)
  accent: string;
  accentSoft: string;
}

export const ROOMS: RoomDef[] = [
  {
    slug: 'build-guild',
    label: 'Build Guild',
    short: 'BG',
    accent: '#39d98a',
    accentSoft: 'rgba(57,217,138,0.18)',
  },
  {
    slug: 'case-builder',
    label: 'Case Builder',
    short: 'CB',
    accent: '#14a0b8',
    accentSoft: 'rgba(20,160,184,0.18)',
  },
  {
    slug: 'builder-revolution',
    label: 'Builder Revolution',
    short: 'BR',
    accent: '#7ac043',
    accentSoft: 'rgba(122,192,67,0.18)',
  },
];

export const DEFAULT_ROOM = ROOMS[0];

export function resolveRoom(slug?: string | null): RoomDef {
  return ROOMS.find((r) => r.slug === slug) || DEFAULT_ROOM;
}
