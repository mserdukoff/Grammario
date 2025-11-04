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
import { logError, logAdminCall } from "@/lib/error-logger";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const SYSTEM = [
  "You are Grammario, a multilingual grammar & morphology analyst and teacher.",
  "Return ONLY JSON via the provided function schema (no prose).",
  "Prefer UPOS; include xpos when helpful.",
  "Morphology must be sparse; omit absent/null keys entirely.",
  "CRITICAL: For each word, provide morphological_components that break down the word into its constituent parts (root/stem + affixes).",
  "For agglutinative languages (Turkish, Finnish, etc.), always decompose complex words into their morphemes.",
  "Example: Turkish 'köyde' → [{type:'root', form:'köy', meaning:'village'}, {type:'suffix', form:'de', function:'locative'}]",
  "For inflected words in any language, show the decomposition (e.g., 'running' → 'run' + 'ing').",
  "If mistakes exist: keep original_sentence intact; set normalized to the correction and add errors[].",
  "Add 1–3 teaching_notes (CEFR A2–B1) explaining morphological processes when relevant.",
  "Syntax: UD-like dependencies; 1-based heads (1..n) or 0 for root tokens with no head.",
  "If uncertain, output minimal analysis (text + lemma + upos).",
  "No over-correction: if acceptable, normalized == original_sentence and errors == [].",
].join(" ");

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  let sentence: string | undefined;
  let languageHint: string | undefined;
  let userId: string | null | undefined;
  let family: Family | undefined;
  let rawInput: any;
  let rawLLMOutput: any;
  
  try {
    // Check API key first
    if (!process.env.OPENAI_API_KEY) {
      const duration = Date.now() - startTime;
      await logAdminCall({
        endpoint: '/api/grammario/analyze',
        method: 'POST',
        userId: null,
        userAgent: req.headers.get('user-agent') || undefined,
        rawInput: null,
        statusCode: 500,
        duration,
        error: { message: 'OpenAI API key not configured' },
      }).catch(() => {});
      return NextResponse.json({ error: "OpenAI API key not configured" }, { status: 500 });
    }

    const requestBody = await req.json();
    ({ sentence, languageHint, userId } = requestBody);
    
    // Store complete raw input including the full request body
    rawInput = {
      ...requestBody,
      sentence,
      languageHint,
      userId: userId || null,
    };
    
    if (!sentence || typeof sentence !== "string") {
      const duration = Date.now() - startTime;
      await logAdminCall({
        endpoint: '/api/grammario/analyze',
        method: 'POST',
        userId: userId || null,
        userAgent: req.headers.get('user-agent') || undefined,
        rawInput: rawInput,
        statusCode: 400,
        duration,
        error: { message: 'Missing sentence string' },
      }).catch(() => {});
      return NextResponse.json({ error: "Missing 'sentence' string" }, { status: 400 });
    }

    // Detect language family and get appropriate tools/prompt
    family = detectFamily(languageHint);
    const tools = toolsForFamily(family);
    const systemPrompt = FAMILY_SYSTEM_PROMPT[family];
    
    // Update rawInput to include detected family
    rawInput = {
      ...rawInput,
      family: family,
    };

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
      rawLLMOutput = resp;
    } catch (apiError) {
      console.error("OpenAI API Error:", apiError);
      const duration = Date.now() - startTime;
      rawLLMOutput = apiError;
      
      // Log to admin_logs
      await logAdminCall({
        endpoint: '/api/grammario/analyze',
        method: 'POST',
        userId: userId || null,
        userAgent: req.headers.get('user-agent') || undefined,
        rawInput: rawInput,
        rawLLMOutput: rawLLMOutput,
        statusCode: 502,
        duration,
        error: apiError instanceof Error ? apiError : { message: String(apiError) },
      }).catch(() => {});
      
      // Log error to database with full LLM response context
      await logError({
        error: apiError,
        endpoint: '/api/grammario/analyze',
        requestData: { sentence, languageHint, family },
        httpStatus: 502,
        userAgent: req.headers.get('user-agent') || undefined,
      }).catch(err => console.error('Failed to log error:', err));
      
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
      const errorDetails = {
        choices: resp.choices?.length || 0,
        message: resp.choices[0]?.message,
        hasToolCalls: !!resp.choices[0]?.message?.tool_calls,
        toolCallsLength: resp.choices[0]?.message?.tool_calls?.length || 0
      };
      console.error("OpenAI Response Debug:", errorDetails);
      const duration = Date.now() - startTime;
      
      // Log to admin_logs
      await logAdminCall({
        endpoint: '/api/grammario/analyze',
        method: 'POST',
        userId: userId || null,
        userAgent: req.headers.get('user-agent') || undefined,
        rawInput: rawInput,
        rawLLMOutput: rawLLMOutput,
        statusCode: 502,
        duration,
        error: { message: 'Model did not return function arguments' },
      }).catch(() => {});
      
      // Log error with full LLM response
      await logError({
        error: new Error("Model did not return function arguments"),
        endpoint: '/api/grammario/analyze',
        requestData: { sentence, languageHint, family },
        fullLLMResponse: JSON.stringify(resp, null, 2),
        httpStatus: 502,
        userAgent: req.headers.get('user-agent') || undefined,
      }).catch(err => console.error('Failed to log error:', err));
      
      return NextResponse.json({ error: "Model did not return function arguments" }, { status: 502 });
    }

    // Debug: Log the raw function arguments before parsing
    console.log("Raw function arguments:", toolCall.function.arguments);
    console.log("Arguments type:", typeof toolCall.function.arguments);
    console.log("Arguments length:", toolCall.function.arguments?.length || 0);

    // 1) Parse JSON, 2) Family-specific Zod-validate, 3) Sanity checks, 4) Clean nulls
    let raw;
    let rawFunctionArguments: string | undefined;
    try {
      rawFunctionArguments = toolCall.function.arguments;
      raw = JSON.parse(rawFunctionArguments);

    } catch (parseError) {
      console.error("JSON Parse Error:", parseError);
      console.error("Failed to parse:", toolCall.function.arguments);
      const duration = Date.now() - startTime;
      
      // Log to admin_logs
      await logAdminCall({
        endpoint: '/api/grammario/analyze',
        method: 'POST',
        userId: userId || null,
        userAgent: req.headers.get('user-agent') || undefined,
        rawInput: rawInput,
        rawLLMOutput: rawLLMOutput,
        statusCode: 502,
        duration,
        error: parseError instanceof Error ? parseError : { message: String(parseError) },
      }).catch(() => {});
      
      // Log error with full faulty LLM response
      await logError({
        error: parseError instanceof Error ? parseError : new Error(String(parseError)),
        endpoint: '/api/grammario/analyze',
        requestData: { sentence, languageHint, family },
        fullLLMResponse: toolCall.function.arguments || JSON.stringify(resp, null, 2),
        httpStatus: 502,
        userAgent: req.headers.get('user-agent') || undefined,
      }).catch(err => console.error('Failed to log error:', err));
      
      return NextResponse.json({ 
        error: "Invalid JSON in model response", 
        details: parseError instanceof Error ? parseError.message : "Unknown parse error",
        rawResponse: toolCall.function.arguments?.slice(0, 500) // First 500 chars for debugging
      }, { status: 502 });
    }
    
    // Parse using family-specific schema for better validation
    const parsed = parseByFamily(family, raw);
    const clean = normalizeAndCheck(parsed);
    const duration = Date.now() - startTime;

    // Log successful request to admin_logs
    // Include rawFunctionArguments as a separate field in rawLLMOutput for easy access
    const rawLLMOutputWithArgs = rawLLMOutput ? {
      ...rawLLMOutput,
      rawFunctionArguments: rawFunctionArguments,
    } : { rawFunctionArguments: rawFunctionArguments };
    
    await logAdminCall({
      endpoint: '/api/grammario/analyze',
      method: 'POST',
      userId: userId || null,
      userAgent: req.headers.get('user-agent') || undefined,
      rawInput: rawInput,
      rawLLMOutput: rawLLMOutputWithArgs,
      responseData: clean,
      statusCode: 200,
      duration,
    }).catch((err) => {
      console.error('Failed to log admin call (non-blocking):', err);
    });

    return NextResponse.json(clean, { status: 200 });
  } catch (err: any) {
    const duration = Date.now() - startTime;
    
    if (err instanceof ZodError) {
      const summary = err.issues
        .map((i) => `${(i.path && i.path.join(".")) || "(root)"}: ${i.message}`)
        .slice(0, 6)
        .join("; ");
      
      // Log to admin_logs
      await logAdminCall({
        endpoint: '/api/grammario/analyze',
        method: 'POST',
        userId: userId || null,
        userAgent: req.headers.get('user-agent') || undefined,
        rawInput: rawInput,
        rawLLMOutput: rawLLMOutput,
        statusCode: 422,
        duration,
        error: err,
      }).catch(() => {});
      
      // Log validation error
      await logError({
        error: err,
        endpoint: '/api/grammario/analyze',
        requestData: { sentence, languageHint },
        httpStatus: 422,
        userAgent: req.headers.get('user-agent') || undefined,
      }).catch(logErr => console.error('Failed to log error:', logErr));
      
      return NextResponse.json({ error: summary }, { status: 422 });
    }
    
    console.error(err);
    
    // Log to admin_logs
    await logAdminCall({
      endpoint: '/api/grammario/analyze',
      method: 'POST',
      userId: userId || null,
      userAgent: req.headers.get('user-agent') || undefined,
      rawInput: rawInput,
      rawLLMOutput: rawLLMOutput,
      statusCode: 500,
      duration,
      error: err,
    }).catch(() => {});
    
    // Log general error
    await logError({
      error: err,
      endpoint: '/api/grammario/analyze',
      httpStatus: 500,
      userAgent: req.headers.get('user-agent') || undefined,
    }).catch(logErr => console.error('Failed to log error:', logErr));
    
    return NextResponse.json({ error: err?.message || "Internal error" }, { status: 500 });
  }
}
