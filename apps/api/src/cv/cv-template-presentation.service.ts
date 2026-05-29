import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  type CvTemplatePresentationConfig,
  createDefaultPresentationConfig,
  getDefaultPresentationConfig,
  isValidTemplateId,
  mergePresentationConfig,
  resolveCanonicalTemplateId,
} from '@resumind/resume-template';
import type { AuthenticatedRequest } from '../auth/supabase-auth.guard';
import { CvNormalizedRepository } from './cv-normalized.repository';
import { CvTemplatePresentationRepository } from './cv-template-presentation.repository';

@Injectable()
export class CvTemplatePresentationService {
  constructor(
    private readonly normalizedRepo: CvNormalizedRepository,
    private readonly presentationRepo: CvTemplatePresentationRepository,
  ) {}

  private resolveTemplate(templateId: string): string {
    if (!isValidTemplateId(templateId)) {
      throw new BadRequestException(`Unknown template id: ${templateId}`);
    }
    return resolveCanonicalTemplateId(templateId);
  }

  async getPresentation(
    user: AuthenticatedRequest['user'],
    cvId: string,
    templateId: string,
  ): Promise<{ templateId: string; config: CvTemplatePresentationConfig }> {
    const canonical = this.resolveTemplate(templateId);
    const supabase = this.normalizedRepo.createClientForUser(user);
    const header = await this.normalizedRepo.fetchHeader(supabase, cvId);
    if (!header) {
      throw new NotFoundException('CV not found');
    }

    const row = await this.presentationRepo.fetch(supabase, cvId, canonical);
    const defaults = getDefaultPresentationConfig(canonical);
    const config = mergePresentationConfig(defaults, row?.config);
    return { templateId: canonical, config };
  }

  async upsertPresentation(
    user: AuthenticatedRequest['user'],
    cvId: string,
    templateId: string,
    patch: Partial<CvTemplatePresentationConfig>,
  ): Promise<{ templateId: string; config: CvTemplatePresentationConfig }> {
    const canonical = this.resolveTemplate(templateId);
    const supabase = this.normalizedRepo.createClientForUser(user);
    const header = await this.normalizedRepo.fetchHeader(supabase, cvId);
    if (!header) {
      throw new NotFoundException('CV not found');
    }

    const existing = await this.presentationRepo.fetch(supabase, cvId, canonical);
    const defaults = getDefaultPresentationConfig(canonical);
    const merged = mergePresentationConfig(
      existing ? mergePresentationConfig(defaults, existing.config) : defaults,
      patch,
    );

    await this.presentationRepo.upsert(supabase, cvId, canonical, merged);
    return { templateId: canonical, config: merged };
  }

  async loadPresentationForExport(
    user: AuthenticatedRequest['user'],
    cvId: string,
    templateId: string,
  ): Promise<CvTemplatePresentationConfig> {
    const canonical = this.resolveTemplate(templateId);
    const supabase = this.normalizedRepo.createClientForUser(user);
    const row = await this.presentationRepo.fetch(supabase, cvId, canonical);
    const defaults = getDefaultPresentationConfig(canonical);
    return mergePresentationConfig(defaults, row?.config);
  }

  getSchemaDefaults(): CvTemplatePresentationConfig {
    return createDefaultPresentationConfig();
  }
}
