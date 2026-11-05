import { IsString, MaxLength } from 'class-validator';

export class GuestImportUrlDto {
  @IsString()
  @MaxLength(2048)
  url!: string;
}
