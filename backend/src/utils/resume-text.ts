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

async function extractPdfText(buffer: Buffer): Promise<string> {
  try {
    const pdfParse = (await import('pdf-parse')).default;
    const parsed = await pdfParse(buffer);
    return parsed.text;
  } catch (error) {
    // Fallback to pdfjs for PDFs with malformed xref tables.
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
      return text;
    } catch {
      throw error;
    }
  }
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

  // PDF extraction using pdf-parse with pdfjs fallback
  if (mime.includes('pdf') || ext === '.pdf') {
    return normalizeExtractedText(await extractPdfText(buffer));
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
