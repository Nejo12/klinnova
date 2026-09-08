/** Shared Berlin-local `en-GB` date+time formatter for application list/detail/history timestamps. */
export function formatApplicationTimestamp(
  value: string,
  locale: "en" | "de" = "en",
): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat(locale === "de" ? "de-DE" : "en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Berlin",
  }).format(date);
}
