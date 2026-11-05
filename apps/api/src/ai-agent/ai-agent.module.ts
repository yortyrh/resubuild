import { Module } from '@nestjs/common';
import { AiHostedModule } from '../ai-hosted/ai-hosted.module';
import { CvModule } from '../cv/cv.module';
import { AiAgentController } from './ai-agent.controller';
import { AiAgentRepository } from './ai-agent.repository';
import { AiAgentService } from './ai-agent.service';
import { AiAgentCredentialService } from './ai-agent-credential.service';

@Module({
  imports: [CvModule, AiHostedModule],
  controllers: [AiAgentController],
  providers: [AiAgentRepository, AiAgentCredentialService, AiAgentService],
  exports: [AiAgentCredentialService, AiAgentService, AiAgentRepository],
})
export class AiAgentModule {}
