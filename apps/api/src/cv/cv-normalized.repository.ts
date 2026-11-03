import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  and,
  cv,
  type Database,
  desc,
  eq,
  inArray,
  type PgColumn,
  type PgTable,
  sectionTable,
} from '@resubuild/db';
import type { Resume } from '@resubuild/types';
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
} from '@resubuild/types';
import type { AuthUser } from '../auth/auth-user.types';
import { DATABASE } from '../database/database.tokens';
import { type DbScope, pickColumns } from '../database/db-scope';

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

/** Columns every section table has; `sort` only on sort-backed sections. */
type SectionTableShape = PgTable & { id: PgColumn; cv_id: PgColumn; sort?: PgColumn };

function tableFor(section: CvSectionKey): SectionTableShape {
  return sectionTable(SECTION_TABLE_MAP[section]) as unknown as SectionTableShape;
}

export type CvKind = 'primary' | 'application_clone' | 'import_staging';

export interface CvHeaderInsert {
  kind?: CvKind;
  source_cv_id?: string | null;
  location?: Record<string, unknown>;
  template_id?: string;
}

@Injectable()
export class CvNormalizedRepository {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  /** Data-access scope for `user`; every repository call is restricted to that user. */
  scopeFor(user: AuthUser): DbScope {
    return { db: this.db, userId: user.id };
  }

  /** Runs `fn` in one transaction, with a scope bound to it. */
  inTransaction<T>(scope: DbScope, fn: (tx: DbScope) => Promise<T>): Promise<T> {
    return scope.db.transaction((tx) => fn({ db: tx, userId: scope.userId }));
  }

  /** `id IN (cv owned by scope.userId with id = cvId)` — the ownership check for section rows. */
  private ownedCv(scope: DbScope, cvId: string) {
    return scope.db
      .select({ id: cv.id })
      .from(cv)
      .where(and(eq(cv.id, cvId), eq(cv.user_id, scope.userId)));
  }

  private sectionWhere(scope: DbScope, table: SectionTableShape, cvId: string) {
    return and(eq(table.cv_id, cvId), inArray(table.cv_id, this.ownedCv(scope, cvId)));
  }

  private async requireOwnedCv(scope: DbScope, cvId: string): Promise<void> {
    const header = await this.fetchHeader(scope, cvId);
    if (!header) {
      throw new NotFoundException('CV not found');
    }
  }

  async fetchHeader(scope: DbScope, cvId: string): Promise<CvHeaderRow | null> {
    const rows = await scope.db
      .select()
      .from(cv)
      .where(and(eq(cv.id, cvId), eq(cv.user_id, scope.userId)))
      .limit(1);
    return (rows[0] as CvHeaderRow | undefined) ?? null;
  }

  async listHeaders(scope: DbScope, kind: CvKind = 'primary'): Promise<CvHeaderRow[]> {
    const rows = await scope.db
      .select()
      .from(cv)
      .where(and(eq(cv.user_id, scope.userId), eq(cv.kind, kind)))
      .orderBy(desc(cv.updated_at));
    return rows as CvHeaderRow[];
  }

  async insertHeader(scope: DbScope, values: CvHeaderInsert = {}): Promise<CvHeaderRow> {
    const [row] = await scope.db
      .insert(cv)
      .values({
        user_id: scope.userId,
        kind: values.kind ?? 'primary',
        source_cv_id: values.source_cv_id ?? null,
        location: values.location ?? {},
        template_id: values.template_id ?? 'classic',
      })
      .returning();
    return row as CvHeaderRow;
  }

  /** Returns false when the CV does not exist for this user. */
  async updateHeaderFields(
    scope: DbScope,
    cvId: string,
    fields: { template_id?: string; kind?: CvKind },
  ): Promise<boolean> {
    const set = pickColumns(cv, fields);
    if (Object.keys(set).length === 0) return (await this.fetchHeader(scope, cvId)) !== null;
    const rows = await scope.db
      .update(cv)
      .set(set)
      .where(and(eq(cv.id, cvId), eq(cv.user_id, scope.userId)))
      .returning({ id: cv.id });
    return rows.length > 0;
  }

