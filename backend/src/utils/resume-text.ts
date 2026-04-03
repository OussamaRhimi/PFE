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

  // Get the file path from Strapi's upload directory
  const uploadDir = strapi.dirs.static.public;
  const filePath = path.join(uploadDir, file.url.replace(/^\//, ''));

  return fs.readFile(filePath);
}

/**
 * Get file extension from file object
 */
function getFileExtension(file: UploadFileLike): string {
  if (file.ext) return file.ext.toLowerCase();
  const match = file.name.match(/\.[^.]+$/);
  return match ? match[0].toLowerCase() : '';
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
  const mime = file.mime?.toLowerCase() || '';
  const ext = getFileExtension(file);

  // PDF extraction using pdf-parse
  if (mime.includes('pdf') || ext === '.pdf') {
    const pdfParse = (await import('pdf-parse')).default;
    const parsed = await pdfParse(buffer);
    return parsed.text;
  }

  // DOCX extraction using mammoth
  if (mime.includes('officedocument') || mime.includes('wordprocessingml') || ext === '.docx') {
    const mammoth = await import('mammoth');
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }

  // TXT extraction (plain text)
  if (mime.startsWith('text/') || ext === '.txt') {
    return buffer.toString('utf8');
  }

  throw new Error(`Unsupported resume file type: ${mime || ext}`);
}
