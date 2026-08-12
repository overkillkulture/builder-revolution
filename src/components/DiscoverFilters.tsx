'use client';

/**
 * Discover Filters — Builder Revolution Chat
 * Replaces the dating-app gender/status filters with useful builder filters.
 * These are cosmetic for now — will wire to real data when skills are structured.
 */
export function DiscoverFilters() {
  return (
    <div className="mb-6 flex flex-wrap gap-2">
      {[
        'All Builders',
        'Legal / Pro Se',
        'Developers',
        'Pattern Analysts',
        'Investigators',
        'Media / Content',
        'Contractors',
      ].map((label, i) => (
        <button
          key={label}
          className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
            i === 0
              ? 'border-primary/40 bg-primary/10 text-primary'
              : 'border-border/40 text-muted-foreground hover:border-primary/30 hover:text-primary'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
