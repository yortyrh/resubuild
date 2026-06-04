import { Injectable } from '@nestjs/common';
import { ResourceTemplate } from '@rekog/mcp-nest';
import { ApplicationService } from '../../application/application.service';
import { getMcpAuthUser } from '../mcp-auth.context';

/**
 * `resumind://{applicationId}/application` — read one job application as JSON.
 * Replaces the prior `ApplicationResourceHandler` interface implementation.
 */
@Injectable()
export class ApplicationResource {
  constructor(private readonly applicationService: ApplicationService) {}

  @ResourceTemplate({
    uriTemplate: 'resumind://{applicationId}/application',
    name: 'Applications',
    description: 'Job applications — active rows only; update drafts are excluded',
    mimeType: 'application/json',
  })
  async handle(params: { applicationId: string }) {
    const user = getMcpAuthUser();
    const app = await this.applicationService.findOne(user, params.applicationId);
    return {
      contents: [
        {
          uri: `resumind://${params.applicationId}/application`,
          text: JSON.stringify(app, null, 2),
          mimeType: 'application/json',
        },
      ],
    };
  }
}
