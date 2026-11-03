import { Injectable } from '@nestjs/common';
import { and, cv, cvTemplatePresentation, eq, inArray } from '@resubuild/db';
import type { CvTemplatePresentationConfig } from '@resubuild/resume-template';
import type { DbScope } from '../database/db-scope';

export interface CvTemplatePresentationRow {
  cv_id: string;
  template_id: string;
  config: Partial<CvTemplatePresentationConfig>;
  updated_at: string;
}

@Injectable()
export class CvTemplatePresentationRepository {
  private ownedCv(scope: DbScope, cvId: string) {
    return scope.db
      .select({ id: cv.id })
      .from(cv)
      .where(and(eq(cv.id, cvId), eq(cv.user_id, scope.userId)));
  }

  async fetch(
    scope: DbScope,
    cvId: string,
    templateId: string,
  ): Promise<CvTemplatePresentationRow | null> {
    const rows = await scope.db
      .select()
      .from(cvTemplatePresentation)
      .where(
        and(
          eq(cvTemplatePresentation.cv_id, cvId),
          eq(cvTemplatePresentation.template_id, templateId),
          inArray(cvTemplatePresentation.cv_id, this.ownedCv(scope, cvId)),
        ),
      )
      .limit(1);

    return (rows[0] as CvTemplatePresentationRow | undefined) ?? null;
  }

  /** Callers must have checked that `cvId` belongs to `scope.userId`. */
  async upsert(
    scope: DbScope,
    cvId: string,
    templateId: string,
    config: Partial<CvTemplatePresentationConfig>,
  ): Promise<CvTemplatePresentationRow> {
    const [row] = await scope.db
      .insert(cvTemplatePresentation)
      .values({ cv_id: cvId, template_id: templateId, config })
      .onConflictDoUpdate({
        target: [cvTemplatePresentation.cv_id, cvTemplatePresentation.template_id],
        set: { config },
      })
      .returning();

    return row as CvTemplatePresentationRow;
  }
}
