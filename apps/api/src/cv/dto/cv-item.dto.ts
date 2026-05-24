import { IsArray, IsObject, IsOptional, IsString, MinLength } from 'class-validator';

export class VersionedDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  version?: string;
}

export class BasicsItemDto extends VersionedDto {
  @IsOptional()
  @IsObject()
  basics?: Record<string, unknown>;
}

export class ProfileItemDto extends VersionedDto {
  @IsObject()
  profile!: Record<string, unknown>;
}

export class WorkItemDto extends VersionedDto {
  @IsObject()
  work!: Record<string, unknown>;
}

export class VolunteerItemDto extends VersionedDto {
  @IsObject()
  volunteer!: Record<string, unknown>;
}

export class EducationItemDto extends VersionedDto {
  @IsObject()
  education!: Record<string, unknown>;
}

export class SkillItemDto extends VersionedDto {
  @IsObject()
  skill!: Record<string, unknown>;
}

export class ProjectItemDto extends VersionedDto {
  @IsObject()
  project!: Record<string, unknown>;
}

export class AwardItemDto extends VersionedDto {
  @IsObject()
  award!: Record<string, unknown>;
}

export class CertificateItemDto extends VersionedDto {
  @IsObject()
  certificate!: Record<string, unknown>;
}

export class PublicationItemDto extends VersionedDto {
  @IsObject()
  publication!: Record<string, unknown>;
}

export class LanguageItemDto extends VersionedDto {
  @IsObject()
  language!: Record<string, unknown>;
}

export class InterestItemDto extends VersionedDto {
  @IsObject()
  interest!: Record<string, unknown>;
}

export class ReferenceItemDto extends VersionedDto {
  @IsObject()
  reference!: Record<string, unknown>;
}

export class StringValueDto extends VersionedDto {
  @IsString()
  value!: string;
}

export class StringListDto extends VersionedDto {
  @IsArray()
  @IsString({ each: true })
  values!: string[];
}
