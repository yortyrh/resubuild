import { NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Resume } from '@resumind/types';
import type { AuthenticatedRequest } from '../auth/supabase-auth.guard';
import { CvNormalizedRepository } from '../cv/cv-normalized.repository';
import { CvExportService } from './cv-export.service';

jest.mock('puppeteer', () => ({
  launch: jest.fn(),
}));

const puppeteer = jest.requireMock('puppeteer') as {
  launch: jest.Mock;
};

describe('CvExportService', () => {
  let service: CvExportService;
  let normalizedRepo: jest.Mocked<Pick<CvNormalizedRepository, 'createClientForUser' | 'fetchHeader' | 'fetchSections'>>;
  let configService: jest.Mocked<Pick<ConfigService, 'get'>>;

  const userCtx: AuthenticatedRequest['user'] = {
    id: 'u42',
    email: 'hitme@test.dev',
    accessToken: 'tok',
  };

  const supabase = {} as never;

  beforeEach(() => {
    normalizedRepo = {
      createClientForUser: jest.fn().mockReturnValue(supabase),
      fetchHeader: jest.fn(),
      fetchSections: jest.fn(),
    };
    configService = {
      get: jest.fn((key: string) => {
        if (key === 'PUBLIC_API_URL') return 'http://localhost:3001';
        return undefined;
      }),
    } as never;
    service = new CvExportService(normalizedRepo as never, configService as never);
    puppeteer.launch.mockReset();
  });

  it('renderHtml returns document containing basics name', async () => {
    normalizedRepo.fetchHeader.mockResolvedValue({
      id: 'cv-1',
      user_id: 'u42',
      name: 'Jane Doe',
    });
    normalizedRepo.fetchSections.mockResolvedValue({
      profiles: [],
      work: [],
      volunteer: [],
      education: [],
      awards: [],
      certificates: [],
      publications: [],
      skills: [],
      languages: [],
      interests: [],
      references: [],
      projects: [],
    });

    const html = await service.renderHtml(userCtx, 'cv-1');
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('Jane Doe');
  });

  it('renderHtml throws NotFoundException when CV is missing', async () => {
    normalizedRepo.fetchHeader.mockResolvedValue(null);
    await expect(service.renderHtml(userCtx, 'missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('renderPdfFromHtml uses puppeteer with html from renderResumeHtml', async () => {
    const pdfBytes = Buffer.from('%PDF-1.4');
    const pdf = jest.fn().mockResolvedValue(pdfBytes);
    const setContent = jest.fn().mockResolvedValue(undefined);
    const close = jest.fn().mockResolvedValue(undefined);
    puppeteer.launch.mockResolvedValue({
      newPage: jest.fn().mockResolvedValue({ setContent, pdf, close }),
      close,
    });

    const resume: Resume = { basics: { name: 'Jane Doe' } };
    const html = '<html><body>Jane Doe</body></html>';
    const buffer = await service.renderPdfFromHtml(html);

    expect(puppeteer.launch).toHaveBeenCalled();
    expect(setContent).toHaveBeenCalledWith(html, { waitUntil: 'networkidle0' });
    expect(pdf).toHaveBeenCalledWith(
      expect.objectContaining({ format: 'Letter', printBackground: true }),
    );
    expect(buffer).toEqual(pdfBytes);
    expect(resume.basics?.name).toBe('Jane Doe');
  });

  it('renderPdfFromHtml throws ServiceUnavailableException when chromium fails', async () => {
    puppeteer.launch.mockRejectedValue(new Error('Chromium not found'));
    await expect(service.renderPdfFromHtml('<html></html>')).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it('withAbsoluteImageUrls rewrites relative media paths', () => {
    const resume: Resume = {
      basics: { name: 'Jane', image: '/media/abc-123' },
    };
    const updated = service.withAbsoluteImageUrls(resume);
    expect(updated.basics?.image).toBe('http://localhost:3001/media/abc-123');
  });
});
