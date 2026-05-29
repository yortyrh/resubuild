import { BadRequestException, Injectable } from '@nestjs/common';
import type { CvTemplatePresentationConfig } from '@resumind/resume-template';
import type { SupabaseClient } from '@supabase/supabase-js';

export interface CvTemplatePresentationRow {
  cv_id: string;
  template_id: string;
  config: Partial<CvTemplatePresentationConfig>;
  updated_at: string;
}

@Injectable()
export class CvTemplatePresentationRepository {
  async fetch(
    supabase: SupabaseClient,
    cvId: string,
    templateId: string,
  ): Promise<CvTemplatePresentationRow | null> {
    const { data, error } = await supabase
      .from('cv_template_presentation')
      .select('*')
      .eq('cv_id', cvId)
      .eq('template_id', templateId)
      .maybeSingle();

    if (error) {
      throw new BadRequestException(error.message);
    }

    return data as CvTemplatePresentationRow | null;
  }

  async upsert(
    supabase: SupabaseClient,
    cvId: string,
    templateId: string,
    config: Partial<CvTemplatePresentationConfig>,
  ): Promise<CvTemplatePresentationRow> {
    const { data, error } = await supabase
      .from('cv_template_presentation')
      .upsert(
        {
          cv_id: cvId,
          template_id: templateId,
          config,
        },
        { onConflict: 'cv_id,template_id' },
      )
      .select('*')
      .single();

    if (error) {
      throw new BadRequestException(error.message);
    }

    return data as CvTemplatePresentationRow;
  }
}
