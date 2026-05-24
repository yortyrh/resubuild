import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  AuthenticatedRequest,
  SupabaseAuthGuard,
} from '../auth/supabase-auth.guard';
import { CvService } from './cv.service';
import { CreateCvDto, UpdateCvDto } from './dto/cv.dto';

@Controller('cv')
@UseGuards(SupabaseAuthGuard)
export class CvController {
  constructor(private readonly cvService: CvService) {}

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
  update(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: UpdateCvDto,
  ) {
    return this.cvService.update(req.user, id, dto);
  }

  @Delete(':id')
  remove(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.cvService.remove(req.user, id);
  }
}
