import { z } from "zod";
import { BulkGeneratedPost } from "@/lib/posts/bulk/types";

const bulkPostSchema = z
  .object({
    num: z.number(),
    topic: z.string(),
    intent: z.string(),
    primary_keyword: z.string(),
    content: z.string(),
  })
  .strict();

const bulkPostArraySchema = z.array(bulkPostSchema);

function extractJsonArray(rawText: string): string {
  const startIdx = rawText.indexOf("[");
  const endIdx = rawText.lastIndexOf("]");
  if (startIdx === -1 || endIdx === -1 || endIdx <= startIdx) {
    return rawText;
  }
  return rawText.slice(startIdx, endIdx + 1);
}

export function parseStrictBulkPosts(rawText: string): BulkGeneratedPost[] {
  const normalized = extractJsonArray(rawText).trim();
  const parsed = JSON.parse(normalized);
  const validated = bulkPostArraySchema.parse(parsed);

  return validated.map((item, index) => ({
    num: Number.isFinite(item.num) ? Math.trunc(item.num) : index + 1,
    topic: item.topic.trim(),
    intent: item.intent.trim(),
    primary_keyword: item.primary_keyword.trim(),
    content: item.content.trim(),
  }));
}

export function dedupeBatchPosts(
  posts: BulkGeneratedPost[],
  usedTopics: Set<string>,
  usedKeywords: Set<string>,
): BulkGeneratedPost[] {
  const accepted: BulkGeneratedPost[] = [];
  for (const post of posts) {
    const topicKey = post.topic.toLowerCase();
    const keywordKey = post.primary_keyword.toLowerCase();
    if (usedTopics.has(topicKey) || usedKeywords.has(keywordKey)) {
      continue;
    }
    usedTopics.add(topicKey);
    usedKeywords.add(keywordKey);
    accepted.push(post);
  }
  return accepted;
}
