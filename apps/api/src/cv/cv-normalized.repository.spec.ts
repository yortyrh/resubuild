import { BadRequestException, NotFoundException } from '@nestjs/common';
import { cvSkill, cvWork } from '@resubuild/db';
import type { Resume } from '@resubuild/types';
import type { DbScope } from '../database/db-scope';
import { useTestDb } from '../database/test-db.helpers';
import { CvNormalizedRepository } from './cv-normalized.repository';

/**
 * Runs against PGlite (in-process Postgres) with the real migrations, so the
 * ownership filters are exercised as real SQL.
 */
describe('CvNormalizedRepository', () => {
  const testDb = useTestDb();
  let repo: CvNormalizedRepository;
  let alice: DbScope;
  let bob: DbScope;

  beforeEach(async () => {
    repo = new CvNormalizedRepository(testDb.db);
    alice = repo.scopeFor(await testDb.createUser('alice@test.local'));
    bob = repo.scopeFor(await testDb.createUser('bob@test.local'));
  });

  const resume: Resume = {
    basics: { name: 'Alice', label: 'Engineer', location: { city: 'Madrid' } },
    work: [
      { name: 'Old Co', position: 'Dev', startDate: '2018-01' },
      { name: 'New Co', position: 'Lead', startDate: '2022-01', highlights: ['Shipped'] },
    ],
    skills: [{ name: 'TypeScript', keywords: ['Node'] }, { name: 'SQL' }],
  } as Resume;

  async function createCv(scope: DbScope, data: Resume = resume) {
    const header = await repo.insertHeader(scope);
    return repo.insertNormalizedCv(scope, header.id, data);
  }

  describe('headers', () => {
    it('inserts a header owned by the scope user with defaults', async () => {
      const header = await repo.insertHeader(alice);
      expect(header).toMatchObject({
        user_id: alice.userId,
        kind: 'primary',
        template_id: 'classic',
        location: {},
      });
      expect(header.created_at).toMatch(/Z$/);
    });

    it('fetchHeader only returns the owner’s CV', async () => {
      const header = await createCv(alice);
      expect((await repo.fetchHeader(alice, header.id))?.name).toBe('Alice');
      expect(await repo.fetchHeader(bob, header.id)).toBeNull();
    });

    it('listHeaders filters by user and kind, newest first', async () => {
      const first = await repo.insertHeader(alice);
      const second = await repo.insertHeader(alice);
      await repo.updateBasicsHeader(alice, first.id, { name: 'touched' });
      await repo.insertHeader(alice, { kind: 'application_clone' });
      await repo.insertHeader(bob);

      const ids = (await repo.listHeaders(alice)).map((h) => h.id);
      expect(ids).toEqual([first.id, second.id]);
    });

    it('updateHeaderFields and deleteHeader are no-ops for another user', async () => {
      const header = await repo.insertHeader(alice);
      expect(await repo.updateHeaderFields(bob, header.id, { template_id: 'modern' })).toBe(false);
      expect(await repo.deleteHeader(bob, header.id)).toBe(false);
      expect(await repo.updateHeaderFields(alice, header.id, { template_id: 'modern' })).toBe(true);
      expect((await repo.fetchHeader(alice, header.id))?.template_id).toBe('modern');
      expect(await repo.deleteHeader(alice, header.id, 'application_clone')).toBe(false);
      expect(await repo.deleteHeader(alice, header.id)).toBe(true);
      expect(await repo.fetchHeader(alice, header.id)).toBeNull();
    });
  });

  describe('normalized resume', () => {
    it('insertNormalizedCv writes header fields and sections; assembleFullResume rebuilds it', async () => {
      const header = await createCv(alice);
      expect(header.location).toEqual({ city: 'Madrid' });

      const assembled = await repo.assembleFullResume(alice, header.id);
      expect(assembled?.basics?.name).toBe('Alice');
      expect(assembled?.work?.map((w) => w.name)).toEqual(['New Co', 'Old Co']);
      expect(assembled?.skills?.map((s) => s.name)).toEqual(['TypeScript', 'SQL']);
    });

    it('insertNormalizedCv refuses a CV owned by someone else and writes nothing', async () => {
      const header = await repo.insertHeader(alice);
      await expect(repo.insertNormalizedCv(bob, header.id, resume)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(await testDb.db.select().from(cvWork)).toEqual([]);
    });

    it('assembleFullResume returns null for missing or foreign CVs', async () => {
      const header = await createCv(alice);
      expect(await repo.assembleFullResume(bob, header.id)).toBeNull();
      expect(
        await repo.assembleFullResume(alice, '00000000-0000-0000-0000-000000000000'),
      ).toBeNull();
    });

    it('replaceNormalizedCv swaps every section atomically', async () => {
      const header = await createCv(alice);
      await repo.replaceNormalizedCv(alice, header.id, {
        basics: { name: 'Alice 2' },
        work: [{ name: 'Only Co' }],
      } as Resume);

      const sections = await repo.fetchSections(alice, header.id);
      expect(sections.work.map((w) => w.name)).toEqual(['Only Co']);
      expect(sections.skills).toEqual([]);
      expect((await repo.fetchHeader(alice, header.id))?.name).toBe('Alice 2');
    });

    it('replaceNormalizedCv leaves another user’s CV untouched', async () => {
      const header = await createCv(alice);
      await expect(
        repo.replaceNormalizedCv(bob, header.id, { basics: {} } as Resume),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect((await repo.fetchSections(alice, header.id)).work).toHaveLength(2);
    });

    it('rolls back the whole replace when an insert fails', async () => {
      const header = await createCv(alice);
      const failing = {
        basics: { name: 'x' },
        skills: [{ name: 'ok' }],
      } as Resume;
      const spy = jest.spyOn(repo, 'insertNormalizedCv').mockRejectedValueOnce(new Error('boom'));

      await expect(repo.replaceNormalizedCv(alice, header.id, failing)).rejects.toThrow('boom');
      spy.mockRestore();
      expect((await repo.fetchSections(alice, header.id)).work).toHaveLength(2);
    });
  });

  describe('section rows', () => {
    it('getNextSort returns 0 for an empty section and max + 1 otherwise', async () => {
      const header = await repo.insertHeader(alice);
      expect(await repo.getNextSort(alice, header.id, 'skills')).toBe(0);
      await repo.insertSectionRow(alice, header.id, 'skills', { name: 'A' });
      await repo.insertSectionRow(alice, header.id, 'skills', { name: 'B' });
      expect(await repo.getNextSort(alice, header.id, 'skills')).toBe(2);
      expect(await repo.getNextSort(alice, header.id, 'work')).toBe(0);
    });

    it('insertSectionRow assigns sort only for sort-backed sections', async () => {
      const header = await repo.insertHeader(alice);
      const skill = await repo.insertSectionRow(alice, header.id, 'skills', { name: 'A' });
      const work = await repo.insertSectionRow(alice, header.id, 'work', {
        name: 'Co',
        startDate: '2020-01',
        highlights: ['x'],
      });

      expect(skill).toMatchObject({ cv_id: header.id, sort: 0, name: 'A' });
      expect(work).toMatchObject({ name: 'Co', start_date: '2020-01', highlights: ['x'] });
      expect(work).not.toHaveProperty('sort');
    });

    it('insertSectionRow rejects a CV owned by someone else', async () => {
      const header = await repo.insertHeader(alice);
      await expect(
        repo.insertSectionRow(bob, header.id, 'skills', { name: 'A' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('get/update/delete only reach rows of the owner’s CV', async () => {
      const header = await repo.insertHeader(alice);
      const row = await repo.insertSectionRow(alice, header.id, 'work', { name: 'Co' });
      const rowId = row.id as string;

      expect(await repo.getSectionRowById(bob, header.id, 'work', rowId)).toBeNull();
      await expect(
        repo.updateSectionRow(bob, header.id, 'work', rowId, { name: 'hacked' }),
      ).rejects.toBeInstanceOf(NotFoundException);
      await repo.deleteSectionRow(bob, header.id, 'work', rowId);
      expect(await testDb.db.select().from(cvWork)).toHaveLength(1);

      const updated = await repo.updateSectionRow(alice, header.id, 'work', rowId, {
        name: 'Renamed',
      });
      expect(updated.name).toBe('Renamed');
      expect((await repo.getSectionRowById(alice, header.id, 'work', rowId))?.id).toBe(rowId);

      await repo.deleteSectionRow(alice, header.id, 'work', rowId);
      expect(await repo.getSectionRowById(alice, header.id, 'work', rowId)).toBeNull();
    });

    it('updateSectionRow ignores unknown keys and keeps cv_id/sort', async () => {
      const header = await repo.insertHeader(alice);
      const row = await repo.insertSectionRow(alice, header.id, 'skills', { name: 'A' });
      const updated = await repo.updateSectionRow(alice, header.id, 'skills', row.id as string, {
        name: 'B',
        bogus: 'ignored',
      });
      expect(updated).toMatchObject({ name: 'B', sort: 0, cv_id: header.id });
    });

    it('listSectionRows returns rows sorted for the section', async () => {
      const header = await repo.insertHeader(alice);
      await repo.insertSectionRow(alice, header.id, 'skills', { name: 'first' });
      await repo.insertSectionRow(alice, header.id, 'skills', { name: 'second' });
      const rows = await repo.listSectionRows<{ id: string; name: string }>(
        alice,
        header.id,
        'skills',
      );
      expect(rows.map((r) => r.name)).toEqual(['first', 'second']);
      expect(await repo.listSectionRows(bob, header.id, 'skills')).toEqual([]);
    });
  });

  describe('updateBasicsHeader', () => {
    it('merges scalar and location fields', async () => {
      const header = await createCv(alice);
      const updated = await repo.updateBasicsHeader(alice, header.id, {
        email: 'a@example.com',
        location: { city: 'Lisbon' },
      });
      expect(updated).toMatchObject({
        name: 'Alice',
        email: 'a@example.com',
        location: { city: 'Lisbon' },
      });
    });

    it('throws NotFound for another user’s CV', async () => {
      const header = await createCv(alice);
      await expect(repo.updateBasicsHeader(bob, header.id, { name: 'x' })).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('reorderSection', () => {
    async function withSkills() {
      const header = await repo.insertHeader(alice);
      const a = await repo.insertSectionRow(alice, header.id, 'skills', { name: 'A' });
      const b = await repo.insertSectionRow(alice, header.id, 'skills', { name: 'B' });
      return { cvId: header.id, a: a.id as string, b: b.id as string };
    }

    it('rejects non sort-backed sections', async () => {
      const { cvId } = await withSkills();
      await expect(repo.reorderSection(alice, cvId, 'work', [])).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('rejects unknown, missing and duplicate ids', async () => {
      const { cvId, a, b } = await withSkills();
      await expect(
        repo.reorderSection(alice, cvId, 'skills', [a, '00000000-0000-0000-0000-000000000000']),
      ).rejects.toThrow('Unknown row id');
      await expect(repo.reorderSection(alice, cvId, 'skills', [a])).rejects.toThrow('every row id');
      await expect(repo.reorderSection(alice, cvId, 'skills', [a, a])).rejects.toThrow('duplicate');
      expect(b).toBeDefined();
    });

    it('rewrites sort and returns the reordered list', async () => {
      const { cvId, a, b } = await withSkills();
      const rows = await repo.reorderSection(alice, cvId, 'skills', [b, a]);
      expect(rows.map((r) => r.name)).toEqual(['B', 'A']);
      const stored = await testDb.db.select().from(cvSkill);
      expect(stored.find((r: { id: string }) => r.id === b)?.sort).toBe(0);
    });

    it('cannot reorder another user’s rows', async () => {
      const { cvId, a, b } = await withSkills();
      await expect(repo.reorderSection(bob, cvId, 'skills', [b, a])).rejects.toThrow(
        'every row id',
      );
    });
  });
});
