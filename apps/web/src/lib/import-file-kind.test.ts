import { describe, expect, it } from 'vitest';
import {
  detectImportFileKind,
  getImportFileMaxBytes,
  importFileKindRequiresAgent,
} from './import-file-kind';

describe('import-file-kind', () => {
  it('detects JSON files', () => {
    expect(
      detectImportFileKind(new File(['{}'], 'resume.json', { type: 'application/json' })),
    ).toBe('json');
  });

  it('detects PDF files', () => {
    expect(detectImportFileKind(new File(['%PDF'], 'cv.pdf', { type: 'application/pdf' }))).toBe(
      'pdf',
    );
  });

  it('detects Markdown files', () => {
    expect(detectImportFileKind(new File(['# Hi'], 'cv.md', { type: 'text/markdown' }))).toBe(
      'markdown',
    );
  });

  it('returns null for unsupported files', () => {
    expect(detectImportFileKind(new File(['x'], 'cv.docx', { type: 'application/msword' }))).toBe(
      null,
    );
  });

  it('applies per-kind size limits', () => {
    expect(getImportFileMaxBytes('json')).toBe(1024 * 1024);
    expect(getImportFileMaxBytes('pdf')).toBe(5 * 1024 * 1024);
    expect(getImportFileMaxBytes('markdown')).toBe(512 * 1024);
  });

  it('marks pdf and markdown as agent-backed', () => {
    expect(importFileKindRequiresAgent('json')).toBe(false);
    expect(importFileKindRequiresAgent('pdf')).toBe(true);
    expect(importFileKindRequiresAgent('markdown')).toBe(true);
  });
});
