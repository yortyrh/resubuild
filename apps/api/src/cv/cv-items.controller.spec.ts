import type { CvItemService } from './cv-item.service';
import { CvItemsController } from './cv-items.controller';

type ControllerHandler = (...args: unknown[]) => unknown;

describe('CvItemsController', () => {
  let controller: CvItemsController;
  let service: jest.Mocked<CvItemService>;

  const user = { id: 'user-1', email: 'u@test.com', accessToken: 'token' };
  const req = { user } as never;
  const cvId = 'cv-1';
  const version = 'v1.0.0';
  const versionDto = { version };
  const resolved = { version: 'v1.0.1' };
  const itemId = '00000000-0000-4000-8000-000000000001';

  beforeEach(() => {
    service = {
      updateBasics: jest.fn().mockResolvedValue(resolved),
      createProfile: jest.fn().mockResolvedValue(resolved),
      updateProfile: jest.fn().mockResolvedValue(resolved),
      deleteProfile: jest.fn().mockResolvedValue(resolved),
      createArrayItem: jest.fn().mockResolvedValue(resolved),
      updateArrayItem: jest.fn().mockResolvedValue(resolved),
      deleteArrayItem: jest.fn().mockResolvedValue(resolved),
      getSection: jest.fn().mockResolvedValue([]),
      getBasics: jest.fn().mockResolvedValue({ name: 'Jane' }),
      reorderSection: jest.fn().mockResolvedValue({ items: [], version: 'v1.0.1' }),
    } as never;

    controller = new CvItemsController(service);
  });

  it('delegates basics patch to service', async () => {
    await controller.updateBasics(req, cvId, { basics: { name: 'Jane' }, version });

    expect(service.updateBasics).toHaveBeenCalledWith(user, cvId, { name: 'Jane' }, version);

    await controller.updateBasics(req, cvId, { version });
    expect(service.updateBasics).toHaveBeenCalledWith(user, cvId, {}, version);
  });

  it('delegates profile CRUD to service', async () => {
    await controller.createProfile(req, cvId, { profile: { network: 'GitHub' }, version });
    expect(service.createProfile).toHaveBeenCalledWith(user, cvId, { network: 'GitHub' }, version);

    await controller.updateProfile(req, cvId, itemId, { profile: { username: 'jane' }, version });
    expect(service.updateProfile).toHaveBeenCalledWith(
      user,
      cvId,
      itemId,
      { username: 'jane' },
      version,
    );

    await controller.deleteProfile(req, cvId, itemId, versionDto);
    expect(service.deleteProfile).toHaveBeenCalledWith(user, cvId, itemId, version);
  });

  it.each([
    {
      key: 'work',
      label: 'Work entry',
      itemKey: 'work',
      create: 'createWork',
      update: 'updateWork',
      delete: 'deleteWork',
    },
    {
      key: 'volunteer',
      label: 'Volunteer entry',
      itemKey: 'volunteer',
      create: 'createVolunteer',
      update: 'updateVolunteer',
      delete: 'deleteVolunteer',
    },
    {
      key: 'education',
      label: 'Education entry',
      itemKey: 'education',
      create: 'createEducation',
      update: 'updateEducation',
      delete: 'deleteEducation',
    },
    {
      key: 'skills',
      label: 'Skill',
      itemKey: 'skill',
      create: 'createSkill',
      update: 'updateSkill',
      delete: 'deleteSkill',
    },
    {
      key: 'projects',
      label: 'Project',
      itemKey: 'project',
      create: 'createProject',
      update: 'updateProject',
      delete: 'deleteProject',
    },
    {
      key: 'awards',
      label: 'Award',
      itemKey: 'award',
      create: 'createAward',
      update: 'updateAward',
      delete: 'deleteAward',
    },
    {
      key: 'certificates',
      label: 'Certificate',
      itemKey: 'certificate',
      create: 'createCertificate',
      update: 'updateCertificate',
      delete: 'deleteCertificate',
    },
    {
      key: 'publications',
      label: 'Publication',
      itemKey: 'publication',
      create: 'createPublication',
      update: 'updatePublication',
      delete: 'deletePublication',
    },
    {
      key: 'languages',
      label: 'Language',
      itemKey: 'language',
      create: 'createLanguage',
      update: 'updateLanguage',
      delete: 'deleteLanguage',
    },
    {
      key: 'interests',
      label: 'Interest',
      itemKey: 'interest',
      create: 'createInterest',
      update: 'updateInterest',
      delete: 'deleteInterest',
    },
    {
      key: 'references',
      label: 'Reference',
      itemKey: 'reference',
      create: 'createReference',
      update: 'updateReference',
      delete: 'deleteReference',
    },
  ] as const)(
    'delegates $key array CRUD to service',
    async ({ key, label, itemKey, create, update, delete: del }) => {
      const item = { name: 'Sample' };
      const dto = { [itemKey]: item, version } as never;

      await (controller[create as keyof CvItemsController] as ControllerHandler)(req, cvId, dto);
      expect(service.createArrayItem).toHaveBeenCalledWith(user, cvId, key, item, version);

      await (controller[update as keyof CvItemsController] as ControllerHandler)(
        req,
        cvId,
        itemId,
        dto,
      );
      expect(service.updateArrayItem).toHaveBeenCalledWith(
        user,
        cvId,
        key,
        itemId,
        item,
        label,
        version,
      );

      await (controller[del as keyof CvItemsController] as ControllerHandler)(
        req,
        cvId,
        itemId,
        versionDto,
      );
      expect(service.deleteArrayItem).toHaveBeenCalledWith(user, cvId, key, itemId, label, version);
    },
  );

  it('delegates section GET routes to service', async () => {
    await controller.getBasics(req, cvId);
    expect(service.getBasics).toHaveBeenCalledWith(user, cvId);

    await controller.getWork(req, cvId);
    expect(service.getSection).toHaveBeenCalledWith(user, cvId, 'work');

    await controller.getSkills(req, cvId);
    expect(service.getSection).toHaveBeenCalledWith(user, cvId, 'skills');
  });

  it('delegates reorder routes to service', async () => {
    const order = ['id-1', 'id-2'];
    await controller.reorderSkills(req, cvId, { order, version });
    expect(service.reorderSection).toHaveBeenCalledWith(user, cvId, 'skills', order, version);
  });
});
