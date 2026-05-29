import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { type AuthenticatedRequest, SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import { CvService } from './cv.service';
import { CvTemplatePresentationService } from './cv-template-presentation.service';
import { CreateCvDto, UpdateCvDto } from './dto/cv.dto';
import { UpsertCvTemplatePresentationDto } from './dto/cv-template-presentation.dto';

@Controller('cv')
@UseGuards(SupabaseAuthGuard)
export class CvController {
  constructor(
    private readonly cvService: CvService,
    private readonly presentationService: CvTemplatePresentationService,
  ) {}

  @Get()
  findAll(@Req() req: AuthenticatedRequest) {
    return this.cvService.findAll(req.user);
  }

  @Get(':id')
  findOne(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.cvService.findOne(req.user, id);
  }

  @Post()
  create(@Req() req: AuthenticatedRequest, @Body() dto: CreateCvDto) {
    return this.cvService.create(req.user, dto);
  }

  @Patch(':id')
  update(@Req() req: AuthenticatedRequest, @Param('id') id: string, @Body() dto: UpdateCvDto) {
    return this.cvService.update(req.user, id, dto);
  }

  @Delete(':id')
  remove(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.cvService.remove(req.user, id);
  }

  @Get(':id/template-presentation')
  getTemplatePresentation(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Query('template') template: string,
  ) {
    return this.presentationService.getPresentation(req.user, id, template);
  }

  @Patch(':id/template-presentation')
  upsertTemplatePresentation(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Query('template') template: string,
    @Body() dto: UpsertCvTemplatePresentationDto,
  ) {
    return this.presentationService.upsertPresentation(req.user, id, template, dto.config as never);
  }
}
