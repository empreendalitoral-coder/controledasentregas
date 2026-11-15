export const FEED_LIFETIME_MS = 24 * 60 * 60 * 1000;

export function feedExpiryCutoff(now = Date.now()): string {
  return new Date(now - FEED_LIFETIME_MS).toISOString();
}