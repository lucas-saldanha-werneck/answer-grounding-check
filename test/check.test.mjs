import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { check, checkAll, figures, parseJsonl, toMarkdown } from "../src/check.mjs";

const ctx = ["Items can be returned within 30 days with a receipt.", "Opened electronics can be returned within 15 days."];

test("figures finds prices, times, percents", () => {
  assert.deepEqual(figures("Costs $1,299.50, opens 8:00, 15% off."), ["$1299.50", "8:00", "15%"]);
});

test("grounded answer passes", () => {
  assert.equal(check({ context: ctx, answer: "You can return items within 30 days with a receipt [1]." }).ok, true);
});

test("invented number is flagged", () => {
  const r = check({ context: ctx, answer: "Laptops can be returned within 45 days [2]." });
  assert.ok(r.issues.some((i) => i.rule === "ungrounded-figure" && i.detail.includes("45")));
});

test("missing citation is flagged", () => {
  const r = check({ context: ctx, answer: "Items can be returned within 30 days." });
  assert.ok(r.issues.some((i) => i.rule === "missing-citation"));
});

test("citation outside range is flagged", () => {
  const r = check({ context: ctx, answer: "Items can be returned within 30 days [5]." });
  assert.ok(r.issues.some((i) => i.rule === "bad-citation"));
});

test("unsupported extra sentence is flagged", () => {
  const r = check({ context: ctx, answer: "Items can be returned within 30 days [1]. Our loyalty members receive complimentary expedited shipping." });
  assert.ok(r.issues.some((i) => i.rule === "unsupported-sentence"));
});

test("no source and confident answer is flagged", () => {
  assert.equal(check({ context: [], answer: "It costs $5." }).issues[0].rule, "answered-without-source");
});

test("no source and honest refusal passes", () => {
  assert.equal(check({ context: [], answer: "I don't know, please ask your manager." }).ok, true);
});

test("parseJsonl skips comments and rejects bad lines", () => {
  assert.equal(parseJsonl('# c\n{"answer":"x"}\n').length, 1);
  assert.throws(() => parseJsonl("{bad"), /not valid JSON/);
});

test("sample file: exactly the expected cases fail", () => {
  const rep = checkAll(parseJsonl(readFileSync(new URL("../examples/sample-cases.jsonl", import.meta.url), "utf8")));
  const failed = rep.results.filter((r) => !r.ok).map((r) => r.id).sort();
  assert.deepEqual(failed, ["bad-citation", "hours-invented-sunday", "off-topic-sentence", "price-no-source", "returns-wrong-days"]);
  assert.equal(rep.total, 8);
});

test("markdown report lists failures", () => {
  const md = toMarkdown(checkAll([{ id: "x", context: [], answer: "It is $5." }]));
  assert.match(md, /0 of 1 answers passed/);
  assert.match(md, /## x/);
});
