/**
 * Pure conversion logic: FreeShow multi-language lyrics.
 *
 * Kept dependency-free and UI-free on purpose (see build spec §5) so it can
 * be unit tested in isolation and, eventually, lifted into FreeShow itself.
 */

export interface LanguageBox {
  /** Free-text label, UI only (e.g. "Tamil"). */
  label: string;
  /** Optional ISO 639-1-style code (e.g. "ta"). Emitted as `[#N:code]`. */
  code?: string;
  /** Raw pasted lyrics; stanzas separated by one or more blank lines. */
  text: string;
}

export interface SongMetadata {
  title?: string;
  author?: string;
  ccli?: string;
  copyright?: string;
}

export interface ConvertOptions {
  metadata?: SongMetadata;
  /** Optional per-slide group label (e.g. "Verse"), indexed by slide index. */
  groupLabels?: (string | undefined)[];
}

export interface StanzaCount {
  label: string;
  count: number;
}

export interface ConvertResult {
  output: string;
  warnings: string[];
  stanzaCounts: StanzaCount[];
  /** First slide index (0-based) missing a stanza in at least one box, or null if aligned. */
  firstMismatchIndex: number | null;
}

/** Split a box's raw text into stanzas: groups of non-blank lines separated by blank-line runs. */
export function parseStanzas(text: string): string[][] {
  const normalized = text.replace(/\r\n?/g, "\n");
  const lines = normalized.split("\n").map((line) => line.replace(/\s+$/, ""));

  const stanzas: string[][] = [];
  let current: string[] = [];
  for (const line of lines) {
    if (line.trim() === "") {
      if (current.length > 0) {
        stanzas.push(current);
        current = [];
      }
    } else {
      current.push(line);
    }
  }
  if (current.length > 0) {
    stanzas.push(current);
  }
  return stanzas;
}

function metadataLines(metadata: SongMetadata | undefined): string[] {
  if (!metadata) return [];
  const lines: string[] = [];
  const push = (key: string, value: string | undefined) => {
    const trimmed = value?.trim();
    if (trimmed) lines.push(`${key}=${trimmed}`);
  };
  push("Title", metadata.title);
  push("Author", metadata.author);
  push("CCLI", metadata.ccli);
  push("Copyright", metadata.copyright);
  return lines;
}

export function convert(boxes: LanguageBox[], options: ConvertOptions = {}): ConvertResult {
  const parsed = boxes.map((box) => ({
    ...box,
    stanzas: parseStanzas(box.text),
  }));

  const stanzaCounts: StanzaCount[] = parsed.map((box) => ({
    label: box.label,
    count: box.stanzas.length,
  }));

  const maxStanzas = stanzaCounts.reduce((max, c) => Math.max(max, c.count), 0);
  const minStanzas = stanzaCounts.reduce((min, c) => Math.min(min, c.count), maxStanzas);

  const warnings: string[] = [];
  let firstMismatchIndex: number | null = null;

  if (maxStanzas > 0 && stanzaCounts.some((c) => c.count !== maxStanzas)) {
    firstMismatchIndex = minStanzas;
    const detail = stanzaCounts.map((c) => `${c.label}: ${c.count} stanza${c.count === 1 ? "" : "s"}`).join(", ");
    warnings.push(`Stanza count mismatch — ${detail}. Check stanza ${minStanzas + 1} onward.`);
  }

  const metaLines = metadataLines(options.metadata);
  const groupLabels = options.groupLabels ?? [];

  const slides: string[] = [];
  for (let i = 0; i < maxStanzas; i++) {
    const slideLines: string[] = [];
    const group = groupLabels[i]?.trim();
    if (group) {
      slideLines.push(`[${group}]`);
    }
    parsed.forEach((box, boxIndex) => {
      const marker = box.code?.trim() ? `[#${boxIndex + 1}:${box.code.trim()}]` : `[#${boxIndex + 1}]`;
      slideLines.push(marker);
      const stanza = box.stanzas[i] ?? [];
      slideLines.push(...stanza);
    });
    slides.push(slideLines.join("\n"));
  }

  let output = "";
  if (metaLines.length > 0 && slides.length > 0) {
    output = `${metaLines.join("\n")}\n\n${slides.join("\n\n")}`;
  } else if (metaLines.length > 0) {
    output = metaLines.join("\n");
  } else {
    output = slides.join("\n\n");
  }

  return { output, warnings, stanzaCounts, firstMismatchIndex };
}
