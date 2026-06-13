/**
 * Sprint 3: Candidate Service
 * @file src/api/candidate/services/candidate.ts
 * 
 * Core service with AI pipeline re-exports from utils
 */

import { factories } from '@strapi/strapi';

// Re-export all Sprint 3 utilities for controller access
export {
  // Types
  type CvTemplateKey,
  type CvTemplateMeta,
  type Requirements,
  type ExtractedData,
  type EvaluationResult,
  type ResumeContact,
  type ExperienceEntry,
  type EducationEntry,
  type ProjectEntry,
  type UploadFileLike,
  type ApplicationStatus,
  type CandidateMeta,
  
  // CV Templates
  CV_TEMPLATES,
  CV_TEMPLATE_KEYS,
  isCvTemplateKey,
  renderCvMarkdownFromTemplate,
  
  // Pipeline functions
  processCandidate,
  deterministicEvaluate,
  
  // Text extraction
  extractTextFromResume,
  
  // Ollama
  ollamaChat,
  
  // PDF generation
  convertHtmlToPdf,
  markdownToHtml,
  
  // JSON utilities
  safeParseJson,
  extractJsonFromText,
} from '../../../utils';

export default factories.createCoreService('api::candidate.candidate');