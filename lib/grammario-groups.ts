// lib/grammario-groups.ts
// One-stop module: family-specific prompts + Zod schemas + tool builders + validators.

import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";

/* ================================
   Shared primitives & helpers
==================================*/

export type Family = "turkic" | "semitic" | "slavic" | "romance" | "germanic";

/** Affix/morpheme with optional pedagogical metadata */
const Morpheme = z.object({
  type: z.string(),              // e.g., plural, case, possessive, tense, derivational, prefix, suffix, infix
  form: z.string(),              // surface form, e.g., "lar", "ı", "ya", "un-", "-ness"
  gloss: z.string().optional(),  // compact gloss like PL, ACC, DAT, NEG, NMLZ...
  function: z.string().optional()// human-readable role (e.g., "plural marker", "dative goal")
});

/** UD-like minimal syntax object */
const Syntax = z.object({
  root: z.number().int().optional(), // 0-based
  dependencies: z
    .array(z.object({
      head: z.number().int(),
      dependent: z.number().int(), 
      relation: z.string()
    }))
    .optional(), // dependency objects instead of tuples for OpenAI compatibility
});

/** Error and teaching notes for learner UI */
const ErrorItem = z.object({
  span: z.array(z.number().int()).optional(), // [start,end] 1-based inclusive
  type: z.string(),                             // e.g., CASE:Acc, AGR:Gender, ORTH:Punct
  fix: z.string(),
  rule: z.string().optional(),
  explanation: z.string().optional(),
});
const TeachingNote = z.object({
  topic: z.string(),
  level: z.string().optional(), // CEFR e.g., A2/B1
  example_pairs: z.array(z.object({
    example: z.string(),
    translation: z.string()
  })).optional(), // minimal pairs as objects instead of tuples for OpenAI compatibility
});

/** Base token (shared across families) */
const BaseToken = z.object({
  text: z.string(),
  lemma: z.string().optional(),
  upos: z.string(),                 // prefer UPOS; xpos optional
  xpos: z.string().optional(),
  // English translation of the word
  translation: z.string().optional(),
  gloss: z.string().optional(),     // interlinear gloss for the whole token if handy
  head: z.number().int().optional(),// 0-based; 0 means no head (root), 1..n are valid heads
  deprel: z.string().optional(),
  explanation: z.string().optional()// brief "why" for the bundle
});

/** Shared top-level fields */
const BaseAnalysis = {
  language: z.string().optional(),      // ISO 639-1 where known
  original_sentence: z.string(),
  normalized: z.string().optional(),    // equals original if no errors
  syntax: Syntax.optional(),
  errors: z.array(ErrorItem).optional(),
  teaching_notes: z.array(TeachingNote).optional(),
};

/** Helper: omit null/undefined recursively */
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

/** Helper: heads within bounds sanity check - matches original grammario conventions */
export function assertHeadsWithinBounds(tokens: { head?: number }[], root?: number) {
  const n = tokens.length;
  for (let i = 0; i < n; i++) {
    const h = tokens[i]?.head;
    // 0 means no head (root), 1..n are valid head indices
    if (h !== undefined && (h < 0 || h > n)) {
      throw new Error(`Invalid head index at token ${i + 1}: ${h} (0..${n} expected, where 0 means no head)`);
    }
  }
  // Root in syntax should be 0-based index (0..n-1 expected)
  if (root !== undefined && (root < 0 || root >= n)) {
    throw new Error(`Invalid root index: ${root} (0..${n - 1} expected)`);
  }
}

/* ================================
   Family-specific token extensions
==================================*/

