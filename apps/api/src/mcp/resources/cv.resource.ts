import { Injectable } from '@nestjs/common';
import { ResourceTemplate } from '@rekog/mcp-nest';
import { CvService } from '../../cv/cv.service';
import { getMcpAuthUser } from '../mcp-auth.context';

/**
 * `resumind://{cvId}/cv` — read one CV record as JSON.
 * Replaces the prior `CvResourceHandler` interface implementation. The wrapper
 * extracts `{cvId}` from the request URI and dispatches it as the first
 * argument to the handler. The handler returns the same `ReadResourceResult`
 * envelope the prior controller produced (a `contents` array of
 * `{ uri, text, mimeType }`).
 */
@Injectable()
export class CvResource {
  constructor(private readonly cvService: CvService) {}

  @ResourceTemplate({
    uriTemplate: 'resumind://{cvId}/cv',
    name: 'CVs',
    description: 'User CV library — primary CVs only (excludes application clones)',
    mimeType: 'application/json',
  })
  async handle(params: { cvId: string }) {
    const user = getMcpAuthUser();
    const cv = await this.cvService.findOne(user, params.cvId);
    return {
      contents: [
        {
          uri: `resumind://${params.cvId}/cv`,
          text: JSON.stringify(cv, null, 2),
          mimeType: 'application/json',
        },
      ],
    };
  }
}
