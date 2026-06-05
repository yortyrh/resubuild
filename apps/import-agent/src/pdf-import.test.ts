import { readFileSync } from 'node:fs';
import path from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getTextMock, destroyMock } = vi.hoisted(() => ({
  getTextMock: vi.fn(),
  destroyMock: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('pdf-parse', () => ({
  // biome-ignore lint/complexity/useArrowFunction: required by vitest 4
  PDFParse: vi.fn(function () {
    return {
      getText: getTextMock,
      destroy: destroyMock,
    };
  }),
}));

import { createEmptyResume } from '@resumind/types';
import { discoverSocialProfilesTool } from './tools/discover-social-profiles.tool';
import { extractPdfTextTool } from './tools/extract-pdf-text.tool';
import { normalizeDatesTool } from './tools/normalize-dates.tool';
import { validateResumeSchemaTool } from './tools/validate-resume-schema.tool';
import { webLookupTool } from './tools/web-lookup.tool';
import { runPdfImportWorkflow } from './workflows/pdf-import.workflow';

vi.mock('./tools/discover-social-profiles.tool', () => ({
  discoverSocialProfilesTool: vi.fn(async ({ draft }: { draft: Record<string, unknown> }) => ({
    skipped: false,
    draft,
    discoveredProfilesCount: 0,
  })),
}));

const fixturePath = path.join(__dirname, '../test-fixtures/minimal.pdf');

beforeEach(() => {
  getTextMock.mockReset();
  destroyMock.mockClear();
  getTextMock.mockResolvedValue({
    text: 'Jane Doe\nSoftware Engineer',
    total: 1,
    pages: [{ num: 1, text: 'Jane Doe\nSoftware Engineer' }],
  });
});

describe('extractPdfTextTool', () => {
  it('extracts text from a minimal PDF buffer', async () => {
    const buffer = readFileSync(fixturePath);
    const result = await extractPdfTextTool(buffer);
    expect(result.text).toContain('Jane Doe');
    expect(result.pageCount).toBe(1);
    expect(result.usedVisionOcr).toBe(false);
  });

  it('passes parseHyperlinks: true to preserve icon-to-URL mapping', async () => {
    getTextMock.mockResolvedValueOnce({
      text: '[yorty](https://linkedin.com/in/yorty)',
      total: 1,
      pages: [{ num: 1, text: '[yorty](https://linkedin.com/in/yorty)' }],
    });
    const buffer = readFileSync(fixturePath);
    await extractPdfTextTool(buffer);
    expect(getTextMock).toHaveBeenCalledWith({ parseHyperlinks: true });
  });

  it('falls back to vision OCR when pdf-parse returns no text', async () => {
    getTextMock.mockResolvedValueOnce({
      text: '   ',
      total: 2,
      pages: [
        { num: 1, text: '   ' },
        { num: 2, text: '   ' },
      ],
    });

    const buffer = readFileSync(fixturePath);
    const transcribePdfPages = vi.fn().mockResolvedValue('Mariela Romero\nProduct Designer');

    const result = await extractPdfTextTool(buffer, {
      modelId: 'openai/gpt-4o-mini',
      apiKey: 'test-key',
      transcribePdfPages,
    });

    expect(transcribePdfPages).toHaveBeenCalledWith(buffer, 2, 'openai/gpt-4o-mini', 'test-key');
    expect(result.text).toContain('Mariela Romero');
    expect(result.usedVisionOcr).toBe(true);
  });
});

describe('validateResumeSchemaTool', () => {
  it('rejects invalid drafts', () => {
    const result = validateResumeSchemaTool({ basics: 'invalid' });
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});

describe('normalizeDatesTool', () => {
  it('coerces work dates toward ISO partial dates', () => {
    const normalized = normalizeDatesTool({
      work: [{ name: 'Acme', startDate: 'Jan 2020', endDate: '2022' }],
    });
    expect(normalized.work).toEqual([
      expect.objectContaining({ startDate: '2020-01', endDate: '2022' }),
    ]);
  });
});

describe('webLookupTool', () => {
  it('skips when search key is absent', async () => {
    await expect(webLookupTool({ query: 'Acme Corp' })).resolves.toEqual({ skipped: true });
  });

  it('uses mocked search when key is present', async () => {
    const searchFn = vi.fn().mockResolvedValue({ url: 'https://acme.example', summary: 'Acme' });
    await expect(
      webLookupTool({ query: 'Acme Corp', searchApiKey: 'test-key' }, searchFn),
    ).resolves.toEqual({
      skipped: false,
      url: 'https://acme.example',
      summary: 'Acme',
    });
    expect(searchFn).toHaveBeenCalledWith('Acme Corp', 'test-key');
  });
});

describe('runPdfImportWorkflow', () => {
  it('repairs invalid drafts within the attempt limit', async () => {
    const buffer = readFileSync(fixturePath);
    let repairCalls = 0;

    const result = await runPdfImportWorkflow({
      pdfBuffer: buffer,
      modelId: 'openai/gpt-4o-mini',
      apiKey: 'test-key',
      generateDraft: async () => ({ basics: 'invalid' }),
      repairDraft: async () => {
        repairCalls += 1;
        return {
          ...createEmptyResume(),
          basics: { name: 'Jane Doe' },
        };
      },
      finalize: async () => 'cv-123',
    });

    expect(repairCalls).toBeGreaterThan(0);
    expect(result.cvId).toBe('cv-123');
  });

  it('merges discovered profiles into the validated draft', async () => {
    vi.mocked(discoverSocialProfilesTool).mockResolvedValueOnce({
      skipped: false,
      discoveredProfilesCount: 1,
      draft: {
        ...createEmptyResume(),
        basics: {
          name: 'Jane Doe',
          profiles: [
            {
              network: 'LinkedIn',
              url: 'https://www.linkedin.com/in/jane-doe',
              username: 'jane-doe',
            },
          ],
        },
      },
    });

    const buffer = readFileSync(fixturePath);
    const result = await runPdfImportWorkflow({
      pdfBuffer: buffer,
      modelId: 'openai/gpt-4o-mini',
      apiKey: 'test-key',
      searchApiKey: 'search-key',
      generateDraft: async () => ({
        ...createEmptyResume(),
        basics: { name: 'Jane Doe', profiles: [] },
      }),
    });

    expect(discoverSocialProfilesTool).toHaveBeenCalled();
    expect(result.discoveredProfilesCount).toBe(1);
    expect(result.draft?.basics).toMatchObject({
      profiles: [
        expect.objectContaining({
          network: 'LinkedIn',
          url: 'https://www.linkedin.com/in/jane-doe',
        }),
      ],
    });
  });
});
