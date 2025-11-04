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
  try {
    // Check API key first
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: "OpenAI API key not configured" }, { status: 500 });
    }

    const { sentence, languageHint, userId, userName, userEmail, location } = await req.json();
    
    // Extract location from request if not provided
    const requestLocation = location || req.nextUrl.pathname;
    
    // Get IP address and other request metadata
    const ip = req.headers.get('x-forwarded-for') || 
               req.headers.get('x-real-ip') || 
               req.ip || 
               'unknown';
    const userAgent = req.headers.get('user-agent') || 'unknown';
    const referer = req.headers.get('referer') || 'unknown';
    if (!sentence || typeof sentence !== "string") {
      return NextResponse.json({ error: "Missing 'sentence' string" }, { status: 400 });
    }

    // Detect language family and get appropriate tools/prompt
    const family = detectFamily(languageHint);
    const tools = toolsForFamily(family);
    const systemPrompt = FAMILY_SYSTEM_PROMPT[family];

    // Enhanced logging for API call initiation
    const requestLogData = {
      timestamp: new Date().toISOString(),
      location: {
        apiRoute: req.nextUrl.pathname,
        clientLocation: requestLocation,
        ip: ip,
        referer: referer,
      },
      user: {
        userId: userId || 'anonymous',
        userName: userName || 'unknown',
        userEmail: userEmail || 'unknown',
      },
      request: {
        model: "gpt-4o",
        sentence,
        languageHint,
        family,
        hasApiKey: !!process.env.OPENAI_API_KEY,
        toolsLength: tools.length,
      },
    };
    
    console.log("=== Making OpenAI API Call ===");
    console.log(JSON.stringify(requestLogData, null, 2));
    console.log("==============================");

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
      const apiErrorLogData = {
        timestamp: new Date().toISOString(),
        location: {
          apiRoute: req.nextUrl.pathname,
          clientLocation: requestLocation,
          ip: ip,
        },
        user: {
          userId: userId || 'anonymous',
          userName: userName || 'unknown',
          userEmail: userEmail || 'unknown',
        },
        error: {
          type: "OpenAI API Error",
          message: apiError instanceof Error ? apiError.message : "Unknown API error",
          error: apiError,
        },
      };
      
      console.error("=== OpenAI API Error ===");
      console.error(JSON.stringify(apiErrorLogData, null, 2));
      console.error("=======================");
      return NextResponse.json({ 
        error: "OpenAI API request failed", 
        details: apiError instanceof Error ? apiError.message : "Unknown API error"
      }, { status: 502 });
    }

    // Enhanced logging with user info, location, and full response details
    const logData = {
      timestamp: new Date().toISOString(),
      location: {
        apiRoute: req.nextUrl.pathname,
        clientLocation: requestLocation,
        ip: ip,
        referer: referer,
        userAgent: userAgent,
      },
      user: {
        userId: userId || 'anonymous',
        userName: userName || 'unknown',
        userEmail: userEmail || 'unknown',
      },
      request: {
        sentence: sentence,
        languageHint: languageHint,
        family: family,
      },
      response: {
        fullResponse: resp,
        hasChoices: !!resp.choices,
        choicesLength: resp.choices?.length || 0,
        usage: resp.usage,
        model: resp.model,
        id: resp.id,
        created: resp.created,
        object: resp.object,
      },
    };
    
    console.log("=== OpenAI API Response (Full Details) ===");
    console.log(JSON.stringify(logData, null, 2));
    console.log("==========================================");

    const toolCall = resp.choices[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      const noToolCallLogData = {
        timestamp: new Date().toISOString(),
        location: {
          apiRoute: req.nextUrl.pathname,
          clientLocation: requestLocation,
          ip: ip,
        },
        user: {
          userId: userId || 'anonymous',
          userName: userName || 'unknown',
          userEmail: userEmail || 'unknown',
        },
        error: {
          type: "No Tool Call Arguments",
          choices: resp.choices?.length || 0,
          message: resp.choices[0]?.message,
          hasToolCalls: !!resp.choices[0]?.message?.tool_calls,
          toolCallsLength: resp.choices[0]?.message?.tool_calls?.length || 0,
        },
      };
      
      console.error("=== OpenAI Response Debug (No Tool Call) ===");
      console.error(JSON.stringify(noToolCallLogData, null, 2));
      console.error("=============================================");
      return NextResponse.json({ error: "Model did not return function arguments" }, { status: 502 });
    }

    // Debug: Log the raw function arguments before parsing with context
    const debugLogData = {
      timestamp: new Date().toISOString(),
      location: {
        apiRoute: req.nextUrl.pathname,
        clientLocation: requestLocation,
      },
      user: {
        userId: userId || 'anonymous',
        userName: userName || 'unknown',
      },
      debug: {
        rawFunctionArguments: toolCall.function.arguments,
        argumentsType: typeof toolCall.function.arguments,
        argumentsLength: toolCall.function.arguments?.length || 0,
      },
    };
    
    console.log("=== Raw Function Arguments Debug ===");
    console.log(JSON.stringify(debugLogData, null, 2));
    console.log("====================================");

    // 1) Parse JSON, 2) Family-specific Zod-validate, 3) Sanity checks, 4) Clean nulls
    let raw;
    try {
      raw = JSON.parse(toolCall.function.arguments);

    } catch (parseError) {
      const errorLogData = {
        timestamp: new Date().toISOString(),
        location: {
          apiRoute: req.nextUrl.pathname,
          clientLocation: requestLocation,
          ip: ip,
        },
        user: {
          userId: userId || 'anonymous',
          userName: userName || 'unknown',
          userEmail: userEmail || 'unknown',
        },
        error: {
          type: "JSON Parse Error",
          message: parseError instanceof Error ? parseError.message : "Unknown parse error",
          failedToParse: toolCall.function.arguments,
        },
      };
      
      console.error("=== JSON Parse Error ===");
      console.error(JSON.stringify(errorLogData, null, 2));
      console.error("========================");
      return NextResponse.json({ 
        error: "Invalid JSON in model response", 
        details: parseError instanceof Error ? parseError.message : "Unknown parse error",
        rawResponse: toolCall.function.arguments?.slice(0, 500) // First 500 chars for debugging
      }, { status: 502 });
    }
    
    // Parse using family-specific schema for better validation
    const parsed = parseByFamily(family, raw);
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
