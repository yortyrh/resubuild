import { BadRequestException, NotFoundException } from '@nestjs/common';
import { cv } from '@resubuild/db';
import type { Resume } from '@resubuild/types';
import type { AuthUser } from '../auth/auth-user.types';
import { CvService } from '../cv/cv.service';
import { CvNormalizedRepository } from '../cv/cv-normalized.repository';
import { useTestDb } from '../database/test-db.helpers';
import { ResumeSchemaValidator } from '../validation/resume-schema.validator';
import { CvJsonResumeSwapService } from './cv-json-resume-swap.service';

describe('CvJsonResumeSwapService', () => {
  const ctx = useTestDb();
  let repo: CvNormalizedRepository;
  let service: CvJsonResumeSwapService;
  let user: AuthUser;

  beforeEach(async () => {
    repo = new CvNormalizedRepository(ctx.db);
    const validator = new ResumeSchemaValidator();
    service = new CvJsonResumeSwapService(new CvService(validator, repo), repo, validator);
    user = await ctx.createUser();
  });

  async function createPrimary(data: Resume) {
    const scope = repo.scopeFor(user);
    const header = await repo.insertHeader(scope);
    await repo.insertNormalizedCv(scope, header.id, data);
    return header.id;
  }

  describe('createFromJsonResume', () => {
    it('creates a CV from a JSON Resume document', async () => {
      const result = await service.createFromJsonResume(user, { basics: { name: 'John' } });
      expect(result.title).toBe('John');
    });

    it('throws BadRequest for documents that are not JSON Resume objects', async () => {
      await expect(service.createFromJsonResume(user, 'nope')).rejects.toThrow(BadRequestException);
    });
  });

  describe('replaceFromJsonResume', () => {
    it('swaps the primary CV for the imported document', async () => {
      const cvId = await createPrimary({
        basics: { name: 'Old' },
        work: [{ name: 'Old Co' }],
      } as Resume);

      const result = await service.replaceFromJsonResume(user, cvId, {
        basics: { name: 'New' },
        skills: [{ name: 'SQL' }],
      });

      expect(result.title).toBe('New');
      expect(result.id).not.toBe(cvId);
      const rows = await ctx.db.select().from(cv);
      expect(rows.map((r) => [r.id, r.kind])).toEqual([[result.id, 'primary']]);
      const sections = await repo.fetchSections(repo.scopeFor(user), result.id);
      expect(sections.skills.map((s) => s.name)).toEqual(['SQL']);
      expect(sections.work).toEqual([]);
    });

    it('throws NotFound when the CV does not exist for the user', async () => {
      const cvId = await createPrimary({ basics: { name: 'Mine' } } as Resume);
      await expect(
        service.replaceFromJsonResume(await ctx.createUser(), cvId, { basics: {} }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequest when the CV is not primary', async () => {
      const header = await repo.insertHeader(repo.scopeFor(user), { kind: 'application_clone' });
      await expect(service.replaceFromJsonResume(user, header.id, { basics: {} })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('rolls everything back when writing the replacement fails', async () => {
      const cvId = await createPrimary({ basics: { name: 'Keep' } } as Resume);
      jest.spyOn(repo, 'insertNormalizedCv').mockRejectedValueOnce(new Error('DB error'));

      await expect(
        service.replaceFromJsonResume(user, cvId, { basics: { name: 'X' } }),
      ).rejects.toThrow('DB error');

      const rows = await ctx.db.select().from(cv);
      expect(rows.map((r) => [r.id, r.kind])).toEqual([[cvId, 'primary']]);
    });

    it('rolls back when promoting the staging CV fails', async () => {
      const cvId = await createPrimary({ basics: { name: 'Keep' } } as Resume);
      jest.spyOn(repo, 'updateHeaderFields').mockResolvedValueOnce(false);

      await expect(
        service.replaceFromJsonResume(user, cvId, { basics: { name: 'X' } }),
      ).rejects.toThrow(BadRequestException);

      const rows = await ctx.db.select().from(cv);
      expect(rows.map((r) => [r.id, r.kind])).toEqual([[cvId, 'primary']]);
    });
  });
});
