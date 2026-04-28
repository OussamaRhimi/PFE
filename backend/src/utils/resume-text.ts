/**
 * Sprint 3: Resume Text Extraction
 * @file src/utils/resume-text.ts
 * 
 * Extracts text from PDF (pdf-parse), DOCX (mammoth), and TXT files
 */

import type { Core } from '@strapi/strapi';
import type { UploadFileLike } from './types';

/**
 * Read file buffer from Strapi upload directory
 */
async function readFileBuffer(file: UploadFileLike, strapi: Core.Strapi): Promise<Buffer> {
  const fs = await import('fs').then(m => m.promises);
  const path = await import('path');

  const filepath = typeof file.filepath === 'string' ? file.filepath.trim() : '';
  if (filepath) return fs.readFile(filepath);

  const url = typeof file.url === 'string' ? file.url.trim() : '';
  if (!url) throw new Error('Resume file is missing both url and filepath.');

  if (/^https?:\/\//i.test(url)) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to fetch resume: ${res.status} ${res.statusText}`);
    const arrayBuffer = await res.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  const relativeUrl = url.startsWith('/') ? url.slice(1) : url;
  const uploadDir = strapi?.dirs?.static?.public ?? path.join(process.cwd(), 'public');
  const filePath = path.join(uploadDir, relativeUrl);
  return fs.readFile(filePath);
}

/**
 * Get file extension from file object
 */
function getFileExtension(file: UploadFileLike): string {
  if (file.ext) return file.ext.toLowerCase();

  const nameCandidate =
    (typeof file.name === 'string' && file.name.trim()) ||
    (typeof file.originalFilename === 'string' && file.originalFilename.trim()) ||
    (typeof file.filepath === 'string' && file.filepath.trim()) ||
    (typeof file.url === 'string' && file.url.trim()) ||
    '';

  const match = nameCandidate.match(/\.[^.]+$/);
  return match ? match[0].toLowerCase() : '';
}

function normalizeExtractedText(raw: string): string {
  let text = raw.replace(/\r\n?/g, '\n');
  text = text.replace(/[–—]/g, '-');
  // Merge hyphenated line breaks: "devel-\noper" -> "developer"
  text = text.replace(/([A-Za-z])\s*-\s*\n\s*([A-Za-z])/g, '$1$2');
  text = text.replace(
    /\b(Email|E-mail|Phone|Tel|Telephone|Mobile|Location|Address|Adresse|LinkedIn|Linkedin|GitHub|Github|Portfolio|Website|Web)\b\s*:?(?=\S)/g,
    '$1: '
  );
  // Normalize section headers - includes ALL variations for work experience, education, skills, certifications, projects
  text = text.replace(
    /\b(Professional Summary|Summary|Profile|Objective|Professional Objective|Career Objective|Technical Skills|Skills|Core Skills|Competencies|Technologies|Technical Expertise|Programming Languages|Tools & Technologies|Technical Stack|Expertise|Core Competencies|Technical Knowledge|Specializations|Capabilities|Technical Proficiencies|Work Experience|Experience|Professional Experience|Career|Employment|Work History|Professional Background|Education|Academic Background|Qualifications|Studies|Academic Qualifications|Schooling|Certifications|Certification|Professional Certifications|Courses|Projects|Academic Projects|Personal Projects|Portfolio|Languages|Languages & Frameworks|Interests|Hobbies|Awards|Publications|Volunteering|Volunteering Experience|Volunteer Work|References|References Available|Achievements|Key Achievements)\b/gi,
    '\n$1\n'
  );
  text = text.replace(/[ \t]+\n/g, '\n');
  text = text.replace(/[ \t]{2,}/g, ' ');
  text = text.replace(/\n{3,}/g, '\n\n');
  return text.trim();
}

/**
 * Validate extracted text to detect extraction failures
 */
function validateExtractedText(text: string, filename: string): { valid: boolean; issues: string[] } {
  const issues: string[] = [];

  // Check for minimum length
  if (text.length < 50) {
    issues.push(`Text too short (${text.length} chars) - possible extraction failure`);
  }

  // Check for dates (should have at least one year)
  if (!/\d{4}/.test(text)) {
    issues.push('No date patterns found - possible extraction failure');
  }

  // Check for job/company keywords
  if (!/\b(developer|engineer|company|intern|stagiaire|architect|analyst|manager|role|position|at|experience)\b/i.test(text)) {
    issues.push('No job/company keywords found - possible extraction failure');
  }

  // Check for common CV content
  if (!/\b(email|phone|linkedin|education|skills|experience|project)\b/i.test(text)) {
    issues.push('Missing common CV sections - possible extraction failure');
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}

async function extractPdfText(buffer: Buffer, filename?: string): Promise<string> {
  let extractedText = '';
  let extractionMethod = '';

  try {
    const pdfParse = (await import('pdf-parse')).default;
    
    // Configure pdf-parse with options for better decompression
    const parsed = await pdfParse(buffer, {
      max: 0, // No page limit
      version: 'v2.0.550', // Use stable version
    } as any);
    
    extractedText = parsed.text;
    extractionMethod = 'pdf-parse';

    // Log extraction results for debugging (CV3 diagnosis)
    const validation = validateExtractedText(extractedText, filename || 'unknown');
    console.log(`[PDF EXTRACT] Method: ${extractionMethod}`);
    console.log(`[PDF EXTRACT] Length: ${extractedText.length} chars`);
    console.log(`[PDF EXTRACT] Valid: ${validation.valid}`);
    if (validation.issues.length > 0) {
      console.log(`[PDF EXTRACT] Issues: ${validation.issues.join('; ')}`);
    }
    console.log(`[PDF EXTRACT] Has 'devops': ${/devops/i.test(extractedText)}`);
    console.log(`[PDF EXTRACT] Has 'experience': ${/experience/i.test(extractedText)}`);
    console.log(`[PDF EXTRACT] First 300 chars: ${extractedText.substring(0, 300).replace(/\n/g, ' ')}`);

    if (extractedText && extractedText.length > 50) {
      return extractedText;
    }
  } catch (error) {
    console.warn(`[PDF EXTRACT] pdf-parse failed: ${error instanceof Error ? error.message : String(error)}`);
    // Continue to fallback
  }

  // Fallback to pdfjs for PDFs with malformed xref tables or compression issues
  try {
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
    const loadingTask = pdfjs.getDocument({
      data: new Uint8Array(buffer),
      disableFontFace: true,
      useSystemFonts: true,
      stopAtErrors: false,
      disableRange: true,
      disableStream: true,
    } as any);
    const doc = await loadingTask.promise;
    let text = '';
    for (let i = 1; i <= doc.numPages; i += 1) {
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      const pageText = (content.items as any[])
        .map((item) => (typeof item?.str === 'string' ? item.str : ''))
        .filter((str) => str)
        .join(' ');
      text += `${pageText}\n`;
    }
    extractedText = text;
    extractionMethod = 'pdfjs';

    // Log fallback extraction results
    const validation = validateExtractedText(extractedText, filename || 'unknown');
    console.log(`[PDF EXTRACT] Fallback to ${extractionMethod}`);
    console.log(`[PDF EXTRACT] Length: ${extractedText.length} chars`);
    console.log(`[PDF EXTRACT] Valid: ${validation.valid}`);
    if (validation.issues.length > 0) {
      console.log(`[PDF EXTRACT] Issues: ${validation.issues.join('; ')}`);
    }

    if (extractedText && extractedText.length > 50) {
      return extractedText;
    }
  } catch (fallbackError) {
    console.error(`[PDF EXTRACT] Both pdf-parse and pdfjs failed`);
    console.error(`[PDF EXTRACT] pdf-parse error: ${fallbackError instanceof Error ? fallbackError.message : String(fallbackError)}`);
  }

  // If both methods failed, throw error with diagnostic info
  throw new Error(`PDF extraction failed for "${filename || 'unknown'}": tried ${extractionMethod || 'pdf-parse and pdfjs'}, got ${extractedText.length} chars`);
}

/**
 * Extract text from resume file (PDF, DOCX, or TXT)
 *
 * @param file - Strapi upload file object
 * @param strapi - Strapi instance for file access
 * @returns Extracted text content
 * @throws Error if file type is not supported
 */
export async function extractTextFromResume(file: UploadFileLike, strapi: Core.Strapi): Promise<string> {
  const buffer = await readFileBuffer(file, strapi);
  const mime = String(file.mime ?? file.mimetype ?? '').toLowerCase().trim();
  const ext = getFileExtension(file);
  const filename = String(file.name ?? file.originalFilename ?? 'unknown');

  // PDF extraction using pdf-parse with pdfjs fallback
  if (mime.includes('pdf') || ext === '.pdf') {
    const rawText = await extractPdfText(buffer, filename);
    const normalized = normalizeExtractedText(rawText);
    console.log(`[NORMALIZE] Input: ${rawText.length} chars → Output: ${normalized.length} chars`);
    console.log(`[NORMALIZE] Has 'experience' section after normalization: ${/^experience$/im.test(normalized)}`);
    return normalized;
  }

  // DOCX extraction using mammoth
  if (mime.includes('officedocument') || mime.includes('wordprocessingml') || ext === '.docx') {
    const mammoth = await import('mammoth');
    const result = await mammoth.extractRawText({ buffer });
    return normalizeExtractedText(result.value);
  }

  // TXT extraction (plain text)
  if (mime.startsWith('text/') || ext === '.txt') {
    return normalizeExtractedText(buffer.toString('utf8'));
  }

  throw new Error(`Unsupported resume file type: ${mime || ext}`);
}
