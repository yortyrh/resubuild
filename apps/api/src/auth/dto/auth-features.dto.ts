export class AuthFeaturesDto {
  forgot_password!: boolean;
  email_verification!: boolean;
  passwordless!: boolean;
  providers!: string[];
}
