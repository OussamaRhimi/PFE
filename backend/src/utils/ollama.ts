/**
 * Sprint 3: Ollama LLM Integration
 * @file src/utils/ollama.ts
 */

import { safeParseJson } from './json';
import type { ExtractedData } from './types';

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || process.env.OLLAMA_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3.2';

export type OllamaChatOptions = {
  system: string;
  user: string;
  model?: string;
  format?: 'json' | 'text';
  timeoutMs?: number;
  ollamaOptions?: Record<string, unknown>;
  keepAlive?: string | number;
  messages?: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
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
}

EXAMPLE 1 INPUT:
"OMAR ATRI\nFull Stack JS Developer\ncontact@omaratri.com\n+216 24 246 962\nKerkennah, Sfax, Tunisia\nlinkedin.com/in/omar-atri\nSKILLS\nNextJS – ReactJS – GatsbyJS – TailwindCSS\nExpressJS – Socket.IO\nEDUCATION\nSeptember 2021 - June 2026 Software engineering\nHigher Institute of Computer Science and Multimedia of Sfax (ISIMS)"

EXAMPLE 1 OUTPUT:
{
  "contact": {
    "fullName": "Omar Atri",
    "email": "contact@omaratri.com",
    "phone": "+216 24 246 962",
    "location": "Kerkennah, Sfax, Tunisia",
    "linkedin": "linkedin.com/in/omar-atri",
    "portfolio": null,
    "links": ["linkedin.com/in/omar-atri"]
  },
  "summary": "Full Stack JS Developer",
  "skills": ["NextJS", "ReactJS", "GatsbyJS", "TailwindCSS", "ExpressJS", "Socket.IO"],
  "competencies": [],
  "languages": [],
  "qualities": [],
  "interests": [],
  "experience": [],
  "education": [{
    "school": "Higher Institute of Computer Science and Multimedia of Sfax (ISIMS)",
    "degree": "Software engineering",
    "startDate": "September 2021",
    "endDate": "June 2026"
  }],
  "certifications": [],
  "projects": []
}

EXAMPLE 2 INPUT:
"Yassin Sedki\nsedkiyassin19@gmail.com\n+216 93913842\nKsour Essef, Mahdia\nPROFILE\nFinal-year Software Engineering student focused on AI systems.\nEXPERIENCE\nAI Engineer Intern\nAttoflow Consulting\n06/2025 – 08/2025\nSKILLS\nPyTorch, TensorFlow, LangChain, LangGraph"

EXAMPLE 2 OUTPUT:
{
  "contact": {
    "fullName": "Yassin Sedki",
    "email": "sedkiyassin19@gmail.com",
    "phone": "+216 93913842",
    "location": "Ksour Essef, Mahdia",
    "linkedin": null,
    "portfolio": null,
    "links": []
  },
  "summary": "Final-year Software Engineering student focused on AI systems.",
  "skills": ["PyTorch", "TensorFlow", "LangChain", "LangGraph"],
  "competencies": [],
  "languages": [],
  "qualities": [],
  "interests": [],
  "experience": [{
    "company": "Attoflow Consulting",
    "title": "AI Engineer Intern",
    "startDate": "June 2025",
    "endDate": "August 2025",
    "highlights": []
  }],
  "education": [],
  "certifications": [],
  "projects": []
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

  let messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> | null =
    Array.isArray(options.messages) && options.messages.length > 0 ? [...options.messages] : null;

  if (messages) {
    const hasSystem = messages.some((m) => m.role === 'system');
    if (options.system && !hasSystem) {
      messages = [{ role: 'system', content: options.system }, ...messages];
    }
  } else {
    messages = [
      { role: 'system', content: options.system },
      { role: 'user', content: options.user },
    ];
  }

  const promptFromMessages = (items: Array<{ role: string; content: string }>) =>
    items
      .map((m) => {
        if (m.role === 'system') return `System:\n${m.content}`;
        if (m.role === 'assistant') return `Assistant:\n${m.content}`;
        return `User:\n${m.content}`;
      })
      .join('\n\n');

  const baseUrl = OLLAMA_BASE_URL.replace(/\/+$/, '');
  const apiBase = baseUrl.endsWith('/api') ? baseUrl : `${baseUrl}/api`;

  const timeoutMs = options.timeoutMs ?? 240000;
  const keepAlive = options.keepAlive ?? process.env.OLLAMA_KEEP_ALIVE ?? '5m';
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  const chatResponse = await fetch(`${apiBase}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: options.model || OLLAMA_MODEL,
      messages,
      stream: false,
      ...(options.format ? { format: options.format } : {}),
      ...(options.ollamaOptions ? { options: options.ollamaOptions } : {}),
      ...(options.format === 'json' ? { options: { temperature: 0, ...(options.ollamaOptions ?? {}) } } : {}),
      keep_alive: keepAlive,
    }),
    signal: controller?.signal,
  });

  clearTimeout(timeoutId);

  if (chatResponse.ok) {
    const data = (await chatResponse.json()) as { message?: { content?: string } };
    return data.message?.content || '';
  }

  if (chatResponse.status !== 404) {
    throw new Error(`Ollama request failed: ${chatResponse.status} ${chatResponse.statusText}`);
  }

  const generateResponse = await fetch(`${apiBase}/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: options.model || OLLAMA_MODEL,
      prompt: promptFromMessages(messages),
      stream: false,
      ...(options.format ? { format: options.format } : {}),
      ...(options.ollamaOptions ? { options: options.ollamaOptions } : {}),
      ...(options.format === 'json' ? { options: { temperature: 0, ...(options.ollamaOptions ?? {}) } } : {}),
      keep_alive: keepAlive,
    }),
    signal: controller?.signal,
  });

  if (!generateResponse.ok) {
    throw new Error(`Ollama request failed: ${generateResponse.status} ${generateResponse.statusText}`);
  }

  const data = (await generateResponse.json()) as { response?: string };
  return data.response || '';
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
