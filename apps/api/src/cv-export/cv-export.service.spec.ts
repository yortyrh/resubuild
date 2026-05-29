import {
  BadRequestException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  createDefaultPresentationConfig,
  getDefaultPresentationConfig,
} from '@resumind/resume-template';
import type { Resume } from '@resumind/types';
import type { AuthenticatedRequest } from '../auth/supabase-auth.guard';
import { CvNormalizedRepository } from '../cv/cv-normalized.repository';
import { CvTemplatePresentationService } from '../cv/cv-template-presentation.service';
import { CvExportService } from './cv-export.service';

jest.mock('puppeteer', () => ({
  launch: jest.fn(),
}));

const puppeteer = jest.requireMock('puppeteer') as {
  launch: jest.Mock;
};

describe('CvExportService', () => {
  let service: CvExportService;
  let normalizedRepo: jest.Mocked<
    Pick<CvNormalizedRepository, 'createClientForUser' | 'fetchHeader' | 'fetchSections'>
  >;
  let configService: jest.Mocked<Pick<ConfigService, 'get'>>;
  let presentationService: jest.Mocked<
    Pick<CvTemplatePresentationService, 'loadPresentationForExport'>
  >;

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
    presentationService = {
      loadPresentationForExport: jest.fn().mockResolvedValue(createDefaultPresentationConfig()),
    };
    service = new CvExportService(
      normalizedRepo as never,
      presentationService as never,
      configService as never,
    );
    puppeteer.launch.mockReset();
  });

  it('listTemplateCatalog returns registered templates', () => {
    const templates = service.listTemplateCatalog();
    expect(templates).toHaveLength(4);
    expect(templates.some((t) => t.id === 'classic')).toBe(true);
  });

  it('resolveTemplateId prefers query param over stored value', () => {
    expect(service.resolveTemplateId('classic', 'modern')).toBe('modern');
  });

  it('resolveTemplateId maps legacy ids to canonical templates', () => {
    expect(service.resolveTemplateId('mit-classic', 'capd-alum')).toBe('classic');
  });

  it('resolveTemplateId throws BadRequestException for unknown id', () => {
    expect(() => service.resolveTemplateId('classic', 'invalid-template')).toThrow(
      BadRequestException,
    );
  });

  it('resolveTemplateId falls back to default when stored and query are empty', () => {
    expect(service.resolveTemplateId(null, undefined)).toBe('classic');
    expect(service.resolveTemplateId('  ', '  ')).toBe('classic');
  });

  it('withAbsoluteImageUrls leaves resume unchanged when basics image is missing', () => {
    const resume: Resume = { basics: { name: 'Jane' } };
    expect(service.withAbsoluteImageUrls(resume)).toBe(resume);
  });

  it('uses API_PUBLIC_URL when PUBLIC_API_URL is unset', () => {
    configService.get.mockImplementation((key: string) => {
      if (key === 'API_PUBLIC_URL') return 'https://api.example.com';
      return undefined;
    });
    const resume: Resume = { basics: { name: 'Jane', image: '/media/photo' } };
    const updated = service.withAbsoluteImageUrls(resume);
    expect(updated.basics?.image).toBe('https://api.example.com/media/photo');
  });

  it('renderHtml returns document containing basics name', async () => {
    normalizedRepo.fetchHeader.mockResolvedValue({
      id: 'cv-1',
      user_id: 'u42',
      name: 'Jane Doe',
      template_id: 'mit-classic',
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

  it('renderHtml uses query template override', async () => {
    normalizedRepo.fetchHeader.mockResolvedValue({
      id: 'cv-1',
      user_id: 'u42',
      name: 'Jane Doe',
      template_id: 'mit-classic',
    });
    normalizedRepo.fetchSections.mockResolvedValue({
      profiles: [],
      work: [
        {
          id: 'w1',
          cv_id: 'cv-1',
          name: 'Acme',
          position: 'Eng',
          start_date: '2020-01',
        },
      ],
      volunteer: [],
      education: [
        {
          id: 'e1',
          cv_id: 'cv-1',
          institution: 'MIT',
          start_date: '2014-09',
        },
      ],
      awards: [],
      certificates: [],
      publications: [],
      skills: [],
      languages: [],
      interests: [],
      references: [],
      projects: [],
    });

    presentationService.loadPresentationForExport.mockResolvedValue(
      getDefaultPresentationConfig('capd-undergraduate-standard'),
    );

    const html = await service.renderHtml(userCtx, 'cv-1', 'capd-undergraduate-standard');
    const educationIndex = html.indexOf('id="education-heading"');
    const experienceIndex = html.indexOf('id="experience-heading"');
    expect(educationIndex).toBeLessThan(experienceIndex);
    expect(html).toContain('data-template="classic"');
  });

  it('renderHtml throws NotFoundException when CV is missing', async () => {
    normalizedRepo.fetchHeader.mockResolvedValue(null);
    await expect(service.renderHtml(userCtx, 'missing')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('renderHtml throws BadRequestException for invalid template query', async () => {
    normalizedRepo.fetchHeader.mockResolvedValue({
      id: 'cv-1',
      user_id: 'u42',
      name: 'Jane Doe',
    });
    await expect(service.renderHtml(userCtx, 'cv-1', 'not-a-template')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('renderPdf returns buffer and slugified filename from CV title', async () => {
    normalizedRepo.fetchHeader.mockResolvedValue({
      id: 'cv-1',
      user_id: 'u42',
      name: 'Jane Doe',
      template_id: 'mit-classic',
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

    const pdfBytes = Buffer.from('%PDF-1.4');
    const pdf = jest.fn().mockResolvedValue(pdfBytes);
    const setContent = jest.fn().mockResolvedValue(undefined);
    const close = jest.fn().mockResolvedValue(undefined);
    puppeteer.launch.mockResolvedValue({
      newPage: jest.fn().mockResolvedValue({ setContent, pdf, close }),
      close,
    });

    const result = await service.renderPdf(userCtx, 'cv-1', 'capd-alum');

    expect(result.buffer).toEqual(pdfBytes);
    expect(result.filename).toBe('jane-doe.pdf');
    expect(setContent).toHaveBeenCalledWith(expect.stringContaining('Jane Doe'), {
      waitUntil: 'networkidle0',
    });
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

  it('renderPdfFromHtml logs non-Error launch failures', async () => {
    puppeteer.launch.mockRejectedValue('launch failed');
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
