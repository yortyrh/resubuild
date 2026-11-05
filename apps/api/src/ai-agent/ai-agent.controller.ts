import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { type AuthenticatedRequest, SessionAuthGuard } from '../auth/session-auth.guard';
import { AiAgentService } from './ai-agent.service';
import { CreateAiAgentAccountDto } from './dto/create-ai-agent-account.dto';
import { SetActiveAiAgentAccountDto } from './dto/set-active-ai-agent-account.dto';
import { UpdateAiAgentAccountDto } from './dto/update-ai-agent-account.dto';

@Controller('ai/agents')
@UseGuards(SessionAuthGuard)
export class AiAgentController {
  constructor(private readonly aiAgentService: AiAgentService) {}

  @Get('providers')
  listProviders() {
    return this.aiAgentService.listProviders();
  }

  @Get('providers/:providerId/models')
  listModels(@Param('providerId') providerId: string) {
    return this.aiAgentService.listModels(providerId);
  }

  @Get('accounts')
  listAccounts(@Req() req: AuthenticatedRequest) {
    return this.aiAgentService.listAccounts(req.user);
  }

  @Post('accounts')
  createAccount(@Req() req: AuthenticatedRequest, @Body() body: CreateAiAgentAccountDto) {
    return this.aiAgentService.createAccount(req.user, body);
  }

  @Patch('accounts/:id')
  updateAccount(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: UpdateAiAgentAccountDto,
  ) {
    return this.aiAgentService.updateAccount(req.user, id, body);
  }

  @Delete('accounts/:id')
  async deleteAccount(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    await this.aiAgentService.deleteAccount(req.user, id);
  }

  @Get('active')
  getActive(@Req() req: AuthenticatedRequest) {
    return this.aiAgentService.getActiveStatus(req.user);
  }

  @Put('active')
  setActive(@Req() req: AuthenticatedRequest, @Body() body: SetActiveAiAgentAccountDto) {
    if (body.source === 'included') {
      return this.aiAgentService.selectIncluded(req.user);
    }
    return this.aiAgentService.setActiveAccount(req.user, body.accountId as string);
  }

  /** Included (app-funded) models: availability, models and this month's usage. */
  @Get('included')
  getIncluded(@Req() req: AuthenticatedRequest) {
    return this.aiAgentService.getIncludedStatus(req.user);
  }
}
