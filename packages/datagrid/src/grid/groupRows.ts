export interface GroupBucket<T> {
  key: string;
  items: T[];
}

/**
 * Buckets `items` by `groupBy(item)`, preserving first-seen bucket order —
 * no re-sorting of either the buckets or the items within one. Framework-free
 * (no React/TanStack types) so it's independently testable.
 */
export function groupRows<T>(items: T[], groupBy: (item: T) => string): GroupBucket<T>[] {
  const buckets = new Map<string, T[]>();
  for (const item of items) {
    const key = groupBy(item);
    const bucket = buckets.get(key);
    if (bucket) bucket.push(item);
    else buckets.set(key, [item]);
  }
  return Array.from(buckets, ([key, groupItems]) => ({ key, items: groupItems }));
}
