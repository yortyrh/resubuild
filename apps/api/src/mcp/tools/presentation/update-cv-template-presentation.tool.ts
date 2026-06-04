import { Injectable } from '@nestjs/common';
import { Tool } from '@rekog/mcp-nest';
import type { CvTemplatePresentationConfig } from '@resumind/resume-template';
import { CvTemplatePresentationService } from '../../../cv/cv-template-presentation.service';
import { getMcpAuthUser } from '../../mcp-auth.context';
import { MCP_TOOL_DEFINITIONS } from '../../tool-definitions';
import { presentationPatchSchema } from '../_schemas';

@Injectable()
export class UpdateCvTemplatePresentationTool {
  constructor(private readonly presentationService: CvTemplatePresentationService) {}

  @Tool({
    name: 'update_cv_template_presentation',
    description: MCP_TOOL_DEFINITIONS.update_cv_template_presentation.description,
    parameters: presentationPatchSchema,
  })
  async run(args: { cvId: string; template: string; config: Record<string, unknown> }) {
    return this.presentationService.upsertPresentation(
      getMcpAuthUser(),
      args.cvId,
      args.template,
      args.config as Partial<CvTemplatePresentationConfig>,
    );
  }
}
