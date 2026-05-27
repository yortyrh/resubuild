import { IsEmail, IsString, MaxLength } from 'class-validator';

export class ImportMediaGravatarDto {
  @IsString()
  @IsEmail()
  @MaxLength(320)
  email!: string;
}
