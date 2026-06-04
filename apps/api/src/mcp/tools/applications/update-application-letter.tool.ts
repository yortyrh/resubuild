import { Injectable } from '@nestjs/common';
import { Tool } from '@rekog/mcp-nest';
import { ApplicationService } from '../../../application/application.service';
import { getMcpAuthUser } from '../../mcp-auth.context';
import { MCP_TOOL_DEFINITIONS } from '../../tool-definitions';
import { updateLetterSchema } from '../_schemas';

@Injectable()
export class UpdateApplicationLetterTool {
  constructor(private readonly applicationService: ApplicationService) {}

  @Tool({
    name: 'update_application_letter',
    description: MCP_TOOL_DEFINITIONS.update_application_letter.description,
    parameters: updateLetterSchema,
  })
  async run(args: { applicationId: string; coverLetter: string }) {
    return this.applicationService.updateCoverLetter(
      getMcpAuthUser(),
      args.applicationId,
      args.coverLetter,
    );
  }
}
