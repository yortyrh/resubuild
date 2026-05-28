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
import { type AuthenticatedRequest, SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import { CreateAiAgentAccountDto } from './dto/create-ai-agent-account.dto';
import { SetActiveAiAgentAccountDto } from './dto/set-active-ai-agent-account.dto';
import { UpdateAiAgentAccountDto } from './dto/update-ai-agent-account.dto';
import { AiAgentService } from './ai-agent.service';

@Controller('ai/agents')
@UseGuards(SupabaseAuthGuard)
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
    return this.aiAgentService.setActiveAccount(req.user, body.accountId);
  }
}
