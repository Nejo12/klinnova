/** http/https only. Malformed or other-scheme URLs return null and must
 * not be rendered as a clickable link. */
export function safeExternalHref(website: string | null): string | null {
  if (website === null) {
    return null;
  }
  let url: URL;
  try {
    url = new URL(website);
  } catch {
    return null;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return null;
  }
  return url.toString();
}
