import {
  cvAward,
  cvCertificate,
  cvEducation,
  cvInterest,
  cvLanguage,
  cvProfile,
  cvProject,
  cvPublication,
  cvReference,
  cvSkill,
  cvVolunteer,
  cvWork,
} from './schema/app';

/**
 * Normalized CV section tables keyed by SQL table name (the values of
 * `SECTION_TABLE_MAP` in `@resubuild/types`).
 */
export const sectionTablesByName = {
  cv_profile: cvProfile,
  cv_work: cvWork,
  cv_volunteer: cvVolunteer,
  cv_education: cvEducation,
  cv_award: cvAward,
  cv_certificate: cvCertificate,
  cv_publication: cvPublication,
  cv_skill: cvSkill,
  cv_language: cvLanguage,
  cv_interest: cvInterest,
  cv_reference: cvReference,
  cv_project: cvProject,
} as const;

export type SectionTableName = keyof typeof sectionTablesByName;
export type SectionTable = (typeof sectionTablesByName)[SectionTableName];

export function sectionTable(name: string): SectionTable {
  const table = sectionTablesByName[name as SectionTableName];
  if (!table) {
    throw new Error(`Unknown CV section table: ${name}`);
  }
  return table;
}
