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
