import { readFileSync } from 'node:fs';
import path from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { toMarkdownBytesMock } = vi.hoisted(() => ({
  toMarkdownBytesMock: vi.fn(),
}));

vi.mock('@firecrawl/anydoc', () => ({
  toMarkdownBytes: toMarkdownBytesMock,
}));

import { createEmptyResume } from '@resubuild/types';
import { discoverSocialProfilesTool } from './tools/discover-social-profiles.tool';
import { extractDocxTextTool } from './tools/extract-docx-text.tool';
import { appendPdfLinks, extractPdfLinks } from './tools/extract-pdf-links';
import { extractPdfTextTool } from './tools/extract-pdf-text.tool';
import { normalizeDatesTool } from './tools/normalize-dates.tool';
import { validateResumeSchemaTool } from './tools/validate-resume-schema.tool';
import { createWebProviderPool } from './web-providers/web-provider-pool';
import { runPdfImportWorkflow } from './workflows/pdf-import.workflow';

vi.mock('./tools/discover-social-profiles.tool', () => ({
  discoverSocialProfilesTool: vi.fn(async ({ draft }: { draft: Record<string, unknown> }) => ({
    skipped: false,
    draft,
    discoveredProfilesCount: 0,
  })),
}));

const fixturePath = path.join(__dirname, '../test-fixtures/minimal.pdf');
const noLinks = async () => [];

function anydocError(code: string, extra: Record<string, unknown> = {}) {
  return Object.assign(new Error(`anydoc: ${code}`), { code, ...extra });
}

beforeEach(() => {
  toMarkdownBytesMock.mockReset();
  toMarkdownBytesMock.mockResolvedValue('# Jane Doe\n\nSoftware Engineer');
});

describe('extractPdfTextTool', () => {
  it('converts the PDF locally with anydoc and hosted OCR enabled', async () => {
    const buffer = readFileSync(fixturePath);
    const result = await extractPdfTextTool(buffer, {
      firecrawlApiKey: 'fc-key',
      extractLinks: noLinks,
    });

    expect(result.text).toContain('Jane Doe');
    expect(result.usedVisionOcr).toBe(false);
    expect(toMarkdownBytesMock).toHaveBeenCalledWith(expect.any(Uint8Array), 'pdf', {
      ocr: 'hosted',
      apiKey: 'fc-key',
    });
  });

  it('uses keyless hosted OCR when no Firecrawl key is set', async () => {
    await extractPdfTextTool(readFileSync(fixturePath), { extractLinks: noLinks });
    expect(toMarkdownBytesMock).toHaveBeenCalledWith(expect.any(Uint8Array), 'pdf', {
      ocr: 'hosted',
    });
  });

  it('appends link annotations the text does not already contain', async () => {
    toMarkdownBytesMock.mockResolvedValueOnce('Jane Doe LinkedIn https://janedoe.dev');
    const result = await extractPdfTextTool(readFileSync(fixturePath), {
      extractLinks: async () => [
        { url: 'https://linkedin.com/in/jane-doe', text: 'LinkedIn' },
        { url: 'https://janedoe.dev', text: 'janedoe.dev' },
      ],
    });

    expect(result.text).toContain('[LinkedIn](https://linkedin.com/in/jane-doe)');
    expect(result.text.match(/https:\/\/janedoe\.dev/g)).toHaveLength(1);
  });

  it('falls back to vision OCR when anydoc cannot read the PDF', async () => {
    toMarkdownBytesMock.mockRejectedValueOnce(anydocError('hosted'));
    const buffer = readFileSync(fixturePath);
    const transcribePdfPages = vi.fn().mockResolvedValue('Mariela Romero\nProduct Designer');

    const result = await extractPdfTextTool(buffer, {
      modelId: 'openai/gpt-4o-mini',
      apiKey: 'test-key',
      transcribePdfPages,
      extractLinks: noLinks,
    });

    expect(transcribePdfPages).toHaveBeenCalledWith(buffer, 0, 'openai/gpt-4o-mini', 'test-key');
    expect(result.text).toContain('Mariela Romero');
    expect(result.usedVisionOcr).toBe(true);
  });

  it('passes the page count reported by anydoc to the vision fallback', async () => {
    toMarkdownBytesMock.mockRejectedValueOnce(
      anydocError('needsOcr', { pages: [1, 2], pageCount: 2 }),
    );
    const transcribePdfPages = vi.fn().mockResolvedValue('Jane Doe');

    const result = await extractPdfTextTool(readFileSync(fixturePath), {
      modelId: 'm',
      apiKey: 'k',
      transcribePdfPages,
      extractLinks: noLinks,
    });

    expect(transcribePdfPages).toHaveBeenCalledWith(expect.any(Buffer), 2, 'm', 'k');
    expect(result.pageCount).toBe(2);
  });

  it('rejects password-protected PDFs without trying vision OCR', async () => {
    toMarkdownBytesMock.mockRejectedValueOnce(anydocError('encrypted'));
    const transcribePdfPages = vi.fn();

    await expect(
      extractPdfTextTool(readFileSync(fixturePath), {
        modelId: 'm',
        apiKey: 'k',
        transcribePdfPages,
      }),
    ).rejects.toThrow(/password-protected/);
    expect(transcribePdfPages).not.toHaveBeenCalled();
  });

  it('fails with the anydoc reason when there is no vision model', async () => {
    toMarkdownBytesMock.mockRejectedValueOnce(anydocError('malformed'));
    await expect(extractPdfTextTool(readFileSync(fixturePath))).rejects.toThrow(/damaged/);
  });

  it('treats empty anydoc output as no text', async () => {
    toMarkdownBytesMock.mockResolvedValueOnce('   ');
    await expect(extractPdfTextTool(readFileSync(fixturePath))).rejects.toThrow(
      /No extractable text/,
    );
  });
});

describe('extractPdfLinks', () => {
  it('returns no links for the minimal fixture', async () => {
    await expect(extractPdfLinks(readFileSync(fixturePath))).resolves.toEqual([]);
  });

  it('returns no links for bytes that are not a PDF', async () => {
    await expect(extractPdfLinks(Buffer.from('not a pdf'))).resolves.toEqual([]);
  });

  it('formats links without anchor text as autolinks', () => {
    expect(appendPdfLinks('Jane', [{ url: 'https://x.example', text: '' }])).toBe(
      'Jane\n\n## Links in the document\n\n- <https://x.example>',
    );
    expect(appendPdfLinks('Jane', [])).toBe('Jane');
  });
});

describe('extractDocxTextTool', () => {
  it('converts DOCX to markdown with anydoc', async () => {
    toMarkdownBytesMock.mockResolvedValueOnce('# Jane Doe\n\n- Engineer');
    await expect(extractDocxTextTool(Buffer.from('docx'))).resolves.toEqual({
      text: '# Jane Doe\n\n- Engineer',
    });
    expect(toMarkdownBytesMock).toHaveBeenCalledWith(expect.any(Uint8Array), 'docx', {
      ocr: 'hosted',
    });
  });

  it('rejects DOCX files without text', async () => {
    toMarkdownBytesMock.mockResolvedValueOnce('');
    await expect(extractDocxTextTool(Buffer.from('docx'))).rejects.toThrow(
      'No extractable text found in DOCX',
    );
  });

  it('surfaces anydoc errors', async () => {
    toMarkdownBytesMock.mockRejectedValueOnce(anydocError('unsupported'));
    await expect(extractDocxTextTool(Buffer.from('docx'))).rejects.toThrow(/format/);
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
      webProviders: createWebProviderPool({ tavily: 'search-key' }),
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
