import { BadRequestException } from '@nestjs/common';
import type { AuthUser } from '../auth/auth-user.types';
import { McpExportService } from './mcp-export.service';

const user: AuthUser = { id: 'u-1', authMethod: 'mcp' } as AuthUser;

function makeUploadResult(
  overrides: Partial<{
    exportId: string;
    id: string;
    signedUrl: string;
    expiresAt: string;
    filename: string;
    contentType: string;
    sizeBytes: number;
    kind: 'html' | 'pdf' | 'screenshot' | 'jsonresume';
    templateId: string | null;
    mode: 'first_page' | 'full_document' | null;
    storagePath: string;
    userId: string;
    cvId: string;
  }> = {},
) {
  const future = new Date(Date.now() + 3_600_000).toISOString();
  const exportId = overrides.exportId ?? 'exp-1';
  return {
    record: {
      id: overrides.id ?? exportId,
      exportId,
      filename: overrides.filename ?? 'cv.pdf',
      contentType: overrides.contentType ?? 'application/pdf',
      sizeBytes: overrides.sizeBytes ?? 10,
      kind: overrides.kind ?? 'pdf',
      templateId: overrides.templateId ?? 'classic',
      mode: overrides.mode ?? null,
      storagePath: overrides.storagePath ?? `u-1/c-1/pdf/${exportId}.pdf`,
      userId: overrides.userId ?? 'u-1',
      cvId: overrides.cvId ?? 'c-1',
      createdAt: future,
      expiresAt: overrides.expiresAt ?? future,
    },
    signedUrl:
      overrides.signedUrl ?? `https://signed.example/u-1/c-1/pdf/${exportId}.pdf?token=abc`,
    expiresAt: overrides.expiresAt ?? future,
  };
}

function makeRefreshResult(
  overrides: Partial<{
    url: string;
    expiresAt: string;
    filename: string;
    contentType: string;
    sizeBytes: number;
    kind: 'html' | 'pdf' | 'screenshot' | 'jsonresume';
    templateId: string | null;
    mode: 'first_page' | 'full_document' | null;
    storagePath: string;
    userId: string;
    cvId: string;
  }> = {},
) {
  const future = new Date(Date.now() + 3_600_000).toISOString();
  return {
    url: overrides.url ?? 'https://signed.example/exp-1?token=abc',
    expiresAt: overrides.expiresAt ?? future,
    record: {
      id: 'exp-1',
      exportId: 'exp-1',
      filename: overrides.filename ?? 'cv.pdf',
      contentType: overrides.contentType ?? 'application/pdf',
      sizeBytes: overrides.sizeBytes ?? 10,
      kind: overrides.kind ?? 'pdf',
      templateId: overrides.templateId ?? 'classic',
      mode: overrides.mode ?? null,
      storagePath: overrides.storagePath ?? 'u-1/c-1/pdf/exp-1.pdf',
      userId: overrides.userId ?? 'u-1',
      cvId: overrides.cvId ?? 'c-1',
      createdAt: future,
      expiresAt: overrides.expiresAt ?? future,
    },
  };
}

