export interface HfRowsResponse {
  features: Array<{ name: string; type: string }>;
  rows: Array<{ row_idx: number; row: Record<string, unknown> }>;
  num_rows_total: number;
}

/** A single message in a WildChat conversation */
export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

/** A WildChat item row from HuggingFace */
export interface WildChatItem {
  conversation_hash: string;
  model: string;
  conversation: ChatMessage[];
  turn: number;
  language: string;
  [key: string]: unknown;
}
