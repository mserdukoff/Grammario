import { collection, addDoc, Timestamp, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from './firebase';

// Admin UID from environment variable
// Set NEXT_PUBLIC_ADMIN_UID in your .env.local file
export const ADMIN_UID = process.env.NEXT_PUBLIC_ADMIN_UID || '';

export interface LLMLogEntry {
  id?: string;
  userId: string;
  timestamp: Timestamp;
  type: 'request' | 'response' | 'error';
  endpoint: string;
  requestData?: {
    sentence?: string;
    languageHint?: string;
    [key: string]: any;
  };
  responseData?: {
    rawFunctionArguments?: string;
    parsedResponse?: any;
    parsedBeforeValidation?: any;
    success: boolean;
    responseTime?: number;
    [key: string]: any;
  };
  error?: {
    message: string;
    stack?: string;
    details?: any;
  };
  metadata?: {
    statusCode?: number;
    contentType?: string;
    responseTime?: number;
    [key: string]: any;
  };
}

/**
 * Check if a user is the admin user
 */
export function isAdminUser(uid: string | null | undefined): boolean {
  if (!ADMIN_UID || !uid) {
    return false;
  }
  return uid === ADMIN_UID;
}

/**
 * Log an LLM request/response/error to Firestore
 * Only logs if the user is the admin user
 */
export async function logLLMInteraction(
  userId: string | null | undefined,
  entry: Omit<LLMLogEntry, 'userId' | 'timestamp'>
): Promise<void> {
  // Only log for admin user
  if (!isAdminUser(userId)) {
    return;
  }

  try {
    const logEntry: LLMLogEntry = {
      userId: userId!,
      timestamp: Timestamp.now(),
      ...entry,
    };

    // Sanitize data for Firestore (remove undefined values)
    const sanitized = sanitizeForFirestore(logEntry);
    
    await addDoc(collection(db, 'admin_logs'), sanitized);
  } catch (error) {
    // Don't fail the request if logging fails
    console.error('Failed to log LLM interaction:', error);
  }
}

/**
 * Fetch log entries for the admin user
 */
export async function fetchAdminLogs(
  userId: string,
  limitCount: number = 100
): Promise<LLMLogEntry[]> {
  if (!isAdminUser(userId)) {
    throw new Error('Unauthorized: Only admin users can fetch logs');
  }

  try {
    const q = query(
      collection(db, 'admin_logs'),
      where('userId', '==', userId),
      orderBy('timestamp', 'desc'),
      limit(limitCount)
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as LLMLogEntry[];
  } catch (error) {
    console.error('Failed to fetch admin logs:', error);
    throw error;
  }
}

/**
 * Sanitize object for Firestore by removing undefined values
 */
function sanitizeForFirestore(obj: any): any {
  if (obj === undefined || obj === null) {
    return null;
  }
  
  if (typeof obj !== 'object') {
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(sanitizeForFirestore);
  }
  
  if (obj instanceof Date) {
    return Timestamp.fromDate(obj);
  }
  
  if (obj instanceof Timestamp) {
    return obj;
  }
  
  const sanitized: any = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      sanitized[key] = sanitizeForFirestore(value);
    }
  }
  return sanitized;
}

