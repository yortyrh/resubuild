import { createCapdTemplate } from './capd-factory';

export const capdFirstYearTabular = createCapdTemplate({
  id: 'capd-first-year-tabular',
  label: 'First-Year Tabular',
  description: 'Tabular two-column header with mixed section labels.',
  category: 'first-year',
  capdPage: 1,
  sectionOrder: ['education', 'work', 'skills', 'volunteer', 'projects'],
  headingStyle: 'sentence',
  headerStyle: 'tabular',
});

export const capdFirstYearLeadership = createCapdTemplate({
  id: 'capd-first-year-leadership',
  label: 'First-Year Leadership',
  description: 'Leadership and work experience blocks with MIT sidebar note.',
  category: 'first-year',
  capdPage: 2,
  sectionOrder: ['education', 'volunteer', 'work', 'skills'],
  headingStyle: 'uppercase',
  headerStyle: 'centered',
  leadershipVolunteer: true,
  sidebarNote: 'MIT Career Advising & Professional Development sample layout.',
});

export const capdUndergraduateMixed = createCapdTemplate({
  id: 'capd-undergraduate-mixed',
  label: 'Undergraduate Mixed',
  description: 'Sentence-case section titles; experience before education.',
  category: 'undergraduate',
  capdPage: 3,
  sectionOrder: ['summary', 'work', 'education', 'skills', 'projects', 'awards'],
  headingStyle: 'sentence',
  headerStyle: 'centered',
});

export const capdUndergraduateStandard = createCapdTemplate({
  id: 'capd-undergraduate-standard',
  label: 'Undergraduate Standard',
  description: 'ALL-CAPS sections with education before experience.',
  category: 'undergraduate',
  capdPage: 4,
  sectionOrder: ['summary', 'education', 'work', 'skills', 'projects', 'awards'],
  headingStyle: 'uppercase',
  headerStyle: 'centered',
});

export const capdDesign = createCapdTemplate({
  id: 'capd-design',
  label: 'Design',
  description: 'Design-oriented typography and spacing for creative roles.',
  category: 'design',
  capdPage: 5,
  sectionOrder: ['summary', 'work', 'projects', 'education', 'skills'],
  headingStyle: 'sentence',
  headerStyle: 'design',
  articleClass:
    'max-w-[8.5in] mx-auto my-6 print:my-0 bg-white text-neutral-900 font-resume text-[11pt] leading-relaxed shadow-sm print:shadow-none p-[0.6in] print:p-0',
});

export const capdGlobal = createCapdTemplate({
  id: 'capd-global',
  label: 'Global',
  description: 'International education emphasis and study-abroad formatting.',
  category: 'global',
  capdPage: 6,
  sectionOrder: ['summary', 'education', 'work', 'languages', 'skills', 'projects'],
  headingStyle: 'uppercase',
  headerStyle: 'left',
  sectionLabels: { education: 'Education & Study Abroad' },
});

export const capdMastersIcons = createCapdTemplate({
  id: 'capd-masters-icons',
  label: 'Masters Icons',
  description: 'Symbol separators in header and skills; compact entry blocks.',
  category: 'masters',
  capdPage: 7,
  sectionOrder: ['education', 'work', 'skills', 'projects', 'awards'],
  headingStyle: 'uppercase',
  headerStyle: 'icons',
});

export const capdMastersSkillsFirst = createCapdTemplate({
  id: 'capd-masters-skills-first',
  label: 'Masters Skills First',
  description: 'Relevant skills before experience with honors block.',
  category: 'masters',
  capdPage: 8,
  sectionOrder: ['summary', 'skills', 'work', 'education', 'awards', 'projects'],
  headingStyle: 'uppercase',
  headerStyle: 'centered',
  sectionLabels: { skills: 'Relevant Skills' },
});

export const capdMastersStandard = createCapdTemplate({
  id: 'capd-masters-standard',
  label: 'Masters Standard',
  description: 'Education-first masters layout with experience and projects.',
  category: 'masters',
  capdPage: 7,
  sectionOrder: ['education', 'work', 'projects', 'skills', 'awards'],
  headingStyle: 'uppercase',
  headerStyle: 'centered',
});

export const capdPhdAcademic = createCapdTemplate({
  id: 'capd-phd-academic',
  label: 'PhD Academic',
  description: 'Education-first layout with dense publications and fellowships.',
  category: 'phd',
  capdPage: 9,
  sectionOrder: ['education', 'publications', 'awards', 'work', 'skills', 'projects'],
  headingStyle: 'uppercase',
  headerStyle: 'left',
});

export const capdPhdSummary = createCapdTemplate({
  id: 'capd-phd-summary',
  label: 'PhD Summary',
  description: 'Summary and skills before experience; multi-page friendly.',
  category: 'phd',
  capdPage: 10,
  sectionOrder: ['summary', 'skills', 'work', 'education', 'publications', 'awards'],
  headingStyle: 'uppercase',
  headerStyle: 'centered',
});

export const capdPhdSummaryExtended = createCapdTemplate({
  id: 'capd-phd-summary-extended',
  label: 'PhD Summary Extended',
  description: 'Extended PhD layout for multi-page résumés (CAPD p.11).',
  category: 'phd',
  capdPage: 11,
  sectionOrder: ['summary', 'skills', 'publications', 'work', 'education', 'projects', 'awards'],
  headingStyle: 'uppercase',
  headerStyle: 'centered',
});

export const capdPhdConsulting = createCapdTemplate({
  id: 'capd-phd-consulting',
  label: 'PhD Consulting',
  description: 'Industry internships and leadership with inline awards.',
  category: 'phd',
  capdPage: 12,
  sectionOrder: ['summary', 'work', 'education', 'awards', 'skills', 'projects'],
  headingStyle: 'uppercase',
  headerStyle: 'centered',
  sectionLabels: { work: 'Experience & Internships' },
});

export const capdAlum = createCapdTemplate({
  id: 'capd-alum',
  label: 'Alum',
  description: 'Summary and experience first; education last with additional info.',
  category: 'alum',
  capdPage: '13–14',
  sectionOrder: ['summary', 'work', 'skills', 'projects', 'education', 'additionalInfo'],
  headingStyle: 'uppercase',
  headerStyle: 'centered',
});

export const ALL_CAPD_TEMPLATES = [
  capdFirstYearTabular,
  capdFirstYearLeadership,
  capdUndergraduateMixed,
  capdUndergraduateStandard,
  capdDesign,
  capdGlobal,
  capdMastersIcons,
  capdMastersSkillsFirst,
  capdMastersStandard,
  capdPhdAcademic,
  capdPhdSummary,
  capdPhdSummaryExtended,
  capdPhdConsulting,
  capdAlum,
];
