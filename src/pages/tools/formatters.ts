/** Shared display formatting for the tools pages. */

export function formatBytes(bytes: number, precise = false): string {
  if (bytes <= 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;

  const units = ["KB", "MB", "GB", "TB"];
  let value = bytes / 1024;
  let unit = 0;

  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }

  const digits = precise ? 2 : value >= 100 ? 0 : value >= 10 ? 1 : 2;
  return `${value.toFixed(digits)} ${units[unit]}`;
}

export function formatCount(value: number): string {
  return value.toLocaleString();
}

export function formatDaysAgo(days: number | null): string {
  if (days === null) return "Never opened here";
  if (days === 0) return "Opened today";
  if (days === 1) return "Opened yesterday";
  if (days < 30) return `Opened ${days} days ago`;

  const months = Math.floor(days / 30);
  if (months < 12) return `Opened ${months} month${months === 1 ? "" : "s"} ago`;

  const years = Math.floor(months / 12);
  return `Opened ${years} year${years === 1 ? "" : "s"} ago`;
}