describe('McpExportService', () => {
  let cvExportService: {
    renderHtml: jest.Mock;
    renderPdf: jest.Mock;
    renderScreenshot: jest.Mock;
    renderJson: jest.Mock;
    resolveTemplateId: jest.Mock;
  };
  let cvService: { findOne: jest.Mock };
  let storage: {
    uploadAndRegister: jest.Mock;
    createSignedUrl: jest.Mock;
    getDefaultTtlSeconds: jest.Mock;
  };
  let service: McpExportService;

  beforeEach(() => {
    cvExportService = {
      renderHtml: jest.fn(),
      renderPdf: jest.fn(),
      renderScreenshot: jest.fn(),
      renderJson: jest.fn(),
      resolveTemplateId: jest.fn(),
    };
    cvService = { findOne: jest.fn() };
    storage = {
      uploadAndRegister: jest.fn(),
      createSignedUrl: jest.fn(),
      getDefaultTtlSeconds: jest.fn().mockReturnValue(3600),
    };
    service = new McpExportService(cvExportService as never, cvService as never, storage as never);
  });

  describe('publishHtml', () => {
    it('uploads an HTML buffer and returns the envelope with the signed storage URL', async () => {
      cvExportService.renderHtml.mockResolvedValue('<html></html>');
      cvService.findOne.mockResolvedValue({ id: 'c-1', title: 'Jane Doe', templateId: 'classic' });
      cvExportService.resolveTemplateId.mockReturnValue('classic');
      const stored = makeUploadResult({
        kind: 'html',
        contentType: 'text/html; charset=utf-8',
        filename: 'jane-doe.html',
        signedUrl: 'https://signed.example/u-1/c-1/html/exp-1.html?token=abc',
      });
      storage.uploadAndRegister.mockResolvedValue(stored);

      const result = await service.publishHtml(user, 'c-1', 'classic');

      expect(cvExportService.renderHtml).toHaveBeenCalledWith(user, 'c-1', 'classic');
      expect(storage.uploadAndRegister).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'u-1',
          cvId: 'c-1',
          kind: 'html',
          contentType: 'text/html; charset=utf-8',
        }),
      );
      expect(storage.createSignedUrl).not.toHaveBeenCalled();
      expect(result.kind).toBe('html');
      expect(result.contentType).toBe('text/html; charset=utf-8');
      expect(result.templateId).toBe('classic');
      expect(result.url).toBe('https://signed.example/u-1/c-1/html/exp-1.html?token=abc');
      expect(result.url).toContain('?token=');
    });
  });

  describe('publishPdf', () => {
    it('uploads a PDF buffer with the rendered filename', async () => {
      cvExportService.renderPdf.mockResolvedValue({
        buffer: Buffer.from('%PDF-1.4'),
        filename: 'jane.pdf',
      });
      cvService.findOne.mockResolvedValue({ id: 'c-1', title: 'Jane Doe', templateId: 'classic' });
      cvExportService.resolveTemplateId.mockReturnValue('classic');
      const stored = makeUploadResult({
        kind: 'pdf',
        filename: 'jane.pdf',
        signedUrl: 'https://signed.example/u-1/c-1/pdf/exp-1.pdf?token=xyz',
      });
      storage.uploadAndRegister.mockResolvedValue(stored);

      const result = await service.publishPdf(user, 'c-1', 'modern');

      expect(result.kind).toBe('pdf');
      expect(result.contentType).toBe('application/pdf');
      expect(storage.uploadAndRegister).toHaveBeenCalledWith(
        expect.objectContaining({ kind: 'pdf', filename: 'jane.pdf' }),
      );
      expect(result.url).toBe('https://signed.example/u-1/c-1/pdf/exp-1.pdf?token=xyz');
    });
  });

  describe('publishScreenshot', () => {
    it('preserves mode in the envelope', async () => {
      cvExportService.renderScreenshot.mockResolvedValue({
        buffer: Buffer.from('png'),
        filename: 'jane-full_document.png',
        mode: 'full_document',
        templateId: 'classic',
      });
      const stored = makeUploadResult({
        kind: 'screenshot',
        contentType: 'image/png',
        mode: 'full_document',
        signedUrl: 'https://signed.example/u-1/c-1/screenshot/exp-1.png?token=q',
      });
      storage.uploadAndRegister.mockResolvedValue(stored);

      const result = await service.publishScreenshot(user, 'c-1', { mode: 'full_document' });

      expect(result.kind).toBe('screenshot');
      expect(result.mode).toBe('full_document');
      expect(storage.uploadAndRegister).toHaveBeenCalledWith(
        expect.objectContaining({ kind: 'screenshot', mode: 'full_document' }),
      );
      expect(result.url).toBe('https://signed.example/u-1/c-1/screenshot/exp-1.png?token=q');
    });

    it('defaults to first_page when mode omitted', async () => {
      cvExportService.renderScreenshot.mockResolvedValue({
        buffer: Buffer.from('png'),
        filename: 'jane-first_page.png',
        mode: 'first_page',
        templateId: 'classic',
      });
      const stored = makeUploadResult({
        kind: 'screenshot',
        mode: 'first_page',
        signedUrl: 'https://signed.example/u-1/c-1/screenshot/exp-1.png?token=q',
      });
      storage.uploadAndRegister.mockResolvedValue(stored);

      const result = await service.publishScreenshot(user, 'c-1');
      expect(result.mode).toBe('first_page');
    });
  });

  describe('publishJsonResume', () => {
    it('uploads JSON Resume and includes parsed document', async () => {
      cvExportService.renderJson.mockResolvedValue({
        body: '{"$schema":"https://jsonresume.org/schema","basics":{"name":"Jane"}}',
        filename: 'jane.json',
      });
      cvService.findOne.mockResolvedValue({ id: 'c-1', title: 'Jane', templateId: 'classic' });
      const stored = makeUploadResult({
        kind: 'jsonresume',
        contentType: 'application/json; charset=utf-8',
        signedUrl: 'https://signed.example/u-1/c-1/jsonresume/exp-1.json?token=q',
      });
      storage.uploadAndRegister.mockResolvedValue(stored);

      const result = await service.publishJsonResume(user, 'c-1');

      expect(result.kind).toBe('jsonresume');
      expect(result.document).toMatchObject({ basics: { name: 'Jane' } });
      expect(result.url).toBe('https://signed.example/u-1/c-1/jsonresume/exp-1.json?token=q');
    });

    it('warns and omits document when the rendered JSON cannot be parsed', async () => {
      const warn = jest
        .spyOn((service as unknown as { logger: { warn: jest.Mock } }).logger, 'warn')
        .mockImplementation(() => undefined);
      cvExportService.renderJson.mockResolvedValue({
        body: '{this is not valid JSON',
        filename: 'jane.json',
      });
      cvService.findOne.mockResolvedValue({ id: 'c-1', title: 'Jane', templateId: 'classic' });
      const stored = makeUploadResult({ kind: 'jsonresume' });
      storage.uploadAndRegister.mockResolvedValue(stored);

      const result = await service.publishJsonResume(user, 'c-1');

      expect(result.document).toBeUndefined();
      expect(warn).toHaveBeenCalled();
    });
  });

  describe('refreshSignedUrl', () => {
    it('bumps expires_at via storage and returns the signed storage URL', async () => {
      const refresh = makeRefreshResult({ url: 'https://signed.example/exp-1?token=abc' });
      storage.createSignedUrl.mockResolvedValue(refresh);

      const result = await service.refreshSignedUrl(user, 'exp-1', 120);

      expect(storage.createSignedUrl).toHaveBeenCalledWith('exp-1', 'u-1', 120);
      expect(result.exportId).toBe('exp-1');
      // The envelope URL is the signed storage URL (carrying the ?token=... query
      // string), not an API-host viewer URL.
      expect(result.url).toBe('https://signed.example/exp-1?token=abc');
    });

    it('uses default TTL when none provided', async () => {
      const refresh = makeRefreshResult();
      storage.createSignedUrl.mockResolvedValue(refresh);

      await service.refreshSignedUrl(user, 'exp-1');

      expect(storage.createSignedUrl).toHaveBeenCalledWith('exp-1', 'u-1', 3600);
    });

    it('throws 400 for ttlSeconds below the minimum', async () => {
      await expect(service.refreshSignedUrl(user, 'exp-1', 10)).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('throws 400 for ttlSeconds above the maximum', async () => {
      await expect(service.refreshSignedUrl(user, 'exp-1', 86401)).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('throws 400 for non-integer ttlSeconds', async () => {
      await expect(service.refreshSignedUrl(user, 'exp-1', 100.5)).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('throws 400 for non-finite ttlSeconds (NaN/Infinity)', async () => {
      await expect(service.refreshSignedUrl(user, 'exp-1', Number.NaN)).rejects.toBeInstanceOf(
        BadRequestException,
      );
      await expect(
        service.refreshSignedUrl(user, 'exp-1', Number.POSITIVE_INFINITY),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });
});
