import type { Resume } from '@resubuild/types';
import {
  getCvAwards,
  getCvBasics,
  getCvCertificates,
  getCvEducation,
  getCvInterests,
  getCvLanguages,
  getCvProfiles,
  getCvProjects,
  getCvPublications,
  getCvReferences,
  getCvSkills,
  getCvVolunteer,
  getCvWork,
  parseMediaIdFromImageUrl,
  profilePhotoPreviewUrl,
} from '@/lib/api';
import { stripVolunteerHiddenStorage } from '@/lib/work-volunteer-move';

function nonEmpty<T>(items: T[] | undefined): T[] | undefined {
  if (!items || items.length === 0) return undefined;
  return items;
}

function withPreviewImageUrl(resume: Resume): Resume {
  if (!resume.basics?.image) return resume;
  const image = profilePhotoPreviewUrl(resume.basics.image) ?? resume.basics.image;
  if (image === resume.basics.image) return resume;
  return { ...resume, basics: { ...resume.basics, image } };
}

/** Load JSON Resume data for client-side preview rendering. */
export async function fetchCvResumeForPreview(cvId: string): Promise<Resume> {
  const [
    basics,
    profiles,
    work,
    volunteer,
    education,
    skills,
    projects,
    awards,
    certificates,
    publications,
    languages,
    interests,
    references,
  ] = await Promise.all([
    getCvBasics(cvId),
    getCvProfiles(cvId),
    getCvWork(cvId),
    getCvVolunteer(cvId),
    getCvEducation(cvId),
    getCvSkills(cvId),
    getCvProjects(cvId),
    getCvAwards(cvId),
    getCvCertificates(cvId),
    getCvPublications(cvId),
    getCvLanguages(cvId),
    getCvInterests(cvId),
    getCvReferences(cvId),
  ]);

  const resume: Resume = {
    basics: {
      ...(basics as Resume['basics']),
      profiles: nonEmpty(profiles as NonNullable<Resume['basics']>['profiles']),
    },
    work: nonEmpty(work as NonNullable<Resume['work']>),
    volunteer: nonEmpty(
      (volunteer as Record<string, unknown>[] | undefined)?.map(stripVolunteerHiddenStorage),
    ) as Resume['volunteer'],
    education: nonEmpty(education as NonNullable<Resume['education']>),
    skills: nonEmpty(skills as NonNullable<Resume['skills']>),
    projects: nonEmpty(projects as NonNullable<Resume['projects']>),
    awards: nonEmpty(awards as NonNullable<Resume['awards']>),
    certificates: nonEmpty(certificates as NonNullable<Resume['certificates']>),
    publications: nonEmpty(publications as NonNullable<Resume['publications']>),
    languages: nonEmpty(languages as NonNullable<Resume['languages']>),
    interests: nonEmpty(interests as NonNullable<Resume['interests']>),
    references: nonEmpty(references as NonNullable<Resume['references']>),
  };

  if (resume.basics?.image && parseMediaIdFromImageUrl(resume.basics.image)) {
    return withPreviewImageUrl(resume);
  }

  return resume;
}
