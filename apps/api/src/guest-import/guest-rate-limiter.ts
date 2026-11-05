/**
 * Per-IP counter of guest imports per UTC day. In memory: limits are per API
 * process (like the import job store), which is enough for a single replica.
 */
export class GuestRateLimiter {
  private readonly counts = new Map<string, { day: string; count: number }>();

  constructor(
    private readonly limitPerDay: number,
    private readonly now: () => number = Date.now,
  ) {}

  private today(): string {
    return new Date(this.now()).toISOString().slice(0, 10);
  }

  /** Whether `ip` may start another import today (0 = unlimited). */
  allows(ip: string): boolean {
    if (this.limitPerDay <= 0) return true;
    const entry = this.counts.get(ip);
    return !entry || entry.day !== this.today() || entry.count < this.limitPerDay;
  }

  /** Count one import for `ip`. */
  consume(ip: string): void {
    const day = this.today();
    const entry = this.counts.get(ip);
    const count = entry && entry.day === day ? entry.count + 1 : 1;
    this.counts.set(ip, { day, count });
    if (this.counts.size > 10_000) this.prune(day);
  }

  private prune(day: string): void {
    for (const [ip, entry] of this.counts) {
      if (entry.day !== day) this.counts.delete(ip);
    }
  }
}
