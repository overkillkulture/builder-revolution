// Document-oriented allowlist for room files. The existing `isValidFileType` only
// allows image/video (and BLOCKS PDFs) — it is the wrong gate for a document library.
const VALID_ROOM_FILE_TYPES = [
  'pdf',
  'doc',
  'docx',
  'txt',
  'md',
  'csv',
  'xls',
  'xlsx',
  'ppt',
  'pptx',
  'json',
  'zip',
  'jpg',
  'jpeg',
  'png',
  'gif',
  'webp',
];

// Max upload size for a room file (25 MB).
export const MAX_ROOM_FILE_BYTES = 25 * 1024 * 1024;

// Map a filename extension to a normalized type token.
export const extOf = (fileName: string) => fileName.split('.').pop()?.toLowerCase() ?? '';

export const isValidRoomFileType = (fileName: string) =>
  VALID_ROOM_FILE_TYPES.includes(extOf(fileName));
