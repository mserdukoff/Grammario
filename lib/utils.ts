import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { Timestamp } from "firebase/firestore"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getTimestampMillis(timestamp: any): number {
  if (!timestamp) return 0
  
  // If it's a Firestore Timestamp object with toMillis
  if (typeof timestamp.toMillis === 'function') {
    return timestamp.toMillis()
  }
  
  // If it's a Date object
  if (timestamp instanceof Date) {
    return timestamp.getTime()
  }
  
  // If it's a number (assume millis)
  if (typeof timestamp === 'number') {
    return timestamp
  }
  
  // If it's a plain object with seconds (serialized Timestamp)
  if (typeof timestamp === 'object' && 'seconds' in timestamp) {
    return timestamp.seconds * 1000 + (timestamp.nanoseconds || 0) / 1000000
  }
  
  // If it's a string, try to parse it
  if (typeof timestamp === 'string') {
    const date = new Date(timestamp)
    if (!isNaN(date.getTime())) {
      return date.getTime()
    }
  }
  
  return 0
}

export function formatTimestamp(timestamp: any): string {
  const millis = getTimestampMillis(timestamp)
  if (millis === 0) return 'N/A'
  return new Date(millis).toLocaleString()
}
