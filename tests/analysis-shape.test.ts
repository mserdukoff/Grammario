import { describe, it, expect } from "vitest";
import { AnalysisSchema, assertHeadsWithinBounds } from "@/lib/grammario";

describe("Grammario Analysis schema", () => {
  it("accepts minimal valid output", () => {
    const sample = {
      original_sentence: "Les garçons mangent des pommes.",
      tokens: [{ text: "Les", upos: "DET" }],
    };
    expect(() => AnalysisSchema.parse(sample)).not.toThrow();
  });

  it("rejects out-of-range head in sanity check", () => {
    const bad = {
      original_sentence: "X",
      tokens: [{ text: "X", upos: "NOUN", head: 9 }],
      syntax: { root: 1 },
    };
    // Schema validation passes, but sanity check should fail
    const parsed = AnalysisSchema.parse(bad);
    expect(() => assertHeadsWithinBounds(parsed)).toThrow();
  });

  it("accepts head index 0 (no head)", () => {
    const good = {
      original_sentence: "Hello",
      tokens: [{ text: "Hello", upos: "INTJ", head: 0 }],
      syntax: { root: 1 },
    };
    const parsed = AnalysisSchema.parse(good);
    expect(() => assertHeadsWithinBounds(parsed)).not.toThrow();
  });

  it("accepts valid head indices", () => {
    const good = {
      original_sentence: "Hello world",
      tokens: [
        { text: "Hello", upos: "INTJ", head: 2 },
        { text: "world", upos: "NOUN", head: 2 }
      ],
      syntax: { 
        root: 2,
        dependencies: [
          { head: 2, dependent: 1, relation: "nsubj" }
        ]
      },
    };
    const parsed = AnalysisSchema.parse(good);
    expect(() => assertHeadsWithinBounds(parsed)).not.toThrow();
  });
});
