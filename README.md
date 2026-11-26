# answer-grounding-check

Independent demo, not affiliated with CI&T (cliente não diz).

A small Node script that checks whether a chatbot answer is backed by the source snippets it was given. It uses fixed rules, no LLM and no network, so it gives the same result every run and can sit in CI.

I wrote it after reading a job post about an AI assistant that answers store-employee questions, where the post says the team must prevent false answers. The idea is a cheap first gate before any heavier eval.

## What it checks

Each case has the source snippets (`context`) and the bot's `answer`. The tool flags:

- `ungrounded-figure`: a number, price, time or percent in the answer that is not in any snippet.
- `unsupported-sentence`: a sentence where fewer than 40% of the content words appear in the snippets.
- `missing-citation` and `bad-citation`: no `[n]` marker, or a marker pointing at a snippet that does not exist.
- `answered-without-source`: no snippets were found and the answer does not say it is unsure.

## Run it

Needs Node 20 or newer. No install step.

```
npm test
node src/cli.mjs examples/sample-cases.jsonl          # Markdown report
node src/cli.mjs examples/sample-cases.jsonl --json   # JSON report
```

Exit code is 1 when any answer fails, 0 when all pass, 2 on bad usage. Input is JSONL, one case per line, `#` lines are comments:

```
{"id":"x","context":["Gift cards never expire."],"answer":"Gift cards never expire [1]."}
```

## Sample result

`examples/sample-cases.jsonl` holds 8 invented cases (example data, not from any real store). 3 pass and 5 fail. The fails are a wrong return window (45 days against 30 and 15), an invented Sunday opening time, a price with no source, an unrelated loyalty claim, and a citation to snippet 3 when only one exists.

## What was tested

- 11 offline tests with `node --test`, run in GitHub Actions on every push.
- Each rule has a test for a failing case. One test covers a passing case and one covers an honest "I don't know".
- The sample file test pins exactly which of the 8 cases fail. Writing it exposed a bug: `[1]` markers were read as figures. That is fixed.

## What was not tested

- No real chatbot output and no real store data. Every case is invented.
- It was never compared with a human grader or an LLM judge, so I do not know its false-positive rate.
- Word overlap is crude. A paraphrase with different words can be flagged, and a wrong sentence that reuses source words can pass. Figures are matched as text, so "30 days" and "thirty days" differ.
- English only. No semantic or embedding check.

## License

MIT
