import {
  Logger,
  NotFoundException,
  PayloadTooLargeException,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { mcpExport } from '@resubuild/db';
import type { McpExportUploadInput } from '@resubuild/types';
import type { AuthUser } from '../auth/auth-user.types';
import { useTestDb } from '../database/test-db.helpers';
import { InMemoryObjectStorage } from '../storage/in-memory-object-storage';
import { ExportStorageService } from './export-storage.service';

const BUCKET = 'mcp-exports';
const CV_ID = '11111111-1111-1111-1111-111111111111';
const MISSING_ID = '00000000-0000-0000-0000-000000000000';

describe('ExportStorageService', () => {
  const ctx = useTestDb();
  let storage: InMemoryObjectStorage;
  let env: Record<string, string | undefined>;
  let service: ExportStorageService;
  let user: AuthUser;

  function createService(): ExportStorageService {
    const config = { get: (key: string) => env[key] } as unknown as ConfigService;
    return new ExportStorageService(config, ctx.db, storage.asService());
  }

  beforeEach(async () => {
    storage = new InMemoryObjectStorage();
    env = { MCP_EXPORT_BUCKET: BUCKET };
    service = createService();
    user = await ctx.createUser();
  });

  const input = (overrides: Partial<McpExportUploadInput> = {}): McpExportUploadInput => ({
    userId: user.id,
    cvId: CV_ID,
    kind: 'pdf',
    buffer: Buffer.from('%PDF-1.7'),
    contentType: 'application/pdf',
    filename: 'cv.pdf',
    templateId: 'classic',
    ...overrides,
  });

  const rows = () => ctx.db.select().from(mcpExport);

  describe('uploadAndRegister', () => {
    it('uploads the object, inserts the row and returns a presigned URL', async () => {
      const result = await service.uploadAndRegister(input());

      const path = `${user.id}/${CV_ID}/pdf/${result.record.id}.pdf`;
      expect(storage.keys(BUCKET)).toEqual([path]);
      expect(storage.objects.get(`${BUCKET}/${path}`)?.contentType).toBe('application/pdf');
      expect(result.signedUrl).toBe(`https://storage.test/${BUCKET}/${path}?X-Amz-Expires=3600`);
      expect(result.record).toMatchObject({
        userId: user.id,
        cvId: CV_ID,
        kind: 'pdf',
        storagePath: path,
        sizeBytes: 8,
        filename: 'cv.pdf',
        templateId: 'classic',
        mode: null,
      });
      expect(Date.parse(result.expiresAt) - Date.now()).toBeGreaterThan(3500 * 1000);
      expect(await rows()).toHaveLength(1);
    });

    it('maps every kind to its file extension', async () => {
      const ext = { html: 'html', pdf: 'pdf', screenshot: 'png', jsonresume: 'json' } as const;
      for (const [kind, extension] of Object.entries(ext)) {
        const result = await service.uploadAndRegister(input({ kind: kind as never }));
        expect(result.record.storagePath.endsWith(`.${extension}`)).toBe(true);
      }
    });

    it('stores the bare MIME type but keeps the descriptive one on the row', async () => {
      const result = await service.uploadAndRegister(
        input({ kind: 'jsonresume', contentType: 'application/json; charset=utf-8' }),
      );
      expect(storage.objects.get(`${BUCKET}/${result.record.storagePath}`)?.contentType).toBe(
        'application/json',
      );
      expect(result.record.contentType).toBe('application/json; charset=utf-8');
    });

    it('rejects empty and oversize payloads with 413 before touching storage', async () => {
      await expect(service.uploadAndRegister(input({ buffer: Buffer.alloc(0) }))).rejects.toThrow(
        PayloadTooLargeException,
      );
      env.MCP_EXPORT_MAX_BYTES = '4';
      await expect(createService().uploadAndRegister(input())).rejects.toThrow(/MiB limit/);
      expect(storage.objects.size).toBe(0);
    });

    it('fails fast with 503 without a bucket, storage or user id', async () => {
      env = {};
      await expect(createService().uploadAndRegister(input())).rejects.toThrow(
        'MCP export storage is not configured',
      );
      env = { MCP_EXPORT_BUCKET: BUCKET };
      storage.configured = false;
      await expect(createService().uploadAndRegister(input())).rejects.toThrow(
        'Object storage is not configured',
      );
      await expect(service.uploadAndRegister(input({ userId: ' ' }))).rejects.toThrow(
        ServiceUnavailableException,
      );
    });

    it('wraps storage upload errors as 503', async () => {
      jest.spyOn(storage, 'put').mockRejectedValueOnce(new Error('bucket full'));
      await expect(service.uploadAndRegister(input())).rejects.toThrow(
        new ServiceUnavailableException('bucket full'),
      );
      expect(await rows()).toEqual([]);
    });

    it('removes the uploaded object when the row insert fails (FK/constraint)', async () => {
      const errorLog = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
      await expect(service.uploadAndRegister(input({ userId: MISSING_ID }))).rejects.toThrow(
        'Failed to register MCP export row',
      );
      expect(storage.objects.size).toBe(0);
      errorLog.mockRestore();
    });

    it('logs a warning when the rollback itself fails and still throws 503', async () => {
      const warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
      jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
      jest.spyOn(storage, 'remove').mockRejectedValueOnce(new Error('remove failed'));

      await expect(service.uploadAndRegister(input({ userId: MISSING_ID }))).rejects.toThrow(
        ServiceUnavailableException,
      );
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('remove failed'));
      jest.restoreAllMocks();
    });

    it('throws 503 when presigning fails after the insert', async () => {
      jest.spyOn(storage, 'presignGet').mockRejectedValueOnce(new Error('sign failed'));
      await expect(service.uploadAndRegister(input())).rejects.toThrow(
        new ServiceUnavailableException('sign failed'),
      );
    });
  });

  describe('createSignedUrl', () => {
    it('re-signs and extends expires_at for the owner', async () => {
      const { record } = await service.uploadAndRegister(input());

      const result = await service.createSignedUrl(record.id, user.id, 120);

      expect(result.url).toContain('X-Amz-Expires=120');
      expect(result.record.id).toBe(record.id);
      const [row] = await rows();
      expect(row.expires_at).toBe(result.expiresAt);
    });

    it('throws NotFound for empty ids, unknown, foreign or expired exports', async () => {
      const { record } = await service.uploadAndRegister(input());
      const other = await ctx.createUser();

      await expect(service.createSignedUrl('', user.id, 60)).rejects.toThrow(NotFoundException);
      await expect(service.createSignedUrl(record.id, '', 60)).rejects.toThrow(NotFoundException);
      await expect(service.createSignedUrl(MISSING_ID, user.id, 60)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.createSignedUrl(record.id, other.id, 60)).rejects.toThrow(
        NotFoundException,
      );

      await ctx.db.update(mcpExport).set({ expires_at: '2000-01-01T00:00:00.000Z' });
      await expect(service.createSignedUrl(record.id, user.id, 60)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('wraps presign errors as 503', async () => {
      const { record } = await service.uploadAndRegister(input());
      jest.spyOn(storage, 'presignGet').mockRejectedValueOnce(new Error('sign failed'));
      await expect(service.createSignedUrl(record.id, user.id, 60)).rejects.toThrow(
        ServiceUnavailableException,
      );
    });

    it('warns but still returns the URL when the expires_at update fails', async () => {
      const { record } = await service.uploadAndRegister(input());
      const warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
      jest.spyOn(ctx.db, 'update').mockImplementationOnce(() => {
        throw new Error('update failed');
      });

      await expect(service.createSignedUrl(record.id, user.id, 60)).resolves.toMatchObject({
        url: expect.any(String),
      });
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('update failed'));
      jest.restoreAllMocks();
    });
  });

  describe('runSweep', () => {
    it('removes expired rows and their objects, leaving valid rows alone', async () => {
      const expired = await service.uploadAndRegister(input());
      const valid = await service.uploadAndRegister(input({ kind: 'html' }));
      const { eq } = await import('@resubuild/db');
      await ctx.db
        .update(mcpExport)
        .set({ expires_at: '2000-01-01T00:00:00.000Z' })
        .where(eq(mcpExport.id, expired.record.id));

      await expect(service.runSweep()).resolves.toEqual({ rowsDeleted: 1, objectsDeleted: 1 });

      expect((await rows()).map((r) => r.id)).toEqual([valid.record.id]);
      expect(storage.keys(BUCKET)).toEqual([valid.record.storagePath]);
    });

    it('is a no-op when nothing is expired', async () => {
      await service.uploadAndRegister(input());
      await expect(service.runSweep()).resolves.toEqual({ rowsDeleted: 0, objectsDeleted: 0 });
    });

    it('still deletes rows when storage removal fails', async () => {
      await service.uploadAndRegister(input());
      const warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
      jest.spyOn(storage, 'remove').mockRejectedValueOnce(new Error('storage down'));

      await expect(service.runSweep(new Date(Date.now() + 10 * 3600 * 1000))).resolves.toEqual({
        rowsDeleted: 1,
        objectsDeleted: 0,
      });
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('storage down'));
      jest.restoreAllMocks();
    });

    it('sweepExpired delegates to runSweep with the current time', async () => {
      const spy = jest.spyOn(service, 'runSweep').mockResolvedValue({
        rowsDeleted: 0,
        objectsDeleted: 0,
      });
      await service.sweepExpired();
      expect(spy).toHaveBeenCalledWith(expect.any(Date));
    });
  });

  describe('accessors', () => {
    it('reflect configured env values and fall back to defaults when invalid', () => {
      env = { MCP_EXPORT_MAX_BYTES: '2048', MCP_EXPORT_TTL_SECONDS: '60' };
      const configured = createService();
      expect(configured.getMaxBytes()).toBe(2048);
      expect(configured.getDefaultTtlSeconds()).toBe(60);

      env = { MCP_EXPORT_MAX_BYTES: 'nope', MCP_EXPORT_TTL_SECONDS: '-5' };
      const fallback = createService();
      expect(fallback.getMaxBytes()).toBe(10 * 1024 * 1024);
      expect(fallback.getDefaultTtlSeconds()).toBe(3600);
    });
  });

  describe('expiry heuristics', () => {
    it('treats a missing or unparseable expires_at as expired', () => {
      const isExpired = (value: string | null) =>
        (service as unknown as { isExpired: (v: string | null) => boolean }).isExpired(value);
      expect(isExpired(null)).toBe(true);
      expect(isExpired('garbage')).toBe(true);
      expect(isExpired(new Date(Date.now() + 60_000).toISOString())).toBe(false);
    });
  });
});
