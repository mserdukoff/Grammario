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

// Configure OpenAI client with timeout to prevent function timeouts
// Set to 50 seconds to leave buffer for function execution overhead
const OPENAI_TIMEOUT_MS = 50000; // 50 seconds

// Model selection: defaults to gpt-4o (best available model)
// Can be overridden via OPENAI_MODEL env var (e.g., "gpt-4o-mini" for faster responses)
const DEFAULT_MODEL = process.env.OPENAI_MODEL || "gpt-4o";

const client = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY,
  timeout: OPENAI_TIMEOUT_MS,
  maxRetries: 1, // Retry once for transient failures
});

// Configure route timeout for Next.js (if supported by deployment platform)
// This helps prevent FUNCTION_INVOCATION_TIMEOUT errors
// Note: This is only effective on platforms that support it (Vercel, etc.)
export const maxDuration = 60; // 60 seconds - maximum for most platforms
export const dynamic = 'force-dynamic'; // Ensure dynamic rendering

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

    const model = DEFAULT_MODEL;
    console.log("Making OpenAI API call with:", {
      model,
      sentence,
      languageHint,
      family,
      hasApiKey: !!process.env.OPENAI_API_KEY,
      toolsLength: tools.length
    });

    let resp;
    try {
      // Create a timeout promise that rejects after OPENAI_TIMEOUT_MS
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Request timeout after ${OPENAI_TIMEOUT_MS}ms`));
        }, OPENAI_TIMEOUT_MS);
      });

      // Race between the OpenAI API call and the timeout
      resp = await Promise.race([
        client.chat.completions.create({
          model,
          temperature: 0.1,
          max_tokens: 4000, // Limit response size to speed up generation
          messages: [
            { role: "system" as const, content: systemPrompt },
            ...(languageHint ? [{ role: "user" as const, content: `language hint: ${languageHint}` }] : []),
            { role: "user" as const, content: sentence },
          ],
          tools: tools as any, // Cast to avoid readonly issues
          tool_choice: { type: "function", function: { name: "analyze_sentence" } },
        }),
        timeoutPromise,
      ]);
      rawLLMOutput = resp;
    } catch (apiError: any) {
      console.error("OpenAI API Error:", apiError);
      const duration = Date.now() - startTime;
      rawLLMOutput = apiError;
      
      // Check if this is a timeout error
      const isTimeout = apiError?.message?.includes('timeout') || 
                       apiError?.code === 'ETIMEDOUT' ||
                       apiError?.code === 'ECONNABORTED' ||
                       apiError?.name === 'AbortError' ||
                       apiError?.message?.includes('TIMEOUT');
      
      const errorMessage = isTimeout 
        ? "The analysis request timed out. The sentence may be too complex or the service is experiencing high load. Please try again with a shorter sentence."
        : "OpenAI API request failed";
      
      const statusCode = isTimeout ? 504 : 502;
      
      // Log to admin_logs
      await logAdminCall({
        endpoint: '/api/grammario/analyze',
        method: 'POST',
        userId: userId || null,
        userAgent: req.headers.get('user-agent') || undefined,
        rawInput: rawInput,
        rawLLMOutput: rawLLMOutput,
        statusCode,
        duration,
        error: apiError instanceof Error ? apiError : { message: String(apiError) },
      }).catch(() => {});
      
      // Log error to database with full LLM response context
      await logError({
        error: apiError,
        endpoint: '/api/grammario/analyze',
        requestData: { sentence, languageHint, family },
        httpStatus: statusCode,
        userAgent: req.headers.get('user-agent') || undefined,
      }).catch(err => console.error('Failed to log error:', err));
      
      return NextResponse.json({ 
        error: errorMessage, 
        details: apiError instanceof Error ? apiError.message : "Unknown API error",
        isTimeout,
      }, { status: statusCode });
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
