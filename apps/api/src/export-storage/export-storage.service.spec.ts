import {
  NotFoundException,
  PayloadTooLargeException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ExportStorageService } from './export-storage.service';

type Row = Record<string, unknown> & {
  id: string;
  user_id: string;
  cv_id: string;
  kind: 'html' | 'pdf' | 'screenshot' | 'jsonresume';
  storage_path: string;
  content_type: string;
  size_bytes: number;
  filename: string;
  template_id: string | null;
  mode: string | null;
  expires_at: string;
  created_at: string;
};

const BUCKET = 'mcp-exports';

function createMockSupabase(initialRows: Row[] = []) {
  const rows: Row[] = [...initialRows];
  const storage = new Map<string, Buffer>();
  const uploadCalls: Array<{ path: string; contentType?: string }> = [];

  let storageRemoveError: { message: string } | null = null;
  let storageRemoveThrows: Error | null = null;
  const storageRemove = jest.fn(async (paths: string[]) => {
    if (storageRemoveThrows) {
      throw storageRemoveThrows;
    }
    if (storageRemoveError) {
      return { data: null, error: storageRemoveError };
    }
    const removed: string[] = [];
    for (const p of paths) {
      if (storage.delete(p)) {
        removed.push(p);
      }
    }
    return { data: removed, error: null };
  });

  let uploadError: { message: string } | null = null;
  let signedUrlError: { message: string } | null = null;
  const storageBucket = () => ({
    upload: jest.fn(async (path: string, buf: Buffer, options?: { contentType?: string }) => {
      uploadCalls.push({ path, contentType: options?.contentType });
      if (uploadError) {
        return { data: null, error: uploadError };
      }
      storage.set(path, buf);
      return { data: { path }, error: null };
    }),
    download: jest.fn(async (path: string) => {
      const buf = storage.get(path);
      if (!buf) {
        return { data: null, error: { message: 'not found' } };
      }
      return { data: { arrayBuffer: async () => buf }, error: null };
    }),
    createSignedUrl: jest.fn(async (path: string) => {
      if (signedUrlError) {
        return { data: null, error: signedUrlError };
      }
      if (!storage.has(path)) {
        return { data: null, error: { message: 'missing' } };
      }
      return {
        data: { signedUrl: `https://signed.example/${path}?t=now` },
        error: null,
      };
    }),
    remove: storageRemove,
  });

  type PendingQuery = {
    filters: Array<(row: Row) => boolean>;
    mode: 'select' | 'delete' | 'insert' | 'update';
    payload?: unknown;
  };

  let insertError: { message: string } | null = null;
  let updateError: { message: string } | null = null;
  let deleteError: { message: string } | null = null;
  let selectError: { message: string } | null = null;
  const newBuilder = () => {
    const query: PendingQuery = { filters: [], mode: 'select' };

    const run = async (): Promise<{
      data: unknown;
      error: { message: string } | null;
      count?: number;
    }> => {
      if (query.mode === 'insert' && insertError) {
        return { data: null, error: insertError };
      }
      if (query.mode === 'update' && updateError) {
        return { data: null, error: updateError };
      }
      if (query.mode === 'delete' && deleteError) {
        return { data: null, error: deleteError };
      }
      if (query.mode === 'select' && selectError) {
        return { data: null, error: selectError };
      }
      if (query.mode === 'insert') {
        const incoming = query.payload as Row;
        rows.push(incoming);
        return { data: incoming, error: null };
      }
      if (query.mode === 'update') {
        const patch = query.payload as Partial<Row>;
        let changed = 0;
        for (const r of rows) {
          if (query.filters.every((f) => f(r))) {
            Object.assign(r, patch);
            changed += 1;
          }
        }
        return { data: null, error: null, count: changed };
      }
      if (query.mode === 'delete') {
        const before = rows.length;
        const kept: Row[] = [];
        for (const r of rows) {
          if (!query.filters.every((f) => f(r))) {
            kept.push(r);
          }
        }
        rows.length = 0;
        rows.push(...kept);
        return { data: null, error: null, count: before - kept.length };
      }
      const matches = rows.filter((r) => query.filters.every((f) => f(r)));
      return { data: matches, error: null };
    };

    const builder: {
      select: (cols?: string) => typeof builder;
      eq: (col: string, val: unknown) => typeof builder;
      lt: (col: string, val: unknown) => typeof builder;
      maybeSingle: () => Promise<{ data: unknown; error: unknown }>;
      single: () => Promise<{ data: unknown; error: unknown }>;
      insert: (payload: Row) => typeof builder;
      update: (patch: Partial<Row>) => typeof builder;
      delete: (opts?: { count?: 'exact' }) => typeof builder;
      then: <TResult1 = unknown>(
        resolve: (v: { data: unknown; error: unknown; count?: number }) => TResult1,
      ) => Promise<TResult1>;
    } = {
      select: () => {
        // After insert/update, .select() should not flip the mode back to 'select'.
        // For our purposes, we only care about the result shape: insert+select+single
        // returns the inserted row.
        if (query.mode !== 'insert' && query.mode !== 'update') {
          query.mode = 'select';
        }
        return builder;
      },
      eq: (col, val) => {
        query.filters.push((r) => (r as Record<string, unknown>)[col] === val);
        return builder;
      },
      lt: (col, val) => {
        query.filters.push((r) => {
          const cell = (r as Record<string, unknown>)[col] as string;
          return typeof cell === 'string' && cell < (val as string);
        });
        return builder;
      },
      maybeSingle: async () => {
        const { data, error } = await run();
        if (query.mode === 'insert') {
          return { data, error };
        }
        if (query.mode === 'update') {
          return { data: null, error };
        }
        const list = (data as Row[]) ?? [];
        return { data: list[0] ?? null, error };
      },
      single: async () => {
        const { data, error } = await run();
        if (query.mode === 'insert') {
          return { data, error };
        }
        if (query.mode === 'update') {
          return { data: null, error };
        }
        const list = (data as Row[]) ?? [];
        return { data: list[0] ?? null, error };
      },
      insert: (payload) => {
        query.mode = 'insert';
        query.payload = payload;
        return builder;
      },
      update: (patch) => {
        query.mode = 'update';
        query.payload = patch;
        return builder;
      },
      delete: (opts) => {
        query.mode = 'delete';
        if (opts?.count === 'exact') {
          // count is requested — emit count in run()
        }
        return builder;
      },
      // biome-ignore lint/suspicious/noThenProperty: builder is awaitable like real supabase-js
      then: async (resolve) => {
        const v = await run();
        return resolve({ data: v.data, error: v.error, count: v.count });
      },
    };
    return builder;
  };

  const tableFrom = (name: string) => {
    if (name !== 'mcp_export') {
      throw new Error(`Unexpected table: ${name}`);
    }
    return newBuilder();
  };

  const api = {
    client: {
      from: tableFrom,
      storage: {
        from: (bucket: string) => {
          if (bucket !== BUCKET) {
            throw new Error(`Unexpected bucket: ${bucket}`);
          }
          return storageBucket();
        },
      },
    } as never,
    rows,
    storage,
    storageRemove,
    uploadCalls,
    setUploadError: (e: { message: string } | null) => {
      uploadError = e;
    },
    setInsertError: (e: { message: string } | null) => {
      insertError = e;
    },
    setSelectError: (e: { message: string } | null) => {
      selectError = e;
    },
    setSignedUrlError: (e: { message: string } | null) => {
      signedUrlError = e;
    },
    setUpdateError: (e: { message: string } | null) => {
      updateError = e;
    },
    setDeleteError: (e: { message: string } | null) => {
      deleteError = e;
    },
    setStorageRemoveError: (e: { message: string } | null) => {
      storageRemoveError = e;
    },
    setStorageRemoveThrows: (e: Error | null) => {
      storageRemoveThrows = e;
    },
  };
  return api;
}

