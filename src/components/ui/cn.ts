/** Class-name joiner (no dependency, works with conditional values). */
export function cn(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(' ');
}
