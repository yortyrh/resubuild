import { ArrayNotEmpty, IsArray, IsObject, IsOptional, IsString, IsUUID } from 'class-validator';

export class BasicsItemDto {
  @IsOptional()
  @IsObject()
  basics?: Record<string, unknown>;
}

export class ProfileItemDto {
  @IsObject()
  profile!: Record<string, unknown>;
}

export class WorkItemDto {
  @IsObject()
  work!: Record<string, unknown>;
}

export class VolunteerItemDto {
  @IsObject()
  volunteer!: Record<string, unknown>;
}

export class EducationItemDto {
  @IsObject()
  education!: Record<string, unknown>;
}

export class SkillItemDto {
  @IsObject()
  skill!: Record<string, unknown>;
}

export class ProjectItemDto {
  @IsObject()
  project!: Record<string, unknown>;
}

export class AwardItemDto {
  @IsObject()
  award!: Record<string, unknown>;
}

export class CertificateItemDto {
  @IsObject()
  certificate!: Record<string, unknown>;
}

export class PublicationItemDto {
  @IsObject()
  publication!: Record<string, unknown>;
}

export class LanguageItemDto {
  @IsObject()
  language!: Record<string, unknown>;
}

export class InterestItemDto {
  @IsObject()
  interest!: Record<string, unknown>;
}

export class ReferenceItemDto {
  @IsObject()
  reference!: Record<string, unknown>;
}

export class StringListDto {
  @IsArray()
  @IsString({ each: true })
  values!: string[];
}

export class ReorderSectionDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsUUID('4', { each: true })
  order!: string[];
}
