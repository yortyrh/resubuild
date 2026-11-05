/** Usage counters reset every UTC calendar month; the period key is 'YYYY-MM'. */
export function usagePeriod(now: Date = new Date()): string {
  return now.toISOString().slice(0, 7);
}

/** Start of the next period (when the monthly counters reset), as an ISO timestamp. */
export function usagePeriodResetsAt(now: Date = new Date()): string {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)).toISOString();
}
