import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  PayloadTooLargeException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DEFAULT_TEMPLATE_ID,
  isValidTemplateId,
  listTemplates,
  PDF_EXPORT_OPTIONS,
  renderMarkdownField,
  renderResumeHtml,
  resolveCanonicalTemplateId,
} from '@resubuild/resume-template';
import type { Resume } from '@resubuild/types';
import { assembleResume, deriveCvTitleFromBasics, prepareExportedResume } from '@resubuild/types';
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

export type CvScreenshotMode = 'full_document' | 'first_page';

export interface CvExportScreenshotResult {
  buffer: Buffer;
  filename: string;
  mode: CvScreenshotMode;
  templateId: string;
}

const DEFAULT_MCP_BINARY_MAX_BYTES = 10 * 1024 * 1024;

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
    const header = await this.normalizedRepo.fetchHeader(supabase, cvId, user.id);

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

  renderLetterHtml(markdown: string, options: { title?: string } = {}): string {
    const body = renderMarkdownField(markdown);
    const title = options.title ?? 'Cover letter';
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${title}</title>
  <style>
    body { font-family: Georgia, 'Times New Roman', serif; max-width: 700px; margin: 2rem auto; line-height: 1.6; color: #111; }
    p { margin: 0 0 1rem; }
    strong, b { font-weight: 700; }
  </style>
</head>
<body>${body}</body>
</html>`;
  }

  async renderLetterPdf(
    markdown: string,
    options: { title?: string; filename?: string } = {},
  ): Promise<CvExportPdfResult> {
    const html = this.renderLetterHtml(markdown, options);
    const buffer = await this.renderPdfFromHtml(html);
    const filename =
      options.filename ?? `${slugifyExportFilename(options.title ?? 'cover-letter')}.pdf`;
    return { buffer, filename };
  }

  async renderJson(user: AuthenticatedRequest['user'], cvId: string): Promise<CvExportJsonResult> {
    const supabase = this.normalizedRepo.createClientForUser(user);
    const header = await this.normalizedRepo.fetchHeader(supabase, cvId, user.id);

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

  getMcpBinaryMaxBytes(): number {
    const configured = Number(this.configService.get<string>('MCP_EXPORT_MAX_BYTES'));
    return Number.isFinite(configured) && configured > 0
      ? configured
      : DEFAULT_MCP_BINARY_MAX_BYTES;
  }

  assertMcpBinarySize(buffer: Buffer, label: string): void {
    const max = this.getMcpBinaryMaxBytes();
    if (buffer.length > max) {
      throw new PayloadTooLargeException(
        `${label} exceeds the ${Math.floor(max / (1024 * 1024))} MiB limit. Reduce content or hide sections via template presentation.`,
      );
    }
  }

  toMcpBase64Payload(buffer: Buffer, contentType: string, filename: string) {
    this.assertMcpBinarySize(buffer, 'Export');
    return {
      filename,
      contentType,
      contentBase64: buffer.toString('base64'),
    };
  }

  async renderScreenshot(
    user: AuthenticatedRequest['user'],
    cvId: string,
    options: { template?: string; mode?: CvScreenshotMode } = {},
  ): Promise<CvExportScreenshotResult> {
    const mode = options.mode ?? 'first_page';
    const html = await this.renderHtml(user, cvId, options.template);
    const { resume, templateId } = await this.loadExportContext(user, cvId, options.template);
    const buffer = await this.renderScreenshotFromHtml(html, mode);
    const title = deriveCvTitleFromBasics(resume.basics);
    const filename = `${slugifyExportFilename(title)}-${mode}.png`;
    return { buffer, filename, mode, templateId };
  }

  async renderScreenshotFromHtml(html: string, mode: CvScreenshotMode): Promise<Buffer> {
    return this.withBrowserPage(async (page) => {
      if (mode === 'first_page') {
        await page.setViewport({
          width: 816,
          height: 1056,
          deviceScaleFactor: 1,
        });
      }
      await page.setContent(html, { waitUntil: 'networkidle0' as 'load' });
      const screenshot = await page.screenshot({
        type: 'png',
        fullPage: mode === 'full_document',
      });
      return Buffer.from(screenshot);
    });
  }

  async renderPdfFromHtml(html: string): Promise<Buffer> {
    return this.withBrowserPage(async (page) => {
      await page.setContent(html, { waitUntil: 'networkidle0' as 'load' });
      const pdf = await page.pdf(PDF_EXPORT_OPTIONS);
      return Buffer.from(pdf);
    });
  }

  private async withBrowserPage<T>(
    action: (page: import('puppeteer').Page) => Promise<T>,
  ): Promise<T> {
    try {
      const puppeteer = await import('puppeteer');
      const executablePath =
        this.configService.get<string>('CHROMIUM_EXECUTABLE_PATH') ?? undefined;

      const browser = await puppeteer.launch({
        headless: true,
        executablePath: executablePath || undefined,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });

      try {
        const page = await browser.newPage();
        return await action(page);
      } finally {
        await browser.close();
      }
    } catch (error) {
      this.logger.error('Chromium export failed', error instanceof Error ? error.stack : error);
      throw new ServiceUnavailableException(
        'PDF and screenshot export are temporarily unavailable. HTML preview is still available.',
      );
    }
  }
}
