import { AnalysisSchema, type Analysis } from "@/lib/grammario";
import { detectFamily, parseByFamily } from "@/lib/grammario-groups";

export interface AnalyzeOptions {
  languageHint?: string;
  userId?: string;
  userName?: string;
  userEmail?: string;
  location?: string;
}

export async function analyze(sentence: string, options?: string | AnalyzeOptions): Promise<Analysis> {
  // Handle backward compatibility: if options is a string, treat it as languageHint
  const opts: AnalyzeOptions = typeof options === 'string' 
    ? { languageHint: options } 
    : (options || {});
  
  try {
    const r = await fetch("/api/grammario/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        sentence, 
        languageHint: opts.languageHint,
        userId: opts.userId,
        userName: opts.userName,
        userEmail: opts.userEmail,
        location: opts.location || (typeof window !== 'undefined' ? window.location.pathname : 'unknown'),
      }),
    });
    
    let responseData;
    try {
      responseData = await r.json();
    } catch (parseError) {
      console.error("Failed to parse API response as JSON:", parseError);
      throw new Error("Server returned invalid response format");
    }
    
    if (!r.ok) {
      const errorMessage = responseData.error || `Server error (${r.status})`;
      const errorDetails = responseData.details ? ` - ${responseData.details}` : '';
      throw new Error(`${errorMessage}${errorDetails}`);
    }
    
    // Use family-specific parsing to preserve all morphological data
    const family = detectFamily(opts.languageHint);
    const validated = parseByFamily(family, responseData);
    return validated;
  } catch (error) {
    if (error instanceof Error) {
      console.error("Analysis request failed:", error.message);
      throw error;
    }
    console.error("Unknown error during analysis:", error);
    throw new Error("An unexpected error occurred during sentence analysis");
  }
}
