import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class UpdateApplicationLetterDto {
  @IsString()
  @MaxLength(50000)
  coverLetter!: string;
}

export class UpdateApplicationDto {
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  message?: string;

  @IsOptional()
  @IsUUID('4')
  sourceCvId?: string;
}

export class PrepareApplicationFieldsDto {
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  url?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100000)
  text?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  message?: string;

  @IsOptional()
  @IsUUID('4')
  sourceCvId?: string;
}
