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
        ...(errorObj.cause !== undefined ? { cause: errorObj.cause } : {}),
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

export interface AdminLog {
  timestamp: Timestamp;
  endpoint: string;
  method: string;
  userId?: string | null;
  userAgent?: string;
  rawInput?: any;
  rawLLMOutput?: any;
  responseData?: any;
  statusCode: number;
  duration?: number;
  error?: any;
}

/**
 * Logs all API calls to admin_logs collection
 * This logs everything including raw input and raw LLM output, even for non-authenticated users
 */
export async function logAdminCall(log: {
  endpoint: string;
  method: string;
  userId?: string | null;
  userAgent?: string;
  rawInput?: any;
  rawLLMOutput?: any;
  responseData?: any;
  statusCode: number;
  duration?: number;
  error?: any;
}): Promise<void> {
  try {
    const adminLog: any = {
      timestamp: Timestamp.now(),
      endpoint: log.endpoint,
      method: log.method,
      userId: log.userId || null,
      userAgent: log.userAgent || undefined,
      statusCode: log.statusCode,
      duration: log.duration,
      error: log.error ? (log.error instanceof Error 
        ? { message: log.error.message, name: log.error.name, stack: log.error.stack }
        : log.error) : undefined,
    };

    // Store rawInput as an object (map) for better querying in Firestore
    if (log.rawInput) {
      adminLog.rawInput = typeof log.rawInput === 'string' 
        ? JSON.parse(log.rawInput) 
        : log.rawInput;
    }

    // Store rawLLMOutput - keep as object if it's an object, otherwise stringify
    if (log.rawLLMOutput) {
      if (typeof log.rawLLMOutput === 'string') {
        adminLog.rawLLMOutput = log.rawLLMOutput;
      } else if (log.rawLLMOutput && typeof log.rawLLMOutput === 'object') {
        // Store the full LLM response object, including rawFunctionArguments if present
        adminLog.rawLLMOutput = log.rawLLMOutput;
        
        // Extract rawFunctionArguments as a separate top-level field for easy access
        if (log.rawLLMOutput.rawFunctionArguments) {
          adminLog.rawFunctionArguments = typeof log.rawLLMOutput.rawFunctionArguments === 'string' 
            ? log.rawLLMOutput.rawFunctionArguments 
            : JSON.stringify(log.rawLLMOutput.rawFunctionArguments);
        }
      } else {
        adminLog.rawLLMOutput = JSON.stringify(log.rawLLMOutput, null, 2);
      }
    }

    // Store responseData as an object (map) for better querying in Firestore
    if (log.responseData) {
      adminLog.responseData = typeof log.responseData === 'string' 
        ? JSON.parse(log.responseData) 
        : log.responseData;
    }

    // Sanitize the admin log to prevent Firebase errors
    const sanitized = sanitizeForFirebase(adminLog);
    
    // Log to console for debugging
    console.log('[AdminLog] Attempting to save:', {
      endpoint: log.endpoint,
      method: log.method,
      statusCode: log.statusCode,
      hasUserId: !!log.userId,
    });
    
    await addDoc(collection(db, 'admin_logs'), sanitized);
    console.log('[AdminLog] Successfully saved to database:', log.endpoint, log.method, log.statusCode);
  } catch (logError: any) {
    // If admin logging itself fails, log the error with details
    console.error('[AdminLog] Failed to save to database:', logError);
    console.error('[AdminLog] Error details:', {
      message: logError?.message,
      code: logError?.code,
      codeName: logError?.codeName,
      stack: logError?.stack,
    });
    console.error('[AdminLog] Original log data:', {
      endpoint: log.endpoint,
      method: log.method,
      statusCode: log.statusCode,
      userId: log.userId,
    });
    // Don't re-throw - we don't want logging failures to break the API
  }
}