function makeConfig(overrides: Record<string, string | undefined> = {}): ConfigService {
  return {
    get: (key: string) => overrides[key],
  } as unknown as ConfigService;
}

describe('ExportStorageService', () => {
  let mock: ReturnType<typeof createMockSupabase>;
  let service: ExportStorageService;

  beforeEach(() => {
    mock = createMockSupabase();
    service = new ExportStorageService(makeConfig({ MCP_EXPORT_BUCKET: BUCKET }));
    (service as unknown as { client: unknown }).client = mock.client;
  });

  describe('uploadAndRegister', () => {
    it('uploads to storage, inserts a row, and returns a signed URL', async () => {
      const result = await service.uploadAndRegister({
        userId: 'u-1',
        cvId: 'c-1',
        kind: 'pdf',
        buffer: Buffer.from('%PDF-1.4 hello'),
        contentType: 'application/pdf',
        filename: 'jane.pdf',
        templateId: 'classic',
      });

      expect(result.record.kind).toBe('pdf');
      expect(result.record.userId).toBe('u-1');
      expect(result.record.cvId).toBe('c-1');
      expect(result.record.storagePath).toBe(`u-1/c-1/pdf/${result.record.id}.pdf`);
      expect(result.record.sizeBytes).toBeGreaterThan(0);
      expect(result.signedUrl).toMatch(/^https:\/\/signed\.example\//);
      expect(result.signedUrl).toContain(result.record.storagePath);
      expect(result.expiresAt).toMatch(/T.*Z|\+00:00/);
      expect(mock.storage.has(result.record.storagePath)).toBe(true);
      expect(mock.rows).toHaveLength(1);
      expect(mock.rows[0].template_id).toBe('classic');
    });

    it('maps all four kinds to their respective file extensions', async () => {
      const html = await service.uploadAndRegister({
        userId: 'u-1',
        cvId: 'c-1',
        kind: 'html',
        buffer: Buffer.from('<html></html>'),
        contentType: 'text/html',
        filename: 'cv.html',
      });
      const shot = await service.uploadAndRegister({
        userId: 'u-1',
        cvId: 'c-1',
        kind: 'screenshot',
        buffer: Buffer.from('png'),
        contentType: 'image/png',
        filename: 'cv.png',
      });
      const json = await service.uploadAndRegister({
        userId: 'u-1',
        cvId: 'c-1',
        kind: 'jsonresume',
        buffer: Buffer.from('{}'),
        contentType: 'application/json',
        filename: 'cv.json',
      });

      expect(html.record.storagePath.endsWith('.html')).toBe(true);
      expect(shot.record.storagePath.endsWith('.png')).toBe(true);
      expect(json.record.storagePath.endsWith('.json')).toBe(true);
    });

    it('strips MIME parameters from contentType before calling storage.upload, while keeping the original on the row', async () => {
      const result = await service.uploadAndRegister({
        userId: 'u-1',
        cvId: 'c-1',
        kind: 'jsonresume',
        buffer: Buffer.from('{"basics":{}}'),
        contentType: 'application/json; charset=utf-8',
        filename: 'cv.json',
      });

      // Storage layer receives the bare MIME so the bucket allowlist accepts it.
      const lastUpload = mock.uploadCalls[mock.uploadCalls.length - 1];
      expect(lastUpload.contentType).toBe('application/json');
      // The descriptive value is preserved on the DB row and the response envelope.
      expect(result.record.contentType).toBe('application/json; charset=utf-8');
      expect(mock.rows[0].content_type).toBe('application/json; charset=utf-8');
    });

    it('strips MIME parameters on the HTML export too (text/html; charset=utf-8 → text/html)', async () => {
      await service.uploadAndRegister({
        userId: 'u-1',
        cvId: 'c-1',
        kind: 'html',
        buffer: Buffer.from('<html></html>'),
        contentType: 'text/html; charset=utf-8',
        filename: 'cv.html',
      });

      const lastUpload = mock.uploadCalls[mock.uploadCalls.length - 1];
      expect(lastUpload.contentType).toBe('text/html');
      expect(mock.rows[0].content_type).toBe('text/html; charset=utf-8');
    });

    it('leaves a parameter-less contentType unchanged for the storage upload', async () => {
      await service.uploadAndRegister({
        userId: 'u-1',
        cvId: 'c-1',
        kind: 'pdf',
        buffer: Buffer.from('%PDF-1.4'),
        contentType: 'application/pdf',
        filename: 'cv.pdf',
      });

      const lastUpload = mock.uploadCalls[mock.uploadCalls.length - 1];
      expect(lastUpload.contentType).toBe('application/pdf');
      expect(mock.rows[0].content_type).toBe('application/pdf');
    });

    it('throws 503 when the post-insert signed-URL issuance fails', async () => {
      mock.setSignedUrlError({ message: 'signing failed' });
      await expect(
        service.uploadAndRegister({
          userId: 'u-1',
          cvId: 'c-1',
          kind: 'pdf',
          buffer: Buffer.from('data'),
          contentType: 'application/pdf',
          filename: 'x.pdf',
        }),
      ).rejects.toBeInstanceOf(ServiceUnavailableException);
    });

    it('handles a rollback that itself throws by logging a warning and still throwing 503', async () => {
      mock.setInsertError({ message: 'rls denied' });
      // Storage remove rejects (simulating a real error during rollback)
      mock.setStorageRemoveError({ message: 'storage unreachable' });
      await expect(
        service.uploadAndRegister({
          userId: 'u-1',
          cvId: 'c-1',
          kind: 'pdf',
          buffer: Buffer.from('data'),
          contentType: 'application/pdf',
          filename: 'x.pdf',
        }),
      ).rejects.toBeInstanceOf(ServiceUnavailableException);
    });

    it('rejects empty buffer with 413', async () => {
      await expect(
        service.uploadAndRegister({
          userId: 'u-1',
          cvId: 'c-1',
          kind: 'html',
          buffer: Buffer.alloc(0),
          contentType: 'text/html',
          filename: 'empty.html',
        }),
      ).rejects.toBeInstanceOf(PayloadTooLargeException);
    });

    it('rejects oversize buffer with 413 before any storage call', async () => {
      const small = new ExportStorageService(
        makeConfig({ MCP_EXPORT_MAX_BYTES: '100', MCP_EXPORT_BUCKET: BUCKET }),
      );
      (small as unknown as { client: unknown }).client = mock.client;
      const big = Buffer.alloc(200, 'x');

      await expect(
        small.uploadAndRegister({
          userId: 'u-1',
          cvId: 'c-1',
          kind: 'pdf',
          buffer: big,
          contentType: 'application/pdf',
          filename: 'big.pdf',
        }),
      ).rejects.toBeInstanceOf(PayloadTooLargeException);

      expect(mock.storage.size).toBe(0);
    });

    it('fails fast with 503 if MCP_EXPORT_BUCKET is missing', async () => {
      const noBucket = new ExportStorageService(makeConfig({ MCP_EXPORT_BUCKET: '' }));
      (noBucket as unknown as { client: unknown }).client = mock.client;
      await expect(
        noBucket.uploadAndRegister({
          userId: 'u-1',
          cvId: 'c-1',
          kind: 'pdf',
          buffer: Buffer.from('data'),
          contentType: 'application/pdf',
          filename: 'x.pdf',
        }),
      ).rejects.toBeInstanceOf(ServiceUnavailableException);
    });
  });

  describe('createSignedUrl', () => {
    it('returns a signed URL and updates expires_at', async () => {
      const future = new Date(Date.now() + 60_000).toISOString();
      mock.rows.push({
        id: 'exp-1',
        user_id: 'u-1',
        cv_id: 'c-1',
        kind: 'html',
        storage_path: 'u-1/c-1/html/exp-1.html',
        content_type: 'text/html',
        size_bytes: 10,
        filename: 'r.html',
        template_id: null,
        mode: null,
        expires_at: future,
        created_at: new Date().toISOString(),
      });
      mock.storage.set('u-1/c-1/html/exp-1.html', Buffer.from('hello'));

      const { url, expiresAt, record } = await service.createSignedUrl('exp-1', 'u-1', 3600);

      expect(url).toMatch(/^https:\/\/signed\.example\//);
      expect(new Date(expiresAt).getTime()).toBeGreaterThan(Date.now() + 3000);
      expect(record.expiresAt).toBe(expiresAt);
    });

    it('throws NotFound for unknown exportId', async () => {
      await expect(service.createSignedUrl('missing', 'u-1', 3600)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('throws NotFound for cross-user export', async () => {
      mock.rows.push({
        id: 'exp-1',
        user_id: 'u-2',
        cv_id: 'c-1',
        kind: 'html',
        storage_path: 'u-2/c-1/html/exp-1.html',
        content_type: 'text/html',
        size_bytes: 10,
        filename: 'r.html',
        template_id: null,
        mode: null,
        expires_at: new Date(Date.now() + 60_000).toISOString(),
        created_at: new Date().toISOString(),
      });

      await expect(service.createSignedUrl('exp-1', 'u-1', 3600)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('throws NotFound for expired row', async () => {
      mock.rows.push({
        id: 'exp-1',
        user_id: 'u-1',
        cv_id: 'c-1',
        kind: 'html',
        storage_path: 'u-1/c-1/html/exp-1.html',
        content_type: 'text/html',
        size_bytes: 10,
        filename: 'r.html',
        template_id: null,
        mode: null,
        expires_at: new Date(Date.now() - 60_000).toISOString(),
        created_at: new Date().toISOString(),
      });

      await expect(service.createSignedUrl('exp-1', 'u-1', 3600)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('runSweep', () => {
    it('removes expired rows and their storage objects, leaves valid rows alone', async () => {
      const past = new Date(Date.now() - 60_000).toISOString();
      const future = new Date(Date.now() + 60_000).toISOString();
      mock.rows.push(
        {
          id: 'exp-1',
          user_id: 'u-1',
          cv_id: 'c-1',
          kind: 'pdf',
          storage_path: 'u-1/c-1/pdf/exp-1.pdf',
          content_type: 'application/pdf',
          size_bytes: 10,
          filename: 'r.pdf',
          template_id: null,
          mode: null,
          expires_at: past,
          created_at: new Date().toISOString(),
        },
        {
          id: 'exp-2',
          user_id: 'u-1',
          cv_id: 'c-1',
          kind: 'html',
          storage_path: 'u-1/c-1/html/exp-2.html',
          content_type: 'text/html',
          size_bytes: 10,
          filename: 'r.html',
          template_id: null,
          mode: null,
          expires_at: future,
          created_at: new Date().toISOString(),
        },
      );
      mock.storage.set('u-1/c-1/pdf/exp-1.pdf', Buffer.from('old'));
      mock.storage.set('u-1/c-1/html/exp-2.html', Buffer.from('keep'));

      const result = await service.runSweep();

      expect(result.rowsDeleted).toBe(1);
      expect(result.objectsDeleted).toBe(1);
      expect(mock.storage.has('u-1/c-1/pdf/exp-1.pdf')).toBe(false);
      expect(mock.storage.has('u-1/c-1/html/exp-2.html')).toBe(true);
      expect(mock.rows).toHaveLength(1);
      expect(mock.rows[0].id).toBe('exp-2');
    });

    it('is a no-op when nothing is expired', async () => {
      const future = new Date(Date.now() + 60_000).toISOString();
      mock.rows.push({
        id: 'exp-1',
        user_id: 'u-1',
        cv_id: 'c-1',
        kind: 'html',
        storage_path: 'u-1/c-1/html/exp-1.html',
        content_type: 'text/html',
        size_bytes: 10,
        filename: 'r.html',
        template_id: null,
        mode: null,
        expires_at: future,
        created_at: new Date().toISOString(),
      });

      const result = await service.runSweep();

      expect(result).toEqual({ rowsDeleted: 0, objectsDeleted: 0 });
      expect(mock.rows).toHaveLength(1);
    });
  });

  describe('cron entry point', () => {
    it('sweepExpired delegates to runSweep with the current time', async () => {
      const past = new Date(Date.now() - 60_000).toISOString();
      mock.rows.push({
        id: 'exp-1',
        user_id: 'u-1',
        cv_id: 'c-1',
        kind: 'html',
        storage_path: 'u-1/c-1/html/exp-1.html',
        content_type: 'text/html',
        size_bytes: 10,
        filename: 'r.html',
        template_id: null,
        mode: null,
        expires_at: past,
        created_at: new Date().toISOString(),
      });
      mock.storage.set('u-1/c-1/html/exp-1.html', Buffer.from('old'));

      const before = Date.now();
      const result = await service.sweepExpired();
      const after = Date.now();

      expect(result.rowsDeleted).toBe(1);
      expect(result.objectsDeleted).toBe(1);

      // The default `now` was set inside sweepExpired, between `before` and `after`.
      // Verify the cutoff is roughly now (i.e. not a fixed date in 1970).
      expect(mock.rows).toHaveLength(0);
      expect(before).toBeLessThanOrEqual(after);
    });
  });

  describe('accessors', () => {
    it('getMaxBytes and getDefaultTtlSeconds reflect the configured env values', () => {
      const sized = new ExportStorageService(
        makeConfig({ MCP_EXPORT_BUCKET: BUCKET, MCP_EXPORT_MAX_BYTES: '500' }),
      );
      expect(sized.getMaxBytes()).toBe(500);
      expect(sized.getDefaultTtlSeconds()).toBe(3600);
    });

    it('falls back to defaults for invalid (non-numeric) env values', () => {
      const fallback = new ExportStorageService(
        makeConfig({
          MCP_EXPORT_BUCKET: BUCKET,
          MCP_EXPORT_MAX_BYTES: 'not-a-number',
          MCP_EXPORT_TTL_SECONDS: '-1',
        }),
      );
      expect(fallback.getMaxBytes()).toBe(10 * 1024 * 1024);
      expect(fallback.getDefaultTtlSeconds()).toBe(3600);
    });
  });

  describe('ensureClient', () => {
    it('throws 503 when SUPABASE_URL is missing', () => {
      const missing = new ExportStorageService(
        makeConfig({ MCP_EXPORT_BUCKET: BUCKET, SUPABASE_SERVICE_ROLE_KEY: 'k' }),
      );
      expect(() => (missing as unknown as { ensureClient(): unknown }).ensureClient()).toThrow(
        ServiceUnavailableException,
      );
    });

    it('throws 503 when SUPABASE_SERVICE_ROLE_KEY is missing', () => {
      const missing = new ExportStorageService(
        makeConfig({ MCP_EXPORT_BUCKET: BUCKET, SUPABASE_URL: 'https://example.supabase.co' }),
      );
      expect(() => (missing as unknown as { ensureClient(): unknown }).ensureClient()).toThrow(
        ServiceUnavailableException,
      );
    });
  });

  describe('uploadAndRegister error branches', () => {
    it('rejects an empty userId with 503 before touching storage', async () => {
      await expect(
        service.uploadAndRegister({
          userId: '   ',
          cvId: 'c-1',
          kind: 'pdf',
          buffer: Buffer.from('data'),
          contentType: 'application/pdf',
          filename: 'x.pdf',
        }),
      ).rejects.toBeInstanceOf(ServiceUnavailableException);
      expect(mock.storage.size).toBe(0);
    });

    it('wraps an upload error from storage as 503', async () => {
      mock.setUploadError({ message: 'bucket down' });
      await expect(
        service.uploadAndRegister({
          userId: 'u-1',
          cvId: 'c-1',
          kind: 'pdf',
          buffer: Buffer.from('data'),
          contentType: 'application/pdf',
          filename: 'x.pdf',
        }),
      ).rejects.toBeInstanceOf(ServiceUnavailableException);
    });

    it('rolls back the uploaded object when the DB insert fails', async () => {
      mock.setInsertError({ message: 'rls denied' });
      await expect(
        service.uploadAndRegister({
          userId: 'u-1',
          cvId: 'c-1',
          kind: 'pdf',
          buffer: Buffer.from('data'),
          contentType: 'application/pdf',
          filename: 'x.pdf',
        }),
      ).rejects.toBeInstanceOf(ServiceUnavailableException);
      // The object that was uploaded was best-effort removed.
      expect(mock.storageRemove).toHaveBeenCalled();
    });
  });

  describe('createSignedUrl error branches', () => {
    it('rejects empty exportId', async () => {
      await expect(service.createSignedUrl('', 'u-1', 3600)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('rejects empty userId', async () => {
      await expect(service.createSignedUrl('exp-1', '', 3600)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('wraps lookup error as 503', async () => {
      mock.setSelectError({ message: 'select failed' });
      await expect(service.createSignedUrl('exp-1', 'u-1', 3600)).rejects.toBeInstanceOf(
        ServiceUnavailableException,
      );
    });

    it('wraps signed-URL creation error as 503', async () => {
      const future = new Date(Date.now() + 60_000).toISOString();
      mock.rows.push({
        id: 'exp-1',
        user_id: 'u-1',
        cv_id: 'c-1',
        kind: 'html',
        storage_path: 'u-1/c-1/html/exp-1.html',
        content_type: 'text/html',
        size_bytes: 10,
        filename: 'r.html',
        template_id: null,
        mode: null,
        expires_at: future,
        created_at: new Date().toISOString(),
      });
      mock.setSignedUrlError({ message: 'signing failed' });
      await expect(service.createSignedUrl('exp-1', 'u-1', 3600)).rejects.toBeInstanceOf(
        ServiceUnavailableException,
      );
    });

    it('warns but still returns the URL when the expires_at update fails', async () => {
      const future = new Date(Date.now() + 60_000).toISOString();
      mock.rows.push({
        id: 'exp-1',
        user_id: 'u-1',
        cv_id: 'c-1',
        kind: 'html',
        storage_path: 'u-1/c-1/html/exp-1.html',
        content_type: 'text/html',
        size_bytes: 10,
        filename: 'r.html',
        template_id: null,
        mode: null,
        expires_at: future,
        created_at: new Date().toISOString(),
      });
      mock.storage.set('u-1/c-1/html/exp-1.html', Buffer.from('hello'));
      mock.setUpdateError({ message: 'rls denied' });

      const { url } = await service.createSignedUrl('exp-1', 'u-1', 3600);
      expect(url).toMatch(/^https:\/\/signed\.example\//);
    });
  });

  describe('runSweep error branches', () => {
    it('throws 503 when the select call fails', async () => {
      mock.setSelectError({ message: 'select failed' });
      await expect(service.runSweep()).rejects.toBeInstanceOf(ServiceUnavailableException);
    });

    it('warns and continues when storage remove fails (rows still deleted)', async () => {
      const past = new Date(Date.now() - 60_000).toISOString();
      mock.rows.push({
        id: 'exp-1',
        user_id: 'u-1',
        cv_id: 'c-1',
        kind: 'pdf',
        storage_path: 'u-1/c-1/pdf/exp-1.pdf',
        content_type: 'application/pdf',
        size_bytes: 10,
        filename: 'r.pdf',
        template_id: null,
        mode: null,
        expires_at: past,
        created_at: new Date().toISOString(),
      });
      mock.storage.set('u-1/c-1/pdf/exp-1.pdf', Buffer.from('old'));
      mock.setStorageRemoveError({ message: 'storage unreachable' });

      const result = await service.runSweep();
      expect(result.rowsDeleted).toBe(1);
      expect(result.objectsDeleted).toBe(0);
      expect(mock.rows).toHaveLength(0);
    });

    it('throws 503 when the DB delete call fails', async () => {
      const past = new Date(Date.now() - 60_000).toISOString();
      mock.rows.push({
        id: 'exp-1',
        user_id: 'u-1',
        cv_id: 'c-1',
        kind: 'pdf',
        storage_path: 'u-1/c-1/pdf/exp-1.pdf',
        content_type: 'application/pdf',
        size_bytes: 10,
        filename: 'r.pdf',
        template_id: null,
        mode: null,
        expires_at: past,
        created_at: new Date().toISOString(),
      });
      mock.setDeleteError({ message: 'delete failed' });

      await expect(service.runSweep()).rejects.toBeInstanceOf(ServiceUnavailableException);
    });

    it('continues when the storage remove promise rejects (warns and deletes the row anyway)', async () => {
      const past = new Date(Date.now() - 60_000).toISOString();
      mock.rows.push({
        id: 'exp-1',
        user_id: 'u-1',
        cv_id: 'c-1',
        kind: 'pdf',
        storage_path: 'u-1/c-1/pdf/exp-1.pdf',
        content_type: 'application/pdf',
        size_bytes: 10,
        filename: 'r.pdf',
        template_id: null,
        mode: null,
        expires_at: past,
        created_at: new Date().toISOString(),
      });
      mock.setStorageRemoveThrows(new Error('network down'));

      const result = await service.runSweep();
      expect(result.rowsDeleted).toBe(1);
      expect(result.objectsDeleted).toBe(0);
    });
  });

  describe('expiry heuristics', () => {
    it('treats a missing or unparseable expires_at as expired', async () => {
      // Access private method via the public createSignedUrl path:
      // rows without expires_at should 404, and unparseable strings should 404.
      mock.rows.push({
        id: 'exp-1',
        user_id: 'u-1',
        cv_id: 'c-1',
        kind: 'pdf',
        storage_path: 'u-1/c-1/pdf/exp-1.pdf',
        content_type: 'application/pdf',
        size_bytes: 10,
        filename: 'r.pdf',
        template_id: null,
        mode: null,
        expires_at: 'not-a-date' as unknown as string,
        created_at: new Date().toISOString(),
      });
      await expect(service.createSignedUrl('exp-1', 'u-1', 3600)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });
});
