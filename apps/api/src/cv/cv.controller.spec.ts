/**
 * Mirrors openspec CV REST API — guard applies to handlers; controller forwards to CvService.
 */

import type { AuthenticatedRequest } from '../auth/supabase-auth.guard';
import { CvController } from './cv.controller';
import type { CvRecord } from './cv.service';

describe('CvController', () => {
  let controller: CvController;
  let service: jest.Mocked<{
    findAll: jest.Mock;
    findOne: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    remove: jest.Mock;
  }>;

  const userCtx: AuthenticatedRequest['user'] = {
    id: 'u42',
    email: 'hitme@test.dev',
    accessToken: 'tok',
  };
  const req = { user: userCtx } as AuthenticatedRequest;

  beforeEach(() => {
    service = {
      findAll: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };
    controller = new CvController(service as never);
  });

  const sample: CvRecord = {
    id: 'cv-1',
    user_id: 'u42',
    title: 'Doc',
    templateId: 'mit-classic',
    data: {},
    created_at: 'c',
    updated_at: 'c',
  };

  it('findAll proxies AuthenticatedRequest through CvService.findAll', async () => {
    service.findAll.mockResolvedValue([sample]);
    await expect(controller.findAll(req)).resolves.toEqual([sample]);
    expect(service.findAll).toHaveBeenCalledWith(userCtx);
  });

  it('POST create forwards request user + dto', async () => {
    const dto = { title: 'N', data: { basics: {} } };
    service.create.mockResolvedValue(sample);

    await expect(controller.create(req, dto)).resolves.toEqual(sample);
    expect(service.create).toHaveBeenCalledWith(userCtx, dto);
  });

  it('PATCH update relays id fragments', async () => {
    const dto = { title: 'rename' };
    service.update.mockResolvedValue({ ...sample, title: 'rename' });

    await expect(controller.update(req, sample.id, dto)).resolves.toMatchObject({
      id: sample.id,
      title: 'rename',
    });
    expect(service.update).toHaveBeenCalledWith(userCtx, sample.id, dto);
  });

  it('DELETE remove delegates CvService removal', async () => {
    service.remove.mockResolvedValue(undefined);
    await expect(controller.remove(req, sample.id)).resolves.toBeUndefined();
    expect(service.remove).toHaveBeenCalledWith(userCtx, sample.id);
  });

  it('GET :id relays identifier string', async () => {
    service.findOne.mockResolvedValue(sample);
    await expect(controller.findOne(req, sample.id)).resolves.toEqual(sample);
    expect(service.findOne).toHaveBeenCalledWith(userCtx, sample.id);
  });
});
