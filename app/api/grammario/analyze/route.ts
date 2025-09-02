import OpenAI from "openai";
import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import {
  AnalysisSchema,
  assertHeadsWithinBounds,
  deepOmitNullish,
  type Analysis,
} from "@/lib/grammario";
import {
  detectFamily,
  toolsForFamily,
  parseByFamily,
  normalizeAndCheck,
  FAMILY_SYSTEM_PROMPT,
  type Family
} from "@/lib/grammario-groups";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const SYSTEM = [
  "You are Grammario, a multilingual grammar & morphology analyst and teacher.",
  "Return ONLY JSON via the provided function schema (no prose).",
  "Prefer UPOS; include xpos when helpful.",
  "Morphology must be sparse; omit absent/null keys entirely.",
  "CRITICAL: For each word, provide morphological_components that break down the word into its constituent parts (root/stem + affixes).",
  "CRITICAL: For each word, provide an English translation in the 'translation' field.",
  "Example token structure: {text: 'bonjour', lemma: 'bonjour', upos: 'INTJ', translation: 'hello'}",
  "For agglutinative languages (Turkish, Finnish, etc.), always decompose complex words into their morphemes.",
  "Example: Turkish 'köyde' → [{type:'root', form:'köy', meaning:'village'}, {type:'suffix', form:'de', function:'locative'}]",
  "For inflected words in any language, show the decomposition (e.g., 'running' → 'run' + 'ing').",
  "If mistakes exist: keep original_sentence intact; set normalized to the correction and add errors[].",
  "Add 1–3 teaching_notes (CEFR A2–B1) explaining morphological processes when relevant.",
  "Syntax: UD-like dependencies; 1-based heads (1..n) or 0 for root tokens with no head.",
  "If uncertain, output minimal analysis (text + lemma + upos + translation).",
  "No over-correction: if acceptable, normalized == original_sentence and errors == [].",
  "REMEMBER: Every token MUST have a 'translation' field with its English equivalent.",
].join(" ");

export async function POST(req: NextRequest) {
  try {
    // Check API key first
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: "OpenAI API key not configured" }, { status: 500 });
    }

    const { sentence, languageHint } = await req.json();
    if (!sentence || typeof sentence !== "string") {
      return NextResponse.json({ error: "Missing 'sentence' string" }, { status: 400 });
    }

    // Detect language family and get appropriate tools/prompt
    const family = detectFamily(languageHint);
    const tools = toolsForFamily(family);
    const systemPrompt = FAMILY_SYSTEM_PROMPT[family];

    console.log("Making OpenAI API call with:", {
      model: "gpt-4o",
      sentence,
      languageHint,
      family,
      hasApiKey: !!process.env.OPENAI_API_KEY,
      toolsLength: tools.length
    });

    let resp;
    try {
      resp = await client.chat.completions.create({
        model: "gpt-4o",
        temperature: 0.1,
        messages: [
          { role: "system" as const, content: systemPrompt },
          ...(languageHint ? [{ role: "user" as const, content: `language hint: ${languageHint}` }] : []),
          { role: "user" as const, content: sentence },
        ],
        tools: tools as any, // Cast to avoid readonly issues
        tool_choice: { type: "function", function: { name: "analyze_sentence" } },
      });
    } catch (apiError) {
      console.error("OpenAI API Error:", apiError);
      return NextResponse.json({ 
        error: "OpenAI API request failed", 
        details: apiError instanceof Error ? apiError.message : "Unknown API error"
      }, { status: 502 });
    }

    console.log("OpenAI API response received:", {
      hasChoices: !!resp.choices,
      choicesLength: resp.choices?.length || 0,
      usage: resp.usage
    });

    const toolCall = resp.choices[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      console.error("OpenAI Response Debug:", {
        choices: resp.choices?.length || 0,
        message: resp.choices[0]?.message,
        hasToolCalls: !!resp.choices[0]?.message?.tool_calls,
        toolCallsLength: resp.choices[0]?.message?.tool_calls?.length || 0
      });
      return NextResponse.json({ error: "Model did not return function arguments" }, { status: 502 });
    }

    // Debug: Log the raw function arguments before parsing
    console.log("Raw function arguments:", toolCall.function.arguments);
    console.log("Arguments type:", typeof toolCall.function.arguments);
    console.log("Arguments length:", toolCall.function.arguments?.length || 0);

    // 1) Parse JSON, 2) Family-specific Zod-validate, 3) Sanity checks, 4) Clean nulls
    let raw;
    try {
      raw = JSON.parse(toolCall.function.arguments);

    } catch (parseError) {
      console.error("JSON Parse Error:", parseError);
      console.error("Failed to parse:", toolCall.function.arguments);
      return NextResponse.json({ 
        error: "Invalid JSON in model response", 
        details: parseError instanceof Error ? parseError.message : "Unknown parse error",
        rawResponse: toolCall.function.arguments?.slice(0, 500) // First 500 chars for debugging
      }, { status: 502 });
    }
    
    // Parse using family-specific schema for better validation
    const parsed = parseByFamily(family, raw);
    
    // Debug: Check if translations are present after parsing
    console.log('Parsed analysis tokens:');
    parsed.tokens.forEach((token, index) => {
      console.log(`Token ${index}: "${token.text}" - translation: ${token.translation || 'MISSING'}`);
    });
    
    const clean = normalizeAndCheck(parsed);

    return NextResponse.json(clean, { status: 200 });
  } catch (err: any) {
    if (err instanceof ZodError) {
      const summary = err.issues
        .map((i) => `${(i.path && i.path.join(".")) || "(root)"}: ${i.message}`)
        .slice(0, 6)
        .join("; ");
      return NextResponse.json({ error: summary }, { status: 422 });
    }
    console.error(err);
    return NextResponse.json({ error: err?.message || "Internal error" }, { status: 500 });
  }
}
