import type { AuthUser } from '../auth/auth-user.types';
import { useTestDb } from '../database/test-db.helpers';
import { ApplicationRepository } from './application.repository';

const MISSING_ID = '00000000-0000-0000-0000-000000000000';

describe('ApplicationRepository', () => {
  const ctx = useTestDb();
  let repository: ApplicationRepository;
  let user: AuthUser;
  let other: AuthUser;

  beforeEach(async () => {
    repository = new ApplicationRepository(ctx.db);
    user = await ctx.createUser();
    other = await ctx.createUser();
  });

  it('creates a job application row with defaults', async () => {
    const row = await repository.create(user, {
      status: 'queued',
      job_source_type: 'text',
      user_message: 'Tailor for leadership',
    });

    expect(row).toMatchObject({
      user_id: user.id,
      status: 'queued',
      job_source_type: 'text',
      user_message: 'Tailor for leadership',
      is_list_visible: true,
      job_title: null,
      source_cv_snapshot: null,
    });
    expect(row.created_at).toMatch(/Z$/);
  });

  it('lists only the user’s visible applications, newest first', async () => {
    const first = await repository.create(user, { status: 'queued', job_source_type: 'text' });
    const second = await repository.create(user, { status: 'queued', job_source_type: 'url' });
    await repository.update(user, first.id, { job_title: 'touched' });
    await repository.create(user, {
      status: 'queued',
      job_source_type: 'text',
      is_list_visible: false,
    });
    await repository.create(other, { status: 'queued', job_source_type: 'text' });

    const rows = await repository.findAll(user);
    expect(rows.map((r) => r.id)).toEqual([first.id, second.id]);
  });

  it('findOne / update / remove are restricted to the owner', async () => {
    const row = await repository.create(user, { status: 'queued', job_source_type: 'text' });

    await expect(repository.findOne(other, row.id)).resolves.toBeNull();
    await expect(repository.update(other, row.id, { status: 'failed' })).resolves.toBeNull();
    await expect(repository.remove(other, row.id)).resolves.toBe(false);

    await expect(repository.findOne(user, row.id)).resolves.toMatchObject({ status: 'queued' });
    await expect(repository.update(user, row.id, { status: 'ready' })).resolves.toMatchObject({
      status: 'ready',
    });
    await expect(repository.remove(user, row.id)).resolves.toBe(true);
    await expect(repository.findOne(user, row.id)).resolves.toBeNull();
  });

  it('returns null / false for missing rows', async () => {
    await expect(repository.findOne(user, MISSING_ID)).resolves.toBeNull();
    await expect(repository.update(user, MISSING_ID, { status: 'failed' })).resolves.toBeNull();
    await expect(repository.remove(user, MISSING_ID)).resolves.toBe(false);
  });

  it('update with an empty or unknown-only patch returns the current row', async () => {
    const row = await repository.create(user, { status: 'queued', job_source_type: 'text' });
    await expect(repository.update(user, row.id, {})).resolves.toMatchObject({ id: row.id });
    await expect(
      repository.update(user, row.id, { bogus: 1, user_id: other.id } as never),
    ).resolves.toMatchObject({ user_id: user.id });
  });

  describe('job posting trace', () => {
    const summary = {
      requirements: ['5+ years of TypeScript', 'Team leadership'],
      keywords: ['NestJS', 'PostgreSQL'],
      language: 'es',
    };

    it('defaults the job source URL, file name and summary to null', async () => {
      const row = await repository.create(user, { status: 'queued', job_source_type: 'text' });

      expect(row.job_source_url).toBeNull();
      expect(row.job_source_file_name).toBeNull();
      expect(row.job_summary).toBeNull();
    });

    it('persists the job source URL, file name and summary on create', async () => {
      const row = await repository.create(user, {
        status: 'queued',
        job_source_type: 'url',
        job_source_url: 'https://jobs.example.com/123',
        job_source_file_name: 'job-offer.pdf',
        job_summary: summary,
      });

      const stored = await repository.findOne(user, row.id);
      expect(stored).toMatchObject({
        job_source_url: 'https://jobs.example.com/123',
        job_source_file_name: 'job-offer.pdf',
        job_summary: summary,
      });
    });

    it('updates the stored job summary', async () => {
      const row = await repository.create(user, { status: 'queued', job_source_type: 'text' });

      const updated = await repository.update(user, row.id, {
        status: 'ready',
        job_summary: { requirements: ['SQL'], keywords: [], language: null },
      });

      expect(updated?.job_summary).toEqual({ requirements: ['SQL'], keywords: [], language: null });
      await expect(repository.findOne(user, row.id)).resolves.toMatchObject({
        job_summary: { requirements: ['SQL'], keywords: [], language: null },
      });
    });

    it('does not expose the job posting trace to another user', async () => {
      const row = await repository.create(user, {
        status: 'ready',
        job_source_type: 'url',
        job_source_url: 'https://jobs.example.com/123',
        job_summary: summary,
        job_raw_text: 'Secret posting',
      });

      await expect(repository.findOne(other, row.id)).resolves.toBeNull();
      await expect(repository.findAll(other)).resolves.toEqual([]);
      await expect(
        repository.update(other, row.id, { job_summary: { requirements: [], keywords: [] } }),
      ).resolves.toBeNull();
      await expect(repository.findOne(user, row.id)).resolves.toMatchObject({
        job_summary: summary,
      });
    });
  });

  describe('update drafts', () => {
    it('finds the newest active (queued/running) hidden draft for a source application', async () => {
      const source = await repository.create(user, { status: 'ready', job_source_type: 'text' });
      const draft = (status: 'queued' | 'running' | 'failed') =>
        repository.create(user, {
          status,
          job_source_type: 'text',
          source_application_id: source.id,
          is_list_visible: false,
        });

      await expect(repository.findActiveUpdateDraft(user, source.id)).resolves.toBeNull();
      await draft('failed');
      const running = await draft('running');

      await expect(repository.findActiveUpdateDraft(user, source.id)).resolves.toMatchObject({
        id: running.id,
      });
      await expect(repository.findActiveUpdateDraft(other, source.id)).resolves.toBeNull();
      await expect(repository.findDanglingUpdateDrafts(user, source.id)).resolves.toHaveLength(2);
      await expect(repository.findDanglingUpdateDrafts(other, source.id)).resolves.toEqual([]);
    });
  });
});
