/**
 * CRUD and baseline create-flow scenarios (docs/requirements/cv.md).
 *
 * Runs the real repository against PGlite (in-process Postgres).
 */

import { BadRequestException, NotFoundException } from '@nestjs/common';
import { cv } from '@resubuild/db';
import type { AuthUser } from '../auth/auth-user.types';
import { useTestDb } from '../database/test-db.helpers';
import { ResumeSchemaValidator } from '../validation/resume-schema.validator';
import { CvService } from './cv.service';
import { CvNormalizedRepository } from './cv-normalized.repository';

const MISSING_ID = '00000000-0000-0000-0000-000000000000';

describe('CvService', () => {
  const ctx = useTestDb();
  let service: CvService;
  let repo: CvNormalizedRepository;
  let user: AuthUser;
  let other: AuthUser;

  beforeEach(async () => {
    repo = new CvNormalizedRepository(ctx.db);
    service = new CvService(new ResumeSchemaValidator(), repo);
    user = await ctx.createUser('user@test.local');
    other = await ctx.createUser('other@test.local');
  });

  const create = (owner: AuthUser, data: Record<string, unknown>) =>
    service.create(owner, { data } as never);

  describe('findAll', () => {
    it('returns the user’s primary CVs, newest first, as slim records', async () => {
      const older = await create(user, { basics: { name: 'Older' } });
      const newer = await create(user, { basics: { name: 'Jane', label: 'Engineer' } });
      await create(other, { basics: { name: 'Someone else' } });
      await repo.insertHeader(repo.scopeFor(user), { kind: 'application_clone' });

      const result = await service.findAll(user);

      expect(result.map((r) => r.id)).toEqual([newer.id, older.id]);
      expect(result[0]).toMatchObject({
        user_id: user.id,
        title: 'Jane — Engineer',
        templateId: 'classic',
      });
      expect(result[0].data).not.toHaveProperty('work');
      expect(result[0].created_at).toMatch(/Z$/);
    });

    it('returns an empty list when the user has no CVs', async () => {
      await expect(service.findAll(user)).resolves.toEqual([]);
    });
  });

  describe('findOne / getHeader', () => {
    it('returns the header for the owner', async () => {
      const created = await create(user, { basics: { name: 'Jane' } });
      await expect(service.findOne(user, created.id)).resolves.toMatchObject({ title: 'Jane' });
      await expect(service.getHeader(user, created.id)).resolves.toMatchObject({
        id: created.id,
      });
    });

    it('throws NotFound for missing or foreign CVs', async () => {
      const created = await create(user, { basics: { name: 'Jane' } });
      await expect(service.findOne(other, created.id)).rejects.toThrow(NotFoundException);
      await expect(service.getHeader(user, MISSING_ID)).rejects.toThrow(NotFoundException);
    });

    it('maps a malformed id to a 400 through the database error filter', async () => {
      await expect(service.findOne(user, 'not-a-uuid')).rejects.toMatchObject({
        cause: expect.objectContaining({ code: '22P02' }),
      });
    });
  });

  describe('create', () => {
    it('inserts the cv row and normalized sections', async () => {
      const result = await create(user, {
        basics: { name: 'Jane Doe', label: 'Senior Software Engineer' },
        work: [{ name: 'Tech Innovators Inc.', position: 'Lead', startDate: '2021-06-15' }],
        education: [{ institution: 'University of Toronto', area: 'Computer Science' }],
        meta: { canonical: 'https://example.org/old', version: 'v4.99.99' },
      });

      expect(result.title).toBe('Jane Doe — Senior Software Engineer');
      expect(result.data).not.toHaveProperty('meta');
      expect(result.data).not.toHaveProperty('work');

      const full = await repo.assembleFullResume(repo.scopeFor(user), result.id);
      expect(full?.work?.[0]?.name).toBe('Tech Innovators Inc.');
      expect(full?.education?.[0]?.institution).toBe('University of Toronto');
    });

    it('validates before insert so invalid data does not create a cv row', async () => {
      await expect(create(user, { work: [{ name: 123 }] })).rejects.toThrow(BadRequestException);
      expect(await ctx.db.select().from(cv)).toEqual([]);
    });
  });

  describe('update', () => {
    it('ignores title-only updates and returns the slim CV', async () => {
      const created = await create(user, { basics: { name: 'Jane' } });
      const result = await service.update(user, created.id, { title: 'Ignored' } as never);
      expect(result.title).toBe('Jane');
    });

    it('replaces normalized rows when data is provided', async () => {
      const created = await create(user, {
        basics: { name: 'Jane' },
        work: [{ name: 'Old Co' }],
      });

      const result = await service.update(user, created.id, {
        data: { basics: { name: 'Updated', label: 'Role' } },
      } as never);

      expect(result.title).toBe('Updated — Role');
      const sections = await repo.fetchSections(repo.scopeFor(user), created.id);
      expect(sections.work).toEqual([]);
    });

    it('persists a valid templateId in canonical form', async () => {
      const created = await create(user, { basics: { name: 'Jane' } });
      const result = await service.update(user, created.id, { templateId: 'capd-alum' } as never);
      expect(result.templateId).toBe('classic');
    });

    it('rejects an unknown templateId', async () => {
      await expect(
        service.update(user, MISSING_ID, { templateId: 'not-a-real-template' } as never),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws NotFound and changes nothing for another user’s CV', async () => {
      const created = await create(user, { basics: { name: 'Jane' } });
      await expect(
        service.update(other, created.id, { templateId: 'classic' } as never),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.update(other, created.id, { data: { basics: { name: 'Hacked' } } } as never),
      ).rejects.toThrow(NotFoundException);
      await expect(service.findOne(user, created.id)).resolves.toMatchObject({ title: 'Jane' });
    });
  });

  it('persistValidatedData validates and replaces the normalized cv', async () => {
    const created = await create(user, { basics: { name: 'Before' } });
    const result = await service.persistValidatedData(user, created.id, {
      basics: { name: 'Import' },
    });
    expect(result.title).toBe('Import');
    await expect(
      service.persistValidatedData(user, created.id, { work: [{ name: 1 }] }),
    ).rejects.toThrow(BadRequestException);
  });

  describe('remove', () => {
    it('deletes the cv row', async () => {
      const created = await create(user, { basics: { name: 'Jane' } });
      await expect(service.remove(user, created.id)).resolves.toBeUndefined();
      await expect(service.findOne(user, created.id)).rejects.toThrow(NotFoundException);
    });

    it('throws NotFound for missing or foreign CVs', async () => {
      const created = await create(user, { basics: { name: 'Jane' } });
      await expect(service.remove(other, created.id)).rejects.toThrow(NotFoundException);
      await expect(service.remove(user, MISSING_ID)).rejects.toThrow(NotFoundException);
      await expect(service.findOne(user, created.id)).resolves.toBeDefined();
    });
  });
});
