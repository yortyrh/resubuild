import { Injectable } from '@nestjs/common';
import { Tool } from '@rekog/mcp-nest';
import { ApplicationService } from '../../../application/application.service';
import { getMcpAuthUser } from '../../mcp-auth.context';
import { MCP_TOOL_DEFINITIONS } from '../../tool-definitions';
import { updateApplicationSchema } from '../_schemas';

@Injectable()
export class UpdateApplicationTool {
  constructor(private readonly applicationService: ApplicationService) {}

  @Tool({
    name: 'update_application',
    description: MCP_TOOL_DEFINITIONS.update_application.description,
    parameters: updateApplicationSchema,
  })
  async run(args: {
    applicationId: string;
    jobTitle?: string | null;
    jobCompany?: string | null;
    jobRawText?: string | null;
    selectionRationale?: string | null;
    coverLetterEmailSubject?: string | null;
    userMessage?: string | null;
  }) {
    const { applicationId, ...patch } = args;
    return this.applicationService.patchApplicationMetadata(getMcpAuthUser(), applicationId, {
      jobTitle: patch.jobTitle,
      jobCompany: patch.jobCompany,
      jobRawText: patch.jobRawText,
      selectionRationale: patch.selectionRationale,
      coverLetterEmailSubject: patch.coverLetterEmailSubject,
      userMessage: patch.userMessage,
    });
  }
}
