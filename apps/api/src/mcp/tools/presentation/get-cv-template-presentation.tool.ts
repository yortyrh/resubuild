import { Injectable } from '@nestjs/common';
import { Tool } from '@rekog/mcp-nest';
import { CvTemplatePresentationService } from '../../../cv/cv-template-presentation.service';
import { getMcpAuthUser } from '../../mcp-auth.context';
import { MCP_TOOL_DEFINITIONS } from '../../tool-definitions';
import { presentationSchema } from '../_schemas';

@Injectable()
export class GetCvTemplatePresentationTool {
  constructor(private readonly presentationService: CvTemplatePresentationService) {}

  @Tool({
    name: 'get_cv_template_presentation',
    description: MCP_TOOL_DEFINITIONS.get_cv_template_presentation.description,
    parameters: presentationSchema,
    annotations: { readOnlyHint: true },
  })
  async run(args: { cvId: string; template: string }) {
    return this.presentationService.getPresentation(getMcpAuthUser(), args.cvId, args.template);
  }
}
