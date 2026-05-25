import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { applyResumeMetaForUpdate, getResumeMetaVersion } from '@resumind/types';
import type { AuthenticatedRequest } from '../auth/supabase-auth.guard';
import { CvService } from './cv.service';
import type { CvItemMutationResponse } from './cv-item.types';

type ResumeData = Record<string, unknown>;

@Injectable()
export class CvItemService {
  constructor(
    private readonly cvService: CvService,
    private readonly configService: ConfigService,
  ) {}

  private appBaseUrl(): string {
    return (
      this.configService.get<string>('APP_URL') ??
      this.configService.get<string>('CORS_ORIGIN')?.split(',')[0] ??
      'http://localhost:3000'
    );
  }

  private parseIndex(index: string, label: string): number {
    const parsed = Number.parseInt(index, 10);
    if (!Number.isInteger(parsed) || parsed < 0) {
      throw new BadRequestException(`Invalid ${label} index`);
    }
    return parsed;
  }

  private assertVersion(
    clientVersion: string | undefined,
    currentVersion: string | undefined,
  ): void {
    if (clientVersion && currentVersion && clientVersion !== currentVersion) {
      throw new ConflictException('This CV was modified elsewhere. Reload the page and try again.');
    }
  }

  private ensureArray(data: ResumeData, key: string): unknown[] {
    const current = data[key];
    if (!Array.isArray(current)) {
      data[key] = [];
    }
    return data[key] as unknown[];
  }

  private ensureBasics(data: ResumeData): Record<string, unknown> {
    if (!data.basics || typeof data.basics !== 'object') {
      data.basics = {};
    }
    return data.basics as Record<string, unknown>;
  }

  private ensureProfiles(data: ResumeData): unknown[] {
    const basics = this.ensureBasics(data);
    if (!Array.isArray(basics.profiles)) {
      basics.profiles = [];
    }
    return basics.profiles as unknown[];
  }

  private getArrayItem<T extends Record<string, unknown>>(
    data: ResumeData,
    key: string,
    index: number,
    label: string,
  ): T {
    const array = this.ensureArray(data, key);
    if (index >= array.length) {
      throw new NotFoundException(`${label} not found`);
    }
    return array[index] as T;
  }

  private ensureStringArray(parent: Record<string, unknown>, key: string): string[] {
    if (!Array.isArray(parent[key])) {
      parent[key] = [];
    }
    return parent[key] as string[];
  }

  private async mutateCvData(
    user: AuthenticatedRequest['user'],
    cvId: string,
    clientVersion: string | undefined,
    mutator: (data: ResumeData) => Omit<CvItemMutationResponse, 'version'>,
  ): Promise<CvItemMutationResponse> {
    const existing = await this.cvService.findOne(user, cvId);
    const currentVersion = getResumeMetaVersion(existing.data);
    this.assertVersion(clientVersion, currentVersion);

    const draft = structuredClone(existing.data) as ResumeData;
    const result = mutator(draft);

    const dataWithMeta = applyResumeMetaForUpdate(draft, {
      cvId,
      baseUrl: this.appBaseUrl(),
      currentVersion: currentVersion ?? clientVersion,
    });

    const updated = await this.cvService.persistValidatedData(user, cvId, dataWithMeta);
    const version = getResumeMetaVersion(updated.data) ?? '';

    return { ...result, version };
  }

  updateBasics(
    user: AuthenticatedRequest['user'],
    cvId: string,
    basics: Record<string, unknown>,
    version?: string,
  ): Promise<CvItemMutationResponse> {
    return this.mutateCvData(user, cvId, version, (data) => {
      const current = this.ensureBasics(data);
      data.basics = { ...current, ...basics };
      return { item: data.basics };
    });
  }

  createProfile(
    user: AuthenticatedRequest['user'],
    cvId: string,
    profile: Record<string, unknown>,
    version?: string,
  ): Promise<CvItemMutationResponse> {
    return this.mutateCvData(user, cvId, version, (data) => {
      const profiles = this.ensureProfiles(data);
      profiles.push(profile);
      const index = profiles.length - 1;
      return { index, item: profiles[index] };
    });
  }

  updateProfile(
    user: AuthenticatedRequest['user'],
    cvId: string,
    indexStr: string,
    profile: Record<string, unknown>,
    version?: string,
  ): Promise<CvItemMutationResponse> {
    const index = this.parseIndex(indexStr, 'profile');
    return this.mutateCvData(user, cvId, version, (data) => {
      const profiles = this.ensureProfiles(data);
      if (index >= profiles.length) {
        throw new NotFoundException('Profile not found');
      }
      const current = profiles[index] as Record<string, unknown>;
      profiles[index] = { ...current, ...profile };
      return { index, item: profiles[index] };
    });
  }

