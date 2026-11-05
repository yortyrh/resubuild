import {
  ForbiddenException,
  HttpException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { GuestImportService, ownerIdFor } from './guest-import.service';

function setup(
  overrides: { capacity?: boolean; verify?: boolean; limit?: number; enabled?: boolean } = {},
) {
  const config = {
    enabled: overrides.enabled ?? true,
    importsPerIpPerDay: overrides.limit ?? 2,
    turnstileSiteKey: 'site-key',
  };
  const hosted = {
    guestHasCapacity: jest.fn().mockResolvedValue(overrides.capacity ?? true),
    acquireGuest: jest.fn().mockResolvedValue({
      modelId: 'openai/gpt-5-mini',
      apiKey: 'sk-guest',
      providerOptions: undefined,
      usageMeter: { record: jest.fn() },
      onRunError: jest.fn(),
    }),
  };
  const importService = {
    startPdfImportAs: jest.fn().mockResolvedValue({ jobId: 'job-pdf' }),
    startDocxImportAs: jest.fn().mockResolvedValue({ jobId: 'job-docx' }),
    startImageImportAs: jest.fn().mockResolvedValue({ jobId: 'job-img' }),
    startMarkdownImportAs: jest.fn().mockResolvedValue({ jobId: 'job-md' }),
    importFromUrlAs: jest.fn().mockResolvedValue({ kind: 'job', jobId: 'job-url' }),
    getJobFor: jest.fn().mockReturnValue({ status: 'running' }),
  };
  const turnstile = { verify: jest.fn().mockResolvedValue(overrides.verify ?? true) };
  const service = new GuestImportService(
    config as never,
    hosted as never,
    importService as never,
    turnstile as never,
  );
  return { service, hosted, importService, turnstile };
}

const file = (mimetype: string, originalname = 'cv') =>
  ({ mimetype, originalname, size: 10, buffer: Buffer.from('x') }) as Express.Multer.File;
const context = { ip: '1.2.3.4', turnstileToken: 'tok' };

describe('GuestImportService', () => {
  it('reports the wizard as available with the Turnstile site key', async () => {
    await expect(setup().service.getStatus()).resolves.toEqual({
      enabled: true,
      turnstileSiteKey: 'site-key',
    });
    await expect(setup({ capacity: false }).service.getStatus()).resolves.toEqual({
      enabled: false,
    });
    await expect(setup({ enabled: false }).service.getStatus()).resolves.toEqual({
      enabled: false,
    });
  });

  it('starts the matching import as a guest owner and returns a private token', async () => {
    const { service, importService, hosted } = setup();
    const result = await service.startFileImport(file('application/pdf'), context);
    expect(result).toEqual({ jobId: 'job-pdf', guestToken: expect.any(String) });
    expect(result.guestToken.length).toBeGreaterThanOrEqual(43);

    const [owner] = importService.startPdfImportAs.mock.calls[0];
    expect(owner.id).toBe(ownerIdFor(result.guestToken));
    await expect(owner.resolveCredentials()).resolves.toMatchObject({
      modelId: 'openai/gpt-5-mini',
      apiKey: 'sk-guest',
    });
    expect(hosted.acquireGuest).toHaveBeenCalled();
  });

  it.each([
    [
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'startDocxImportAs',
    ],
    ['image/png', 'startImageImportAs'],
    ['text/markdown', 'startMarkdownImportAs'],
  ])('routes %s files', async (mimetype, method) => {
    const { service, importService } = setup();
    await service.startFileImport(file(mimetype), context);
    expect(importService[method as keyof typeof importService]).toHaveBeenCalled();
  });

  it('rejects unsupported files without counting them', async () => {
    const { service } = setup({ limit: 1 });
    await expect(service.startFileImport(file('application/zip'), context)).rejects.toThrow(
      /Upload a PDF/,
    );
    await expect(service.startFileImport(file('application/pdf'), context)).resolves.toBeDefined();
  });

  it('refuses when the guest budget is spent (503)', async () => {
    const { service } = setup({ capacity: false });
    await expect(service.startFileImport(file('application/pdf'), context)).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it('refuses a failed Turnstile challenge (403)', async () => {
    const { service, turnstile } = setup({ verify: false });
    await expect(service.startFileImport(file('application/pdf'), context)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(turnstile.verify).toHaveBeenCalledWith('tok', '1.2.3.4');
  });

  it('limits imports per IP per day (429)', async () => {
    const { service } = setup({ limit: 2 });
    await service.startFileImport(file('application/pdf'), context);
    await service.startUrlImport('https://example.com/cv', context);
    const error = await service
      .startFileImport(file('application/pdf'), context)
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(HttpException);
    expect((error as HttpException).getStatus()).toBe(429);
    await expect(
      service.startFileImport(file('application/pdf'), { ...context, ip: '5.6.7.8' }),
    ).resolves.toBeDefined();
  });

  it('does not count plain JSON Resume URLs (no AI used)', async () => {
    const { service, importService } = setup({ limit: 1 });
    importService.importFromUrlAs.mockResolvedValueOnce({ kind: 'json', data: { basics: {} } });
    await expect(service.startUrlImport('https://example.com/cv.json', context)).resolves.toEqual({
      kind: 'json',
      data: { basics: {} },
    });
    await expect(service.startUrlImport('https://example.com/cv', context)).resolves.toMatchObject({
      kind: 'job',
      guestToken: expect.any(String),
    });
  });

  it('reads a job only with its guest token', () => {
    const { service, importService } = setup();
    expect(() => service.getJob('job-1', undefined)).toThrow(NotFoundException);
    service.getJob('job-1', 'token');
    expect(importService.getJobFor).toHaveBeenCalledWith(ownerIdFor('token'), 'job-1');
  });
});
