import type { ApplicationService } from '../../application/application.service';
import type { CvService } from '../../cv/cv.service';
import type { MediaService } from '../../media/media.service';
import { ApplicationResourceHandler } from './application-resource.handler';
import { CvResourceHandler } from './cv-resource.handler';
import { MediaResourceHandler } from './media-resource.handler';

const mockUser = { id: 'user-1', accessToken: 'tok', authMethod: 'jwt' as const };

// Mock the entire module
jest.mock('../mcp-auth.context', () => ({
  getMcpAuthUser: jest.fn(() => mockUser),
}));

import { getMcpAuthUser } from '../mcp-auth.context';

describe('Resource Handlers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getMcpAuthUser as jest.Mock).mockReturnValue(mockUser);
  });

  describe('CvResourceHandler', () => {
    let mockCvService: { findAll: jest.Mock; findOne: jest.Mock };

    beforeEach(() => {
      mockCvService = {
        findAll: jest.fn(),
        findOne: jest.fn(),
      };
    });

    it('list returns CV resources with correct structure', async () => {
      const cvs = [
        { id: 'cv-1', title: 'Software Engineer', basics: { name: 'Alice' } },
        { id: 'cv-2', title: 'Product Manager', basics: { name: 'Bob' } },
      ];
      mockCvService.findAll.mockResolvedValue(cvs as never);

      const handler = new CvResourceHandler(mockCvService as unknown as CvService);
      const result = await handler.list();

      expect(result.resources).toHaveLength(2);
      expect(result.resources[0]).toEqual({
        uri: 'resumind://cv-1/cv',
        name: 'Software Engineer',
        description: 'CV: Software Engineer',
        mimeType: 'application/json',
      });
    });

    it('read returns CV resource by URI', async () => {
      const cv = { id: 'cv-1', title: 'Engineer' };
      mockCvService.findOne.mockResolvedValue(cv as never);

      const handler = new CvResourceHandler(mockCvService as unknown as CvService);
      // Use triple slash to make cv-1 a path segment, not hostname
      const uri = new URL('resumind:///cv-1/cv');
      const result = await handler.read(uri);

      expect(mockCvService.findOne).toHaveBeenCalledWith(mockUser, 'cv-1');
      expect(result.uri).toBe('resumind:///cv-1/cv');
      expect(result.mimeType).toBe('application/json');
    });
  });

  describe('ApplicationResourceHandler', () => {
    let mockAppService: { findAll: jest.Mock; findOne: jest.Mock };

    beforeEach(() => {
      mockAppService = {
        findAll: jest.fn(),
        findOne: jest.fn(),
      };
    });

    it('list returns application resources with job title and company', async () => {
      const apps = [
        { id: 'app-1', jobTitle: 'Engineer', jobCompany: 'Acme' },
        { id: 'app-2', jobTitle: 'Designer', jobCompany: 'Beta' },
      ];
      mockAppService.findAll.mockResolvedValue(apps as never);

      const handler = new ApplicationResourceHandler(
        mockAppService as unknown as ApplicationService,
      );
      const result = await handler.list();

      expect(result.resources).toHaveLength(2);
      expect(result.resources[0]).toEqual({
        uri: 'resumind://app-1/application',
        name: 'Engineer @ Acme',
        description: 'Application: Engineer',
        mimeType: 'application/json',
      });
    });

    it('read returns application by URI', async () => {
      const app = { id: 'app-1', jobTitle: 'Engineer' };
      mockAppService.findOne.mockResolvedValue(app as never);

      const handler = new ApplicationResourceHandler(
        mockAppService as unknown as ApplicationService,
      );
      const uri = new URL('resumind:///app-1/application');
      const result = await handler.read(uri);

      expect(mockAppService.findOne).toHaveBeenCalledWith(mockUser, 'app-1');
      expect(result.uri).toBe('resumind:///app-1/application');
    });
  });

  describe('MediaResourceHandler', () => {
    let mockMediaService: { listMediaForUser: jest.Mock; getMediaMeta: jest.Mock };

    beforeEach(() => {
      mockMediaService = {
        listMediaForUser: jest.fn(),
        getMediaMeta: jest.fn(),
      };
    });

    it('list returns media resources with contentType as description', async () => {
      const mediaItems = [
        { id: 'media-1', contentType: 'image/png' },
        { id: 'media-2', contentType: 'application/pdf' },
      ];
      mockMediaService.listMediaForUser.mockResolvedValue(mediaItems as never);

      const handler = new MediaResourceHandler(mockMediaService as unknown as MediaService);
      const result = await handler.list();

      expect(result.resources).toHaveLength(2);
      expect(result.resources[0]).toEqual({
        uri: 'resumind://media-1/media',
        name: 'media-1',
        description: 'Media: image/png',
        mimeType: 'image/png',
      });
      expect(result.resources[1]).toEqual({
        uri: 'resumind://media-2/media',
        name: 'media-2',
        description: 'Media: application/pdf',
        mimeType: 'application/pdf',
      });
    });

    it('read returns media metadata by URI', async () => {
      const meta = { id: 'media-1', contentType: 'image/png', crop: null, hasCropped: false };
      mockMediaService.getMediaMeta.mockResolvedValue(meta as never);

      const handler = new MediaResourceHandler(mockMediaService as unknown as MediaService);
      const uri = new URL('resumind:///media-1/media');
      const result = await handler.read(uri);

      expect(mockMediaService.getMediaMeta).toHaveBeenCalledWith(mockUser.id, 'media-1');
      expect(result.uri).toBe('resumind:///media-1/media');
    });
  });
});
