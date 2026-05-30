import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DEFAULT_TEMPLATE_ID,
  isValidTemplateId,
  listTemplates,
  PDF_EXPORT_OPTIONS,
  renderResumeHtml,
  resolveCanonicalTemplateId,
} from '@resumind/resume-template';
import type { Resume } from '@resumind/types';
import { assembleResume, deriveCvTitleFromBasics, prepareExportedResume } from '@resumind/types';
import type { AuthenticatedRequest } from '../auth/supabase-auth.guard';
import { CvNormalizedRepository } from '../cv/cv-normalized.repository';
import { CvTemplatePresentationService } from '../cv/cv-template-presentation.service';
import { ResumeSchemaValidator } from '../validation/resume-schema.validator';
import { slugifyExportFilename, toAbsoluteMediaUrl } from './cv-export.util';

export interface CvExportPdfResult {
  buffer: Buffer;
  filename: string;
}

export interface CvExportJsonResult {
  body: string;
  filename: string;
}

export interface CvExportContext {
  resume: Resume;
  templateId: string;
}

@Injectable()
export class CvExportService {
  private readonly logger = new Logger(CvExportService.name);

  constructor(
    private readonly normalizedRepo: CvNormalizedRepository,
    private readonly presentationService: CvTemplatePresentationService,
    private readonly configService: ConfigService,
    private readonly schemaValidator: ResumeSchemaValidator,
  ) {}

  private getApiPublicOrigin(): string {
    return (
      this.configService.get<string>('PUBLIC_API_URL') ??
      this.configService.get<string>('API_PUBLIC_URL') ??
      'http://localhost:3001'
    );
  }

  resolveTemplateId(storedTemplateId: string | null | undefined, queryTemplate?: string): string {
    const candidate = queryTemplate?.trim() || storedTemplateId?.trim() || DEFAULT_TEMPLATE_ID;
    if (!isValidTemplateId(candidate)) {
      throw new BadRequestException(`Unknown template id: ${candidate}`);
    }
    return resolveCanonicalTemplateId(candidate);
  }

  listTemplateCatalog() {
    return listTemplates();
  }

  private async loadExportContext(
    user: AuthenticatedRequest['user'],
    cvId: string,
    queryTemplate?: string,
  ): Promise<CvExportContext> {
    const supabase = this.normalizedRepo.createClientForUser(user);
    const header = await this.normalizedRepo.fetchHeader(supabase, cvId);

    if (!header) {
      throw new NotFoundException('CV not found');
    }

    const templateId = this.resolveTemplateId(header.template_id, queryTemplate);
    const sections = await this.normalizedRepo.fetchSections(supabase, cvId);
    const resume = assembleResume(header, sections);

    return { resume, templateId };
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

  async renderHtml(
    user: AuthenticatedRequest['user'],
    cvId: string,
    queryTemplate?: string,
  ): Promise<string> {
    const { resume, templateId } = await this.loadExportContext(user, cvId, queryTemplate);
    const exportResume = this.withAbsoluteImageUrls(resume);
    const presentationConfig = await this.presentationService.loadPresentationForExport(
      user,
      cvId,
      templateId,
    );
    return renderResumeHtml(exportResume, templateId, { presentationConfig });
  }

  async renderPdf(
    user: AuthenticatedRequest['user'],
    cvId: string,
    queryTemplate?: string,
  ): Promise<CvExportPdfResult> {
    const { resume, templateId } = await this.loadExportContext(user, cvId, queryTemplate);
    const exportResume = this.withAbsoluteImageUrls(resume);
    const presentationConfig = await this.presentationService.loadPresentationForExport(
      user,
      cvId,
      templateId,
    );
    const html = renderResumeHtml(exportResume, templateId, { presentationConfig });
    const buffer = await this.renderPdfFromHtml(html);
    const title = deriveCvTitleFromBasics(resume.basics);
    const filename = `${slugifyExportFilename(title)}.pdf`;
    return { buffer, filename };
  }

  async renderJson(user: AuthenticatedRequest['user'], cvId: string): Promise<CvExportJsonResult> {
    const supabase = this.normalizedRepo.createClientForUser(user);
    const header = await this.normalizedRepo.fetchHeader(supabase, cvId);

    if (!header) {
      throw new NotFoundException('CV not found');
    }

    const sections = await this.normalizedRepo.fetchSections(supabase, cvId);
    const resume = assembleResume(header, sections);
    const exported = prepareExportedResume(resume, {
      updatedAt: header.updated_at ?? new Date(),
      version: header.meta_version ?? undefined,
      canonical: header.meta_canonical ?? undefined,
    });

    try {
      this.schemaValidator.validate(exported);
    } catch (error) {
      if (error instanceof BadRequestException) {
        this.logger.error(
          'JSON export failed schema validation',
          error instanceof Error ? error.stack : error,
        );
        throw new InternalServerErrorException('Failed to export valid JSON Resume');
      }
      throw error;
    }

    const title = deriveCvTitleFromBasics(resume.basics);
    const filename = `${slugifyExportFilename(title)}.json`;
    return { body: JSON.stringify(exported, null, 2), filename };
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
