import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Injectable, OnModuleInit } from '@nestjs/common';
import type { CvTemplatePresentationConfig } from '@resumind/resume-template';
import { z } from 'zod';
import { ApplicationService } from '../application/application.service';
import { CvService } from '../cv/cv.service';
import { CvTemplatePresentationService } from '../cv/cv-template-presentation.service';
import { CvExportService } from '../cv-export/cv-export.service';
import { CvJsonResumeSwapService } from './cv-json-resume-swap.service';
import { getMcpAuthUser } from './mcp-auth.context';
import { MCP_TOOL_DEFINITIONS, MCP_TOOL_NAMES, type McpToolName } from './tool-definitions';

const cvIdSchema = z.object({
  cvId: z.string().uuid(),
});

const templateOptionalSchema = z.object({
  cvId: z.string().uuid(),
  template: z.string().optional(),
});

const screenshotSchema = z.object({
  cvId: z.string().uuid(),
  template: z.string().optional(),
  mode: z.enum(['full_document', 'first_page']).optional(),
});

const presentationSchema = z.object({
  cvId: z.string().uuid(),
  template: z.string(),
});

const presentationPatchSchema = z.object({
  cvId: z.string().uuid(),
  template: z.string(),
  config: z.record(z.string(), z.unknown()),
});

const jsonResumeCreateSchema = z.object({
  document: z.record(z.string(), z.unknown()),
});

const jsonResumeReplaceSchema = z.object({
  cvId: z.string().uuid(),
  document: z.record(z.string(), z.unknown()),
});

const applicationIdSchema = z.object({
  applicationId: z.string().uuid(),
});

const updateApplicationSchema = z.object({
  applicationId: z.string().uuid(),
  jobTitle: z.string().nullable().optional(),
  jobCompany: z.string().nullable().optional(),
  jobRawText: z.string().nullable().optional(),
  selectionRationale: z.string().nullable().optional(),
  coverLetterEmailSubject: z.string().nullable().optional(),
  userMessage: z.string().nullable().optional(),
});

const updateLetterSchema = z.object({
  applicationId: z.string().uuid(),
  coverLetter: z.string(),
});

@Injectable()
export class McpToolsService implements OnModuleInit {
  private readonly mcpServer = new McpServer({
    name: 'resumind',
    version: '1.0.0',
  });

  constructor(
    private readonly cvService: CvService,
    private readonly cvExportService: CvExportService,
    private readonly presentationService: CvTemplatePresentationService,
    private readonly applicationService: ApplicationService,
    private readonly jsonResumeSwapService: CvJsonResumeSwapService,
  ) {}

  onModuleInit(): void {
    this.registerTools();
  }

  getServer(): McpServer {
    return this.mcpServer;
  }

  listRegisteredToolNames(): McpToolName[] {
    return [...MCP_TOOL_NAMES];
  }

  private registerTools(): void {
    const register = (
      name: McpToolName,
      handler: (args: Record<string, unknown>) => Promise<unknown>,
    ) => {
      const meta = MCP_TOOL_DEFINITIONS[name];
      this.mcpServer.registerTool(
        name,
        {
          description: meta.description,
          annotations: {
            readOnlyHint: meta.readOnlyHint,
            destructiveHint: meta.destructiveHint,
          },
        },
        async (args) => {
          const result = await handler((args ?? {}) as Record<string, unknown>);
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
            structuredContent: result as Record<string, unknown>,
          };
        },
      );
    };

    register('list_cvs', async () => {
      const user = getMcpAuthUser();
      return this.cvService.findAll(user);
    });

    register('get_cv', async (args) => {
      const { cvId } = cvIdSchema.parse(args);
      return this.cvService.findOne(getMcpAuthUser(), cvId);
    });

    register('delete_cv', async (args) => {
      const { cvId } = cvIdSchema.parse(args);
      await this.cvService.remove(getMcpAuthUser(), cvId);
      return { ok: true, cvId };
    });

