import "server-only";
import { redis } from "./redis";
import { fetchItems, fetchItem, fetchItemCount } from "./hf/client";

const ITEM_TTL = 60 * 60 * 24; // 24 hours

export async function getCachedItem(
  dataset: string,
  config: string,
  split: string,
  index: number,
): Promise<Record<string, unknown> | null> {
  const key = `item:${dataset}:${split}:${index}`;

  const cached = await redis.get<Record<string, unknown>>(key);
  if (cached) return cached;

  const item = await fetchItem(dataset, config, split, index);
  if (item) await redis.set(key, item, { ex: ITEM_TTL });
  return item;
}

export async function prefetchItemWindow(
  dataset: string,
  config: string,
  split: string,
  offset: number,
  length: number,
): Promise<void> {
  const data = await fetchItems(dataset, config, split, offset, length);
  const pipeline = redis.pipeline();
  for (const { row_idx, row } of data.rows) {
    pipeline.set(`item:${dataset}:${split}:${row_idx}`, row, { ex: ITEM_TTL });
  }
  await pipeline.exec();
}

export async function getCachedItemCount(
  dataset: string,
  config: string,
  split: string,
): Promise<number> {
  const key = `count:${dataset}:${split}`;
  const cached = await redis.get<number>(key);
  if (cached !== null && cached !== undefined) return cached;

  const count = await fetchItemCount(dataset, config, split);
  await redis.set(key, count, { ex: 3600 });
  return count;
}

export async function invalidateProgress(
  projectId: string,
  userId: string,
): Promise<void> {
  await redis.del(`progress:${projectId}:${userId}`);
}
