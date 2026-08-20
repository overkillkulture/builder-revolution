import 'server-only';

/**
 * Hook to easily filter posts, this allows paginated queries with varying directions ('asc' and 'desc')
 * @param url
 */
export function usePostsSorter(url: string) {
  const { searchParams } = new URL(url);
  // Clamp limit: a non-numeric `?limit=abc` was NaN -> `take: NaN` -> Prisma
  // validation error -> unhandled 500 on public GETs; `?limit=1e9` pulled the
  // whole table (DoS). Bound to 1..50 with a safe default (S446).
  const rawLimit = parseInt(searchParams.get('limit') || '5', 10);
  const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(rawLimit, 1), 50) : 5;
  const rawCursor = parseInt(searchParams.get('cursor') || '0', 10);
  const cursor = Number.isFinite(rawCursor) ? rawCursor : 0;
  const sortDirection = (searchParams.get('sort-direction') as 'asc' | 'desc') || 'desc';

  /**
   * This is an alternative approach to Prisma's cursor-based pagination
   * that does not return the expected results when the cursor no longer
   * exists.
   * The issue links:
   * https://github.com/prisma/prisma/issues/3362
   * https://github.com/prisma/prisma/issues/8560
   */
  const filters = cursor
    ? {
        id: {
          ...(sortDirection === 'desc' && {
            lt: cursor,
          }),
          ...(sortDirection === 'asc' && {
            gt: cursor,
          }),
        },
      }
    : undefined;

  const limitAndOrderBy = {
    take: limit,
    orderBy: {
      id: sortDirection,
    },
  };

  return { filters, limitAndOrderBy };
}
