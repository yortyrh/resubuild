import { Injectable } from '@nestjs/common';
import { Tool } from '@rekog/mcp-nest';
import { CvExportService } from '../../../cv-export/cv-export.service';
import { MCP_TOOL_DEFINITIONS } from '../../tool-definitions';

@Injectable()
export class ListCvDesignsTool {
  constructor(private readonly cvExportService: CvExportService) {}

  @Tool({
    name: 'list_cv_designs',
    description: MCP_TOOL_DEFINITIONS.list_cv_designs.description,
    annotations: { readOnlyHint: true },
  })
  async run() {
    return this.cvExportService.listTemplateCatalog();
  }
}