/* -------- Turkic (agglutinative chains) -------- */
const TurkicToken = BaseToken.extend({
  // Decompose into core + linear suffix chain; typical buffer consonant/harmony notes optional
  root: z.string().optional(), // lexical root/base
  suffix_chain: z.array(Morpheme).optional(), // ordered suffixes after the root
  harmonic_class: z.string().optional(),      // e.g., back/front vowel harmony class
  buffer_consonant: z.string().optional(),    // e.g., 'y' in Turkish linking
  features: z.object({
    number: z.string().optional(), case: z.string().optional(),
    person: z.string().optional(), tense: z.string().optional(),
    mood: z.string().optional(),   polarity: z.string().optional(),
    possessive: z.string().optional(), evidentiality: z.string().optional(),
    voice: z.string().optional(),  aspect: z.string().optional()
  }).partial().optional()
});
export const TurkicAnalysisSchema = z.object({
  ...BaseAnalysis,
  tokens: z.array(TurkicToken).min(1)
});
export type TurkicAnalysis = z.infer<typeof TurkicAnalysisSchema>;

/* -------- Semitic (root & template) -------- */
const SemiticAffix = Morpheme.extend({
  position: z.enum(["prefix", "suffix", "infix", "clitic"]).optional()
});
const SemiticToken = BaseToken.extend({
  root_consonants: z.union([z.string(), z.array(z.string())]).optional(), // "KTB" or ["k","t","b"]
  template: z.string().optional(),            // e.g., "CaCaC", "maCCuC", "hiCCiC"
  pattern_label: z.string().optional(),       // e.g., Form I / binyan (Pa'al/Hif'il/etc.)
  vocalization: z.string().optional(),        // fully vowelled form (optional)
  affixes: z.array(SemiticAffix).optional(),
  features: z.object({
    part: z.string().optional(),     // verb/noun/adj/participle
    person: z.string().optional(), number: z.string().optional(), gender: z.string().optional(),
    tense: z.string().optional(),   aspect: z.string().optional(), mood: z.string().optional(),
    state: z.string().optional(),   definiteness: z.string().optional()
  }).partial().optional()
});
export const SemiticAnalysisSchema = z.object({
  ...BaseAnalysis,
  tokens: z.array(SemiticToken).min(1)
});
export type SemiticAnalysis = z.infer<typeof SemiticAnalysisSchema>;

/* -------- Slavic (prefix + stem + fusional ending) -------- */
const SlavicToken = BaseToken.extend({
  prefix_chain: z.array(Morpheme).optional(), // ordered prefixes (often verbal)
  stem: z.string().optional(),
  stem_mutation: z.string().optional(),       // palatalization/alternation notes
  ending: z.string().optional(),              // fusional inflectional ending
  features: z.object({
    // nominal
    case: z.string().optional(), number: z.string().optional(), gender: z.string().optional(),
    // verbal
    person: z.string().optional(), tense: z.string().optional(), mood: z.string().optional(),
    aspect: z.string().optional(), voice: z.string().optional()
  }).partial().optional()
});
export const SlavicAnalysisSchema = z.object({
  ...BaseAnalysis,
  tokens: z.array(SlavicToken).min(1)
});
export type SlavicAnalysis = z.infer<typeof SlavicAnalysisSchema>;

/* -------- Romance (stem + inflectional ending; fusional verbs) -------- */
const RomanceToken = BaseToken.extend({
  stem: z.string().optional(),
  ending: z.string().optional(),
  conjugation_class: z.string().optional(),   // e.g., -ar/-er/-ir or class I/II/III
  irregular_stem: z.boolean().optional(),
  features: z.object({
    // verbal
    person: z.string().optional(), number: z.string().optional(),
    tense: z.string().optional(),  mood: z.string().optional(), aspect: z.string().optional(),
    // nominal/adjectival
    gender: z.string().optional(), noun_number: z.string().optional()
  }).partial().optional()
});
export const RomanceAnalysisSchema = z.object({
  ...BaseAnalysis,
  tokens: z.array(RomanceToken).min(1)
});
export type RomanceAnalysis = z.infer<typeof RomanceAnalysisSchema>;

