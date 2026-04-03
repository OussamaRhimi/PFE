/**
 * Sprint 3: HTML to PDF Conversion
 * @file src/utils/html-pdf.ts
 * 
 * Playwright-based HTML-to-PDF conversion
 */

import { marked } from 'marked';

/**
 * Convert HTML content to PDF buffer using Playwright
 * 
 * @param html - HTML content to convert
 * @returns PDF as Buffer
 */
export async function convertHtmlToPdf(html: string): Promise<Buffer> {
  const { chromium } = await import('playwright');
  const browser = await chromium.launch();
  const page = await browser.newPage();

  // Wrap in full HTML document with base styles
  const fullHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { 
      margin: 0; 
      padding: 0; 
      font-family: 'Segoe UI', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
    }
    h1 { margin-top: 0; font-size: 28px; }
    h2 { margin-top: 24px; font-size: 18px; border-bottom: 2px solid #2563eb; padding-bottom: 4px; }
    h3 { margin-top: 16px; margin-bottom: 4px; font-size: 15px; }
    p { margin: 6px 0; }
    ul { margin: 6px 0; padding-left: 24px; }
    li { margin: 3px 0; }
    a { color: #2563eb; text-decoration: none; }
    .cv-container { max-width: 800px; margin: 0 auto; }
  </style>
</head>
<body>
${html}
</body>
</html>
  `;

  await page.setContent(fullHtml, { waitUntil: 'networkidle' });

  const pdf = await page.pdf({
    format: 'A4',
    margin: { top: '1cm', right: '1cm', bottom: '1cm', left: '1cm' },
    printBackground: true,
  });

  await browser.close();
  return Buffer.from(pdf);
}

/**
 * Convert markdown to HTML
 * Note: Our CV templates already contain HTML, so this handles any remaining markdown
 */
export function markdownToHtml(markdown: string): string {
  return marked.parse(markdown, { async: false }) as string;
}
