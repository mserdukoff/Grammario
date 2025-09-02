import { z } from "zod";

export const Affix = z.object({
  type: z.string(), // e.g., "prefix", "suffix", "infix"
  form: z.string(), // the actual affix form
  function: z.string().optional(), // grammatical function (e.g., "locative", "1st person")
});

export const MorphologicalComponent = z.object({
  type: z.string(), // "root", "stem", "prefix", "suffix", "ending"
  form: z.string(), // the actual morpheme
  function: z.string().optional(), // grammatical function
  meaning: z.string().optional(), // semantic meaning if applicable
});

export const Token = z.object({
  text: z.string(),
  lemma: z.string().optional(),
  upos: z.string(),
  xpos: z.string().optional(),
  // English translation of the word
  translation: z.string().optional(),
  morphology: z
    .object({
      number: z.string().optional(),
      case: z.string().optional(),
      gender: z.string().optional(),
      person: z.string().optional(),
      tense: z.string().optional(),
      aspect: z.string().optional(),
      mood: z.string().optional(),
      voice: z.string().optional(),
      polarity: z.string().optional(),
      evidentiality: z.string().optional(),
      affixes: z.array(Affix).optional(),
    })
    .partial()
    .optional(),
  // Morphological decomposition - breaks word into constituent parts
  morphological_components: z.array(MorphologicalComponent).optional(),
  gloss: z.string().optional(),
  head: z.number().int().optional(),        // 1-based; root points to itself
  deprel: z.string().optional(),
  explanation: z.string().optional(),
});

export const ErrorItem = z.object({
  span: z.array(z.number().int()).optional(), // [start,end] inclusive, 1-based
  type: z.string(),
  fix: z.string(),
  rule: z.string().optional(),
  explanation: z.string().optional(),
});

export const TeachingNote = z.object({
  topic: z.string(),
  level: z.string().optional(), // CEFR (A2/B1/…)
  example_pairs: z.array(z.object({
    example: z.string(),
    translation: z.string()
  })).optional(),
});

export const AnalysisSchema = z.object({
  language: z.string().optional(), // ISO 639-1 if known
  original_sentence: z.string(),
  normalized: z.string().optional(),
  tokens: z.array(Token).min(1),
  syntax: z
    .object({
      root: z.number().int().optional(),
      // Dependencies as objects instead of tuples for OpenAI compatibility
      dependencies: z
        .array(z.object({
          head: z.number().int(),
          dependent: z.number().int(),
          relation: z.string()
        }))
        .optional(),
    })
    .optional(),
  errors: z.array(ErrorItem).optional(),
  teaching_notes: z.array(TeachingNote).optional(),
});

export type Analysis = z.infer<typeof AnalysisSchema>;

/** Sanity check: head indices are within [0..n]; root in range if present. */
export function assertHeadsWithinBounds(a: Analysis) {
  const n = a.tokens.length;
  for (let i = 0; i < n; i++) {
    const h = a.tokens[i].head;
    if (h !== undefined && (h < 0 || h > n)) {
      throw new Error(`Invalid head index at token ${i + 1}: ${h} (0..${n} expected, where 0 means no head)`);
    }
  }
  if (a.syntax?.root !== undefined) {
    const r = a.syntax.root;
    if (r < 1 || r > n) throw new Error(`Invalid root index: ${r} (1..${n} expected)`);
  }
}

/** Enforce "omit nulls/undefined" rule across nested objects/arrays. */
export function deepOmitNullish<T>(value: T): T {
  if (value === null || value === undefined) return undefined as any;
  if (Array.isArray(value)) {
    return value
      .map((v) => deepOmitNullish(v))
      .filter((v) => v !== undefined) as any;
  }
  if (typeof value === "object") {
    const out: any = {};
    for (const [k, v] of Object.entries(value as any)) {
      const cleaned = deepOmitNullish(v);
      if (cleaned !== undefined) out[k] = cleaned;
    }
    return out;
  }
  return value;
}

/** (Optional) If your UI still needs an adjacency matrix, derive it from heads. */
export function depsToAdjMatrix(tokens: { head?: number }[]) {
  const n = tokens.length;
  const M = Array.from({ length: n }, () => Array(n).fill(0));
  for (let i = 0; i < n; i++) {
    const h = tokens[i].head;
    // If h is 0, it means no head (root), if undefined, treat as self-pointing
    if (h !== undefined && h > 0 && h <= n && h !== i + 1) {
      M[h - 1][i] = 1;
    }
  }
  return M;
}
