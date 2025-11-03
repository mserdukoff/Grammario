import { AnalysisSchema, type Analysis } from "@/lib/grammario";
import { detectFamily, parseByFamily } from "@/lib/grammario-groups";
import { logLLMInteraction, isAdminUser } from "@/lib/admin-logger";

export async function analyze(
  sentence: string,
  languageHint?: string,
  userId?: string | null
): Promise<Analysis> {
  try {
    const r = await fetch("/api/grammario/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sentence, languageHint, userId }),
    });
    
    // Get response text first to handle non-JSON responses
    const responseText = await r.text();
    const contentType = r.headers.get("content-type") || "";
    
    // Check if response is actually JSON
    if (!contentType.includes("application/json")) {
      console.error("Server returned non-JSON response:", {
        status: r.status,
        statusText: r.statusText,
        contentType,
        responsePreview: responseText.slice(0, 200),
      });
      throw new Error(
        `Server returned invalid response format (${r.status} ${r.statusText}). Expected JSON but got ${contentType || "unknown content type"}.`
      );
    }
    
    // Try to parse as JSON
    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch (parseError) {
      console.error("Failed to parse API response as JSON:", parseError);
      console.error("Response text:", responseText.slice(0, 500));
      throw new Error(
        `Server returned invalid JSON format. Response preview: ${responseText.slice(0, 100)}`
      );
    }
    
    if (!r.ok) {
      // Log error for admin user
      if (isAdminUser(userId) && responseData._adminLogData) {
        await logLLMInteraction(userId, {
          type: 'error',
          endpoint: '/api/grammario/analyze',
          requestData: { sentence, languageHint },
          error: {
            message: responseData.error || `Server error (${r.status})`,
            details: responseData._adminLogData,
          },
          metadata: {
            statusCode: r.status,
            contentType,
          },
        });
      }
      
      const errorMessage = responseData.error || `Server error (${r.status})`;
      const errorDetails = responseData.details ? ` - ${responseData.details}` : '';
      throw new Error(`${errorMessage}${errorDetails}`);
    }
    
    // Log successful response for admin user
    if (isAdminUser(userId) && responseData._adminLogData) {
      const adminLogData = responseData._adminLogData;
      await logLLMInteraction(userId, {
        type: 'response',
        endpoint: '/api/grammario/analyze',
        requestData: adminLogData.requestData || { sentence, languageHint },
        responseData: {
          rawFunctionArguments: adminLogData.rawFunctionArguments,
          parsedBeforeValidation: adminLogData.parsedBeforeValidation,
          success: true,
          responseTime: adminLogData.responseTime,
        },
        metadata: {
          statusCode: r.status,
          contentType,
        },
      });
      
      // Remove admin log data from response before returning
      delete responseData._adminLogData;
    }
    
    // Use family-specific parsing to preserve all morphological data
    const family = detectFamily(languageHint);
    const validated = parseByFamily(family, responseData);
    return validated;
  } catch (error) {
    // Log error for admin user
    if (isAdminUser(userId)) {
      await logLLMInteraction(userId, {
        type: 'error',
        endpoint: '/api/grammario/analyze',
        requestData: { sentence, languageHint },
        error: {
          message: error instanceof Error ? error.message : "Unknown error",
          stack: error instanceof Error ? error.stack : undefined,
          details: error,
        },
      });
    }
    
    if (error instanceof Error) {
      console.error("Analysis request failed:", error.message);
      throw error;
    }
    console.error("Unknown error during analysis:", error);
    throw new Error("An unexpected error occurred during sentence analysis");
  }
}
