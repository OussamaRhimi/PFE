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
  const parsed = parseJsonWithRecovery<T>(text);
  if ('error' in parsed) {
    console.error('Failed to parse JSON:', parsed.error);
    console.error('Input text:', text.substring(0, 500));
    return null;
  }

  return parsed.value;
}

function stripMarkdownCodeFence(input: string): string {
  const text = String(input ?? '').trim();
  const fenced = /^```(?:json)?\s*([\s\S]*?)\s*```$/i.exec(text);
  return fenced?.[1]?.trim() ?? text;
}

function countUnescapedDoubleQuotes(input: string): number {
  let count = 0;
  let escaped = false;

  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (ch === '\\') {
      escaped = true;
      continue;
    }
    if (ch === '"') count++;
  }

  return count;
}

function balanceJsonClosers(input: string): string {
  let inString = false;
  let escaped = false;
  const stack: string[] = [];
  const out: string[] = [];

  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    out.push(ch);

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (ch === '\\') {
        escaped = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }

    if (ch === '"') {
      inString = true;
      continue;
    }
    if (ch === '{') stack.push('}');
    else if (ch === '[') stack.push(']');
    else if (ch === '}' || ch === ']') {
      if (stack.length && stack[stack.length - 1] === ch) stack.pop();
    }
  }

  if (inString) out.push('"');
  while (stack.length) out.push(stack.pop() as string);
  return out.join('');
}

function normalizeJsonStringContent(input: string): string {
  let inString = false;
  let escaped = false;
  const out: string[] = [];

  for (let i = 0; i < input.length; i++) {
    const ch = input[i];

    if (inString) {
      if (escaped) {
        if ('"\\/bfnrtu'.includes(ch)) out.push(ch);
        else out.push('\\', ch);
        escaped = false;
        continue;
      }

      if (ch === '\\') {
        out.push(ch);
        escaped = true;
        continue;
      }
      if (ch === '"') {
        out.push(ch);
        inString = false;
        continue;
      }
      if (ch === '\n') {
        out.push('\\n');
        continue;
      }
      if (ch === '\r') {
        out.push('\\r');
        continue;
      }
      if (ch === '\t') {
        out.push('\\t');
        continue;
      }
      out.push(ch);
      continue;
    }

    out.push(ch);
    if (ch === '"') inString = true;
  }

  return out.join('');
}

function repairLikelyJson(input: string): string {
  let out = stripMarkdownCodeFence(input);
  out = out.replace(/^\uFEFF/, '');
  out = out.replace(/[“”]/g, '"').replace(/[‘’]/g, "'");
  out = out.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, ' ');
  out = normalizeJsonStringContent(out);
  out = out.replace(/,\s*([}\]])/g, '$1').trim();

  if (countUnescapedDoubleQuotes(out) % 2 !== 0) out += '"';
  return balanceJsonClosers(out).trim();
}

function extractLikelyJsonObject(input: string): string | null {
  const text = stripMarkdownCodeFence(input);
  const objStart = text.indexOf('{');
  const arrStart = text.indexOf('[');
  let start = -1;

  if (objStart !== -1 && arrStart !== -1) start = Math.min(objStart, arrStart);
  else start = objStart !== -1 ? objStart : arrStart;
  if (start === -1) return null;

  let inString = false;
  let escaped = false;
  const stack: string[] = [];

  for (let i = start; i < text.length; i++) {
    const ch = text[i];

    if (inString) {
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }

    if (ch === '"') {
      inString = true;
      continue;
    }
    if (ch === '{') stack.push('}');
    else if (ch === '[') stack.push(']');
    else if (ch === '}' || ch === ']') {
      if (!stack.length) continue;
      if (stack[stack.length - 1] === ch) stack.pop();
      if (!stack.length) return text.slice(start, i + 1).trim();
    }
  }

  return repairLikelyJson(text.slice(start));
}

export type JsonParseRecovery<T> =
  | { ok: true; value: T; recovered: boolean }
  | { ok: false; error: Error };

/**
 * Parse JSON with a recovery pass (code fences, trailing commas, extra text).
 */
export function parseJsonWithRecovery<T = unknown>(text: string): JsonParseRecovery<T> {
  const raw = String(text ?? '');
  const candidates = [
    raw,
    stripMarkdownCodeFence(raw),
    extractLikelyJsonObject(raw) ?? '',
    repairLikelyJson(raw),
    repairLikelyJson(extractLikelyJsonObject(raw) ?? ''),
  ].filter(Boolean);

  const seen = new Set<string>();
  let firstError: Error | null = null;

  for (const candidate of candidates) {
    const normalized = candidate.trim();
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);

    try {
      return { ok: true, value: JSON.parse(normalized) as T, recovered: normalized !== raw.trim() };
    } catch (error) {
      if (!firstError && error instanceof Error) firstError = error;
    }
  }

  return { ok: false, error: firstError ?? new Error('Failed to parse JSON response.') };
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
