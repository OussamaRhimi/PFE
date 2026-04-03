/**
 * Sprint 3: JSON parsing utilities
 * @file src/utils/json.ts
 */

/**
 * Extracts JSON from a string that may contain markdown code fences or extra text.
 * Handles cases where LLM returns ```json...``` wrapped content.
 */
export function extractJsonFromText(text: string): string {
  let cleaned = text.trim();

  // Handle ```json ... ``` blocks
  const jsonBlockMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonBlockMatch) {
    cleaned = jsonBlockMatch[1].trim();
  }

  // Find the first { and last } to extract JSON object
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');

  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.substring(firstBrace, lastBrace + 1);
  }

  return cleaned;
}

/**
 * Safely parses JSON from LLM output, handling common issues
 */
export function safeParseJson<T = unknown>(text: string): T | null {
  try {
    const cleaned = extractJsonFromText(text);
    return JSON.parse(cleaned) as T;
  } catch (error) {
    console.error('Failed to parse JSON:', error);
    console.error('Input text:', text.substring(0, 500));
    return null;
  }
}

export type JsonParseRecovery<T> =
  | { ok: true; value: T; recovered: boolean }
  | { ok: false; error: Error };

/**
 * Parse JSON with a recovery pass (code fences, trailing commas, extra text).
 */
export function parseJsonWithRecovery<T = unknown>(text: string): JsonParseRecovery<T> {
  try {
    return { ok: true, value: JSON.parse(text) as T, recovered: false };
  } catch (error) {
    try {
      const cleaned = extractJsonFromText(text);
      const normalized = cleaned.replace(/,\s*([}\]])/g, '$1');
      return { ok: true, value: JSON.parse(normalized) as T, recovered: true };
    } catch (inner) {
      const err = inner instanceof Error
        ? inner
        : error instanceof Error
          ? error
          : new Error('Failed to parse JSON');
      return { ok: false, error: err };
    }
  }
}

/**
 * Validates that the parsed data has required fields for ExtractedData
 */
export function validateExtractedData(data: unknown): boolean {
  if (!data || typeof data !== 'object') {
    return false;
  }

  const obj = data as Record<string, unknown>;

  if (!obj.contact || typeof obj.contact !== 'object') {
    return false;
  }

  if (!Array.isArray(obj.skills)) {
    return false;
  }

  if (!Array.isArray(obj.experience)) {
    return false;
  }

  return true;
}

/**
 * Ensures arrays exist and are properly typed
 */
export function ensureArray<T>(value: unknown): T[] {
  if (Array.isArray(value)) {
    return value as T[];
  }
  return [];
}

/**
 * Ensures string value
 */
export function ensureString(value: unknown): string {
  if (typeof value === 'string') {
    return value;
  }
  return '';
}
