#!/usr/bin/env node
/**
 * Generate MIT CAPD-style PDFs from JSON Resume sample files.
 *
 * Usage: pnpm samples:pdf
 */

import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PDF_EXPORT_OPTIONS, renderResumeHtml } from '@resumind/resume-template';
import puppeteer from 'puppeteer';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const inputDir = path.join(repoRoot, '.samples/resumes/jsonresume');
const outputDir = path.join(repoRoot, '.samples/resumes/pdf');

async function listJsonResumes(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
    .map((entry) => path.join(dir, entry.name))
    .sort((a, b) => a.localeCompare(b));
}

async function renderPdf(browser, html, outputPath) {
  const page = await browser.newPage();
  try {
    await page.setContent(html, { waitUntil: 'networkidle0' });
    await page.pdf({
      path: outputPath,
      ...PDF_EXPORT_OPTIONS,
    });
  } finally {
    await page.close();
  }
}

async function main() {
  await mkdir(outputDir, { recursive: true });

  const jsonFiles = await listJsonResumes(inputDir);
  if (jsonFiles.length === 0) {
    console.error(`No JSON resume files found in ${inputDir}`);
    process.exit(1);
  }

  const browser = await puppeteer.launch({ headless: true });

  try {
    for (const jsonPath of jsonFiles) {
      const baseName = path.basename(jsonPath, '.json');
      const pdfPath = path.join(outputDir, `${baseName}.pdf`);
      const htmlPath = path.join(outputDir, `${baseName}.html`);

      const raw = await readFile(jsonPath, 'utf8');
      const resume = JSON.parse(raw);
      const html = renderResumeHtml(resume);

      await writeFile(htmlPath, html, 'utf8');
      await renderPdf(browser, html, pdfPath);

      console.log(`✓ ${baseName}.pdf`);
    }
  } finally {
    await browser.close();
  }

  console.log(`\nGenerated ${jsonFiles.length} PDF(s) in ${outputDir}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
