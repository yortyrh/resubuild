import { Module } from '@nestjs/common';
import { CvModule } from '../cv/cv.module';
import { AiAgentCredentialService } from './ai-agent-credential.service';
import { AiAgentController } from './ai-agent.controller';
import { AiAgentRepository } from './ai-agent.repository';
import { AiAgentService } from './ai-agent.service';

@Module({
  imports: [CvModule],
  controllers: [AiAgentController],
  providers: [AiAgentRepository, AiAgentCredentialService, AiAgentService],
  exports: [AiAgentCredentialService, AiAgentService, AiAgentRepository],
})
export class AiAgentModule {}