  /** Deletes the CV (sections cascade). Returns false when it does not exist for this user. */
  async deleteHeader(scope: DbScope, cvId: string, kind?: CvKind): Promise<boolean> {
    const conditions = [eq(cv.id, cvId), eq(cv.user_id, scope.userId)];
    if (kind) conditions.push(eq(cv.kind, kind));
    const rows = await scope.db
      .delete(cv)
      .where(and(...conditions))
      .returning({ id: cv.id });
    return rows.length > 0;
  }

  async fetchSections(scope: DbScope, cvId: string): Promise<NormalizedCvSections> {
    const sections = {} as NormalizedCvSections;

    await Promise.all(
      SECTION_KEYS.map(async (key) => {
        sections[key] = (await this.listSectionRows(scope, cvId, key)) as never;
      }),
    );

    return sections;
  }

  async assembleFullResume(scope: DbScope, cvId: string): Promise<Resume | null> {
    const header = await this.fetchHeader(scope, cvId);
    if (!header) return null;

    const sections = await this.fetchSections(scope, cvId);
    return assembleResume(header, sections);
  }

  /** Writes header fields and inserts every section row of `resume` (sections must be empty). */
  async insertNormalizedCv(scope: DbScope, cvId: string, resume: Resume): Promise<CvHeaderRow> {
    return this.inTransaction(scope, async (tx) => {
      const payload = disassembleResume(resume, cvId);

      const updated = await tx.db
        .update(cv)
        .set({
          name: payload.header.name,
          label: payload.header.label,
          image: payload.header.image,
          email: payload.header.email,
          phone: payload.header.phone,
          url: payload.header.url,
          summary: payload.header.summary,
          location: (payload.header.location ?? {}) as Record<string, unknown>,
        })
        .where(and(eq(cv.id, cvId), eq(cv.user_id, tx.userId)))
        .returning({ id: cv.id });

      if (updated.length === 0) {
        throw new NotFoundException('CV not found');
      }

      for (const key of SECTION_KEYS) {
        const rows = payload.sections[key];
        if (rows.length === 0) continue;

        const insertRows = rows.map((row) => {
          const { id: _id, ...rest } = row as unknown as Record<string, unknown>;
          return { ...rest, cv_id: cvId };
        });

        await tx.db.insert(tableFor(key)).values(insertRows as never);
      }

      const header = await this.fetchHeader(tx, cvId);
      if (!header) {
        throw new BadRequestException('CV not found after insert');
      }

      return header;
    });
  }

  /** Replaces every section of the CV with the content of `resume`, atomically. */
  async replaceNormalizedCv(scope: DbScope, cvId: string, resume: Resume): Promise<CvHeaderRow> {
    return this.inTransaction(scope, async (tx) => {
      await this.requireOwnedCv(tx, cvId);

      for (const key of SECTION_KEYS) {
        const table = tableFor(key);
        await tx.db.delete(table).where(eq(table.cv_id, cvId));
      }

      return this.insertNormalizedCv(tx, cvId, resume);
    });
  }

  async getNextSort(scope: DbScope, cvId: string, section: CvSectionKey): Promise<number> {
    const table = tableFor(section);
    if (!table.sort) return 0;

    const rows = await scope.db
      .select({ sort: table.sort })
      .from(table)
      .where(this.sectionWhere(scope, table, cvId))
      .orderBy(desc(table.sort))
      .limit(1);

    if (rows.length === 0) return 0;
    return (rows[0].sort as number) + 1;
  }

  async listSectionRows<T extends { id: string }>(
    scope: DbScope,
    cvId: string,
    section: CvSectionKey,
  ): Promise<T[]> {
    const table = tableFor(section);
    const rows = await scope.db
      .select()
      .from(table)
      .where(this.sectionWhere(scope, table, cvId));

    return sortSectionRows(section, rows as unknown as T[]) as T[];
  }

