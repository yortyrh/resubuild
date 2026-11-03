import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  type CvSectionKey,
  dbRowToResumeItem,
  headerToSlimCvData,
  isSortBackedSection,
  sanitizeResumeItemPayload,
} from '@resubuild/types';
import type { AuthenticatedRequest } from '../auth/session-auth.guard';
import type { DbScope } from '../database/db-scope';
import { MediaService } from '../media/media.service';
import { parseMediaIdFromViewerUrl } from '../media/media-url.util';
import { CvService } from './cv.service';
import type { CvItemMutationResponse } from './cv-item.types';
import { CvNormalizedRepository } from './cv-normalized.repository';

const ARRAY_SECTION_MAP: Record<string, CvSectionKey> = {
  work: 'work',
  volunteer: 'volunteer',
  education: 'education',
  awards: 'awards',
  certificates: 'certificates',
  publications: 'publications',
  skills: 'skills',
  languages: 'languages',
  interests: 'interests',
  references: 'references',
  projects: 'projects',
};

@Injectable()
export class CvItemService {
  constructor(
    private readonly cvService: CvService,
    private readonly normalizedRepo: CvNormalizedRepository,
    private readonly mediaService: MediaService,
  ) {}

  private async requireSectionRow(
    scope: DbScope,
    cvId: string,
    section: CvSectionKey,
    itemId: string,
    label: string,
  ): Promise<Record<string, unknown>> {
    const row = await this.normalizedRepo.getSectionRowById(scope, cvId, section, itemId);
    if (!row) {
      throw new NotFoundException(`${label} not found`);
    }
    return row as Record<string, unknown>;
  }

  private rowToItem(row: Record<string, unknown>): Record<string, unknown> {
    return dbRowToResumeItem('', row);
  }

  private async mutateSection(
    user: AuthenticatedRequest['user'],
    cvId: string,
    mutator: (scope: DbScope) => Promise<CvItemMutationResponse>,
  ): Promise<CvItemMutationResponse> {
    await this.cvService.getHeader(user, cvId);
    const scope = this.normalizedRepo.scopeFor(user);
    return mutator(scope);
  }

  updateBasics(
    user: AuthenticatedRequest['user'],
    cvId: string,
    basics: Record<string, unknown>,
  ): Promise<CvItemMutationResponse> {
    return this.mutateSection(user, cvId, async (scope) => {
      const header = await this.normalizedRepo.updateBasicsHeader(scope, cvId, basics);
      const mediaId = parseMediaIdFromViewerUrl(basics.image);
      if (mediaId) {
        await this.mediaService.ensureThumbnail(mediaId);
      }
      const item = headerToSlimCvData(header).basics ?? {};

      return { item: item as Record<string, unknown> };
    });
  }

  createProfile(
    user: AuthenticatedRequest['user'],
    cvId: string,
    profile: Record<string, unknown>,
  ): Promise<CvItemMutationResponse> {
    return this.mutateSection(user, cvId, async (scope) => {
      const row = await this.normalizedRepo.insertSectionRow(scope, cvId, 'profiles', profile);
      return { item: this.rowToItem(row) };
    });
  }

  updateProfile(
    user: AuthenticatedRequest['user'],
    cvId: string,
    itemId: string,
    profile: Record<string, unknown>,
  ): Promise<CvItemMutationResponse> {
    return this.mutateSection(user, cvId, async (scope) => {
      const row = await this.requireSectionRow(scope, cvId, 'profiles', itemId, 'Profile');
      const current = this.rowToItem(row);
      const updated = await this.normalizedRepo.updateSectionRow(
        scope,
        cvId,
        'profiles',
        row.id as string,
        { ...current, ...profile },
      );

      return { item: this.rowToItem(updated) };
    });
  }

  deleteProfile(
    user: AuthenticatedRequest['user'],
    cvId: string,
    itemId: string,
  ): Promise<CvItemMutationResponse> {
    return this.mutateSection(user, cvId, async (scope) => {
      const row = await this.requireSectionRow(scope, cvId, 'profiles', itemId, 'Profile');
      await this.normalizedRepo.deleteSectionRow(scope, cvId, 'profiles', row.id as string);
      return {};
    });
  }

  createArrayItem(
    user: AuthenticatedRequest['user'],
    cvId: string,
    key: string,
    item: Record<string, unknown>,
  ): Promise<CvItemMutationResponse> {
    const section = ARRAY_SECTION_MAP[key];
    if (!section) {
      throw new BadRequestException(`Unknown section: ${key}`);
    }

    const sanitized = sanitizeResumeItemPayload(item);
    return this.mutateSection(user, cvId, async (scope) => {
      const row = await this.normalizedRepo.insertSectionRow(scope, cvId, section, sanitized);
      return { item: this.rowToItem(row) };
    });
  }

  updateArrayItem(
    user: AuthenticatedRequest['user'],
    cvId: string,
    key: string,
    itemId: string,
    item: Record<string, unknown>,
    label: string,
  ): Promise<CvItemMutationResponse> {
    const section = ARRAY_SECTION_MAP[key];
    if (!section) {
      throw new BadRequestException(`Unknown section: ${key}`);
    }

    return this.mutateSection(user, cvId, async (scope) => {
      const row = await this.requireSectionRow(scope, cvId, section, itemId, label);
      const current = this.rowToItem(row);
      const updated = await this.normalizedRepo.updateSectionRow(
        scope,
        cvId,
        section,
        row.id as string,
        sanitizeResumeItemPayload({ ...current, ...item }),
      );

      return { item: this.rowToItem(updated) };
    });
  }

  deleteArrayItem(
    user: AuthenticatedRequest['user'],
    cvId: string,
    key: string,
    itemId: string,
    label: string,
  ): Promise<CvItemMutationResponse> {
    const section = ARRAY_SECTION_MAP[key];
    if (!section) {
      throw new BadRequestException(`Unknown section: ${key}`);
    }

    return this.mutateSection(user, cvId, async (scope) => {
      const row = await this.requireSectionRow(scope, cvId, section, itemId, label);
      await this.normalizedRepo.deleteSectionRow(scope, cvId, section, row.id as string);
      return {};
    });
  }

  async getSection(
    user: AuthenticatedRequest['user'],
    cvId: string,
    section: CvSectionKey,
  ): Promise<Record<string, unknown>[]> {
    await this.cvService.getHeader(user, cvId);
    const scope = this.normalizedRepo.scopeFor(user);
    const rows = await this.normalizedRepo.listSectionRows(scope, cvId, section);
    return rows.map((row) => this.rowToItem(row as Record<string, unknown>));
  }

  async getBasics(
    user: AuthenticatedRequest['user'],
    cvId: string,
  ): Promise<Record<string, unknown>> {
    const header = await this.cvService.getHeader(user, cvId);
    return (headerToSlimCvData(header).basics ?? {}) as Record<string, unknown>;
  }

  async reorderSection(
    user: AuthenticatedRequest['user'],
    cvId: string,
    section: CvSectionKey,
    order: string[],
  ): Promise<{ items: Record<string, unknown>[] }> {
    if (!isSortBackedSection(section)) {
      throw new BadRequestException(`Section ${section} does not support reorder`);
    }

    await this.cvService.getHeader(user, cvId);
    const scope = this.normalizedRepo.scopeFor(user);
    const rows = await this.normalizedRepo.reorderSection(scope, cvId, section, order);

    return {
      items: rows.map((row) => this.rowToItem(row)),
    };
  }
}
