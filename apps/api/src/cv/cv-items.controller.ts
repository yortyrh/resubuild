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
  StringValueDto,
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

  @Patch('profiles/:index')
  updateProfile(
    @Req() req: AuthenticatedRequest,
    @Param('cvId') cvId: string,
    @Param('index') index: string,
    @Body() dto: ProfileItemDto,
  ) {
    return this.cvItemService.updateProfile(req.user, cvId, index, dto.profile, dto.version);
  }

  @Delete('profiles/:index')
  deleteProfile(
    @Req() req: AuthenticatedRequest,
    @Param('cvId') cvId: string,
    @Param('index') index: string,
    @Body() dto: BasicsItemDto,
  ) {
    return this.cvItemService.deleteProfile(req.user, cvId, index, dto.version);
  }

  @Post('work')
  createWork(
    @Req() req: AuthenticatedRequest,
    @Param('cvId') cvId: string,
    @Body() dto: WorkItemDto,
  ) {
    return this.cvItemService.createArrayItem(req.user, cvId, 'work', dto.work, dto.version);
  }

  @Patch('work/:index')
  updateWork(
    @Req() req: AuthenticatedRequest,
    @Param('cvId') cvId: string,
    @Param('index') index: string,
    @Body() dto: WorkItemDto,
  ) {
    return this.cvItemService.updateArrayItem(
      req.user,
      cvId,
      'work',
      index,
      dto.work,
      'Work entry',
      dto.version,
    );
  }

  @Delete('work/:index')
  deleteWork(
    @Req() req: AuthenticatedRequest,
    @Param('cvId') cvId: string,
    @Param('index') index: string,
    @Body() dto: BasicsItemDto,
  ) {
    return this.cvItemService.deleteArrayItem(
      req.user,
      cvId,
      'work',
      index,
      'Work entry',
      dto.version,
    );
  }

  @Post('work/:workIndex/highlights')
  createWorkHighlight(
    @Req() req: AuthenticatedRequest,
    @Param('cvId') cvId: string,
    @Param('workIndex') workIndex: string,
    @Body() dto: StringValueDto,
  ) {
    return this.cvItemService.createNestedString(
      req.user,
      cvId,
      'work',
      workIndex,
      'highlights',
      dto.value,
      'Work entry',
      dto.version,
    );
  }

  @Patch('work/:workIndex/highlights/:highlightIndex')
  updateWorkHighlight(
    @Req() req: AuthenticatedRequest,
    @Param('cvId') cvId: string,
    @Param('workIndex') workIndex: string,
    @Param('highlightIndex') highlightIndex: string,
    @Body() dto: StringValueDto,
  ) {
    return this.cvItemService.updateNestedString(
      req.user,
      cvId,
      'work',
      workIndex,
      'highlights',
      highlightIndex,
      dto.value,
      'Work entry',
      dto.version,
    );
  }

  @Delete('work/:workIndex/highlights/:highlightIndex')
  deleteWorkHighlight(
    @Req() req: AuthenticatedRequest,
    @Param('cvId') cvId: string,
    @Param('workIndex') workIndex: string,
    @Param('highlightIndex') highlightIndex: string,
    @Body() dto: BasicsItemDto,
  ) {
    return this.cvItemService.deleteNestedString(
      req.user,
      cvId,
      'work',
      workIndex,
      'highlights',
      highlightIndex,
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

  @Patch('volunteer/:index')
  updateVolunteer(
    @Req() req: AuthenticatedRequest,
    @Param('cvId') cvId: string,
    @Param('index') index: string,
    @Body() dto: VolunteerItemDto,
  ) {
    return this.cvItemService.updateArrayItem(
      req.user,
      cvId,
      'volunteer',
      index,
      dto.volunteer,
      'Volunteer entry',
      dto.version,
    );
  }

  @Delete('volunteer/:index')
  deleteVolunteer(
    @Req() req: AuthenticatedRequest,
    @Param('cvId') cvId: string,
    @Param('index') index: string,
    @Body() dto: BasicsItemDto,
  ) {
    return this.cvItemService.deleteArrayItem(
      req.user,
      cvId,
      'volunteer',
      index,
      'Volunteer entry',
      dto.version,
    );
  }

  @Post('volunteer/:volunteerIndex/highlights')
  createVolunteerHighlight(
    @Req() req: AuthenticatedRequest,
    @Param('cvId') cvId: string,
    @Param('volunteerIndex') volunteerIndex: string,
    @Body() dto: StringValueDto,
  ) {
    return this.cvItemService.createNestedString(
      req.user,
      cvId,
      'volunteer',
      volunteerIndex,
      'highlights',
      dto.value,
      'Volunteer entry',
      dto.version,
    );
  }

  @Patch('volunteer/:volunteerIndex/highlights/:highlightIndex')
  updateVolunteerHighlight(
    @Req() req: AuthenticatedRequest,
    @Param('cvId') cvId: string,
    @Param('volunteerIndex') volunteerIndex: string,
    @Param('highlightIndex') highlightIndex: string,
    @Body() dto: StringValueDto,
  ) {
    return this.cvItemService.updateNestedString(
      req.user,
      cvId,
      'volunteer',
      volunteerIndex,
      'highlights',
      highlightIndex,
      dto.value,
      'Volunteer entry',
      dto.version,
    );
  }

  @Delete('volunteer/:volunteerIndex/highlights/:highlightIndex')
  deleteVolunteerHighlight(
    @Req() req: AuthenticatedRequest,
    @Param('cvId') cvId: string,
    @Param('volunteerIndex') volunteerIndex: string,
    @Param('highlightIndex') highlightIndex: string,
    @Body() dto: BasicsItemDto,
  ) {
    return this.cvItemService.deleteNestedString(
      req.user,
      cvId,
      'volunteer',
      volunteerIndex,
      'highlights',
      highlightIndex,
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

  @Patch('education/:index')
  updateEducation(
    @Req() req: AuthenticatedRequest,
    @Param('cvId') cvId: string,
    @Param('index') index: string,
    @Body() dto: EducationItemDto,
  ) {
    return this.cvItemService.updateArrayItem(
      req.user,
      cvId,
      'education',
      index,
      dto.education,
      'Education entry',
      dto.version,
    );
  }

  @Delete('education/:index')
  deleteEducation(
    @Req() req: AuthenticatedRequest,
    @Param('cvId') cvId: string,
    @Param('index') index: string,
    @Body() dto: BasicsItemDto,
  ) {
    return this.cvItemService.deleteArrayItem(
      req.user,
      cvId,
      'education',
      index,
      'Education entry',
      dto.version,
    );
  }

  @Post('education/:educationIndex/courses')
  createEducationCourse(
    @Req() req: AuthenticatedRequest,
    @Param('cvId') cvId: string,
    @Param('educationIndex') educationIndex: string,
    @Body() dto: StringValueDto,
  ) {
    return this.cvItemService.createNestedString(
      req.user,
      cvId,
      'education',
      educationIndex,
      'courses',
      dto.value,
      'Education entry',
      dto.version,
    );
  }

  @Patch('education/:educationIndex/courses/:courseIndex')
  updateEducationCourse(
    @Req() req: AuthenticatedRequest,
    @Param('cvId') cvId: string,
    @Param('educationIndex') educationIndex: string,
    @Param('courseIndex') courseIndex: string,
    @Body() dto: StringValueDto,
  ) {
    return this.cvItemService.updateNestedString(
      req.user,
      cvId,
      'education',
      educationIndex,
      'courses',
      courseIndex,
      dto.value,
      'Education entry',
      dto.version,
    );
  }

  @Delete('education/:educationIndex/courses/:courseIndex')
  deleteEducationCourse(
    @Req() req: AuthenticatedRequest,
    @Param('cvId') cvId: string,
    @Param('educationIndex') educationIndex: string,
    @Param('courseIndex') courseIndex: string,
    @Body() dto: BasicsItemDto,
  ) {
    return this.cvItemService.deleteNestedString(
      req.user,
      cvId,
      'education',
      educationIndex,
      'courses',
      courseIndex,
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

  @Patch('skills/:index')
  updateSkill(
    @Req() req: AuthenticatedRequest,
    @Param('cvId') cvId: string,
    @Param('index') index: string,
    @Body() dto: SkillItemDto,
  ) {
    return this.cvItemService.updateArrayItem(
      req.user,
      cvId,
      'skills',
      index,
      dto.skill,
      'Skill',
      dto.version,
    );
  }

  @Delete('skills/:index')
  deleteSkill(
    @Req() req: AuthenticatedRequest,
    @Param('cvId') cvId: string,
    @Param('index') index: string,
    @Body() dto: BasicsItemDto,
  ) {
    return this.cvItemService.deleteArrayItem(
      req.user,
      cvId,
      'skills',
      index,
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

  @Patch('projects/:index')
  updateProject(
    @Req() req: AuthenticatedRequest,
    @Param('cvId') cvId: string,
    @Param('index') index: string,
    @Body() dto: ProjectItemDto,
  ) {
    return this.cvItemService.updateArrayItem(
      req.user,
      cvId,
      'projects',
      index,
      dto.project,
      'Project',
      dto.version,
    );
  }

  @Delete('projects/:index')
  deleteProject(
    @Req() req: AuthenticatedRequest,
    @Param('cvId') cvId: string,
    @Param('index') index: string,
    @Body() dto: BasicsItemDto,
  ) {
    return this.cvItemService.deleteArrayItem(
      req.user,
      cvId,
      'projects',
      index,
      'Project',
      dto.version,
    );
  }

  @Post('projects/:projectIndex/highlights')
  createProjectHighlight(
    @Req() req: AuthenticatedRequest,
    @Param('cvId') cvId: string,
    @Param('projectIndex') projectIndex: string,
    @Body() dto: StringValueDto,
  ) {
    return this.cvItemService.createNestedString(
      req.user,
      cvId,
      'projects',
      projectIndex,
      'highlights',
      dto.value,
      'Project',
      dto.version,
    );
  }

  @Patch('projects/:projectIndex/highlights/:highlightIndex')
  updateProjectHighlight(
    @Req() req: AuthenticatedRequest,
    @Param('cvId') cvId: string,
    @Param('projectIndex') projectIndex: string,
    @Param('highlightIndex') highlightIndex: string,
    @Body() dto: StringValueDto,
  ) {
    return this.cvItemService.updateNestedString(
      req.user,
      cvId,
      'projects',
      projectIndex,
      'highlights',
      highlightIndex,
      dto.value,
      'Project',
      dto.version,
    );
  }

  @Delete('projects/:projectIndex/highlights/:highlightIndex')
  deleteProjectHighlight(
    @Req() req: AuthenticatedRequest,
    @Param('cvId') cvId: string,
    @Param('projectIndex') projectIndex: string,
    @Param('highlightIndex') highlightIndex: string,
    @Body() dto: BasicsItemDto,
  ) {
    return this.cvItemService.deleteNestedString(
      req.user,
      cvId,
      'projects',
      projectIndex,
      'highlights',
      highlightIndex,
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

  @Patch('awards/:index')
  updateAward(
    @Req() req: AuthenticatedRequest,
    @Param('cvId') cvId: string,
    @Param('index') index: string,
    @Body() dto: AwardItemDto,
  ) {
    return this.cvItemService.updateArrayItem(
      req.user,
      cvId,
      'awards',
      index,
      dto.award,
      'Award',
      dto.version,
    );
  }

  @Delete('awards/:index')
  deleteAward(
    @Req() req: AuthenticatedRequest,
    @Param('cvId') cvId: string,
    @Param('index') index: string,
    @Body() dto: BasicsItemDto,
  ) {
    return this.cvItemService.deleteArrayItem(
      req.user,
      cvId,
      'awards',
      index,
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

  @Patch('certificates/:index')
  updateCertificate(
    @Req() req: AuthenticatedRequest,
    @Param('cvId') cvId: string,
    @Param('index') index: string,
    @Body() dto: CertificateItemDto,
  ) {
    return this.cvItemService.updateArrayItem(
      req.user,
      cvId,
      'certificates',
      index,
      dto.certificate,
      'Certificate',
      dto.version,
    );
  }

  @Delete('certificates/:index')
  deleteCertificate(
    @Req() req: AuthenticatedRequest,
    @Param('cvId') cvId: string,
    @Param('index') index: string,
    @Body() dto: BasicsItemDto,
  ) {
    return this.cvItemService.deleteArrayItem(
      req.user,
      cvId,
      'certificates',
      index,
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

  @Patch('publications/:index')
  updatePublication(
    @Req() req: AuthenticatedRequest,
    @Param('cvId') cvId: string,
    @Param('index') index: string,
    @Body() dto: PublicationItemDto,
  ) {
    return this.cvItemService.updateArrayItem(
      req.user,
      cvId,
      'publications',
      index,
      dto.publication,
      'Publication',
      dto.version,
    );
  }

  @Delete('publications/:index')
  deletePublication(
    @Req() req: AuthenticatedRequest,
    @Param('cvId') cvId: string,
    @Param('index') index: string,
    @Body() dto: BasicsItemDto,
  ) {
    return this.cvItemService.deleteArrayItem(
      req.user,
      cvId,
      'publications',
      index,
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

  @Patch('languages/:index')
  updateLanguage(
    @Req() req: AuthenticatedRequest,
    @Param('cvId') cvId: string,
    @Param('index') index: string,
    @Body() dto: LanguageItemDto,
  ) {
    return this.cvItemService.updateArrayItem(
      req.user,
      cvId,
      'languages',
      index,
      dto.language,
      'Language',
      dto.version,
    );
  }

  @Delete('languages/:index')
  deleteLanguage(
    @Req() req: AuthenticatedRequest,
    @Param('cvId') cvId: string,
    @Param('index') index: string,
    @Body() dto: BasicsItemDto,
  ) {
    return this.cvItemService.deleteArrayItem(
      req.user,
      cvId,
      'languages',
      index,
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

  @Patch('interests/:index')
  updateInterest(
    @Req() req: AuthenticatedRequest,
    @Param('cvId') cvId: string,
    @Param('index') index: string,
    @Body() dto: InterestItemDto,
  ) {
    return this.cvItemService.updateArrayItem(
      req.user,
      cvId,
      'interests',
      index,
      dto.interest,
      'Interest',
      dto.version,
    );
  }

  @Delete('interests/:index')
  deleteInterest(
    @Req() req: AuthenticatedRequest,
    @Param('cvId') cvId: string,
    @Param('index') index: string,
    @Body() dto: BasicsItemDto,
  ) {
    return this.cvItemService.deleteArrayItem(
      req.user,
      cvId,
      'interests',
      index,
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

  @Patch('references/:index')
  updateReference(
    @Req() req: AuthenticatedRequest,
    @Param('cvId') cvId: string,
    @Param('index') index: string,
    @Body() dto: ReferenceItemDto,
  ) {
    return this.cvItemService.updateArrayItem(
      req.user,
      cvId,
      'references',
      index,
      dto.reference,
      'Reference',
      dto.version,
    );
  }

  @Delete('references/:index')
  deleteReference(
    @Req() req: AuthenticatedRequest,
    @Param('cvId') cvId: string,
    @Param('index') index: string,
    @Body() dto: BasicsItemDto,
  ) {
    return this.cvItemService.deleteArrayItem(
      req.user,
      cvId,
      'references',
      index,
      'Reference',
      dto.version,
    );
  }
}
