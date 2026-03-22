import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize the Gemini client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// Use 1.5-flash! It is the most stable and fastest model for Vercel deployments.
export const MODEL_NAME = 'gemini-3-pro-preview';

export function getModel() {
  return genAI.getGenerativeModel({
    model: MODEL_NAME,
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 8192,
      responseMimeType: 'application/json',
    },
  });
}

export function getEditModel() {
  return genAI.getGenerativeModel({
    model: MODEL_NAME,
    generationConfig: {
      temperature: 0.6,
      maxOutputTokens: 4096,
      responseMimeType: 'application/json',
    },
  });
}

// ============================================
// Simple in-memory cache
// ============================================
const cache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_TTL = 1000 * 60 * 30; // 30 minutes

export function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL) {
    cache.delete(key);
    return null;
  }
  return entry.data as T;
}

const MAX_CACHE_SIZE = 50;
export function setCache(key: string, data: unknown): void {
  if (cache.size >= MAX_CACHE_SIZE) {
    const firstKey = cache.keys().next().value;
    if (firstKey) cache.delete(firstKey);
  }
  cache.set(key, { data, timestamp: Date.now() });
}

export function hashInput(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return `cache_${hash}`;
}

export function cleanJSON(jsonContent: string): string {
  let text = jsonContent.trim();
  if (text.startsWith('```json')) text = text.substring(7);
  else if (text.startsWith('```')) text = text.substring(3);
  if (text.endsWith('```')) text = text.slice(0, -3);
  text = text.trim();

  let result = '';
  let inString = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    
    // Count preceding backslashes to determine if current char is escaped
    let escapeCount = 0;
    for (let j = i - 1; j >= 0 && text[j] === '\\'; j--) {
      escapeCount++;
    }
    const isEscaped = escapeCount % 2 === 1;

    if (char === '"' && !isEscaped) {
      inString = !inString;
    }

    if (inString && char === '\n') {
      result += '\\n';
    } else if (inString && char === '\r') {
      // Skip carriage returns
    } else if (inString && char === '\t') {
      result += '\\t';
    } else {
      result += char;
    }
  }
  
  return result;
}