  async getSectionRowById<T extends { id: string }>(
    scope: DbScope,
    cvId: string,
    section: CvSectionKey,
    rowId: string,
  ): Promise<T | null> {
    const table = tableFor(section);
    const rows = await scope.db
      .select()
      .from(table)
      .where(and(eq(table.id, rowId), this.sectionWhere(scope, table, cvId)))
      .limit(1);

    return (rows[0] as unknown as T | undefined) ?? null;
  }

  async insertSectionRow(
    scope: DbScope,
    cvId: string,
    section: CvSectionKey,
    item: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    await this.requireOwnedCv(scope, cvId);

    const table = tableFor(section);
    const dbPayload = pickColumns(table, resumeItemToDbPayload(section, item), ['id']);
    dbPayload.cv_id = cvId;

    if (isSortBackedSection(section)) {
      dbPayload.sort = await this.getNextSort(scope, cvId, section);
    }

    const [row] = await scope.db
      .insert(table)
      .values(dbPayload as never)
      .returning();

    return row as Record<string, unknown>;
  }

  async updateSectionRow(
    scope: DbScope,
    cvId: string,
    section: CvSectionKey,
    rowId: string,
    item: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const table = tableFor(section);
    const dbPayload = pickColumns(table, resumeItemToDbPayload(section, item), [
      'id',
      'cv_id',
      'sort',
    ]);

    if (Object.keys(dbPayload).length === 0) {
      const current = await this.getSectionRowById(scope, cvId, section, rowId);
      if (!current) throw new NotFoundException('Item not found');
      return current as Record<string, unknown>;
    }

    const rows = await scope.db
      .update(table)
      .set(dbPayload)
      .where(and(eq(table.id, rowId), this.sectionWhere(scope, table, cvId)))
      .returning();

    if (rows.length === 0) {
      throw new NotFoundException('Item not found');
    }

    return rows[0] as Record<string, unknown>;
  }

  async deleteSectionRow(
    scope: DbScope,
    cvId: string,
    section: CvSectionKey,
    rowId: string,
  ): Promise<void> {
    const table = tableFor(section);
    await scope.db
      .delete(table)
      .where(and(eq(table.id, rowId), this.sectionWhere(scope, table, cvId)));
  }

  async updateBasicsHeader(
    scope: DbScope,
    cvId: string,
    basics: Record<string, unknown>,
  ): Promise<CvHeaderRow> {
    const payload: Record<string, unknown> = {};
    const scalarFields = ['name', 'label', 'image', 'email', 'phone', 'url', 'summary'] as const;

    for (const field of scalarFields) {
      if (field in basics && basics[field] !== undefined) {
        payload[field] = basics[field];
      }
    }

    if ('location' in basics) {
      payload.location = basics.location ?? {};
    }

    if (Object.keys(payload).length === 0) {
      const header = await this.fetchHeader(scope, cvId);
      if (!header) throw new NotFoundException('CV not found');
      return header;
    }

    const rows = await scope.db
      .update(cv)
      .set(payload)
      .where(and(eq(cv.id, cvId), eq(cv.user_id, scope.userId)))
      .returning();

    if (rows.length === 0) {
      throw new NotFoundException('CV not found');
    }

    return rows[0] as CvHeaderRow;
  }

  async reorderSection(
    scope: DbScope,
    cvId: string,
    section: CvSectionKey,
    order: string[],
  ): Promise<Record<string, unknown>[]> {
    if (!isSortBackedSection(section)) {
      throw new BadRequestException(`Section ${section} does not support reorder`);
    }

    return this.inTransaction(scope, async (tx) => {
      const table = tableFor(section);
      const sortColumn = table.sort;
      if (!sortColumn) {
        throw new BadRequestException(`Section ${section} does not support reorder`);
      }

      const existing = await this.listSectionRows<{ id: string }>(tx, cvId, section);
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
        await tx.db
          .update(table)
          .set({ sort: i } as never)
          .where(and(eq(table.id, order[i]), eq(table.cv_id, cvId)));
      }

      return this.listSectionRows(tx, cvId, section);
    });
  }
}
