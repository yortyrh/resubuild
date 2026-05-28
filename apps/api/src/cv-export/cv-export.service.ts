import { Injectable, Logger, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PDF_EXPORT_OPTIONS, renderResumeHtml } from '@resumind/resume-template';
import type { Resume } from '@resumind/types';
import { assembleResume, deriveCvTitleFromBasics } from '@resumind/types';
import type { AuthenticatedRequest } from '../auth/supabase-auth.guard';
import { CvNormalizedRepository } from '../cv/cv-normalized.repository';
import { slugifyExportFilename, toAbsoluteMediaUrl } from './cv-export.util';

export interface CvExportPdfResult {
  buffer: Buffer;
  filename: string;
}

@Injectable()
export class CvExportService {
  private readonly logger = new Logger(CvExportService.name);

  constructor(
    private readonly normalizedRepo: CvNormalizedRepository,
    private readonly configService: ConfigService,
  ) {}

  private getApiPublicOrigin(): string {
    return (
      this.configService.get<string>('PUBLIC_API_URL') ??
      this.configService.get<string>('API_PUBLIC_URL') ??
      'http://localhost:3001'
    );
  }

  private async loadResumeForExport(
    user: AuthenticatedRequest['user'],
    cvId: string,
  ): Promise<Resume> {
    const supabase = this.normalizedRepo.createClientForUser(user);
    const header = await this.normalizedRepo.fetchHeader(supabase, cvId);

    if (!header) {
      throw new NotFoundException('CV not found');
    }

    const sections = await this.normalizedRepo.fetchSections(supabase, cvId);
    const resume = assembleResume(header, sections);
    return this.withAbsoluteImageUrls(resume);
  }

  withAbsoluteImageUrls(resume: Resume): Resume {
    const apiOrigin = this.getApiPublicOrigin();
    if (!resume.basics?.image) return resume;

    return {
      ...resume,
      basics: {
        ...resume.basics,
        image: toAbsoluteMediaUrl(resume.basics.image, apiOrigin),
      },
    };
  }

  async renderHtml(user: AuthenticatedRequest['user'], cvId: string): Promise<string> {
    const resume = await this.loadResumeForExport(user, cvId);
    return renderResumeHtml(resume);
  }

  async renderPdf(user: AuthenticatedRequest['user'], cvId: string): Promise<CvExportPdfResult> {
    const resume = await this.loadResumeForExport(user, cvId);
    const html = renderResumeHtml(resume);
    const buffer = await this.renderPdfFromHtml(html);
    const title = deriveCvTitleFromBasics(resume.basics);
    const filename = `${slugifyExportFilename(title)}.pdf`;
    return { buffer, filename };
  }

  async renderPdfFromHtml(html: string): Promise<Buffer> {
    try {
      const puppeteer = await import('puppeteer');
      const executablePath =
        this.configService.get<string>('CHROMIUM_EXECUTABLE_PATH') ?? undefined;

      const browser = await puppeteer.launch({
        headless: true,
        executablePath: executablePath || undefined,
      });

      try {
        const page = await browser.newPage();
        await page.setContent(html, { waitUntil: 'networkidle0' as 'load' });
        const pdf = await page.pdf(PDF_EXPORT_OPTIONS);
        return Buffer.from(pdf);
      } finally {
        await browser.close();
      }
    } catch (error) {
      this.logger.error('PDF generation failed', error instanceof Error ? error.stack : error);
      throw new ServiceUnavailableException(
        'PDF export is temporarily unavailable. HTML preview is still available.',
      );
    }
  }
}
