import { BadRequestException, NotFoundException } from '@nestjs/common';
import { cv } from '@resubuild/db';
import type { Resume } from '@resubuild/types';
import type { AuthUser } from '../auth/auth-user.types';
import { useTestDb } from '../database/test-db.helpers';
import { ResumeSchemaValidator } from '../validation/resume-schema.validator';
import { CvCloneService, CvSourceLoaderService } from './cv-clone.service';
import { CvNormalizedRepository } from './cv-normalized.repository';

const MISSING_ID = '00000000-0000-0000-0000-000000000000';

describe('CvCloneService', () => {
  const ctx = useTestDb();
  let repo: CvNormalizedRepository;
  let validator: ResumeSchemaValidator;
  let service: CvCloneService;
  let user: AuthUser;
  let other: AuthUser;

  const resume = {
    basics: { name: 'Jane', label: 'Engineer', location: { city: 'Madrid' } },
    work: [{ name: 'Acme', position: 'Dev', startDate: '2020-01' }],
    projects: [{ name: 'Side project' }],
  } as Resume;

  beforeEach(async () => {
    repo = new CvNormalizedRepository(ctx.db);
    validator = new ResumeSchemaValidator();
    service = new CvCloneService(repo, validator);
    user = await ctx.createUser();
    other = await ctx.createUser();
  });

  async function createPrimary(owner: AuthUser, data: Resume = resume) {
    const scope = repo.scopeFor(owner);
    const header = await repo.insertHeader(scope, { template_id: 'modern' });
    await repo.insertNormalizedCv(scope, header.id, data);
    return header.id;
  }

  describe('deepClone', () => {
    it('copies header and sections into an application clone by default', async () => {
      const sourceId = await createPrimary(user);

      const result = await service.deepClone(user, sourceId);

      expect(result.sourceCvId).toBe(sourceId);
      const scope = repo.scopeFor(user);
      const header = await repo.fetchHeader(scope, result.id);
      expect(header).toMatchObject({
        kind: 'application_clone',
        source_cv_id: sourceId,
        template_id: 'modern',
        location: { city: 'Madrid' },
      });
      const cloned = await repo.assembleFullResume(scope, result.id);
      expect(cloned?.work?.[0]?.name).toBe('Acme');
      expect(cloned?.projects?.[0]?.name).toBe('Side project');
    });

    it('can clone as primary', async () => {
      const sourceId = await createPrimary(user);
      const result = await service.deepClone(user, sourceId, { kind: 'primary' });
      expect((await repo.fetchHeader(repo.scopeFor(user), result.id))?.kind).toBe('primary');
    });

    it('throws NotFound for a missing or foreign source', async () => {
      const sourceId = await createPrimary(user);
      await expect(service.deepClone(other, sourceId)).rejects.toThrow(NotFoundException);
      await expect(service.deepClone(user, MISSING_ID)).rejects.toThrow(NotFoundException);
    });

    it('throws NotFound when the source cannot be assembled', async () => {
      const sourceId = await createPrimary(user);
      jest.spyOn(repo, 'assembleFullResume').mockResolvedValueOnce(null);
      await expect(service.deepClone(user, sourceId)).rejects.toThrow(NotFoundException);
    });

    it('rolls the clone back when the assembled copy fails validation', async () => {
      const sourceId = await createPrimary(user);
      jest.spyOn(validator, 'validate').mockImplementationOnce(() => {
        throw new BadRequestException('invalid');
      });

      await expect(service.deepClone(user, sourceId)).rejects.toThrow(BadRequestException);
      expect(await ctx.db.select().from(cv)).toHaveLength(1);
    });

    it('rolls the clone back when re-assembly returns nothing', async () => {
      const sourceId = await createPrimary(user);
      jest
        .spyOn(repo, 'assembleFullResume')
        .mockImplementationOnce((scope, id) =>
          CvNormalizedRepository.prototype.assembleFullResume.call(repo, scope, id),
        )
        .mockResolvedValueOnce(null);

      await expect(service.deepClone(user, sourceId)).rejects.toThrow('Clone assembly failed');
      expect(await ctx.db.select().from(cv)).toHaveLength(1);
    });
  });

  describe('cloneFromResume', () => {
    it('creates an application clone from resume JSON (source CV deleted)', async () => {
      const result = await service.cloneFromResume(user, resume, {
        sourceCvId: null,
        templateId: 'classic',
      });

      expect(result.sourceCvId).toBe(result.id);
      const header = await repo.fetchHeader(repo.scopeFor(user), result.id);
      expect(header).toMatchObject({
        kind: 'application_clone',
        source_cv_id: null,
        location: { city: 'Madrid' },
      });
    });

    it('rejects an invalid resume before writing', async () => {
      await expect(
        service.cloneFromResume(user, { work: [{ name: 1 }] } as unknown as Resume),
      ).rejects.toThrow(BadRequestException);
      expect(await ctx.db.select().from(cv)).toEqual([]);
    });
  });

  describe('promoteClone', () => {
    it('promotes an application clone by cloning it as primary', async () => {
      const sourceId = await createPrimary(user);
      const clone = await service.deepClone(user, sourceId);

      const promoted = await service.promoteClone(user, clone.id);

      expect(promoted.sourceCvId).toBe(clone.id);
      expect((await repo.fetchHeader(repo.scopeFor(user), promoted.id))?.kind).toBe('primary');
    });

    it('rejects promoting non-clone CVs and missing CVs', async () => {
      const sourceId = await createPrimary(user);
      await expect(service.promoteClone(user, sourceId)).rejects.toThrow(BadRequestException);
      await expect(service.promoteClone(user, MISSING_ID)).rejects.toThrow(NotFoundException);
    });
  });
});

describe('CvSourceLoaderService', () => {
  const ctx = useTestDb();

  it('loads work, volunteer and project items from the source CV', async () => {
    const repo = new CvNormalizedRepository(ctx.db);
    const loader = new CvSourceLoaderService(repo);
    const user = await ctx.createUser();
    const scope = repo.scopeFor(user);
    const header = await repo.insertHeader(scope);
    await repo.insertNormalizedCv(scope, header.id, {
      work: [{ name: 'Acme' }],
      volunteer: [{ organization: 'NGO' }],
      projects: [{ name: 'Proj' }],
    } as Resume);

    expect((await loader.loadWorkItems(user, header.id)).map((r) => r.id)).toHaveLength(1);
    expect(await loader.loadVolunteerItems(user, header.id)).toHaveLength(1);
    expect(await loader.loadProjectItems(user, header.id)).toHaveLength(1);
    expect(await loader.loadWorkItems(await ctx.createUser(), header.id)).toEqual([]);
  });
});
