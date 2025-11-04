import { AnalysisSchema, type Analysis } from "@/lib/grammario";
import { detectFamily, parseByFamily } from "@/lib/grammario-groups";
import { auth } from "@/lib/firebase";
import { logError } from "@/lib/error-logger";

export async function analyze(sentence: string, languageHint?: string, userId?: string | null): Promise<Analysis> {
  try {
    // Get current user if userId not provided
    const currentUserId = userId !== undefined ? userId : (auth.currentUser?.uid || null);
    
    const r = await fetch("/api/grammario/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sentence, languageHint, userId: currentUserId }),
    });
    
    // Read raw response text before attempting JSON parse
    let rawResponseText: string;
    try {
      rawResponseText = await r.text();
    } catch (textError) {
      console.error("Failed to read response text:", textError);
      // Log error even if we can't read the response
      await logError({
        error: textError instanceof Error ? textError : new Error(String(textError)),
        endpoint: '/api/grammario/analyze',
        requestData: { sentence, languageHint, userId: currentUserId },
        httpStatus: r.status,
        userId: currentUserId || undefined,
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
      }).catch(err => console.error('Failed to log error:', err));
      throw new Error("Failed to read server response");
    }
    
    let responseData;
    try {
      responseData = JSON.parse(rawResponseText);
    } catch (parseError) {
      console.error("Failed to parse API response as JSON:", parseError);
      console.error("Raw response text:", rawResponseText);
      
      // Log the error with full details including raw response
      await logError({
        error: parseError instanceof Error ? parseError : new Error(String(parseError)),
        endpoint: '/api/grammario/analyze',
        requestData: { sentence, languageHint, userId: currentUserId },
        fullLLMResponse: rawResponseText,
        httpStatus: r.status,
        userId: currentUserId || undefined,
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
      }).catch(err => console.error('Failed to log error:', err));
      
      throw new Error("Server returned invalid response format");
    }
    
    if (!r.ok) {
      const errorMessage = (responseData && typeof responseData === 'object' && responseData.error) 
        ? responseData.error 
        : `Server error (${r.status})`;
      const errorDetails = (responseData && typeof responseData === 'object' && responseData.details) 
        ? ` - ${responseData.details}` 
        : '';
      
      // Log non-OK responses as well
      await logError({
        error: new Error(`${errorMessage}${errorDetails}`),
        endpoint: '/api/grammario/analyze',
        requestData: { sentence, languageHint, userId: currentUserId },
        fullLLMResponse: rawResponseText,
        httpStatus: r.status,
        userId: currentUserId || undefined,
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
      }).catch(err => console.error('Failed to log error:', err));
      
      throw new Error(`${errorMessage}${errorDetails}`);
    }
    
    // Use family-specific parsing to preserve all morphological data
    const family = detectFamily(languageHint);
    const validated = parseByFamily(family, responseData);
    return validated;
  } catch (error) {
    if (error instanceof Error) {
      console.error("Analysis request failed:", error.message);
      // If error wasn't already logged above, log it here
      if (!error.message.includes("Server returned invalid response format") && 
          !error.message.includes("Server error") &&
          !error.message.includes("Failed to read server response")) {
        const currentUserId = userId !== undefined ? userId : (auth.currentUser?.uid || null);
        await logError({
          error: error,
          endpoint: '/api/grammario/analyze',
          requestData: { sentence, languageHint, userId: currentUserId },
          userId: currentUserId || undefined,
          userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
        }).catch(err => console.error('Failed to log error:', err));
      }
      throw error;
    }
    console.error("Unknown error during analysis:", error);
    const currentUserId = userId !== undefined ? userId : (auth.currentUser?.uid || null);
    await logError({
      error: error instanceof Error ? error : new Error(String(error)),
      endpoint: '/api/grammario/analyze',
      requestData: { sentence, languageHint, userId: currentUserId },
      userId: currentUserId || undefined,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
    }).catch(err => console.error('Failed to log error:', err));
    throw new Error("An unexpected error occurred during sentence analysis");
  }
}
