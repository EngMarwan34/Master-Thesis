/**
 * SQLite's datetime('now') yields "YYYY-MM-DD HH:MM:SS" in UTC without a
 * timezone marker. JS's Date parser treats a space-separated string like
 * that as local time, which silently shifts timestamps. Normalize to ISO
 * (with a trailing Z) before formatting so displayed times are correct.
 */
export function formatDateTime(value: string): string {
  const iso = value.includes("T") ? value : `${value.replace(" ", "T")}Z`;
  return new Date(iso).toLocaleString("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}
