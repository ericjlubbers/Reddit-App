/** Extracts a plain message string from any thrown value. */
export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

// Named HTML entities commonly seen in news-CMS typographic markup
// (curly quotes, dashes, ellipsis) that XML's 5 predefined entities don't cover.
const NAMED_HTML_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  mdash: '\u2014',
  ndash: '\u2013',
  hellip: '\u2026',
  lsquo: '\u2018',
  rsquo: '\u2019',
  ldquo: '\u201c',
  rdquo: '\u201d',
  copy: '\u00a9',
  reg: '\u00ae',
  trade: '\u2122',
}

/**
 * Decodes HTML entities left over after XML parsing. RSS feeds from CMSes
 * often double-escape typographic punctuation (e.g. `&amp;#8217;`), which XML
 * entity decoding only unwraps one level, leaving literal `&#8217;` text that
 * renders as-is on Reddit instead of an apostrophe.
 */
export function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&#x([0-9a-f]+);/gi, (match, hex) =>
      toCodePoint(match, Number.parseInt(hex, 16)),
    )
    .replace(/&#(\d+);/g, (match, dec) =>
      toCodePoint(match, Number.parseInt(dec, 10)),
    )
    .replace(
      /&([a-z]+);/gi,
      (match, name) => NAMED_HTML_ENTITIES[name.toLowerCase()] ?? match,
    )
}

function toCodePoint(match: string, codePoint: number): string {
  try {
    return String.fromCodePoint(codePoint)
  } catch {
    return match
  }
}

/**
 * Turns a pipeline error into a short, staff-friendly toast message.
 * Known failure modes (e.g. the domain-allowlist gate) get a plain-language
 * explanation; anything else falls back to a truncated raw message.
 */
export function friendlyPipelineError(error: unknown): string {
  const message = errorMessage(error)
  if (message.includes('PERMISSION_DENIED')) {
    return 'RSS poll failed: the feed domain is not yet approved by Reddit (allowlist pending). No action needed — this will resolve once approved.'
  }
  return `RSS poll failed: ${message.slice(0, 200)}`
}

/** Formats an ISO timestamp as a short relative-time string, e.g. "5 minutes ago". */
export function formatRelativeTime(iso: string): string {
  const deltaMs = Date.now() - new Date(iso).getTime()
  if (!Number.isFinite(deltaMs)) return iso
  const deltaSec = Math.round(deltaMs / 1000)
  if (deltaSec < 5) return 'just now'
  if (deltaSec < 60) return `${deltaSec} seconds ago`
  const deltaMin = Math.round(deltaSec / 60)
  if (deltaMin < 60) return `${deltaMin} minute${deltaMin === 1 ? '' : 's'} ago`
  const deltaHour = Math.round(deltaMin / 60)
  if (deltaHour < 24)
    return `${deltaHour} hour${deltaHour === 1 ? '' : 's'} ago`
  const deltaDay = Math.round(deltaHour / 24)
  return `${deltaDay} day${deltaDay === 1 ? '' : 's'} ago`
}
