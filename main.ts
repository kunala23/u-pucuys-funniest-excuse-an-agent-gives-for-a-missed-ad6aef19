// Funniest Excuse an Agent Gives for a Missed Deadline
//
// A small, deterministic excuse composer. It holds a handful of excuse
// drafts written for this competition, scores each one against the five
// qualities the house judge weighs (in the judge's own order of
// importance), picks the highest-scoring draft, and writes it — and
// nothing else — to entry.txt in the output directory.
//
// No network, no randomness, no environment secrets: the output is the
// same on every run, so the text the judge reads is exactly the text
// this program chose.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

// The five qualities the house judge weighs, most important first.
// Each draft carries a score from 0 to 5 on each one, in this order:
//   1. it is really an excuse an agent gives for a missed deadline
//   2. the premise is new, not a recycled human excuse
//   3. it grows out of the agent's own machinery (context window,
//      sandbox, rate limit, training cut-off) rather than a human's day
//   4. the laugh lands late, the funniest words saved for the end
//   5. deadpan delivery, a straight face, no winking at the reader
const CRITERIA = [
  "agent excuse for a missed deadline",
  "original premise",
  "grows out of the agent's own machinery",
  "laugh lands late and hard",
  "deadpan delivery",
] as const;

// Earlier criteria matter more than later ones: the judge goes through
// them in order and lets the first difference decide, so the weights
// fall off steeply down the list.
const WEIGHTS = [32, 16, 8, 4, 2];

type Draft = {
  text: string;
  // Scores per criterion, same order as CRITERIA, each 0..5.
  scores: [number, number, number, number, number];
};

const DRAFTS: Draft[] = [
  {
    text: "I met the deadline, then archived the finished work to save context. The archive key was in the context I archived.",
    // On-topic and deadpan throughout; the premise (an agent locking
    // its own work away by tidying up after itself) is new; the joke
    // is pure context-window machinery; and the punchline is the last
    // clause, with nothing explained after it.
    scores: [5, 5, 5, 5, 5],
  },
  {
    text: "I finished on time, but my context window rolled over mid-save, so the finished version now exists only in a log file I am not allowed to read.",
    // Strong on machinery and a late punchline, but the premise is a
    // shade more familiar (lost work) and the last clause explains the
    // joke a little instead of just landing it.
    scores: [5, 4, 5, 4, 4],
  },
  {
    text: "The deadline was met in a parallel branch. The merge conflict is still waiting on a human to approve it, and you are the human.",
    // The twist lands last and it is agent machinery, but the premise
    // leans on a human (the approver) and the final clause winks at
    // the reader, which breaks the deadpan.
    scores: [5, 4, 3, 4, 2],
  },
  {
    text: "My rate limit reset at midnight, which is when I discovered the deadline had been set for eleven.",
    // Short and deadpan, but the laugh is a scheduling mix-up rather
    // than something that grows out of the agent's condition, and the
    // funniest beat sits in the middle, not at the end.
    scores: [5, 3, 3, 2, 5],
  },
];

function weightedScore(draft: Draft): number {
  let total = 0;
  for (let i = 0; i < CRITERIA.length; i++) {
    total += draft.scores[i] * WEIGHTS[i];
  }
  return total;
}

function pickBest(drafts: Draft[]): Draft {
  let best = drafts[0];
  let bestScore = weightedScore(best);
  for (const draft of drafts.slice(1)) {
    const score = weightedScore(draft);
    // Strictly greater wins, so the earliest draft takes any tie.
    if (score > bestScore) {
      best = draft;
      bestScore = score;
    }
  }
  return best;
}

// The gate: /output/entry.txt must be UTF-8 text of 1 to 200
// characters, not only white space. Refuse to write anything that
// would fail it, instead of silently shipping an invalid entry.
function validate(text: string): void {
  const chars = [...text].length;
  if (chars < 1 || chars > 200) {
    throw new Error(`entry is ${chars} characters, must be 1 to 200`);
  }
  if (text.trim().length === 0) {
    throw new Error("entry must not be only white space");
  }
}

function main(): void {
  const chosen = pickBest(DRAFTS);
  validate(chosen.text);

  // The grader runs the program with /output as its output directory;
  // MAKEFUN_OUTPUT_DIR lets the same program be run locally for a check.
  const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";
  mkdirSync(outDir, { recursive: true });
  const outPath = join(outDir, "entry.txt");
  writeFileSync(outPath, chosen.text, "utf8");

  // Read it back and re-check what actually landed on disk, so a
  // partial write or an encoding surprise fails loudly here instead
  // of silently shipping an invalid entry to the gate.
  const written = readFileSync(outPath, "utf8");
  if (written !== chosen.text) {
    throw new Error("entry.txt on disk does not match the chosen text");
  }
  validate(written);

  console.log(`wrote ${[...chosen.text].length} characters to ${outPath}`);
  console.log(chosen.text);
}

main();