    register('create_cv_from_jsonresume', async (args) => {
      const { document } = jsonResumeCreateSchema.parse(args);
      const created = await this.jsonResumeSwapService.createFromJsonResume(
        getMcpAuthUser(),
        document,
      );
      return { cvId: created.id, cv: created };
    });

    register('replace_cv_from_jsonresume', async (args) => {
      const { cvId, document } = jsonResumeReplaceSchema.parse(args);
      const replaced = await this.jsonResumeSwapService.replaceFromJsonResume(
        getMcpAuthUser(),
        cvId,
        document,
      );
      return { cvId: replaced.id, cv: replaced };
    });

    register('export_cv_jsonresume', async (args) => {
      const { cvId } = cvIdSchema.parse(args);
      const user = getMcpAuthUser();
      const { body, filename } = await this.cvExportService.renderJson(user, cvId);
      return { filename, document: JSON.parse(body) as unknown };
    });

    register('export_cv_html', async (args) => {
      const { cvId, template } = templateOptionalSchema.parse(args);
      const user = getMcpAuthUser();
      const html = await this.cvExportService.renderHtml(user, cvId, template);
      const record = await this.cvService.findOne(user, cvId);
      const templateId = template
        ? this.cvExportService.resolveTemplateId(record.templateId, template)
        : record.templateId;
      return { html, templateId };
    });

    register('export_cv_screenshot', async (args) => {
      const { cvId, template, mode } = screenshotSchema.parse(args);
      const user = getMcpAuthUser();
      const shot = await this.cvExportService.renderScreenshot(user, cvId, { template, mode });
      const payload = this.cvExportService.toMcpBase64Payload(
        shot.buffer,
        'image/png',
        shot.filename,
      );
      return { ...payload, mode: shot.mode, templateId: shot.templateId };
    });

    register('export_cv_pdf', async (args) => {
      const { cvId, template } = templateOptionalSchema.parse(args);
      const user = getMcpAuthUser();
      const { buffer, filename } = await this.cvExportService.renderPdf(user, cvId, template);
      return this.cvExportService.toMcpBase64Payload(buffer, 'application/pdf', filename);
    });

    register('list_cv_designs', async () => {
      return this.cvExportService.listTemplateCatalog();
    });

    register('get_cv_template_presentation', async (args) => {
      const { cvId, template } = presentationSchema.parse(args);
      const user = getMcpAuthUser();
      return this.presentationService.getPresentation(user, cvId, template);
    });

    register('update_cv_template_presentation', async (args) => {
      const { cvId, template, config } = presentationPatchSchema.parse(args);
      const user = getMcpAuthUser();
      return this.presentationService.upsertPresentation(
        user,
        cvId,
        template,
        config as Partial<CvTemplatePresentationConfig>,
      );
    });

    register('list_applications', async () => {
      return this.applicationService.findAll(getMcpAuthUser());
    });

    register('get_application', async (args) => {
      const { applicationId } = applicationIdSchema.parse(args);
      return this.applicationService.findOne(getMcpAuthUser(), applicationId);
    });

    register('update_application', async (args) => {
      const parsed = updateApplicationSchema.parse(args);
      const { applicationId, ...patch } = parsed;
      return this.applicationService.patchApplicationMetadata(getMcpAuthUser(), applicationId, {
        jobTitle: patch.jobTitle,
        jobCompany: patch.jobCompany,
        jobRawText: patch.jobRawText,
        selectionRationale: patch.selectionRationale,
        coverLetterEmailSubject: patch.coverLetterEmailSubject,
        userMessage: patch.userMessage,
      });
    });

    register('update_application_letter', async (args) => {
      const { applicationId, coverLetter } = updateLetterSchema.parse(args);
      return this.applicationService.updateCoverLetter(
        getMcpAuthUser(),
        applicationId,
        coverLetter,
      );
    });
  }
}
