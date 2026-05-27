import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Resume } from '@resumind/types';
import {
  assembleResume,
  type CvHeaderRow,
  type CvSectionKey,
  disassembleResume,
  isSortBackedSection,
  type NormalizedCvSections,
  resumeItemToDbPayload,
  SECTION_TABLE_MAP,
  sortSectionRows,
} from '@resumind/types';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { AuthenticatedRequest } from '../auth/supabase-auth.guard';

const SECTION_KEYS: CvSectionKey[] = [
  'profiles',
  'work',
  'volunteer',
  'education',
  'awards',
  'certificates',
  'publications',
  'skills',
  'languages',
  'interests',
  'references',
  'projects',
];

@Injectable()
export class CvNormalizedRepository {
  constructor(private readonly configService: ConfigService) {}

  createUserClient(accessToken: string): SupabaseClient {
    const url = this.configService.get<string>('SUPABASE_URL');
    const anonKey = this.configService.get<string>('SUPABASE_ANON_KEY');

    if (!url || !anonKey) {
      throw new Error('Supabase is not configured');
    }

    return createClient(url, anonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    });
  }

  async fetchHeader(supabase: SupabaseClient, cvId: string): Promise<CvHeaderRow | null> {
    const { data, error } = await supabase.from('cv').select('*').eq('id', cvId).maybeSingle();

    if (error) {
      throw new BadRequestException(error.message);
    }

    return data as CvHeaderRow | null;
  }

  async fetchSections(supabase: SupabaseClient, cvId: string): Promise<NormalizedCvSections> {
    const sections = {} as NormalizedCvSections;

    await Promise.all(
      SECTION_KEYS.map(async (key) => {
        const table = SECTION_TABLE_MAP[key];
        const { data, error } = await supabase.from(table).select('*').eq('cv_id', cvId);

        if (error) {
          throw new BadRequestException(error.message);
        }

        sections[key] = sortSectionRows(key, (data ?? []) as never[]) as never;
      }),
    );

    return sections;
  }

  async assembleFullResume(supabase: SupabaseClient, cvId: string): Promise<Resume | null> {
    const header = await this.fetchHeader(supabase, cvId);
    if (!header) return null;

    const sections = await this.fetchSections(supabase, cvId);
    return assembleResume(header, sections);
  }

  async insertNormalizedCv(
    supabase: SupabaseClient,
    cvId: string,
    userId: string,
    resume: Resume,
  ): Promise<CvHeaderRow> {
    const payload = disassembleResume(resume, cvId);

    const { error: headerError } = await supabase
      .from('cv')
      .update({
        name: payload.header.name,
        label: payload.header.label,
        image: payload.header.image,
        email: payload.header.email,
        phone: payload.header.phone,
        url: payload.header.url,
        summary: payload.header.summary,
        location: payload.header.location ?? {},
        meta_version: payload.header.meta_version,
        meta_canonical: payload.header.meta_canonical,
        meta_last_modified: payload.header.meta_last_modified,
      })
      .eq('id', cvId);

    if (headerError) {
      throw new BadRequestException(headerError.message);
    }

    for (const key of SECTION_KEYS) {
      const table = SECTION_TABLE_MAP[key];
      const rows = payload.sections[key];

      if (rows.length === 0) continue;

      const insertRows = rows.map((row) => {
        const { id: _id, ...rest } = row as unknown as Record<string, unknown>;
        return rest;
      });

      const { error } = await supabase.from(table).insert(insertRows);
      if (error) {
        throw new BadRequestException(error.message);
      }
    }

    const header = await this.fetchHeader(supabase, cvId);
    if (!header) {
      throw new BadRequestException('CV not found after insert');
    }

    return header;
  }

  async replaceNormalizedCv(
    supabase: SupabaseClient,
    cvId: string,
    resume: Resume,
  ): Promise<CvHeaderRow> {
    for (const key of SECTION_KEYS) {
      const table = SECTION_TABLE_MAP[key];
      const { error } = await supabase.from(table).delete().eq('cv_id', cvId);
      if (error) {
        throw new BadRequestException(error.message);
      }
    }

    return this.insertNormalizedCv(supabase, cvId, '', resume);
  }

  async getNextSort(
    supabase: SupabaseClient,
    cvId: string,
    section: CvSectionKey,
  ): Promise<number> {
    const table = SECTION_TABLE_MAP[section];
    const { data, error } = await supabase
      .from(table)
      .select('sort')
      .eq('cv_id', cvId)
      .order('sort', { ascending: false })
      .limit(1);

    if (error) {
      throw new BadRequestException(error.message);
    }

    if (!data || data.length === 0) return 0;
    return (data[0].sort as number) + 1;
  }

  async listSectionRows<T extends { id: string }>(
    supabase: SupabaseClient,
    cvId: string,
    section: CvSectionKey,
  ): Promise<T[]> {
    const table = SECTION_TABLE_MAP[section];
    const { data, error } = await supabase.from(table).select('*').eq('cv_id', cvId);

    if (error) {
      throw new BadRequestException(error.message);
    }

    return sortSectionRows(section, (data ?? []) as T[]) as T[];
  }

  async getSectionRowByIndex<T extends { id: string }>(
    supabase: SupabaseClient,
    cvId: string,
    section: CvSectionKey,
    index: number,
  ): Promise<T | null> {
    const rows = await this.listSectionRows<T>(supabase, cvId, section);
    return rows[index] ?? null;
  }

  async insertSectionRow(
    supabase: SupabaseClient,
    cvId: string,
    section: CvSectionKey,
    item: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const table = SECTION_TABLE_MAP[section];
    const dbPayload = resumeItemToDbPayload(section, item);
    dbPayload.cv_id = cvId;

    if (isSortBackedSection(section)) {
      dbPayload.sort = await this.getNextSort(supabase, cvId, section);
    }

    const { data, error } = await supabase.from(table).insert(dbPayload).select('*').single();

    if (error) {
      throw new BadRequestException(error.message);
    }

    return data as Record<string, unknown>;
  }

  async updateSectionRow(
    supabase: SupabaseClient,
    cvId: string,
    section: CvSectionKey,
    rowId: string,
    item: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const table = SECTION_TABLE_MAP[section];
    const dbPayload = resumeItemToDbPayload(section, item);

    const { data, error } = await supabase
      .from(table)
      .update(dbPayload)
      .eq('id', rowId)
      .eq('cv_id', cvId)
      .select('*')
      .single();

    if (error) {
      throw new BadRequestException(error.message);
    }

    return data as Record<string, unknown>;
  }

  async deleteSectionRow(
    supabase: SupabaseClient,
    cvId: string,
    section: CvSectionKey,
    rowId: string,
  ): Promise<void> {
    const table = SECTION_TABLE_MAP[section];
    const { error } = await supabase.from(table).delete().eq('id', rowId).eq('cv_id', cvId);

    if (error) {
      throw new BadRequestException(error.message);
    }
  }

  async updateBasicsHeader(
    supabase: SupabaseClient,
    cvId: string,
    basics: Record<string, unknown>,
  ): Promise<CvHeaderRow> {
    const payload: Record<string, unknown> = {};
    const scalarFields = ['name', 'label', 'image', 'email', 'phone', 'url', 'summary'] as const;

    for (const field of scalarFields) {
      if (field in basics) {
        payload[field] = basics[field];
      }
    }

    if ('location' in basics) {
      payload.location = basics.location ?? {};
    }

    const { data, error } = await supabase
      .from('cv')
      .update(payload)
      .eq('id', cvId)
      .select('*')
      .single();

    if (error) {
      throw new BadRequestException(error.message);
    }

    return data as CvHeaderRow;
  }

  async bumpMetaVersion(
    supabase: SupabaseClient,
    cvId: string,
    meta: { version: string; canonical: string; lastModified: string },
  ): Promise<string> {
    const { data, error } = await supabase
      .from('cv')
      .update({
        meta_version: meta.version,
        meta_canonical: meta.canonical,
        meta_last_modified: meta.lastModified,
      })
      .eq('id', cvId)
      .select('meta_version')
      .single();

    if (error) {
      throw new BadRequestException(error.message);
    }

    return data.meta_version as string;
  }

  async reorderSection(
    supabase: SupabaseClient,
    cvId: string,
    section: CvSectionKey,
    order: string[],
  ): Promise<Record<string, unknown>[]> {
    if (!isSortBackedSection(section)) {
      throw new BadRequestException(`Section ${section} does not support reorder`);
    }

    const table = SECTION_TABLE_MAP[section];
    const existing = await this.listSectionRows<{ id: string }>(supabase, cvId, section);
    const existingIds = new Set(existing.map((r) => r.id));

    if (order.length !== existing.length) {
      throw new BadRequestException('Order must include every row id exactly once');
    }

    const orderSet = new Set(order);
    if (orderSet.size !== order.length) {
      throw new BadRequestException('Order must not contain duplicate ids');
    }

    for (const id of order) {
      if (!existingIds.has(id)) {
        throw new BadRequestException(`Unknown row id: ${id}`);
      }
    }

    for (let i = 0; i < order.length; i++) {
      const { error } = await supabase
        .from(table)
        .update({ sort: i })
        .eq('id', order[i])
        .eq('cv_id', cvId);

      if (error) {
        throw new BadRequestException(error.message);
      }
    }

    return this.listSectionRows(supabase, cvId, section);
  }

  createClientForUser(user: AuthenticatedRequest['user']): SupabaseClient {
    return this.createUserClient(user.accessToken);
  }
}
