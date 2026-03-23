import "server-only";
import type { HfRowsResponse } from "./types";

const HF_DATASETS_API = "https://datasets-server.huggingface.co";

/**
 * Fetch a window of rows from a HuggingFace dataset.
 */
export async function fetchItems(
  dataset: string,
  config: string,
  split: string,
  offset: number,
  length: number,
): Promise<HfRowsResponse> {
  const url = new URL(`${HF_DATASETS_API}/rows`);
  url.searchParams.set("dataset", dataset);
  url.searchParams.set("config", config);
  url.searchParams.set("split", split);
  url.searchParams.set("offset", String(offset));
  url.searchParams.set("length", String(length));

  const headers: Record<string, string> = {};
  if (process.env.HF_TOKEN) {
    headers["Authorization"] = `Bearer ${process.env.HF_TOKEN}`;
  }

  const res = await fetch(url.toString(), { headers });
  if (!res.ok) {
    throw new Error(`HF API error: ${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<HfRowsResponse>;
}

/**
 * Fetch a single item by index.
 */
export async function fetchItem(
  dataset: string,
  config: string,
  split: string,
  index: number,
): Promise<Record<string, unknown> | null> {
  const data = await fetchItems(dataset, config, split, index, 1);
  return data.rows[0]?.row ?? null;
}

/**
 * Fetch total row count for a dataset split.
 */
export async function fetchItemCount(
  dataset: string,
  config: string,
  split: string,
): Promise<number> {
  const data = await fetchItems(dataset, config, split, 0, 1);
  return data.num_rows_total;
}
