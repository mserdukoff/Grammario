import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { db } from './firebase';

export interface ErrorLog {
  timestamp: Timestamp;
  errorType: string;
  errorMessage: string;
  errorDetails?: any;
  stackTrace?: string;
  endpoint?: string;
  requestData?: any;
  fullLLMResponse?: string;
  httpStatus?: number;
  userId?: string;
  userAgent?: string;
}

/**
 * Logs an error to the Firebase database
 * This includes all error details and full LLM responses when applicable
 */
export async function logError(error: {
  error: Error | any;
  endpoint?: string;
  requestData?: any;
  fullLLMResponse?: string;
  httpStatus?: number;
  userId?: string;
  userAgent?: string;
}): Promise<void> {
  try {
    const errorObj = error.error;
    const errorMessage = errorObj?.message || String(errorObj) || 'Unknown error';
    const stackTrace = errorObj?.stack || undefined;
    const errorType = errorObj?.name || errorObj?.constructor?.name || 'Error';

    const errorLog: ErrorLog = {
      timestamp: Timestamp.now(),
      errorType,
      errorMessage,
      errorDetails: errorObj instanceof Error ? {
        name: errorObj.name,
        message: errorObj.message,
        ...(errorObj.cause && { cause: errorObj.cause }),
      } : errorObj,
      stackTrace,
      endpoint: error.endpoint,
      requestData: error.requestData ? JSON.parse(JSON.stringify(error.requestData)) : undefined,
      fullLLMResponse: typeof error.fullLLMResponse === 'string' 
        ? error.fullLLMResponse 
        : error.fullLLMResponse 
          ? JSON.stringify(error.fullLLMResponse, null, 2)
          : undefined,
      httpStatus: error.httpStatus,
      userId: error.userId,
      userAgent: error.userAgent,
    };

    // Sanitize the error log to prevent Firebase errors
    const sanitized = sanitizeForFirebase(errorLog);
    
    await addDoc(collection(db, 'error_logs'), sanitized);
    console.log('Error logged to database:', errorMessage);
  } catch (logError) {
    // If error logging itself fails, just console.error
    console.error('Failed to log error to database:', logError);
    console.error('Original error:', error.error);
  }
}

/**
 * Sanitizes an object to be safe for Firebase storage
 */
function sanitizeForFirebase(obj: any): any {
  if (obj === undefined) return null;
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return Timestamp.fromDate(obj);
  if (obj instanceof Timestamp) return obj;
  if (Array.isArray(obj)) return obj.map(sanitizeForFirebase);
  
  const sanitized: any = {};
  for (const [key, value] of Object.entries(obj)) {
    const sanitizedValue = sanitizeForFirebase(value);
    if (sanitizedValue !== null) {
      sanitized[key] = sanitizedValue;
    }
  }
  return sanitized;
}

