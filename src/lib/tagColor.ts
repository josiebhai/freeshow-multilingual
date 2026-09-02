/**
 * Deterministic color assignment for language-code tags.
 *
 * Not reverse-engineered from FreeShow (which lets users pick arbitrary tag
 * colors) — a small curated palette, hashed by code so the same code always
 * gets the same color across boxes, the output preview, and reloads.
 */

export const TAG_PALETTE = ["blue", "amber", "violet", "green", "pink", "cyan", "olive"] as const;
export type TagColorName = (typeof TAG_PALETTE)[number];

const DEFAULT_COLOR: TagColorName = "blue";

/** Simple string hash (djb2), stable across sessions since it's pure arithmetic. */
function hashString(value: string): number {
  let hash = 5381;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 33) ^ value.charCodeAt(i);
  }
  return hash >>> 0;
}

/** Maps a language code to one of the fixed palette colors. Empty/blank codes fall back to a neutral default. */
export function tagColorFor(code: string | undefined): TagColorName {
  const normalized = code?.trim().toLowerCase();
  if (!normalized) return DEFAULT_COLOR;
  return TAG_PALETTE[hashString(normalized) % TAG_PALETTE.length];
}
