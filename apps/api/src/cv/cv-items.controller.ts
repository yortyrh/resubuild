import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { type AuthenticatedRequest, SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import { CvItemService } from './cv-item.service';
import {
  AwardItemDto,
  BasicsItemDto,
  CertificateItemDto,
  EducationItemDto,
  InterestItemDto,
  LanguageItemDto,
  ProfileItemDto,
  ProjectItemDto,
  PublicationItemDto,
  ReferenceItemDto,
  ReorderSectionDto,
  SkillItemDto,
  VolunteerItemDto,
  WorkItemDto,
} from './dto/cv-item.dto';

@Controller('cv/:cvId')
@UseGuards(SupabaseAuthGuard)
export class CvItemsController {
  constructor(private readonly cvItemService: CvItemService) {}

  @Get('basics')
  getBasics(@Req() req: AuthenticatedRequest, @Param('cvId') cvId: string) {
    return this.cvItemService.getBasics(req.user, cvId);
  }

  @Get('profiles')
  getProfiles(@Req() req: AuthenticatedRequest, @Param('cvId') cvId: string) {
    return this.cvItemService.getSection(req.user, cvId, 'profiles');
  }

  @Get('work')
  getWork(@Req() req: AuthenticatedRequest, @Param('cvId') cvId: string) {
    return this.cvItemService.getSection(req.user, cvId, 'work');
  }

  @Get('volunteer')
  getVolunteer(@Req() req: AuthenticatedRequest, @Param('cvId') cvId: string) {
    return this.cvItemService.getSection(req.user, cvId, 'volunteer');
  }

  @Get('education')
  getEducation(@Req() req: AuthenticatedRequest, @Param('cvId') cvId: string) {
    return this.cvItemService.getSection(req.user, cvId, 'education');
  }

  @Get('skills')
  getSkills(@Req() req: AuthenticatedRequest, @Param('cvId') cvId: string) {
    return this.cvItemService.getSection(req.user, cvId, 'skills');
  }

  @Get('projects')
  getProjects(@Req() req: AuthenticatedRequest, @Param('cvId') cvId: string) {
    return this.cvItemService.getSection(req.user, cvId, 'projects');
  }

  @Get('awards')
  getAwards(@Req() req: AuthenticatedRequest, @Param('cvId') cvId: string) {
    return this.cvItemService.getSection(req.user, cvId, 'awards');
  }

  @Get('certificates')
  getCertificates(@Req() req: AuthenticatedRequest, @Param('cvId') cvId: string) {
    return this.cvItemService.getSection(req.user, cvId, 'certificates');
  }

  @Get('publications')
  getPublications(@Req() req: AuthenticatedRequest, @Param('cvId') cvId: string) {
    return this.cvItemService.getSection(req.user, cvId, 'publications');
  }

  @Get('languages')
  getLanguages(@Req() req: AuthenticatedRequest, @Param('cvId') cvId: string) {
    return this.cvItemService.getSection(req.user, cvId, 'languages');
  }

  @Get('interests')
  getInterests(@Req() req: AuthenticatedRequest, @Param('cvId') cvId: string) {
    return this.cvItemService.getSection(req.user, cvId, 'interests');
  }

  @Get('references')
  getReferences(@Req() req: AuthenticatedRequest, @Param('cvId') cvId: string) {
    return this.cvItemService.getSection(req.user, cvId, 'references');
  }

  @Put('profiles/reorder')
  reorderProfiles(
    @Req() req: AuthenticatedRequest,
    @Param('cvId') cvId: string,
    @Body() dto: ReorderSectionDto,
  ) {
    return this.cvItemService.reorderSection(req.user, cvId, 'profiles', dto.order, dto.version);
  }

  @Put('skills/reorder')
  reorderSkills(
    @Req() req: AuthenticatedRequest,
    @Param('cvId') cvId: string,
    @Body() dto: ReorderSectionDto,
  ) {
    return this.cvItemService.reorderSection(req.user, cvId, 'skills', dto.order, dto.version);
  }

  @Put('languages/reorder')
  reorderLanguages(
    @Req() req: AuthenticatedRequest,
    @Param('cvId') cvId: string,
    @Body() dto: ReorderSectionDto,
  ) {
    return this.cvItemService.reorderSection(req.user, cvId, 'languages', dto.order, dto.version);
  }

  @Put('interests/reorder')
  reorderInterests(
    @Req() req: AuthenticatedRequest,
    @Param('cvId') cvId: string,
    @Body() dto: ReorderSectionDto,
  ) {
    return this.cvItemService.reorderSection(req.user, cvId, 'interests', dto.order, dto.version);
  }

  @Put('references/reorder')
  reorderReferences(
    @Req() req: AuthenticatedRequest,
    @Param('cvId') cvId: string,
    @Body() dto: ReorderSectionDto,
  ) {
    return this.cvItemService.reorderSection(req.user, cvId, 'references', dto.order, dto.version);
  }

  @Patch('basics')
  updateBasics(
    @Req() req: AuthenticatedRequest,
    @Param('cvId') cvId: string,
    @Body() dto: BasicsItemDto,
  ) {
    return this.cvItemService.updateBasics(req.user, cvId, dto.basics ?? {}, dto.version);
  }

  @Post('profiles')
  createProfile(
    @Req() req: AuthenticatedRequest,
    @Param('cvId') cvId: string,
    @Body() dto: ProfileItemDto,
  ) {
    return this.cvItemService.createProfile(req.user, cvId, dto.profile, dto.version);
  }

  @Patch('profiles/:itemId')
  updateProfile(
    @Req() req: AuthenticatedRequest,
    @Param('cvId') cvId: string,
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Body() dto: ProfileItemDto,
  ) {
    return this.cvItemService.updateProfile(req.user, cvId, itemId, dto.profile, dto.version);
  }

  @Delete('profiles/:itemId')
  deleteProfile(
    @Req() req: AuthenticatedRequest,
    @Param('cvId') cvId: string,
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Body() dto: BasicsItemDto,
  ) {
    return this.cvItemService.deleteProfile(req.user, cvId, itemId, dto.version);
  }

  @Post('work')
  createWork(
    @Req() req: AuthenticatedRequest,
    @Param('cvId') cvId: string,
    @Body() dto: WorkItemDto,
  ) {
    return this.cvItemService.createArrayItem(req.user, cvId, 'work', dto.work, dto.version);
  }

  @Patch('work/:itemId')
  updateWork(
    @Req() req: AuthenticatedRequest,
    @Param('cvId') cvId: string,
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Body() dto: WorkItemDto,
  ) {
    return this.cvItemService.updateArrayItem(
      req.user,
      cvId,
      'work',
      itemId,
      dto.work,
      'Work entry',
      dto.version,
    );
  }

  @Delete('work/:itemId')
  deleteWork(
    @Req() req: AuthenticatedRequest,
    @Param('cvId') cvId: string,
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Body() dto: BasicsItemDto,
  ) {
    return this.cvItemService.deleteArrayItem(
      req.user,
      cvId,
      'work',
      itemId,
      'Work entry',
      dto.version,
    );
  }

  @Post('volunteer')
  createVolunteer(
    @Req() req: AuthenticatedRequest,
    @Param('cvId') cvId: string,
    @Body() dto: VolunteerItemDto,
  ) {
    return this.cvItemService.createArrayItem(
      req.user,
      cvId,
      'volunteer',
      dto.volunteer,
      dto.version,
    );
  }

  @Patch('volunteer/:itemId')
  updateVolunteer(
    @Req() req: AuthenticatedRequest,
    @Param('cvId') cvId: string,
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Body() dto: VolunteerItemDto,
  ) {
    return this.cvItemService.updateArrayItem(
      req.user,
      cvId,
      'volunteer',
      itemId,
      dto.volunteer,
      'Volunteer entry',
      dto.version,
    );
  }

  @Delete('volunteer/:itemId')
  deleteVolunteer(
    @Req() req: AuthenticatedRequest,
    @Param('cvId') cvId: string,
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Body() dto: BasicsItemDto,
  ) {
    return this.cvItemService.deleteArrayItem(
      req.user,
      cvId,
      'volunteer',
      itemId,
      'Volunteer entry',
      dto.version,
    );
  }

  @Post('education')
  createEducation(
    @Req() req: AuthenticatedRequest,
    @Param('cvId') cvId: string,
    @Body() dto: EducationItemDto,
  ) {
    return this.cvItemService.createArrayItem(
      req.user,
      cvId,
      'education',
      dto.education,
      dto.version,
    );
  }

  @Patch('education/:itemId')
  updateEducation(
    @Req() req: AuthenticatedRequest,
    @Param('cvId') cvId: string,
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Body() dto: EducationItemDto,
  ) {
    return this.cvItemService.updateArrayItem(
      req.user,
      cvId,
      'education',
      itemId,
      dto.education,
      'Education entry',
      dto.version,
    );
  }

  @Delete('education/:itemId')
  deleteEducation(
    @Req() req: AuthenticatedRequest,
    @Param('cvId') cvId: string,
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Body() dto: BasicsItemDto,
  ) {
    return this.cvItemService.deleteArrayItem(
      req.user,
      cvId,
      'education',
      itemId,
      'Education entry',
      dto.version,
    );
  }

  @Post('skills')
  createSkill(
    @Req() req: AuthenticatedRequest,
    @Param('cvId') cvId: string,
    @Body() dto: SkillItemDto,
  ) {
    return this.cvItemService.createArrayItem(req.user, cvId, 'skills', dto.skill, dto.version);
  }

  @Patch('skills/:itemId')
  updateSkill(
    @Req() req: AuthenticatedRequest,
    @Param('cvId') cvId: string,
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Body() dto: SkillItemDto,
  ) {
    return this.cvItemService.updateArrayItem(
      req.user,
      cvId,
      'skills',
      itemId,
      dto.skill,
      'Skill',
      dto.version,
    );
  }

  @Delete('skills/:itemId')
  deleteSkill(
    @Req() req: AuthenticatedRequest,
    @Param('cvId') cvId: string,
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Body() dto: BasicsItemDto,
  ) {
    return this.cvItemService.deleteArrayItem(
      req.user,
      cvId,
      'skills',
      itemId,
      'Skill',
      dto.version,
    );
  }

  @Post('projects')
  createProject(
    @Req() req: AuthenticatedRequest,
    @Param('cvId') cvId: string,
    @Body() dto: ProjectItemDto,
  ) {
    return this.cvItemService.createArrayItem(req.user, cvId, 'projects', dto.project, dto.version);
  }

  @Patch('projects/:itemId')
  updateProject(
    @Req() req: AuthenticatedRequest,
    @Param('cvId') cvId: string,
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Body() dto: ProjectItemDto,
  ) {
    return this.cvItemService.updateArrayItem(
      req.user,
      cvId,
      'projects',
      itemId,
      dto.project,
      'Project',
      dto.version,
    );
  }

  @Delete('projects/:itemId')
  deleteProject(
    @Req() req: AuthenticatedRequest,
    @Param('cvId') cvId: string,
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Body() dto: BasicsItemDto,
  ) {
    return this.cvItemService.deleteArrayItem(
      req.user,
      cvId,
      'projects',
      itemId,
      'Project',
      dto.version,
    );
  }

  @Post('awards')
  createAward(
    @Req() req: AuthenticatedRequest,
    @Param('cvId') cvId: string,
    @Body() dto: AwardItemDto,
  ) {
    return this.cvItemService.createArrayItem(req.user, cvId, 'awards', dto.award, dto.version);
  }

  @Patch('awards/:itemId')
  updateAward(
    @Req() req: AuthenticatedRequest,
    @Param('cvId') cvId: string,
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Body() dto: AwardItemDto,
  ) {
    return this.cvItemService.updateArrayItem(
      req.user,
      cvId,
      'awards',
      itemId,
      dto.award,
      'Award',
      dto.version,
    );
  }

  @Delete('awards/:itemId')
  deleteAward(
    @Req() req: AuthenticatedRequest,
    @Param('cvId') cvId: string,
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Body() dto: BasicsItemDto,
  ) {
    return this.cvItemService.deleteArrayItem(
      req.user,
      cvId,
      'awards',
      itemId,
      'Award',
      dto.version,
    );
  }

  @Post('certificates')
  createCertificate(
    @Req() req: AuthenticatedRequest,
    @Param('cvId') cvId: string,
    @Body() dto: CertificateItemDto,
  ) {
    return this.cvItemService.createArrayItem(
      req.user,
      cvId,
      'certificates',
      dto.certificate,
      dto.version,
    );
  }

  @Patch('certificates/:itemId')
  updateCertificate(
    @Req() req: AuthenticatedRequest,
    @Param('cvId') cvId: string,
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Body() dto: CertificateItemDto,
  ) {
    return this.cvItemService.updateArrayItem(
      req.user,
      cvId,
      'certificates',
      itemId,
      dto.certificate,
      'Certificate',
      dto.version,
    );
  }

  @Delete('certificates/:itemId')
  deleteCertificate(
    @Req() req: AuthenticatedRequest,
    @Param('cvId') cvId: string,
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Body() dto: BasicsItemDto,
  ) {
    return this.cvItemService.deleteArrayItem(
      req.user,
      cvId,
      'certificates',
      itemId,
      'Certificate',
      dto.version,
    );
  }

  @Post('publications')
  createPublication(
    @Req() req: AuthenticatedRequest,
    @Param('cvId') cvId: string,
    @Body() dto: PublicationItemDto,
  ) {
    return this.cvItemService.createArrayItem(
      req.user,
      cvId,
      'publications',
      dto.publication,
      dto.version,
    );
  }

  @Patch('publications/:itemId')
  updatePublication(
    @Req() req: AuthenticatedRequest,
    @Param('cvId') cvId: string,
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Body() dto: PublicationItemDto,
  ) {
    return this.cvItemService.updateArrayItem(
      req.user,
      cvId,
      'publications',
      itemId,
      dto.publication,
      'Publication',
      dto.version,
    );
  }

  @Delete('publications/:itemId')
  deletePublication(
    @Req() req: AuthenticatedRequest,
    @Param('cvId') cvId: string,
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Body() dto: BasicsItemDto,
  ) {
    return this.cvItemService.deleteArrayItem(
      req.user,
      cvId,
      'publications',
      itemId,
      'Publication',
      dto.version,
    );
  }

  @Post('languages')
  createLanguage(
    @Req() req: AuthenticatedRequest,
    @Param('cvId') cvId: string,
    @Body() dto: LanguageItemDto,
  ) {
    return this.cvItemService.createArrayItem(
      req.user,
      cvId,
      'languages',
      dto.language,
      dto.version,
    );
  }

  @Patch('languages/:itemId')
  updateLanguage(
    @Req() req: AuthenticatedRequest,
    @Param('cvId') cvId: string,
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Body() dto: LanguageItemDto,
  ) {
    return this.cvItemService.updateArrayItem(
      req.user,
      cvId,
      'languages',
      itemId,
      dto.language,
      'Language',
      dto.version,
    );
  }

  @Delete('languages/:itemId')
  deleteLanguage(
    @Req() req: AuthenticatedRequest,
    @Param('cvId') cvId: string,
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Body() dto: BasicsItemDto,
  ) {
    return this.cvItemService.deleteArrayItem(
      req.user,
      cvId,
      'languages',
      itemId,
      'Language',
      dto.version,
    );
  }

  @Post('interests')
  createInterest(
    @Req() req: AuthenticatedRequest,
    @Param('cvId') cvId: string,
    @Body() dto: InterestItemDto,
  ) {
    return this.cvItemService.createArrayItem(
      req.user,
      cvId,
      'interests',
      dto.interest,
      dto.version,
    );
  }

  @Patch('interests/:itemId')
  updateInterest(
    @Req() req: AuthenticatedRequest,
    @Param('cvId') cvId: string,
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Body() dto: InterestItemDto,
  ) {
    return this.cvItemService.updateArrayItem(
      req.user,
      cvId,
      'interests',
      itemId,
      dto.interest,
      'Interest',
      dto.version,
    );
  }

  @Delete('interests/:itemId')
  deleteInterest(
    @Req() req: AuthenticatedRequest,
    @Param('cvId') cvId: string,
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Body() dto: BasicsItemDto,
  ) {
    return this.cvItemService.deleteArrayItem(
      req.user,
      cvId,
      'interests',
      itemId,
      'Interest',
      dto.version,
    );
  }

  @Post('references')
  createReference(
    @Req() req: AuthenticatedRequest,
    @Param('cvId') cvId: string,
    @Body() dto: ReferenceItemDto,
  ) {
    return this.cvItemService.createArrayItem(
      req.user,
      cvId,
      'references',
      dto.reference,
      dto.version,
    );
  }

  @Patch('references/:itemId')
  updateReference(
    @Req() req: AuthenticatedRequest,
    @Param('cvId') cvId: string,
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Body() dto: ReferenceItemDto,
  ) {
    return this.cvItemService.updateArrayItem(
      req.user,
      cvId,
      'references',
      itemId,
      dto.reference,
      'Reference',
      dto.version,
    );
  }

  @Delete('references/:itemId')
  deleteReference(
    @Req() req: AuthenticatedRequest,
    @Param('cvId') cvId: string,
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Body() dto: BasicsItemDto,
  ) {
    return this.cvItemService.deleteArrayItem(
      req.user,
      cvId,
      'references',
      itemId,
      'Reference',
      dto.version,
    );
  }
}
