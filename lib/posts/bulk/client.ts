import { BulkGeneratedPost } from "@/lib/posts/bulk/types";

export interface BulkProgressChunk {
  type: "progress";
  batch: number;
  totalBatches: number;
  posts: BulkGeneratedPost[];
}

export interface BulkErrorChunk {
  type: "batch_error";
  batch: number;
  message: string;
  retryable: boolean;
}

export interface BulkCompleteChunk {
  type: "complete";
  generatedCount: number;
  failedBatches: number[];
}

export type BulkStreamChunk =
  | BulkProgressChunk
  | BulkErrorChunk
  | BulkCompleteChunk;

export interface BulkProgressState {
  totalBatches: number;
  completedBatches: number;
  generatedPosts: BulkGeneratedPost[];
  batchErrors: BulkErrorChunk[];
  completed: boolean;
}

export const initialBulkProgressState: BulkProgressState = {
  totalBatches: 0,
  completedBatches: 0,
  generatedPosts: [],
  batchErrors: [],
  completed: false,
};

export function parseNdjsonChunk(buffer: string): {
  nextBuffer: string;
  chunks: BulkStreamChunk[];
} {
  const lines = buffer.split("\n");
  const chunks: BulkStreamChunk[] = [];
  const remainder = lines.pop() ?? "";

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      const parsed = JSON.parse(trimmed) as BulkStreamChunk;
      chunks.push(parsed);
    } catch {
      // Ignore malformed line and continue stream processing.
    }
  }

  return { nextBuffer: remainder, chunks };
}

export function applyProgressChunk(
  state: BulkProgressState,
  chunk: BulkStreamChunk,
): BulkProgressState {
  if (chunk.type === "progress") {
    return {
      ...state,
      totalBatches: chunk.totalBatches,
      completedBatches: Math.max(state.completedBatches, chunk.batch),
      generatedPosts: [...state.generatedPosts, ...chunk.posts],
    };
  }

  if (chunk.type === "batch_error") {
    return {
      ...state,
      batchErrors: [...state.batchErrors, chunk],
    };
  }

  return {
    ...state,
    completed: true,
  };
}

export function generateSchedulePreview(
  startDate: string,
  timeOfDay: string,
  count: number,
): Date[] {
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(startDate);
  if (!dateMatch || count <= 0) return [];

  const year = Number(dateMatch[1]);
  const month = Number(dateMatch[2]);
  const day = Number(dateMatch[3]);
  const probe = new Date(year, month - 1, day);
  if (
    Number.isNaN(probe.getTime()) ||
    probe.getFullYear() !== year ||
    probe.getMonth() !== month - 1 ||
    probe.getDate() !== day
  ) {
    return [];
  }

  const timeMatch = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec(timeOfDay);
  if (!timeMatch) return [];

  const hh = Number(timeMatch[1]);
  const mm = Number(timeMatch[2]);

  const schedule: Date[] = [];
  for (let i = 0; i < count; i += 1) {
    const next = new Date(year, month - 1, day + i, hh, mm, 0, 0);
    schedule.push(next);
  }
  return schedule;
}

export function mapConflictMessage(
  conflicts: Array<{ scheduledAt: string }>,
): string {
  if (conflicts.length === 0) return "";
  const display = conflicts
    .slice(0, 4)
    .map((c) => new Date(c.scheduledAt).toLocaleString())
    .join(", ");
  const suffix =
    conflicts.length > 4 ? ` and ${conflicts.length - 4} more` : "";
  return `Conflicts found at ${display}${suffix}.`;
}
