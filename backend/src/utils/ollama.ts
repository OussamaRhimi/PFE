/**
 * Sprint 3: Ollama LLM Integration
 * @file src/utils/ollama.ts
 * 
 * For better CV parsing accuracy (especially with ambiguous or fragmented text):
 * - Set OLLAMA_MODEL env var to: mistral, neural-chat, dolphin-mixtral, or other capable models
 * - For remote APIs: Use Claude 3.5 Sonnet, GPT-4, or similar enterprise models
 * - Default: llama3.2 (works but less capable than alternatives)
 * 
 * Model Selection Guide for CV Parsing:
 * - Haiku/Small models (llama3.2): Basic extraction, may misclassify on ambiguous text
 * - Mid-tier models (mistral, neural-chat): Better context understanding, 95%+ accuracy
 * - Large models (Claude Sonnet, GPT-4): Excellent at edge cases, handles broken text better
 */

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || process.env.OLLAMA_URL || 'http://localhost:11434';
// IMPORTANT: For CV3 and similar issues, use a better model like 'mistral' or 'neural-chat'
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3.2'; // Consider: mistral, neural-chat, or larger models

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