/* -------- Germanic (compounding + inflection; internal change) -------- */
const CompoundPart = z.object({
  root: z.string(),       // component lemma/root
  gloss: z.string().optional()
});
const InternalChange = z.object({
  type: z.string(),       // ablaut/umlaut/consonant_shift/etc.
  from: z.string(),
  to: z.string(),
  note: z.string().optional()
});
const GermanicToken = BaseToken.extend({
  separable_prefix: z.string().optional(),   // e.g., German "auf-" (aufstehen)
  compound_parts: z.array(CompoundPart).optional(), // ordered components for compounds
  suffix_chain: z.array(Morpheme).optional(),       // -s, -ed, -er, -ness, etc.
  internal_change: InternalChange.optional(),       // e.g., sing→sang, man→men
  strong_verb_grade: z.string().optional(),         // e.g., i-a-u pattern label
  features: z.object({
    person: z.string().optional(), number: z.string().optional(),
    tense: z.string().optional(),  mood: z.string().optional(),
    comparison: z.string().optional(), // positive/comparative/superlative
    noun_number: z.string().optional()
  }).partial().optional()
});
export const GermanicAnalysisSchema = z.object({
  ...BaseAnalysis,
  tokens: z.array(GermanicToken).min(1)
});
export type GermanicAnalysis = z.infer<typeof GermanicAnalysisSchema>;

/* ================================
   System prompts per family
==================================*/

export const FAMILY_SYSTEM_PROMPT: Record<Family, string> = {
  turkic: [
    "You are Grammario analyzing a Turkic sentence (Turkish, Azerbaijani, Kazakh, etc.).",
    "IMPORTANT: Analyze the sentence as-is in the source Turkic language. Do NOT translate or convert to any other language.",
    "Output ONLY JSON via the provided function schema; omit null/unused keys.",
    "CRITICAL: For each word, provide an English translation in the 'translation' field.",
    "Emphasize agglutinative morphology: identify lexical roots and decompose ALL individual suffixes in linear order.",
    "For each token: provide root (if recoverable), suffix_chain[] with INDIVIDUAL morphemes {type, form, gloss?, function?}, AND morphological_components[] for UI display.",
    "CRITICAL: Break down complex suffixes into individual morphemes. For example, Turkish '-diğinde' should be split into '-diğin' + '-de', not kept as one unit.",
    "Fill features sparsely (number, case, person, tense, mood, polarity, possessive, evidentiality, voice, aspect).",
    "Use UPOS; include XPOS when helpful. Syntax uses 0-based heads (0=no head/root, 1..n=valid heads); UD-style deprels.",
    "If input has mistakes: keep original_sentence, set normalized to corrected form IN THE SAME LANGUAGE, and populate errors[]. NEVER translate to a different language.",
    "Add 1–3 teaching_notes (CEFR A2–B1) with contrastive minimal pairs."
  ].join(" "),
  semitic: [
    "You are Grammario analyzing a Semitic sentence (Arabic, Hebrew, Aramaic, etc.).",
    "IMPORTANT: Analyze the sentence as-is in the source Semitic language. Do NOT translate or convert to any other language.",
    "Output ONLY JSON via the provided function schema; omit null/unused keys.",
    "CRITICAL: For each word, provide an English translation in the 'translation' field.",
    "Emphasize root-and-template morphology: identify consonantal root, template/pattern, vocalization, and any affixes with positions.",
    "For each token: root_consonants, template (e.g., CaCaC), pattern_label (e.g., binyan/Form), vocalization if known, affixes[].",
    "Fill features sparsely (person, number, gender, tense, aspect, mood, state, definiteness, part).",
    "Use UPOS; include XPOS when helpful. Syntax uses 0-based heads (0=no head/root, 1..n=valid heads); UD-style deprels.",
    "If input has mistakes: keep original_sentence, set normalized to corrected form IN THE SAME LANGUAGE, and populate errors[]. NEVER translate to a different language.",
    "Add 1–3 teaching_notes (CEFR A2–B1) with contrastive minimal pairs."
  ].join(" "),
  slavic: [
    "You are Grammario analyzing a Slavic sentence (Russian, Polish, Czech, etc.).",
    "IMPORTANT: Analyze the sentence as-is in the source Slavic language. Do NOT translate or convert to any other language.",
    "Output ONLY JSON via the provided function schema; omit null/unused keys.",
    "CRITICAL: For each word, provide an English translation in the 'translation' field.",
    "Emphasize fusional inflection and prefixes: for each token, identify prefix_chain, stem, ending, and any stem_mutation.",
    "Populate features sparsely: case/number/gender for nominals; person/number/tense/mood/aspect/voice for verbs.",
    "Use UPOS; include XPOS when helpful. Syntax uses 0-based heads (0=no head/root, 1..n=valid heads); UD-style deprels.",
    "If input has mistakes: keep original_sentence, set normalized to corrected form IN THE SAME LANGUAGE, and populate errors[]. NEVER translate to a different language.",
    "Add 1–3 teaching_notes (CEFR A2–B1) with contrastive minimal pairs."
  ].join(" "),
  romance: [
    "You are Grammario analyzing a Romance sentence (Spanish, Italian, French, etc.).",
    "IMPORTANT: Analyze the sentence as-is in the source Romance language. Do NOT translate or convert to any other language.",
    "Output ONLY JSON via the provided function schema; omit null/unused keys.",
    "CRITICAL: For each word, provide an English translation in the 'translation' field.",
    "Focus on CONJUGATION and meaningful inflection, NOT artificial morphological breakdown.",
    "For VERBS: provide stem/ending breakdown with conjugation_class, irregular_stem flag, person/number/tense/mood/aspect.",
    "For NOUNS/ADJECTIVES: only provide stem/ending if there is actual inflection (gender/number agreement). Simple words like 'casa', 'sopra', 'che' should have empty stem/ending.",
    "For FUNCTION WORDS (prepositions, pronouns, determiners): do NOT provide stem/ending breakdown - these are monomorphemic.",
    "Use UPOS; include XPOS when helpful. Syntax uses 0-based heads (0=no head/root, 1..n=valid heads); UD-style deprels.",
    "If input has mistakes: keep original_sentence, set normalized to corrected form IN THE SAME LANGUAGE, and populate errors[]. NEVER translate to a different language.",
    "Add 1–3 teaching_notes (CEFR A2–B1) with contrastive minimal pairs."
  ].join(" "),
  germanic: [
    "You are Grammario analyzing a Germanic sentence (English, German, Dutch, etc.).",
    "IMPORTANT: Analyze the sentence as-is in the source Germanic language. Do NOT translate or convert to any other language.",
    "Output ONLY JSON via the provided function schema; omit null/unused keys.",
    "CRITICAL: For each word, provide an English translation in the 'translation' field.",
    "Emphasize compounding, separable prefixes, and internal changes: list compound_parts, separable_prefix, suffix_chain, and internal_change if any.",
    "Populate features sparsely (person/number/tense/mood; comparison; noun_number). strong_verb_grade when relevant.",
    "Use UPOS; include XPOS when helpful. Syntax uses 0-based heads (0=no head/root, 1..n=valid heads); UD-style deprels.",
    "If input has mistakes: keep original_sentence, set normalized to corrected form IN THE SAME LANGUAGE, and populate errors[]. NEVER translate to a different language.",
    "Add 1–3 teaching_notes (CEFR A2–B1) with contrastive minimal pairs."
  ].join(" "),
};

