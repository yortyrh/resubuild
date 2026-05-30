import { readFileSync } from 'node:fs';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createE2eApp } from './create-e2e-app';
import { loadE2eAccountState, loadFixture, samplesPath } from './fixture';

describe('E2E — auth (local Supabase)', () => {
  let app: INestApplication;
  const fixture = loadFixture();
  const state = loadE2eAccountState();

  beforeAll(async () => {
    app = await createE2eApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /auth/login returns tokens for the seeded fixture user', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send(fixture.e2eUser)
      .expect(200);

    expect(response.body.access_token).toEqual(expect.any(String));
    expect(response.body.user.id).toBe(state.user.id);
    expect(response.body.user.email).toBe(fixture.e2eUser.email);
  });

  it('GET /auth/me returns the authenticated user', async () => {
    const login = await request(app.getHttpServer()).post('/auth/login').send(fixture.e2eUser);

    const response = await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${login.body.access_token}`)
      .expect(200);

    expect(response.body.user.id).toBe(state.user.id);
    expect(response.body.user.email).toBe(fixture.e2eUser.email);
  });

  it('GET /auth/me without token returns 401', async () => {
    await request(app.getHttpServer()).get('/auth/me').expect(401);
  });
});

describe('E2E — CV REST (local Supabase)', () => {
  let app: INestApplication;
  let accessToken: string;
  const fixture = loadFixture();
  const state = loadE2eAccountState();

  beforeAll(async () => {
    app = await createE2eApp();
    const login = await request(app.getHttpServer()).post('/auth/login').send(fixture.e2eUser);
    accessToken = login.body.access_token;
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /cv includes every seeded CV id', async () => {
    const response = await request(app.getHttpServer())
      .get('/cv')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    const ids = new Set(response.body.map((row: { id: string }) => row.id));
    for (const cv of state.cvs) {
      expect(ids.has(cv.id)).toBe(true);
    }
    expect(ids.size).toBeGreaterThanOrEqual(state.cvs.length);
  });

  it('GET /cv/:id returns a seeded CV with JSON Resume basics', async () => {
    const target = state.cvs[0];
    const response = await request(app.getHttpServer())
      .get(`/cv/${target.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(response.body.id).toBe(target.id);
    expect(response.body.title).toBe(target.title);
    expect(response.body.data.basics?.name).toEqual(expect.any(String));
    expect(response.body.data).not.toHaveProperty('meta');
  });

  it('every seeded CV has basics.image set to its assigned media URL', async () => {
    for (const assignment of state.profilePhotoAssignments) {
      const response = await request(app.getHttpServer())
        .get(`/cv/${assignment.cvId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.data.basics?.image).toBe(assignment.mediaUrl);
    }
    expect(state.profilePhotoAssignments).toHaveLength(state.cvs.length);
  });

  it('GET /media/:id/thumbnail returns WebP preview for seeded profile photos', async () => {
    const assignment = state.profilePhotoAssignments[0];
    const response = await request(app.getHttpServer())
      .get(`/media/${assignment.mediaId}/thumbnail`)
      .expect(200);

    expect(response.headers['content-type']).toMatch(/image\/webp/);
    expect(response.body.length).toBeGreaterThan(0);
  });

  it('POST /cv rejects invalid resume JSON', async () => {
    await request(app.getHttpServer())
      .post('/cv')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ data: { work: [{ name: 123 }] } })
      .expect(400);
  });

  it('GET /cv/:cvId/work returns work section array', async () => {
    const target = state.cvs[0];
    const response = await request(app.getHttpServer())
      .get(`/cv/${target.id}/work`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(Array.isArray(response.body)).toBe(true);
    if (response.body.length > 0) {
      expect(response.body[0].name).toEqual(expect.any(String));
    }
  });

  it('GET /cv/:cvId/skills returns skills section array', async () => {
    const target = state.cvs[0];
    const response = await request(app.getHttpServer())
      .get(`/cv/${target.id}/skills`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(Array.isArray(response.body)).toBe(true);
  });

  it('creates skills, reorders via PUT, and asserts GET order', async () => {
    const created = await request(app.getHttpServer())
      .post('/cv')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ data: { basics: { name: 'Reorder Test' }, skills: [] } })
      .expect(201);

    const cvId = created.body.id;

    const skillNames = ['Alpha', 'Beta', 'Gamma'];
    const ids: string[] = [];

    for (const name of skillNames) {
      const res = await request(app.getHttpServer())
        .post(`/cv/${cvId}/skills`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ skill: { name } })
        .expect(201);
      ids.push(res.body.item.id);
    }

    const listBefore = await request(app.getHttpServer())
      .get(`/cv/${cvId}/skills`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    const rowIds = listBefore.body.map((row: { id: string }) => row.id);

    const reordered = await request(app.getHttpServer())
      .put(`/cv/${cvId}/skills/reorder`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ order: [rowIds[2], rowIds[0], rowIds[1]] })
      .expect(200);

    expect(reordered.body.items.map((s: { name: string }) => s.name)).toEqual([
      'Gamma',
      'Alpha',
      'Beta',
    ]);

    const listAfter = await request(app.getHttpServer())
      .get(`/cv/${cvId}/skills`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(listAfter.body.map((s: { name: string }) => s.name)).toEqual(['Gamma', 'Alpha', 'Beta']);
  });

  it('patches work by row id after a newer entry changes list order', async () => {
    const created = await request(app.getHttpServer())
      .post('/cv')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ data: { basics: { name: 'Work Id Test' }, work: [] } })
      .expect(201);

    const cvId = created.body.id;

    const older = await request(app.getHttpServer())
      .post(`/cv/${cvId}/work`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        work: { name: 'Older Co', position: 'Engineer', startDate: '2018-01' },
      })
      .expect(201);
    const olderId = older.body.item.id as string;

    await request(app.getHttpServer())
      .post(`/cv/${cvId}/work`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        work: { name: 'Newer Co', position: 'Lead', startDate: '2024-01' },
      })
      .expect(201);

    const list = await request(app.getHttpServer())
      .get(`/cv/${cvId}/work`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(list.body[0].name).toBe('Newer Co');
    expect(list.body[1].id).toBe(olderId);

    const patched = await request(app.getHttpServer())
      .patch(`/cv/${cvId}/work/${olderId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        work: { name: 'Older Co', position: 'Senior Engineer', startDate: '2018-01' },
      })
      .expect(200);

    expect(patched.body.item.id).toBe(olderId);
    expect(patched.body.item.position).toBe('Senior Engineer');
  });
});

describe('E2E — media service (local Supabase)', () => {
  let app: INestApplication;
  let accessToken: string;
  const fixture = loadFixture();
  const state = loadE2eAccountState();

  beforeAll(async () => {
    app = await createE2eApp();
    const login = await request(app.getHttpServer()).post('/auth/login').send(fixture.e2eUser);
    accessToken = login.body.access_token;
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /media/:id streams a seeded image without auth', async () => {
    const media = state.media[0];
    const response = await request(app.getHttpServer()).get(`/media/${media.id}`).expect(200);

    expect(response.headers['content-type']).toContain(media.contentType.split('/')[0]);
    expect(response.body.length).toBeGreaterThan(0);
  });

  it('GET /media/:id/meta returns registry metadata for the owner', async () => {
    const media = state.media[0];
    const response = await request(app.getHttpServer())
      .get(`/media/${media.id}/meta`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(response.body.id).toBe(media.id);
    expect(response.body.contentType).toBe(media.contentType);
  });

  it('POST /media/upload accepts a new PNG through MediaService', async () => {
    const samplePath = samplesPath('media', 'profile-01-engineer-woman.png');
    const buffer = readFileSync(samplePath);

    const response = await request(app.getHttpServer())
      .post('/media/upload')
      .set('Authorization', `Bearer ${accessToken}`)
      .attach('file', buffer, {
        filename: 'e2e-upload.png',
        contentType: 'image/png',
      })
      .expect(201);

    expect(response.body.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
    expect(response.body.url).toContain(`/media/${response.body.id}`);
    expect(response.body.contentType).toBe('image/png');
  });

  it('POST /media/upload without token returns 401', async () => {
    await request(app.getHttpServer()).post('/media/upload').expect(401);
  });
});

describe('E2E — CV export (local Supabase)', () => {
  let app: INestApplication;
  let accessToken: string;
  const fixture = loadFixture();
  const state = loadE2eAccountState();

  beforeAll(async () => {
    app = await createE2eApp();
    const login = await request(app.getHttpServer()).post('/auth/login').send(fixture.e2eUser);
    accessToken = login.body.access_token;
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /cv/export/templates returns template catalog', async () => {
    const response = await request(app.getHttpServer())
      .get('/cv/export/templates')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(Array.isArray(response.body.templates)).toBe(true);
    expect(response.body.templates.length).toBeGreaterThan(0);
    expect(response.body.templates[0]).toMatchObject({
      id: expect.any(String),
      label: expect.any(String),
    });
  });

  it('GET /cv/:id/export/html returns rendered HTML for seeded CV', async () => {
    const target = state.cvs[0];
    const response = await request(app.getHttpServer())
      .get(`/cv/${target.id}/export/html`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(response.headers['content-type']).toMatch(/text\/html/);
    expect(response.text).toContain('<');
    expect(response.text.length).toBeGreaterThan(100);
  });

  it('GET /cv/:id/export/json returns JSON Resume attachment for seeded CV', async () => {
    const target = state.cvs[0];
    const response = await request(app.getHttpServer())
      .get(`/cv/${target.id}/export/json`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(response.headers['content-type']).toMatch(/application\/json/);
    expect(response.headers['content-disposition']).toMatch(/attachment/);
    expect(response.headers['content-disposition']).toMatch(/filename="/);

    const body = JSON.parse(response.text) as { basics?: { name?: string } };
    expect(body.basics?.name).toBe('Alex Mercer');
  });
});

describe('E2E — CV template presentation (local Supabase)', () => {
  let app: INestApplication;
  let accessToken: string;
  const fixture = loadFixture();
  const state = loadE2eAccountState();

  beforeAll(async () => {
    app = await createE2eApp();
    const login = await request(app.getHttpServer()).post('/auth/login').send(fixture.e2eUser);
    accessToken = login.body.access_token;
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /cv/:id/template-presentation returns defaults for seeded CV', async () => {
    const target = state.cvs[0];
    const response = await request(app.getHttpServer())
      .get(`/cv/${target.id}/template-presentation`)
      .query({ template: 'classic' })
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(response.body.templateId).toBe('classic');
    expect(response.body.config).toEqual(
      expect.objectContaining({ sectionOrder: expect.any(Array) }),
    );
  });

  it('PATCH /cv/:id/template-presentation persists hidden sections', async () => {
    const created = await request(app.getHttpServer())
      .post('/cv')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ data: { basics: { name: 'Presentation Test' } } })
      .expect(201);

    const cvId = created.body.id;

    const patched = await request(app.getHttpServer())
      .patch(`/cv/${cvId}/template-presentation`)
      .query({ template: 'classic' })
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ config: { hiddenSections: ['interests'] } })
      .expect(200);

    expect(patched.body.config.hiddenSections).toContain('interests');

    const fetched = await request(app.getHttpServer())
      .get(`/cv/${cvId}/template-presentation`)
      .query({ template: 'classic' })
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(fetched.body.config.hiddenSections).toContain('interests');
  });
});

describe('E2E — CV lifecycle (local Supabase)', () => {
  let app: INestApplication;
  let accessToken: string;
  const fixture = loadFixture();

  beforeAll(async () => {
    app = await createE2eApp();
    const login = await request(app.getHttpServer()).post('/auth/login').send(fixture.e2eUser);
    accessToken = login.body.access_token;
  });

  afterAll(async () => {
    await app.close();
  });

  it('PATCH /cv/:id updates template and basics sections', async () => {
    const created = await request(app.getHttpServer())
      .post('/cv')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ data: { basics: { name: 'Lifecycle Test', label: 'Engineer' } } })
      .expect(201);

    const cvId = created.body.id;

    const patched = await request(app.getHttpServer())
      .patch(`/cv/${cvId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        templateId: 'classic',
        data: { basics: { name: 'Lifecycle Updated', label: 'Lead' } },
      })
      .expect(200);

    expect(patched.body.templateId).toBe('classic');
    expect(patched.body.data.basics?.name).toBe('Lifecycle Updated');

    await request(app.getHttpServer())
      .delete(`/cv/${cvId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
  });
});

describe('E2E — CV sections coverage (local Supabase)', () => {
  let app: INestApplication;
  let accessToken: string;
  const fixture = loadFixture();
  const state = loadE2eAccountState();

  beforeAll(async () => {
    app = await createE2eApp();
    const login = await request(app.getHttpServer()).post('/auth/login').send(fixture.e2eUser);
    accessToken = login.body.access_token;
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /cv/:id/basics returns basics for seeded CV', async () => {
    const target = state.cvs[0];
    const response = await request(app.getHttpServer())
      .get(`/cv/${target.id}/basics`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(response.body.name).toEqual(expect.any(String));
  });

  it('GET /cv/:id/education and /languages return arrays for seeded CV', async () => {
    const target = state.cvs[0];

    const education = await request(app.getHttpServer())
      .get(`/cv/${target.id}/education`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    const languages = await request(app.getHttpServer())
      .get(`/cv/${target.id}/languages`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(Array.isArray(education.body)).toBe(true);
    expect(Array.isArray(languages.body)).toBe(true);
  });

  it('creates and deletes a work entry by row id', async () => {
    const created = await request(app.getHttpServer())
      .post('/cv')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ data: { basics: { name: 'Work Delete Test' }, work: [] } })
      .expect(201);

    const cvId = created.body.id;

    const work = await request(app.getHttpServer())
      .post(`/cv/${cvId}/work`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ work: { name: 'Temp Co', position: 'Dev', startDate: '2024-01' } })
      .expect(201);

    const workId = work.body.item.id as string;

    await request(app.getHttpServer())
      .delete(`/cv/${cvId}/work/${workId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    const list = await request(app.getHttpServer())
      .get(`/cv/${cvId}/work`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(list.body).toHaveLength(0);
  });
});

describe('E2E — AI agent catalog (local Supabase)', () => {
  let app: INestApplication;
  let accessToken: string;
  const fixture = loadFixture();

  beforeAll(async () => {
    app = await createE2eApp();
    const login = await request(app.getHttpServer()).post('/auth/login').send(fixture.e2eUser);
    accessToken = login.body.access_token;
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /ai/agents/providers returns provider catalog', async () => {
    const response = await request(app.getHttpServer())
      .get('/ai/agents/providers')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBeGreaterThan(0);
  });

  it('GET /ai/agents/active returns unconfigured status for fresh fixture user', async () => {
    const response = await request(app.getHttpServer())
      .get('/ai/agents/active')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(response.body).toMatchObject({ configured: false });
  });
});

describe('E2E — import LLM config (local Supabase)', () => {
  let app: INestApplication;
  let accessToken: string;
  const fixture = loadFixture();

  beforeAll(async () => {
    app = await createE2eApp();
    const login = await request(app.getHttpServer()).post('/auth/login').send(fixture.e2eUser);
    accessToken = login.body.access_token;
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /import/llm/providers returns provider catalog', async () => {
    const response = await request(app.getHttpServer())
      .get('/import/llm/providers')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBeGreaterThan(0);
  });

  it('GET /import/llm/config returns not-configured for fresh fixture user', async () => {
    const response = await request(app.getHttpServer())
      .get('/import/llm/config')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(response.body.configured).toBe(false);
  });
});

describe('E2E — import URL validation (local Supabase)', () => {
  let app: INestApplication;
  let accessToken: string;
  const fixture = loadFixture();

  beforeAll(async () => {
    app = await createE2eApp();
    const login = await request(app.getHttpServer()).post('/auth/login').send(fixture.e2eUser);
    accessToken = login.body.access_token;
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /cv/import/from-url rejects invalid URLs', async () => {
    await request(app.getHttpServer())
      .post('/cv/import/from-url')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ url: 'not-a-url' })
      .expect(400);
  });

  it('POST /cv/import/from-url resolves registry profile URLs', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: { get: () => 'application/json' },
      json: jest.fn().mockResolvedValue({ basics: { name: 'Registry User' } }),
    }) as never;

    const response = await request(app.getHttpServer())
      .post('/cv/import/from-url')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ url: 'https://registry.jsonresume.org/thomasdavis' })
      .expect(200);

    expect(global.fetch).toHaveBeenCalledWith(
      'https://registry.jsonresume.org/thomasdavis.json',
      expect.any(Object),
    );
    expect(response.body.data).toMatchObject({ basics: { name: 'Registry User' } });
  });
});

describe('E2E — markdown import (local Supabase)', () => {
  let app: INestApplication;
  let accessToken: string;
  const fixture = loadFixture();

  beforeAll(async () => {
    app = await createE2eApp();
    const login = await request(app.getHttpServer()).post('/auth/login').send(fixture.e2eUser);
    accessToken = login.body.access_token;
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /cv/import/markdown rejects missing file', async () => {
    await request(app.getHttpServer())
      .post('/cv/import/markdown')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(400);
  });

  it('POST /cv/import/markdown rejects when LLM is not configured', async () => {
    await request(app.getHttpServer())
      .post('/cv/import/markdown')
      .set('Authorization', `Bearer ${accessToken}`)
      .attach('file', Buffer.from('# Jane Doe\nEngineer'), {
        filename: 'resume.md',
        contentType: 'text/markdown',
      })
      .expect(422);
  });
});
