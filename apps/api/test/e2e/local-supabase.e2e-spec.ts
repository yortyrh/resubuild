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