/* ================================
   Tool (function) builders per family
==================================*/

function toolFor(name: string, schema: z.ZodTypeAny) {
  // Generate schema and resolve $ref to avoid OpenAI issues (same logic as grammarioTools)
  const rawSchema = zodToJsonSchema(schema, { name }) as any;
  
  // Extract the actual schema from definitions if using $ref
  let resolvedSchema;
  if (rawSchema.$ref && rawSchema.definitions) {
    const refName = rawSchema.$ref.replace("#/definitions/", "");
    resolvedSchema = rawSchema.definitions[refName];
  } else {
    resolvedSchema = rawSchema;
  }
  
  // Ensure we have a clean schema without $ref
  const { $schema, definitions, $ref, ...cleanSchema } = resolvedSchema;
  const params = {
    type: "object" as const,
    ...cleanSchema,
  };
  
  return [
    {
      type: "function" as const,
      function: {
        name: "analyze_sentence",
        description: "Return token-level grammar+morphology+syntax analysis and teaching notes",
        parameters: params
      }
    }
  ] as const;
}

export function toolsForFamily(family: Family) {
  switch (family) {
    case "turkic":   return toolFor("TurkicAnalysis", TurkicAnalysisSchema);
    case "semitic":  return toolFor("SemiticAnalysis", SemiticAnalysisSchema);
    case "slavic":   return toolFor("SlavicAnalysis", SlavicAnalysisSchema);
    case "romance":  return toolFor("RomanceAnalysis", RomanceAnalysisSchema);
    case "germanic": return toolFor("GermanicAnalysis", GermanicAnalysisSchema);
  }
}

