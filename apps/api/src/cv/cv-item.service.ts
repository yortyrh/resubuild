import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  type CvSectionKey,
  dbRowToResumeItem,
  getCvMetaVersion,
  isSortBackedSection,
  sanitizeResumeItemPayload,
} from '@resumind/types';
import type { AuthenticatedRequest } from '../auth/supabase-auth.guard';
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
  ) {}

  private parseIndex(index: string, label: string): number {
    const parsed = Number.parseInt(index, 10);
    if (!Number.isInteger(parsed) || parsed < 0) {
      throw new BadRequestException(`Invalid ${label} index`);
    }
    return parsed;
  }

  private assertVersion(
    clientVersion: string | undefined,
    currentVersion: string | undefined,
  ): void {
    if (clientVersion && currentVersion && clientVersion !== currentVersion) {
      throw new ConflictException('This CV was modified elsewhere. Reload the page and try again.');
    }
  }

  private rowToItem(row: Record<string, unknown>): Record<string, unknown> {
    const item = dbRowToResumeItem('', row);
    if (typeof row.id === 'string') {
      item.id = row.id;
    }
    return item;
  }

  private findIndexByRowId<T extends { id: string }>(rows: T[], rowId: string): number {
    return rows.findIndex((r) => r.id === rowId);
  }

  private async mutateSection(
    user: AuthenticatedRequest['user'],
    cvId: string,
    clientVersion: string | undefined,
    mutator: (
      supabase: ReturnType<CvNormalizedRepository['createClientForUser']>,
      currentVersion: string | undefined,
    ) => Promise<Omit<CvItemMutationResponse, 'version'>>,
  ): Promise<CvItemMutationResponse> {
    const header = await this.cvService.getHeader(user, cvId);
    const currentVersion = getCvMetaVersion(header);
    this.assertVersion(clientVersion, currentVersion);

    const supabase = this.normalizedRepo.createClientForUser(user);

    try {
      const result = await mutator(supabase, currentVersion);
      const version = await this.cvService.bumpVersion(
        supabase,
        cvId,
        currentVersion,
        clientVersion,
      );
      return { ...result, version };
    } catch (error) {
      throw error;
    }
  }

  updateBasics(
    user: AuthenticatedRequest['user'],
    cvId: string,
    basics: Record<string, unknown>,
    version?: string,
  ): Promise<CvItemMutationResponse> {
    return this.mutateSection(user, cvId, version, async (supabase) => {
      const header = await this.normalizedRepo.updateBasicsHeader(supabase, cvId, basics);
      const profiles = await this.normalizedRepo.listSectionRows(supabase, cvId, 'profiles');
      const profileItems = profiles.map((p) => this.rowToItem(p as Record<string, unknown>));

      const item = {
        name: header.name ?? undefined,
        label: header.label ?? undefined,
        image: header.image ?? undefined,
        email: header.email ?? undefined,
        phone: header.phone ?? undefined,
        url: header.url ?? undefined,
        summary: header.summary ?? undefined,
        location: header.location ?? {},
        profiles: profileItems,
      };

      return { item };
    });
  }

  createProfile(
    user: AuthenticatedRequest['user'],
    cvId: string,
    profile: Record<string, unknown>,
    version?: string,
  ): Promise<CvItemMutationResponse> {
    return this.mutateSection(user, cvId, version, async (supabase) => {
      const row = await this.normalizedRepo.insertSectionRow(supabase, cvId, 'profiles', profile);
      const rows = await this.normalizedRepo.listSectionRows(supabase, cvId, 'profiles');
      const index = this.findIndexByRowId(rows, row.id as string);
      return { index, item: this.rowToItem(row) };
    });
  }

  updateProfile(
    user: AuthenticatedRequest['user'],
    cvId: string,
    indexStr: string,
    profile: Record<string, unknown>,
    version?: string,
  ): Promise<CvItemMutationResponse> {
    const index = this.parseIndex(indexStr, 'profile');
    return this.mutateSection(user, cvId, version, async (supabase) => {
      const rows = await this.normalizedRepo.listSectionRows(supabase, cvId, 'profiles');
      const row = rows[index];
      if (!row) {
        throw new NotFoundException('Profile not found');
      }

      const current = this.rowToItem(row as Record<string, unknown>);
      const updated = await this.normalizedRepo.updateSectionRow(
        supabase,
        cvId,
        'profiles',
        row.id,
        { ...current, ...profile },
      );

      return { index, item: this.rowToItem(updated) };
    });
  }

  deleteProfile(
    user: AuthenticatedRequest['user'],
    cvId: string,
    indexStr: string,
    version?: string,
  ): Promise<CvItemMutationResponse> {
    const index = this.parseIndex(indexStr, 'profile');
    return this.mutateSection(user, cvId, version, async (supabase) => {
      const rows = await this.normalizedRepo.listSectionRows(supabase, cvId, 'profiles');
      const row = rows[index];
      if (!row) {
        throw new NotFoundException('Profile not found');
      }

      await this.normalizedRepo.deleteSectionRow(supabase, cvId, 'profiles', row.id);
      return { index };
    });
  }

  createArrayItem(
    user: AuthenticatedRequest['user'],
    cvId: string,
    key: string,
    item: Record<string, unknown>,
    version?: string,
  ): Promise<CvItemMutationResponse> {
    const section = ARRAY_SECTION_MAP[key];
    if (!section) {
      throw new BadRequestException(`Unknown section: ${key}`);
    }

    const sanitized = sanitizeResumeItemPayload(item);
    return this.mutateSection(user, cvId, version, async (supabase) => {
      const row = await this.normalizedRepo.insertSectionRow(supabase, cvId, section, sanitized);
      const rows = await this.normalizedRepo.listSectionRows(supabase, cvId, section);
      const index = this.findIndexByRowId(rows, row.id as string);
      return { index, item: this.rowToItem(row) };
    });
  }

  updateArrayItem(
    user: AuthenticatedRequest['user'],
    cvId: string,
    key: string,
    indexStr: string,
    item: Record<string, unknown>,
    label: string,
    version?: string,
  ): Promise<CvItemMutationResponse> {
    const section = ARRAY_SECTION_MAP[key];
    if (!section) {
      throw new BadRequestException(`Unknown section: ${key}`);
    }

    const index = this.parseIndex(indexStr, label);
    return this.mutateSection(user, cvId, version, async (supabase) => {
      const rows = await this.normalizedRepo.listSectionRows(supabase, cvId, section);
      const row = rows[index];
      if (!row) {
        throw new NotFoundException(`${label} not found`);
      }

      const current = this.rowToItem(row as Record<string, unknown>);
      const updated = await this.normalizedRepo.updateSectionRow(
        supabase,
        cvId,
        section,
        row.id,
        sanitizeResumeItemPayload({ ...current, ...item }),
      );

      return { index, item: this.rowToItem(updated) };
    });
  }

  deleteArrayItem(
    user: AuthenticatedRequest['user'],
    cvId: string,
    key: string,
    indexStr: string,
    label: string,
    version?: string,
  ): Promise<CvItemMutationResponse> {
    const section = ARRAY_SECTION_MAP[key];
    if (!section) {
      throw new BadRequestException(`Unknown section: ${key}`);
    }

    const index = this.parseIndex(indexStr, label);
    return this.mutateSection(user, cvId, version, async (supabase) => {
      const rows = await this.normalizedRepo.listSectionRows(supabase, cvId, section);
      const row = rows[index];
      if (!row) {
        throw new NotFoundException(`${label} not found`);
      }

      await this.normalizedRepo.deleteSectionRow(supabase, cvId, section, row.id);
      return { index };
    });
  }

  private async mutateNestedString(
    user: AuthenticatedRequest['user'],
    cvId: string,
    arrayKey: string,
    parentIndexStr: string,
    nestedKey: string,
    parentLabel: string,
    version: string | undefined,
    mutator: (nested: string[]) => { childIndex: number; value: string },
  ): Promise<CvItemMutationResponse> {
    const section = ARRAY_SECTION_MAP[arrayKey];
    if (!section) {
      throw new BadRequestException(`Unknown section: ${arrayKey}`);
    }

    const parentIndex = this.parseIndex(parentIndexStr, parentLabel);

    return this.mutateSection(user, cvId, version, async (supabase) => {
      const rows = await this.normalizedRepo.listSectionRows(supabase, cvId, section);
      const row = rows[parentIndex];
      if (!row) {
        throw new NotFoundException(`${parentLabel} not found`);
      }

      const dbRow = row as Record<string, unknown>;
      const dbNestedKey = nestedKey;
      const current = Array.isArray(dbRow[dbNestedKey])
        ? ([...dbRow[dbNestedKey]] as string[])
        : [];

      const { childIndex, value } = mutator(current);
      const updated = await this.normalizedRepo.updateSectionRow(supabase, cvId, section, row.id, {
        ...this.rowToItem(dbRow),
        [nestedKey]: current,
      });

      return {
        parentIndex,
        childIndex,
        value,
        item: this.rowToItem(updated),
      };
    });
  }

  createNestedString(
    user: AuthenticatedRequest['user'],
    cvId: string,
    arrayKey: string,
    parentIndexStr: string,
    nestedKey: string,
    value: string,
    parentLabel: string,
    version?: string,
  ): Promise<CvItemMutationResponse> {
    return this.mutateNestedString(
      user,
      cvId,
      arrayKey,
      parentIndexStr,
      nestedKey,
      parentLabel,
      version,
      (nested) => {
        nested.push(value);
        return { childIndex: nested.length - 1, value: nested[nested.length - 1] };
      },
    );
  }

  updateNestedString(
    user: AuthenticatedRequest['user'],
    cvId: string,
    arrayKey: string,
    parentIndexStr: string,
    nestedKey: string,
    childIndexStr: string,
    value: string,
    parentLabel: string,
    version?: string,
  ): Promise<CvItemMutationResponse> {
    const childIndex = this.parseIndex(childIndexStr, 'item');

    return this.mutateNestedString(
      user,
      cvId,
      arrayKey,
      parentIndexStr,
      nestedKey,
      parentLabel,
      version,
      (nested) => {
        if (childIndex >= nested.length) {
          throw new NotFoundException('Item not found');
        }
        nested[childIndex] = value;
        return { childIndex, value };
      },
    );
  }

  deleteNestedString(
    user: AuthenticatedRequest['user'],
    cvId: string,
    arrayKey: string,
    parentIndexStr: string,
    nestedKey: string,
    childIndexStr: string,
    parentLabel: string,
    version?: string,
  ): Promise<CvItemMutationResponse> {
    const childIndex = this.parseIndex(childIndexStr, 'item');

    return this.mutateNestedString(
      user,
      cvId,
      arrayKey,
      parentIndexStr,
      nestedKey,
      parentLabel,
      version,
      (nested) => {
        if (childIndex >= nested.length) {
          throw new NotFoundException('Item not found');
        }
        nested.splice(childIndex, 1);
        return { childIndex, value: '' };
      },
    );
  }

  async getSection(
    user: AuthenticatedRequest['user'],
    cvId: string,
    section: CvSectionKey,
  ): Promise<Record<string, unknown>[]> {
    await this.cvService.getHeader(user, cvId);
    const supabase = this.normalizedRepo.createClientForUser(user);
    const rows = await this.normalizedRepo.listSectionRows(supabase, cvId, section);
    return rows.map((row) => this.rowToItem(row as Record<string, unknown>));
  }

  async getBasics(
    user: AuthenticatedRequest['user'],
    cvId: string,
  ): Promise<Record<string, unknown>> {
    const header = await this.cvService.getHeader(user, cvId);
    const supabase = this.normalizedRepo.createClientForUser(user);
    const profiles = await this.normalizedRepo.listSectionRows(supabase, cvId, 'profiles');

    return {
      name: header.name ?? undefined,
      label: header.label ?? undefined,
      image: header.image ?? undefined,
      email: header.email ?? undefined,
      phone: header.phone ?? undefined,
      url: header.url ?? undefined,
      summary: header.summary ?? undefined,
      location: header.location ?? {},
      profiles: profiles.map((p) => this.rowToItem(p as Record<string, unknown>)),
    };
  }

  async reorderSection(
    user: AuthenticatedRequest['user'],
    cvId: string,
    section: CvSectionKey,
    order: string[],
    version?: string,
  ): Promise<{ items: Record<string, unknown>[]; version: string }> {
    if (!isSortBackedSection(section)) {
      throw new BadRequestException(`Section ${section} does not support reorder`);
    }

    const header = await this.cvService.getHeader(user, cvId);
    const currentVersion = getCvMetaVersion(header);
    this.assertVersion(version, currentVersion);

    const supabase = this.normalizedRepo.createClientForUser(user);
    const rows = await this.normalizedRepo.reorderSection(supabase, cvId, section, order);
    const newVersion = await this.cvService.bumpVersion(supabase, cvId, currentVersion, version);

    return {
      items: rows.map((row) => this.rowToItem(row)),
      version: newVersion,
    };
  }
}
