import { IsString, IsUrl } from 'class-validator';

export class ImportFromUrlDto {
  @IsUrl()
  @IsString()
  url!: string;
}
