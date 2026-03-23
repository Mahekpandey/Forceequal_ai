import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize the Gemini client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// Gemini 2.5 Flash — fast JSON generation; split API routes avoid per-invocation timeouts on Vercel.
export const MODEL_NAME = 'gemini-2.5-flash';

/** Default cap for agents that emit JSON-wrapped markdown (insight / executor). */
const DEFAULT_MAX_OUTPUT = 12288;

/**
 * Planner packs four long markdown sections into one JSON object; 8k tokens routinely truncates
 * mid-string and breaks JSON.parse. Keep this high enough for a complete response.
 */
const PLANNER_MAX_OUTPUT = 16384;

export function getModel() {
  return genAI.getGenerativeModel({
    model: MODEL_NAME,
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: DEFAULT_MAX_OUTPUT,
      responseMimeType: 'application/json',
    },
  });
}

export function getPlannerModel() {
  return genAI.getGenerativeModel({
    model: MODEL_NAME,
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: PLANNER_MAX_OUTPUT,
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
  let escape = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    if (!inString) {
      if (char === '"') inString = true;
      result += char;
      continue;
    }

    // Inside JSON string
    if (escape) {
      result += char;
      escape = false;
      continue;
    }

    if (char === '\\') {
      result += char;
      escape = true;
      continue;
    }

    if (char === '"') {
      inString = false;
      result += char;
      continue;
    }

    if (char === '\n') {
      result += '\\n';
    } else if (char === '\r') {
      // Skip carriage returns inside strings
    } else if (char === '\t') {
      result += '\\t';
    } else {
      result += char;
    }
  }

  return result;
}

export function extractFirstJsonObject(text: string): string | null {
  const start = text.indexOf('{');
  if (start === -1) return null;

  let depth = 0;
  let inString = false;
  let escape = false;

  for (let i = start; i < text.length; i++) {
    const char = text[i];

    if (inString) {
      if (escape) {
        escape = false;
        continue;
      }
      if (char === '\\') {
        escape = true;
        continue;
      }
      if (char === '"') inString = false;
      continue;
    }

    if (char === '"') {
      inString = true;
      continue;
    }

    if (char === '{') depth++;
    if (char === '}') {
      depth--;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }

  return null;
}

function tryParseJson<T>(text: string): T | null {
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

export function safeParseJson<T = unknown>(raw: string): T {
  const trimmed = raw.trim();
  const variants = [trimmed, cleanJSON(trimmed)];

  for (const variant of variants) {
    const extracted = extractFirstJsonObject(variant) ?? variant;
    const noTrailingCommas = extracted.replace(/,\s*([}\]])/g, '$1');

    const parsed1 = tryParseJson<T>(extracted);
    if (parsed1 !== null) return parsed1;

    const parsed2 = tryParseJson<T>(noTrailingCommas);
    if (parsed2 !== null) return parsed2;
  }

  // Give caller a better error context without flooding logs.
  const preview = trimmed.length > 400 ? `${trimmed.slice(0, 400)}...` : trimmed;
  throw new Error(`Failed to parse model JSON. Preview: ${preview}`);
}