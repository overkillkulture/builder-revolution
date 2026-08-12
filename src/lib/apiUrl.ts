/**
 * Prepend the Next.js basePath to API routes for client-side fetch() calls.
 * Next.js auto-prefixes <Link> and router.push() but NOT raw fetch().
 * This ensures /api/* calls work whether basePath is '/hq' or '/'.
 */

// A base path is only valid if it starts with '/'. Anything else ('none', garbage)
// becomes a RELATIVE url and 404s every API call from nested routes like /community/[slug].
const raw = process.env.NEXT_PUBLIC_BASE_PATH || '';
const basePath = raw.startsWith('/') ? raw.replace(/\/+$/, '') : '';

export function apiUrl(path: string): string {
  // Already has basePath prefix — don't double-prefix
  if (basePath && path.startsWith(basePath)) return path;
  return `${basePath}${path}`;
}
