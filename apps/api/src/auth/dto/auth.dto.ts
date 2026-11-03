import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class ChangePasswordDto {
  /** Required when the account already has a password; omit to set a first password. */
  @IsOptional()
  @IsString()
  current_password?: string | null;

  @IsString()
  @MinLength(6)
  @MaxLength(128)
  new_password!: string;
}

export class OAuthExchangeDto {
  @IsString()
  @MinLength(10)
  @MaxLength(200)
  code!: string;
}
