#!/usr/bin/env node --input-type=module

import fs from 'fs';
import path from 'path';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';

const CV_FILES = [
  'tunisian_it_cv_1.pdf',
  'tunisian_it_cv_2.pdf',
  'tunisian_it_cv_3.pdf'
];

async function extractTextFromPDF(filePath) {
  try {
    const buffer = fs.readFileSync(filePath);
    const uint8array = new Uint8Array(buffer);
    const pdf = await getDocument({ data: uint8array }).promise;
    let fullText = '';
    
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map(item => item.str).join(' ');
      fullText += pageText + '\n';
    }
    
    return fullText;
  } catch (error) {
    return null;
  }
}

async function testAllCVs() {
  console.log('📊 CV EXTRACTION TEST - ALL 3 CVs');
  console.log('═'.repeat(80));

  for (const cvFile of CV_FILES) {
    const cvPath = path.join(process.cwd(), '..', cvFile);
    
    if (!fs.existsSync(cvPath)) {
      console.log(`\n❌ ${cvFile} not found`);
      continue;
    }

    console.log(`\n📄 ${cvFile}`);
    console.log('─'.repeat(80));

    const fileSize = fs.statSync(cvPath).size;
    console.log(`📦 File size: ${fileSize} bytes`);

    const extractedText = await extractTextFromPDF(cvPath);

    if (!extractedText || extractedText.length < 100) {
      console.log(`❌ Extraction failed or insufficient text`);
      continue;
    }

    console.log(`✅ Extracted: ${extractedText.length} characters\n`);
    
    // Show all text
    console.log('📝 COMPLETE EXTRACTED TEXT:');
    console.log('═'.repeat(80));
    console.log(extractedText);
    console.log('═'.repeat(80));
  }
}

testAllCVs().catch(console.error);
