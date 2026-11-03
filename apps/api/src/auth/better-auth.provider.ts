import type { Provider } from '@nestjs/common';
import type { Database } from '@resubuild/db';
import { DATABASE } from '../database/database.tokens';
import { MailService } from '../mail/mail.service';
import { BETTER_AUTH, createAuth } from './better-auth';
import { AuthConfigService } from './config/auth.config';

export const betterAuthProvider: Provider = {
  provide: BETTER_AUTH,
  inject: [DATABASE, MailService, AuthConfigService],
  useFactory: (db: Database, mail: MailService, config: AuthConfigService) =>
    createAuth({ db, mail, config }),
};
