import { AnalysisSchema, type Analysis } from "@/lib/grammario";

export async function analyze(sentence: string, languageHint?: string): Promise<Analysis> {
  try {
    const r = await fetch("/api/grammario/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sentence, languageHint }),
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
    
    return AnalysisSchema.parse(responseData);
  } catch (error) {
    if (error instanceof Error) {
      console.error("Analysis request failed:", error.message);
      throw error;
    }
    console.error("Unknown error during analysis:", error);
    throw new Error("An unexpected error occurred during sentence analysis");
  }
}
