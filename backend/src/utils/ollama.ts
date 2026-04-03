/**
 * Sprint 3: Ollama LLM Integration
 * @file src/utils/ollama.ts
 */

import { safeParseJson } from './json';
import type { ExtractedData } from './types';

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3.2';

export type OllamaChatOptions = {
  system: string;
  user: string;
  model?: string;
  format?: 'json' | 'text';
  timeoutMs?: number;
  ollamaOptions?: Record<string, unknown>;
};

/**
 * System prompt for CV parsing
 */
export const PARSER_SYSTEM_PROMPT = `Extract contact info, skills, and work history from this CV into a clean JSON structure.
Return ONLY valid JSON (no markdown, no code fences).

IMPORTANT: For all dates (startDate, endDate), use the format "Month YYYY" (e.g. "June 2025").
If only a year is given, use "YYYY". If the role is current/ongoing, set endDate to "Present".

CRITICAL CLASSIFICATION RULES:
- "skills" is ONLY for short technology/tool names (e.g. "React", "Node.js", "Docker").
- "competencies" is for accomplishment descriptions or capability statements.
- "education" is for degrees, diplomas, academic programs.
- "certifications" is for professional certifications, online courses, bootcamps.
- "projects" is for personal/academic projects.

Output JSON schema:
{
  "contact": {
    "fullName": string,
    "email": string,
    "phone": string | null,
    "location": string | null,
    "linkedin": string | null,
    "portfolio": string | null,
    "links": string[]
  },
  "summary": string | null,
  "skills": string[],
  "competencies": string[],
  "languages": string[],
  "qualities": string[],
  "interests": string[],
  "experience": [{
    "company": string,
    "title": string,
    "startDate": string,
    "endDate": string,
    "highlights": string[]
  }],
  "education": [{
    "school": string,
    "degree": string,
    "startDate": string,
    "endDate": string
  }],
  "certifications": string[],
  "projects": [{
    "name": string,
    "description": string,
    "links": string[]
  }]
}`;

/**
 * Send a chat message to Ollama and get response
 */
export async function ollamaChat(systemPrompt: string, userPrompt: string): Promise<string>;
export async function ollamaChat(options: OllamaChatOptions): Promise<string>;
export async function ollamaChat(
  arg1: string | OllamaChatOptions,
  userPrompt?: string
): Promise<string> {
  const options: OllamaChatOptions = typeof arg1 === 'string'
    ? { system: arg1, user: userPrompt ?? '' }
    : arg1;

  const controller = options.timeoutMs ? new AbortController() : null;
  const timeoutId = options.timeoutMs
    ? setTimeout(() => controller?.abort(), options.timeoutMs)
    : null;

  const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: options.model || OLLAMA_MODEL,
      messages: [
        { role: 'system', content: options.system },
        { role: 'user', content: options.user },
      ],
      stream: false,
      ...(options.format ? { format: options.format } : {}),
      ...(options.ollamaOptions ? { options: options.ollamaOptions } : {}),
    }),
    signal: controller?.signal,
  });

  if (timeoutId) {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    throw new Error(`Ollama request failed: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as { message?: { content?: string } };
  return data.message?.content || '';
}

/**
 * Parse resume text via Ollama into structured ExtractedData
 */
export async function parseResumeWithOllama(resumeText: string): Promise<ExtractedData> {
  const response = await ollamaChat(PARSER_SYSTEM_PROMPT, resumeText);
  const parsed = safeParseJson<ExtractedData>(response);

  if (!parsed) {
    throw new Error('Failed to parse CV: Invalid JSON response from Ollama');
  }

  // Ensure required arrays exist with defaults
  return {
    contact: parsed.contact || {},
    summary: parsed.summary || null,
    skills: Array.isArray(parsed.skills) ? parsed.skills : [],
    competencies: Array.isArray(parsed.competencies) ? parsed.competencies : [],
    languages: Array.isArray(parsed.languages) ? parsed.languages : [],
    qualities: Array.isArray(parsed.qualities) ? parsed.qualities : [],
    interests: Array.isArray(parsed.interests) ? parsed.interests : [],
    experience: Array.isArray(parsed.experience) ? parsed.experience : [],
    education: Array.isArray(parsed.education) ? parsed.education : [],
    certifications: Array.isArray(parsed.certifications) ? parsed.certifications : [],
    projects: Array.isArray(parsed.projects) ? parsed.projects : [],
  };
}
