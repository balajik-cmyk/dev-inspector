/**
 * Stable pageId derivation for Comments.
 *
 * `pageId` is a short, stable hash of a normalized URL (origin + pathname,
 * query/hash stripped) so comments group by "page" rather than by every
 * querystring permutation. It is recomputed whenever the URL changes
 * (SPA navigation via history.pushState/replaceState/popstate) or when a
 * host app passes an explicit `commentsPageUrl` (preferred when available,
 * e.g. from a router).
 */

/** Normalize a URL string to origin + pathname (no query/hash, no trailing slash). */
export function normalizePageUrl(url: string): string {
  try {
    const parsed = new URL(url, typeof window !== "undefined" ? window.location.href : undefined);
    const pathname = parsed.pathname.replace(/\/+$/, "") || "/";
    return `${parsed.origin}${pathname}`;
  } catch {
    return url.split(/[?#]/)[0].replace(/\/+$/, "") || url;
  }
}

/** djb2-style 32-bit string hash, base36-encoded — stable across sessions. */
export function hashString(input: string): string {
  let hash = 5381;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 33) ^ input.charCodeAt(i);
  }
  // Force unsigned 32-bit, then base36 for a compact id.
  return (hash >>> 0).toString(36);
}

/** Compute a stable pageId from a raw URL (normalizes first). */
export function computePageId(url: string): string {
  return hashString(normalizePageUrl(url));
}

/** Best-effort current URL: explicit override wins, else window.location. */
export function currentPageUrl(explicitUrl?: string): string {
  if (explicitUrl) return explicitUrl;
  if (typeof window !== "undefined" && window.location) {
    return window.location.href;
  }
  return "";
}
