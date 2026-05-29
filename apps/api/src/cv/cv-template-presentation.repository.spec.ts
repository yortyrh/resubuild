import { BadRequestException } from '@nestjs/common';
import { CvTemplatePresentationRepository } from './cv-template-presentation.repository';

describe('CvTemplatePresentationRepository', () => {
  const repo = new CvTemplatePresentationRepository();

  function createSupabase(result: { data: unknown; error: { message: string } | null }) {
    const chain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue(result),
      upsert: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue(result),
    };
    const supabase = { from: jest.fn(() => chain) };
    return { supabase, chain };
  }

  it('fetch returns row when present', async () => {
    const row = {
      cv_id: 'cv-1',
      template_id: 'classic',
      config: {},
      updated_at: 'now',
    };
    const { supabase, chain } = createSupabase({ data: row, error: null });

    const result = await repo.fetch(supabase as never, 'cv-1', 'classic');

    expect(result).toEqual(row);
    expect(chain.eq).toHaveBeenCalledWith('cv_id', 'cv-1');
    expect(chain.eq).toHaveBeenCalledWith('template_id', 'classic');
  });

  it('fetch throws on supabase error', async () => {
    const { supabase } = createSupabase({ data: null, error: { message: 'db fail' } });

    await expect(repo.fetch(supabase as never, 'cv-1', 'classic')).rejects.toThrow(
      BadRequestException,
    );
  });

  it('upsert returns saved row', async () => {
    const row = {
      cv_id: 'cv-1',
      template_id: 'modern',
      config: { hiddenSections: ['skills'] },
      updated_at: 'now',
    };
    const { supabase } = createSupabase({ data: row, error: null });

    const result = await repo.upsert(supabase as never, 'cv-1', 'modern', {
      hiddenSections: ['skills'],
    });

    expect(result).toEqual(row);
  });

  it('upsert throws on supabase error', async () => {
    const { supabase } = createSupabase({ data: null, error: { message: 'upsert fail' } });

    await expect(
      repo.upsert(supabase as never, 'cv-1', 'modern', { hiddenSections: [] }),
    ).rejects.toThrow(BadRequestException);
  });
});