  deleteProfile(
    user: AuthenticatedRequest['user'],
    cvId: string,
    indexStr: string,
    version?: string,
  ): Promise<CvItemMutationResponse> {
    const index = this.parseIndex(indexStr, 'profile');
    return this.mutateCvData(user, cvId, version, (data) => {
      const profiles = this.ensureProfiles(data);
      if (index >= profiles.length) {
        throw new NotFoundException('Profile not found');
      }
      profiles.splice(index, 1);
      return { index };
    });
  }

  createArrayItem(
    user: AuthenticatedRequest['user'],
    cvId: string,
    key: string,
    item: Record<string, unknown>,
    version?: string,
  ): Promise<CvItemMutationResponse> {
    return this.mutateCvData(user, cvId, version, (data) => {
      const array = this.ensureArray(data, key);
      array.push(item);
      const index = array.length - 1;
      return { index, item: array[index] };
    });
  }

  updateArrayItem(
    user: AuthenticatedRequest['user'],
    cvId: string,
    key: string,
    indexStr: string,
    item: Record<string, unknown>,
    label: string,
    version?: string,
  ): Promise<CvItemMutationResponse> {
    const index = this.parseIndex(indexStr, label);
    return this.mutateCvData(user, cvId, version, (data) => {
      const array = this.ensureArray(data, key);
      const current = this.getArrayItem<Record<string, unknown>>(data, key, index, label);
      array[index] = { ...current, ...item };
      return { index, item: array[index] };
    });
  }

  deleteArrayItem(
    user: AuthenticatedRequest['user'],
    cvId: string,
    key: string,
    indexStr: string,
    label: string,
    version?: string,
  ): Promise<CvItemMutationResponse> {
    const index = this.parseIndex(indexStr, label);
    return this.mutateCvData(user, cvId, version, (data) => {
      const array = this.ensureArray(data, key);
      if (index >= array.length) {
        throw new NotFoundException(`${label} not found`);
      }
      array.splice(index, 1);
      return { index };
    });
  }

  createNestedString(
    user: AuthenticatedRequest['user'],
    cvId: string,
    arrayKey: string,
    parentIndexStr: string,
    nestedKey: string,
    value: string,
    parentLabel: string,
    version?: string,
  ): Promise<CvItemMutationResponse> {
    const parentIndex = this.parseIndex(parentIndexStr, parentLabel);
    return this.mutateCvData(user, cvId, version, (data) => {
      const parent = this.getArrayItem<Record<string, unknown>>(
        data,
        arrayKey,
        parentIndex,
        parentLabel,
      );
      const nested = this.ensureStringArray(parent, nestedKey);
      nested.push(value);
      const childIndex = nested.length - 1;
      return { parentIndex, childIndex, value: nested[childIndex], item: parent };
    });
  }

  updateNestedString(
    user: AuthenticatedRequest['user'],
    cvId: string,
    arrayKey: string,
    parentIndexStr: string,
    nestedKey: string,
    childIndexStr: string,
    value: string,
    parentLabel: string,
    version?: string,
  ): Promise<CvItemMutationResponse> {
    const parentIndex = this.parseIndex(parentIndexStr, parentLabel);
    const childIndex = this.parseIndex(childIndexStr, 'item');
    return this.mutateCvData(user, cvId, version, (data) => {
      const parent = this.getArrayItem<Record<string, unknown>>(
        data,
        arrayKey,
        parentIndex,
        parentLabel,
      );
      const nested = this.ensureStringArray(parent, nestedKey);
      if (childIndex >= nested.length) {
        throw new NotFoundException('Item not found');
      }
      nested[childIndex] = value;
      return { parentIndex, childIndex, value, item: parent };
    });
  }

  deleteNestedString(
    user: AuthenticatedRequest['user'],
    cvId: string,
    arrayKey: string,
    parentIndexStr: string,
    nestedKey: string,
    childIndexStr: string,
    parentLabel: string,
    version?: string,
  ): Promise<CvItemMutationResponse> {
    const parentIndex = this.parseIndex(parentIndexStr, parentLabel);
    const childIndex = this.parseIndex(childIndexStr, 'item');
    return this.mutateCvData(user, cvId, version, (data) => {
      const parent = this.getArrayItem<Record<string, unknown>>(
        data,
        arrayKey,
        parentIndex,
        parentLabel,
      );
      const nested = this.ensureStringArray(parent, nestedKey);
      if (childIndex >= nested.length) {
        throw new NotFoundException('Item not found');
      }
      nested.splice(childIndex, 1);
      return { parentIndex, childIndex, item: parent };
    });
  }
}
