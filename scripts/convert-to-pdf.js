#!/usr/bin/env node

/**
 * Convert HTML to PDF using Playwright
 * Usage: node scripts/convert-to-pdf.js
 */

import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function convertToPDF() {
  const htmlPath = path.join(__dirname, '../docs/TEMPLATE_SYSTEM.html');
  const pdfPath = path.join(__dirname, '../docs/TEMPLATE_SYSTEM.pdf');

  if (!fs.existsSync(htmlPath)) {
    console.error('❌ HTML file not found:', htmlPath);
    process.exit(1);
  }

  console.log('🚀 Launching browser...');
  const browser = await chromium.launch();
  const page = await browser.newPage();

  console.log('📄 Loading HTML file...');
  await page.goto(`file://${htmlPath}`, { waitUntil: 'networkidle' });

  console.log('📝 Generating PDF...');
  await page.pdf({
    path: pdfPath,
    format: 'A4',
    margin: {
      top: '20mm',
      right: '20mm',
      bottom: '20mm',
      left: '20mm',
    },
    printBackground: true,
    displayHeaderFooter: true,
    headerTemplate: '<div></div>',
    footerTemplate: `
      <div style="font-size: 10px; text-align: center; width: 100%; color: #666;">
        <span class="pageNumber"></span> / <span class="totalPages"></span>
      </div>
    `,
  });

  await browser.close();

  console.log('✅ PDF created successfully:', pdfPath);
}

convertToPDF().catch((error) => {
  console.error('❌ Error:', error);
  process.exit(1);
});
