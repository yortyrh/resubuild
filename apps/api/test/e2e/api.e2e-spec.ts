import { readFileSync } from 'node:fs';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { signIn, tokenFromEmail, WEB_ORIGIN, waitForEmail } from './auth-helpers';
import { createE2eApp } from './create-e2e-app';
import { loadE2eAccountState, loadFixture, samplesPath } from './fixture';

describe('E2E — auth', () => {
  let app: INestApplication;
  const fixture = loadFixture();
  const state = loadE2eAccountState();
  const server = () => app.getHttpServer();
  const auth = (path: string) =>
    request(server()).post(`/api/auth${path}`).set('Origin', WEB_ORIGIN);

  beforeAll(async () => {
    app = await createE2eApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /api/auth/sign-in/email returns a bearer token for the seeded user', async () => {
    const response = await auth('/sign-in/email').send(fixture.e2eUser).expect(200);

    expect(response.headers['set-auth-token']).toEqual(expect.any(String));
    expect(response.body.user.id).toBe(state.user.id);
    expect(response.body.user.email).toBe(fixture.e2eUser.email);
  });

  it('rejects a wrong password', async () => {
    await auth('/sign-in/email')
      .send({ email: fixture.e2eUser.email, password: 'definitely-wrong' })
      .expect(401);
  });

  it('GET /auth/me returns the authenticated user', async () => {
    const token = await signIn(app, fixture.e2eUser);

    const response = await request(server())
      .get('/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(response.body.user.id).toBe(state.user.id);
    expect(response.body.user.email).toBe(fixture.e2eUser.email);
    expect(response.body.has_password).toBe(true);
  });

  it('GET /auth/me without or with an unknown token returns 401', async () => {
    await request(server()).get('/auth/me').expect(401);
    await request(server()).get('/auth/me').set('Authorization', 'Bearer nope').expect(401);
  });

  it('POST /auth/logout revokes the session', async () => {
    const token = await signIn(app, fixture.e2eUser);
    await request(server())
      .post('/auth/logout')
      .set('Authorization', `Bearer ${token}`)
      .expect(204);
    await request(server()).get('/auth/me').set('Authorization', `Bearer ${token}`).expect(401);
  });

  it('registers, emails a verification link and signs in once verified', async () => {
    const email = `signup-${Date.now()}@e2e.local`;
    const password = 'signup-password';

    const signUp = await auth('/sign-up/email')
      .send({ email, password, name: 'Signup' })
      .expect(200);
    expect(signUp.body.token).toBeNull();
    await auth('/sign-in/email').send({ email, password }).expect(403);

    const mail = await waitForEmail(email, /Confirm your email/);
    const token = tokenFromEmail(mail.text, '/auth/verify');

    const verified = await request(server())
      .get(`/api/auth/verify-email?token=${encodeURIComponent(token)}`)
      .set('Origin', WEB_ORIGIN)
      .expect(200);
    expect(verified.headers['set-auth-token']).toEqual(expect.any(String));
    await expect(signIn(app, { email, password })).resolves.toEqual(expect.any(String));
  });

  it('resets a forgotten password through the emailed link', async () => {
    const email = `reset-${Date.now()}@e2e.local`;
    await auth('/sign-up/email').send({ email, password: 'old-password', name: 'Reset' });

    await auth('/request-password-reset').send({ email }).expect(200);
    const mail = await waitForEmail(email, /Reset your Resubuild password/);
    const token = tokenFromEmail(mail.text, '/reset-password');

    await auth('/reset-password').send({ token, newPassword: 'new-password' }).expect(200);
    await waitForEmail(email, /password was changed/);
    await auth('/sign-in/email')
      .send({ email, password: 'old-password' })
      .expect((res) => {
        expect([401, 403]).toContain(res.status);
      });
  });

  it('signs in with an emailed magic link and with an emailed one-time code', async () => {
    const email = fixture.e2eUser.email;

    await auth('/sign-in/magic-link').send({ email }).expect(200);
    const link = await waitForEmail(email, /sign-in link/);
    const magic = await request(server())
      .get(
        `/api/auth/magic-link/verify?token=${encodeURIComponent(tokenFromEmail(link.text, '/auth/magic'))}`,
      )
      .set('Origin', WEB_ORIGIN)
      .expect(200);
    expect(magic.headers['set-auth-token']).toEqual(expect.any(String));

    await auth('/email-otp/send-verification-otp').send({ email, type: 'sign-in' }).expect(200);
    const codeMail = await waitForEmail(email, /is your Resubuild code/);
    const otp = codeMail.subject.slice(0, 6);
    const otpSignIn = await auth('/sign-in/email-otp').send({ email, otp }).expect(200);
    expect(otpSignIn.headers['set-auth-token']).toEqual(expect.any(String));
  });

  it('isolates users: another account cannot read, change or delete the fixture CVs', async () => {
    const email = `intruder-${Date.now()}@e2e.local`;
    await auth('/sign-up/email').send({ email, password: 'intruder-pw', name: 'Intruder' });
    const verifyMail = await waitForEmail(email, /Confirm your email/);
    await request(server())
      .get(
        `/api/auth/verify-email?token=${encodeURIComponent(tokenFromEmail(verifyMail.text, '/auth/verify'))}`,
      )
      .set('Origin', WEB_ORIGIN);
    const intruder = await signIn(app, { email, password: 'intruder-pw' });
    const victimCv = state.cvs[0].id;
    const bearer = `Bearer ${intruder}`;

    const list = await request(server()).get('/cv').set('Authorization', bearer).expect(200);
    expect(list.body).toEqual([]);
    await request(server()).get(`/cv/${victimCv}`).set('Authorization', bearer).expect(404);
    await request(server())
      .patch(`/cv/${victimCv}`)
      .set('Authorization', bearer)
      .send({ data: { basics: { name: 'Hacked' } } })
      .expect(404);
    await request(server()).delete(`/cv/${victimCv}`).set('Authorization', bearer).expect(404);

    const owner = await signIn(app, fixture.e2eUser);
    const stillThere = await request(server())
      .get(`/cv/${victimCv}`)
      .set('Authorization', `Bearer ${owner}`)
      .expect(200);
    expect(stillThere.body.title).not.toBe('Hacked');
  });
});

describe('E2E — CV REST', () => {
  let app: INestApplication;
  let accessToken: string;
  const fixture = loadFixture();
  const state = loadE2eAccountState();

  beforeAll(async () => {
    app = await createE2eApp();
    accessToken = await signIn(app, fixture.e2eUser);
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
        work: { name: 'Older Co', position: 'Engineer', startDate: '2018-01', endDate: '2020-01' },
      })
      .expect(201);
    const olderId = older.body.item.id as string;

    await request(app.getHttpServer())
      .post(`/cv/${cvId}/work`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        work: { name: 'Newer Co', position: 'Lead', startDate: '2022-01' },
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

describe('E2E — media service', () => {
  let app: INestApplication;
  let accessToken: string;
  const fixture = loadFixture();
  const state = loadE2eAccountState();

  beforeAll(async () => {
    app = await createE2eApp();
    accessToken = await signIn(app, fixture.e2eUser);
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

describe('E2E — CV export', () => {
  let app: INestApplication;
  let accessToken: string;
  const fixture = loadFixture();
  const state = loadE2eAccountState();

  beforeAll(async () => {
    app = await createE2eApp();
    accessToken = await signIn(app, fixture.e2eUser);
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

describe('E2E — CV template presentation', () => {
  let app: INestApplication;
  let accessToken: string;
  const fixture = loadFixture();
  const state = loadE2eAccountState();

  beforeAll(async () => {
    app = await createE2eApp();
    accessToken = await signIn(app, fixture.e2eUser);
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

describe('E2E — CV lifecycle', () => {
  let app: INestApplication;
  let accessToken: string;
  const fixture = loadFixture();

  beforeAll(async () => {
    app = await createE2eApp();
    accessToken = await signIn(app, fixture.e2eUser);
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

describe('E2E — CV sections coverage', () => {
  let app: INestApplication;
  let accessToken: string;
  const fixture = loadFixture();
  const state = loadE2eAccountState();

  beforeAll(async () => {
    app = await createE2eApp();
    accessToken = await signIn(app, fixture.e2eUser);
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

describe('E2E — AI agent catalog', () => {
  let app: INestApplication;
  let accessToken: string;
  const fixture = loadFixture();

  beforeAll(async () => {
    app = await createE2eApp();
    accessToken = await signIn(app, fixture.e2eUser);
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

  it('stores model options, names accounts and needs a label for a duplicate model', async () => {
    const auth = `Bearer ${accessToken}`;
    const server = app.getHttpServer();

    const providers = await request(server).get('/ai/agents/providers').set('Authorization', auth);
    const openai = providers.body.find((provider: { id: string }) => provider.id === 'openai');
    expect(openai.modelOptions.map((field: { key: string }) => field.key)).toContain(
      'reasoningEffort',
    );

    const created = await request(server)
      .post('/ai/agents/accounts')
      .set('Authorization', auth)
      .send({
        modelId: 'openai/gpt-5',
        apiKey: 'sk-e2e',
        modelOptions: { reasoningEffort: 'high' },
      })
      .expect(201);
    expect(created.body).toMatchObject({
      label: null,
      modelOptions: { reasoningEffort: 'high' },
      displayName: 'OpenAI · GPT-5',
    });

    try {
      await request(server)
        .post('/ai/agents/accounts')
        .set('Authorization', auth)
        .send({ modelId: 'openai/gpt-5', apiKey: 'sk-e2e' })
        .expect(409);

      await request(server)
        .post('/ai/agents/accounts')
        .set('Authorization', auth)
        .send({ modelId: 'openai/gpt-5', apiKey: 'sk-e2e', modelOptions: { effort: 'max' } })
        .expect(400);

      const active = await request(server)
        .get('/ai/agents/active')
        .set('Authorization', auth)
        .expect(200);
      expect(active.body).toMatchObject({ configured: true, displayName: 'OpenAI · GPT-5' });
    } finally {
      await request(server)
        .delete(`/ai/agents/accounts/${created.body.id}`)
        .set('Authorization', auth)
        .expect(200);
    }
  });
});

describe('E2E — included AI (app-funded models)', () => {
  let app: INestApplication;
  let accessToken: string;
  const fixture = loadFixture();
  const env = {
    AI_INCLUDED_MODELS: JSON.stringify([
      {
        id: 'e2e-openai',
        model: 'openai/gpt-5-mini',
        apiKey: 'sk-e2e-included',
        monthlyTokenLimit: 1_000_000,
        options: { reasoningEffort: 'low' },
      },
    ]),
    AI_INCLUDED_USER_MONTHLY_TOKEN_LIMIT: '1000',
  };

  beforeAll(async () => {
    Object.assign(process.env, env);
    app = await createE2eApp();
    accessToken = await signIn(app, fixture.e2eUser);
  });

  afterAll(async () => {
    await app.close();
    for (const key of Object.keys(env)) delete process.env[key];
  });

  it('serves users without their own key from the included models, up to their allowance', async () => {
    const auth = `Bearer ${accessToken}`;
    const server = app.getHttpServer();

    const included = await request(server)
      .get('/ai/agents/included')
      .set('Authorization', auth)
      .expect(200);
    expect(included.body).toMatchObject({
      enabled: true,
      available: true,
      usage: { limit: 1000 },
      models: [{ providerId: 'openai', providerDisplayName: 'OpenAI' }],
    });

    const active = await request(server).get('/ai/agents/active').set('Authorization', auth);
    expect(active.body).toMatchObject({
      configured: true,
      source: 'included',
      displayName: 'Resubuild included AI',
    });

    await request(server)
      .put('/ai/agents/active')
      .set('Authorization', auth)
      .send({ source: 'included' })
      .expect(200);

    // Use up the allowance, then a new AI job is refused with 429.
    const { AiUsageRepository } =
      require('../../src/ai-hosted/ai-usage.repository') as typeof import('../../src/ai-hosted/ai-usage.repository');
    const { usagePeriod } =
      require('../../src/ai-hosted/usage-period') as typeof import('../../src/ai-hosted/usage-period');
    const me = await request(server).get('/auth/me').set('Authorization', auth).expect(200);
    await app
      .get(AiUsageRepository)
      .record(
        { inputTokens: 900, outputTokens: 100, totalTokens: 1000 },
        { pool: 'included', entryId: 'e2e-openai', period: usagePeriod(), userId: me.body.user.id },
      );

    const refused = await request(server)
      .post('/cv/import/markdown')
      .set('Authorization', auth)
      .attach('file', Buffer.from('# Jane Doe\n\nEngineer'), {
        filename: 'cv.md',
        contentType: 'text/markdown',
      })
      .expect(429);
    expect(refused.body).toMatchObject({ code: 'AI_INCLUDED_QUOTA_EXCEEDED' });

    const exhausted = await request(server).get('/ai/agents/active').set('Authorization', auth);
    expect(exhausted.body).toMatchObject({ configured: false, exhausted: true });
  });
});

describe('E2E — free import wizard (guest)', () => {
  let app: INestApplication;
  const env = {
    AI_GUEST_MODELS: JSON.stringify([
      {
        id: 'e2e-guest',
        model: 'openai/gpt-5-mini',
        apiKey: 'sk-e2e-guest',
        monthlyTokenLimit: 1000,
      },
    ]),
  };

  beforeAll(async () => {
    Object.assign(process.env, env);
    app = await createE2eApp();
  });

  afterAll(async () => {
    await app.close();
    for (const key of Object.keys(env)) delete process.env[key];
  });

  it('is open without a session while the guest models have budget, then switches off', async () => {
    const server = app.getHttpServer();

    await request(server).get('/public/import/status').expect(200, { enabled: true });

    await request(server)
      .post('/public/import/file')
      .attach('file', Buffer.from('PK'), { filename: 'cv.zip', contentType: 'application/zip' })
      .expect(400);

    await request(server)
      .get('/public/import/jobs/00000000-0000-0000-0000-000000000000')
      .set('x-guest-import-token', 'not-a-token')
      .expect(404);

    const { AiUsageRepository } =
      require('../../src/ai-hosted/ai-usage.repository') as typeof import('../../src/ai-hosted/ai-usage.repository');
    const { usagePeriod } =
      require('../../src/ai-hosted/usage-period') as typeof import('../../src/ai-hosted/usage-period');
    await app
      .get(AiUsageRepository)
      .record(
        { inputTokens: 900, outputTokens: 100, totalTokens: 1000 },
        { pool: 'guest', entryId: 'e2e-guest', period: usagePeriod() },
      );

    // The pool caches usage briefly; a fresh app reads the spent budget.
    await app.close();
    app = await createE2eApp();
    const closed = app.getHttpServer();
    await request(closed).get('/public/import/status').expect(200, { enabled: false });
    const refused = await request(closed)
      .post('/public/import/file')
      .attach('file', Buffer.from('# Jane'), { filename: 'cv.md', contentType: 'text/markdown' })
      .expect(503);
    expect(refused.body).toMatchObject({ code: 'GUEST_IMPORT_UNAVAILABLE' });
  });

  it('stays closed when no guest models are configured', async () => {
    delete process.env.AI_GUEST_MODELS;
    const plain = await createE2eApp();
    try {
      await request(plain.getHttpServer()).get('/public/import/status').expect(200, {
        enabled: false,
      });
    } finally {
      await plain.close();
      Object.assign(process.env, env);
    }
  });
});

describe('E2E — import LLM config', () => {
  let app: INestApplication;
  let accessToken: string;
  const fixture = loadFixture();

  beforeAll(async () => {
    app = await createE2eApp();
    accessToken = await signIn(app, fixture.e2eUser);
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

describe('E2E — import URL validation', () => {
  let app: INestApplication;
  let accessToken: string;
  const originalFetch = global.fetch;
  const fixture = loadFixture();

  beforeAll(async () => {
    app = await createE2eApp();
    accessToken = await signIn(app, fixture.e2eUser);
  });

  afterAll(async () => {
    global.fetch = originalFetch;
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
    const responseBody = { basics: { name: 'Registry User' } };
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: { get: () => 'application/json' },
      json: jest.fn().mockResolvedValue(responseBody),
      text: jest.fn().mockResolvedValue(JSON.stringify(responseBody)),
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

describe('E2E — markdown import', () => {
  let app: INestApplication;
  let accessToken: string;
  const fixture = loadFixture();

  beforeAll(async () => {
    app = await createE2eApp();
    accessToken = await signIn(app, fixture.e2eUser);
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

describe('E2E — MCP transport gate', () => {
  let app: INestApplication;
  let accessToken: string;
  const fixture = loadFixture();

  beforeAll(async () => {
    app = await createE2eApp();
    accessToken = await signIn(app, fixture.e2eUser);
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /mcp without an API key returns 401 (wrapper guard rejects first)', async () => {
    await request(app.getHttpServer())
      .post('/mcp')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2025-03-26',
          capabilities: {},
          clientInfo: { name: 'e2e', version: '0.0.0' },
        },
      })
      .expect(401);
  });

  it('GET /settings/mcp still resolves when MCP transport is enabled', async () => {
    await request(app.getHttpServer())
      .get('/settings/mcp')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
  });
});

describe('E2E — MCP transport disabled', () => {
  let app: INestApplication;
  let accessToken: string;
  const fixture = loadFixture();
  const previousEnabled = process.env.MCP_SERVER_ENABLED;

  beforeAll(async () => {
    process.env.MCP_SERVER_ENABLED = 'false';
    jest.resetModules();
    app = await createE2eApp();
    accessToken = await signIn(app, fixture.e2eUser);
  });

  afterAll(async () => {
    await app.close();
    if (previousEnabled === undefined) {
      delete process.env.MCP_SERVER_ENABLED;
    } else {
      process.env.MCP_SERVER_ENABLED = previousEnabled;
    }
    jest.resetModules();
  });

  it('POST /mcp returns 404 when MCP_SERVER_ENABLED=false (no controller is mounted)', async () => {
    await request(app.getHttpServer())
      .post('/mcp')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ jsonrpc: '2.0', id: 1, method: 'ping' })
      .expect(404);
  });

  it('POST /mcp/ also returns 404 when MCP_SERVER_ENABLED=false', async () => {
    await request(app.getHttpServer())
      .post('/mcp/')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ jsonrpc: '2.0', id: 1, method: 'ping' })
      .expect(404);
  });

  it('GET /settings/mcp remains live when MCP_SERVER_ENABLED=false (REST key management is decoupled)', async () => {
    await request(app.getHttpServer())
      .get('/settings/mcp')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
  });
});
