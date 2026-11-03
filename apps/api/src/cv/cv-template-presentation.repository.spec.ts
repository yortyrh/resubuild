import type { AuthUser } from '../auth/auth-user.types';
import { useTestDb } from '../database/test-db.helpers';
import { CvNormalizedRepository } from './cv-normalized.repository';
import { CvTemplatePresentationRepository } from './cv-template-presentation.repository';

describe('CvTemplatePresentationRepository', () => {
  const ctx = useTestDb();
  const repo = new CvTemplatePresentationRepository();
  let cvRepo: CvNormalizedRepository;
  let user: AuthUser;
  let cvId: string;

  beforeEach(async () => {
    cvRepo = new CvNormalizedRepository(ctx.db);
    user = await ctx.createUser();
    cvId = (await cvRepo.insertHeader(cvRepo.scopeFor(user))).id;
  });

  it('fetch returns null when no row exists', async () => {
    await expect(repo.fetch(cvRepo.scopeFor(user), cvId, 'classic')).resolves.toBeNull();
  });

  it('upsert inserts then updates the config for (cv, template)', async () => {
    const scope = cvRepo.scopeFor(user);
    const first = await repo.upsert(scope, cvId, 'classic', { sectionOrder: ['work'] } as never);
    expect(first).toMatchObject({ cv_id: cvId, template_id: 'classic' });

    await repo.upsert(scope, cvId, 'classic', { sectionOrder: ['skills'] } as never);
    const row = await repo.fetch(scope, cvId, 'classic');
    expect(row?.config).toEqual({ sectionOrder: ['skills'] });
    expect(await repo.fetch(scope, cvId, 'modern')).toBeNull();
  });

  it('fetch never returns another user’s presentation', async () => {
    await repo.upsert(cvRepo.scopeFor(user), cvId, 'classic', {} as never);
    const other = cvRepo.scopeFor(await ctx.createUser());
    await expect(repo.fetch(other, cvId, 'classic')).resolves.toBeNull();
  });
});
