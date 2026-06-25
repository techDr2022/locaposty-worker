import test from "node:test";
import assert from "node:assert/strict";
import {
  dedupeBatchPosts,
  parseStrictBulkPosts,
} from "@/lib/posts/bulk/parser";

test("parseStrictBulkPosts parses strict output", () => {
  const raw = JSON.stringify([
    {
      num: 1,
      topic: "Topic 1",
      intent: "education",
      primary_keyword: "keyword one",
      content: "Post content 1",
    },
  ]);

  const parsed = parseStrictBulkPosts(raw);
  assert.equal(parsed.length, 1);
  assert.equal(parsed[0].topic, "Topic 1");
});

test("dedupeBatchPosts removes repeated topics and keywords", () => {
  const usedTopics = new Set<string>(["topic 1"]);
  const usedKeywords = new Set<string>(["keyword one"]);
  const deduped = dedupeBatchPosts(
    [
      {
        num: 1,
        topic: "Topic 1",
        intent: "education",
        primary_keyword: "keyword one",
        content: "a",
      },
      {
        num: 2,
        topic: "Topic 2",
        intent: "education",
        primary_keyword: "keyword two",
        content: "b",
      },
    ],
    usedTopics,
    usedKeywords,
  );

  assert.equal(deduped.length, 1);
  assert.equal(deduped[0].topic, "Topic 2");
});
