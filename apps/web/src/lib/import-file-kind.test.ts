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

  it('detects DOCX files', () => {
    expect(
      detectImportFileKind(
        new File(['docx'], 'cv.docx', {
          type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        }),
      ),
    ).toBe('docx');
  });

  it('detects image files', () => {
    expect(detectImportFileKind(new File(['png'], 'cv.png', { type: 'image/png' }))).toBe('image');
    expect(detectImportFileKind(new File(['jpg'], 'cv.jpg', { type: 'image/jpeg' }))).toBe('image');
  });

  it('returns null for unsupported files', () => {
    expect(detectImportFileKind(new File(['x'], 'cv.doc', { type: 'application/msword' }))).toBe(
      null,
    );
  });

  it('applies per-kind size limits', () => {
    expect(getImportFileMaxBytes('json')).toBe(1024 * 1024);
    expect(getImportFileMaxBytes('pdf')).toBe(5 * 1024 * 1024);
    expect(getImportFileMaxBytes('markdown')).toBe(512 * 1024);
    expect(getImportFileMaxBytes('image')).toBe(5 * 1024 * 1024);
    expect(getImportFileMaxBytes('docx')).toBe(5 * 1024 * 1024);
  });

  it('marks agent-backed formats correctly', () => {
    expect(importFileKindRequiresAgent('json')).toBe(false);
    expect(importFileKindRequiresAgent('pdf')).toBe(true);
    expect(importFileKindRequiresAgent('markdown')).toBe(true);
    expect(importFileKindRequiresAgent('image')).toBe(true);
    expect(importFileKindRequiresAgent('docx')).toBe(true);
  });
});
