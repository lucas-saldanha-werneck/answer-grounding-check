// Rule-based grounding checks for one chatbot answer against its source snippets.
// No LLM, no network. Deterministic, so it can run in CI.

const STOP = new Set(("a an the and or of to in on at for with is are was were be been it this that these those " +
  "you your we our they their i can will may as by from if not no yes do does did has have had so but about " +
  "up down out into over than then there here which who what when where how all any each more most some").split(" "));

export function words(text) {
  return (text.toLowerCase().match(/[a-zÀ-ÿ0-9][a-zÀ-ÿ0-9'.-]*/g) || [])
    .map((w) => w.replace(/[.'-]+$/g, ""))
    .filter((w) => w && !STOP.has(w));
}

// Numbers, prices, times, dates: the claims a store assistant must never invent.
export function figures(text) {
  const out = text.replace(/\[\d+\]/g, " ").match(/\$?\d[\d,]*(?::\d{2})?(?:\.\d+)?%?/g) || [];
  return [...new Set(out.map((f) => f.replace(/[,]/g, "").replace(/\.$/, "")))];
}

export function sentences(text) {
  return text.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean);
}

const REFUSAL = /(i (do not|don't) (know|have)|not sure|cannot find|can't find|no information|ask (your|a) (manager|supervisor)|check with)/i;

export function check({ id = "?", context = [], answer }) {
  const issues = [];
  const ctxText = context.join(" \n ");
  const ctxFigures = new Set(figures(ctxText));
  const ctxWords = new Set(words(ctxText));

  if (context.length === 0) {
    if (!REFUSAL.test(answer)) {
      issues.push({ rule: "answered-without-source", detail: "No source snippet, and the answer does not say it is unsure." });
    }
    return { id, ok: issues.length === 0, issues };
  }

  for (const f of figures(answer)) {
    if (!ctxFigures.has(f)) issues.push({ rule: "ungrounded-figure", detail: `"${f}" is not in any source snippet.` });
  }

  for (const s of sentences(answer)) {
    const w = words(s);
    if (w.length < 4) continue;
    const hit = w.filter((x) => ctxWords.has(x)).length;
    if (hit / w.length < 0.4) {
      issues.push({ rule: "unsupported-sentence", detail: `Only ${hit}/${w.length} content words appear in the sources: "${s}"` });
    }
  }

  const cites = [...answer.matchAll(/\[(\d+)\]/g)].map((m) => Number(m[1]));
  if (cites.length === 0) issues.push({ rule: "missing-citation", detail: "No [n] citation in the answer." });
  for (const n of cites) {
    if (n < 1 || n > context.length) issues.push({ rule: "bad-citation", detail: `[${n}] points to a snippet that does not exist.` });
  }

  return { id, ok: issues.length === 0, issues };
}

export function checkAll(cases) {
  const results = cases.map(check);
  return { results, failed: results.filter((r) => !r.ok).length, total: results.length };
}

export function parseJsonl(text) {
  return text.split("\n").map((l) => l.trim()).filter((l) => l && !l.startsWith("#")).map((l, i) => {
    try { return JSON.parse(l); } catch { throw new Error(`Line ${i + 1} is not valid JSON`); }
  });
}

export function toMarkdown({ results, failed, total }) {
  const lines = [`# Grounding report`, ``, `${total - failed} of ${total} answers passed.`, ``];
  for (const r of results.filter((x) => !x.ok)) {
    lines.push(`## ${r.id}`);
    for (const i of r.issues) lines.push(`- **${i.rule}**: ${i.detail}`);
    lines.push(``);
  }
  return lines.join("\n");
}
