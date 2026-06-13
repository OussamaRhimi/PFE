/**
 * Sprint 3: Utils Index
 * @file src/utils/index.ts
 * 
 * Re-exports all utilities for clean imports
 */

// Types
export * from './types';

// JSON utilities
export { extractJsonFromText, safeParseJson, parseJsonWithRecovery, validateExtractedData, ensureArray, ensureString } from './json';

// Ollama LLM integration
export { ollamaChat } from './ollama';

// Resume text extraction
export { extractTextFromResume } from './resume-text';

// CV Templates
export { CV_TEMPLATES, CV_TEMPLATE_KEYS, isCvTemplateKey, renderCvMarkdownFromTemplate } from './cv-templates';

// HTML to PDF conversion
export { convertHtmlToPdf, markdownToHtml } from './html-pdf';

// Pipeline orchestration & evaluation
import { processCandidate, deterministicEvaluate } from './candidate-ai';
export { processCandidate, deterministicEvaluate };