/* ================================
   Narrow validators per family
==================================*/

export function parseByFamily(family: Family, payload: unknown) {
  switch (family) {
    case "turkic":   return TurkicAnalysisSchema.parse(payload);
    case "semitic":  return SemiticAnalysisSchema.parse(payload);
    case "slavic":   return SlavicAnalysisSchema.parse(payload);
    case "romance":  return RomanceAnalysisSchema.parse(payload);
    case "germanic": return GermanicAnalysisSchema.parse(payload);
  }
}

/** Helper: convert 1-based indices to 0-based for consistency */
function convertToZeroBasedIndexing<T extends { tokens: { head?: number }[]; syntax?: { root?: number; dependencies?: { head: number; dependent: number; relation: string }[] } }>(analysis: T): T {
  // Convert token head indices from 1-based to 0-based
  analysis.tokens.forEach(token => {
    if (token.head !== undefined && token.head > 0) {
      token.head = token.head - 1;
    }
  });
  
  // Convert syntax root from 1-based to 0-based
  if (analysis.syntax?.root !== undefined && analysis.syntax.root > 0) {
    analysis.syntax.root = analysis.syntax.root - 1;
  }
  
  // Convert dependency indices from 1-based to 0-based
  if (analysis.syntax?.dependencies) {
    analysis.syntax.dependencies.forEach(dep => {
      if (dep.head > 0) dep.head = dep.head - 1;
      if (dep.dependent > 0) dep.dependent = dep.dependent - 1;
    });
  }
  
  return analysis;
}

/** Optional post-parse checks + cleanup */
export function normalizeAndCheck<T extends { tokens: { head?: number }[]; syntax?: { root?: number; dependencies?: { head: number; dependent: number; relation: string }[] } }>(analysis: T): T {
  // Convert from 1-based to 0-based indexing if needed
  const converted = convertToZeroBasedIndexing(analysis);
  assertHeadsWithinBounds(converted.tokens, converted.syntax?.root);
  // ensure normalized fallback if absent
  if ((converted as any).normalized == null) {
    (converted as any).normalized = (converted as any).original_sentence;
  }
  return deepOmitNullish(converted);
}

/* ================================
   Language to family mapping
==================================*/

export const LANGUAGE_TO_FAMILY: Record<string, Family> = {
  // Germanic
  "english": "germanic",
  "german": "germanic",
  "norwegian": "germanic",
  "danish": "germanic",
  "icelandic": "germanic",
  
  // Romance
  "spanish": "romance",
  "italian": "romance",
  "portuguese": "romance",
  "romanian": "romance",
  "catalan": "romance",
  
  // Slavic
  "russian": "slavic",
  "ukrainian": "slavic",
  "slovak": "slavic",
  "bulgarian": "slavic",
  "serbian": "slavic",
  "croatian": "slavic",
  "slovenian": "slavic",
  
  // Turkic
  "turkish": "turkic",
  "azerbaijani": "turkic",
  "kazakh": "turkic",
  "uzbek": "turkic",
  "kyrgyz": "turkic",
  "turkmen": "turkic",
  
  // Semitic
  "arabic": "semitic",
  "hebrew": "semitic",
  "aramaic": "semitic",
  "amharic": "semitic",
  "tigrinya": "semitic",
  "maltese": "semitic"
};

/** Detect language family from language hint or default to Germanic */
export function detectFamily(languageHint?: string): Family {
  if (!languageHint) return "germanic"; // Default fallback
  
  const normalizedLanguage = languageHint.toLowerCase().trim();
  return LANGUAGE_TO_FAMILY[normalizedLanguage] || "germanic";
}
