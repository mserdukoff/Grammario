import { AnalysisSchema, type Analysis } from "@/lib/grammario";
import { detectFamily, parseByFamily } from "@/lib/grammario-groups";
import { auth } from "@/lib/firebase";

export async function analyze(sentence: string, languageHint?: string, userId?: string | null): Promise<Analysis> {
  try {
    // Get current user if userId not provided
    const currentUserId = userId !== undefined ? userId : (auth.currentUser?.uid || null);
    
    const r = await fetch("/api/grammario/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sentence, languageHint, userId: currentUserId }),
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
    const family = detectFamily(languageHint);
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
