#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { checkAll, parseJsonl, toMarkdown } from "./check.mjs";

const file = process.argv[2];
if (!file) {
  console.error("usage: grounding-check <cases.jsonl> [--json]");
  process.exit(2);
}
const report = checkAll(parseJsonl(readFileSync(file, "utf8")));
console.log(process.argv.includes("--json") ? JSON.stringify(report, null, 2) : toMarkdown(report));
process.exit(report.failed ? 1 : 0);
