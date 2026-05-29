import { MIT_CLASSIC_SECTION_ORDER } from './primitives/sections';
import type { SectionKey } from './types';

export const CANONICAL_TEMPLATE_IDS = ['classic', 'modern', 'tabular', 'left'] as const;
export type CanonicalTemplateId = (typeof CANONICAL_TEMPLATE_IDS)[number];

export interface BasicsFieldVisibility {
  label: boolean;
  location: boolean;
  phone: boolean;
  email: boolean;
  url: boolean;
  profiles: boolean;
  image: boolean;
}

export interface WorkFieldVisibility {
  location: boolean;
  summary: boolean;
  highlights: boolean;
  url: boolean;
}

export interface EducationFieldVisibility {
  score: boolean;
  courses: boolean;
  url: boolean;
}

export interface ProjectFieldVisibility {
  entity: boolean;
  type: boolean;
  roles: boolean;
  description: boolean;
  highlights: boolean;
  keywords: boolean;
  url: boolean;
}

export interface CvTemplatePresentationConfig {
  sectionOrder: SectionKey[];
  hiddenSections: SectionKey[];
  sectionLabels: Partial<Record<SectionKey, string>>;
  basicsFields: BasicsFieldVisibility;
  workFields: WorkFieldVisibility;
  volunteerFields: WorkFieldVisibility;
  educationFields: EducationFieldVisibility;
  projectFields: ProjectFieldVisibility;
  skillsFields: { level: boolean };
  awardsFields: { awarder: boolean; summary: boolean };
  publicationsFields: { publisher: boolean; summary: boolean };
  certificatesFields: { issuer: boolean };
  interestsFields: { keywords: boolean };
  /** When true, volunteer section uses "Leadership Experiences" label. */
  leadershipVolunteer: boolean;
  sidebarNote?: string;
}

export const ALL_SECTION_KEYS: SectionKey[] = [
  'summary',
  'work',
  'volunteer',
  'education',
  'skills',
  'projects',
  'awards',
  'certificates',
  'publications',
  'languages',
  'interests',
  'references',
];

const DEFAULT_BASICS_FIELDS: BasicsFieldVisibility = {
  label: true,
  location: true,
  phone: true,
  email: true,
  url: true,
  profiles: true,
  image: false,
};

const DEFAULT_WORK_FIELDS: WorkFieldVisibility = {
  location: true,
  summary: true,
  highlights: true,
  url: true,
};

export function createDefaultPresentationConfig(
  overrides?: Partial<CvTemplatePresentationConfig>,
): CvTemplatePresentationConfig {
  const validKeys = new Set(ALL_SECTION_KEYS);
  const sectionOrder = (overrides?.sectionOrder ?? [...MIT_CLASSIC_SECTION_ORDER]).filter((key) =>
    validKeys.has(key),
  );
  const hiddenSections = (overrides?.hiddenSections ?? []).filter((key) => validKeys.has(key));

  return {
    sectionOrder,
    hiddenSections,
    sectionLabels: { ...overrides?.sectionLabels },
    basicsFields: { ...DEFAULT_BASICS_FIELDS, ...overrides?.basicsFields },
    workFields: { ...DEFAULT_WORK_FIELDS, ...overrides?.workFields },
    volunteerFields: { ...DEFAULT_WORK_FIELDS, ...overrides?.volunteerFields },
    educationFields: {
      score: true,
      courses: true,
      url: true,
      ...overrides?.educationFields,
    },
    projectFields: {
      entity: true,
      type: true,
      roles: true,
      description: true,
      highlights: true,
      keywords: true,
      url: true,
      ...overrides?.projectFields,
    },
    skillsFields: { level: true, ...overrides?.skillsFields },
    awardsFields: { awarder: true, summary: true, ...overrides?.awardsFields },
    publicationsFields: {
      publisher: true,
      summary: true,
      ...overrides?.publicationsFields,
    },
    certificatesFields: { issuer: true, ...overrides?.certificatesFields },
    interestsFields: { keywords: true, ...overrides?.interestsFields },
    leadershipVolunteer: overrides?.leadershipVolunteer ?? false,
    sidebarNote: overrides?.sidebarNote,
  };
}

/** Presets that matched former CAPD template section layouts. */
export const LEGACY_TEMPLATE_PRESETS: Record<string, Partial<CvTemplatePresentationConfig>> = {
  'mit-classic': {},
  'capd-first-year-tabular': {
    sectionOrder: ['education', 'work', 'skills', 'volunteer', 'projects'],
  },
  'capd-first-year-leadership': {
    sectionOrder: ['education', 'volunteer', 'work', 'skills'],
    leadershipVolunteer: true,
    sidebarNote: 'MIT Career Advising & Professional Development sample layout.',
  },
  'capd-undergraduate-mixed': {
    sectionOrder: ['summary', 'work', 'education', 'skills', 'projects', 'awards'],
  },
  'capd-undergraduate-standard': {
    sectionOrder: ['summary', 'education', 'work', 'skills', 'projects', 'awards'],
  },
  'capd-design': {
    sectionOrder: ['summary', 'work', 'projects', 'education', 'skills'],
  },
  'capd-global': {
    sectionOrder: ['summary', 'education', 'work', 'languages', 'skills', 'projects'],
    sectionLabels: { education: 'Education & Study Abroad' },
  },
  'capd-masters-icons': {
    sectionOrder: ['education', 'work', 'skills', 'projects', 'awards'],
  },
  'capd-masters-skills-first': {
    sectionOrder: ['summary', 'skills', 'work', 'education', 'awards', 'projects'],
    sectionLabels: { skills: 'Relevant Skills' },
  },
  'capd-masters-standard': {
    sectionOrder: ['education', 'work', 'projects', 'skills', 'awards'],
  },
  'capd-phd-academic': {
    sectionOrder: ['education', 'publications', 'awards', 'work', 'skills', 'projects'],
  },
  'capd-phd-summary': {
    sectionOrder: ['summary', 'skills', 'work', 'education', 'publications', 'awards'],
  },
  'capd-phd-summary-extended': {
    sectionOrder: ['summary', 'skills', 'publications', 'work', 'education', 'projects', 'awards'],
  },
  'capd-phd-consulting': {
    sectionOrder: ['summary', 'work', 'education', 'awards', 'skills', 'projects'],
    sectionLabels: { work: 'Experience & Internships' },
  },
  'capd-alum': {
    sectionOrder: ['summary', 'work', 'skills', 'projects', 'education', 'languages', 'interests'],
  },
};

export const LEGACY_TO_CANONICAL_TEMPLATE: Record<string, CanonicalTemplateId> = {
  'mit-classic': 'classic',
  'capd-first-year-tabular': 'tabular',
  'capd-first-year-leadership': 'classic',
  'capd-undergraduate-mixed': 'classic',
  'capd-undergraduate-standard': 'classic',
  'capd-design': 'modern',
  'capd-global': 'left',
  'capd-masters-icons': 'classic',
  'capd-masters-skills-first': 'classic',
  'capd-masters-standard': 'classic',
  'capd-phd-academic': 'classic',
  'capd-phd-summary': 'classic',
  'capd-phd-summary-extended': 'classic',
  'capd-phd-consulting': 'classic',
  'capd-alum': 'classic',
};

export function resolveCanonicalTemplateId(templateId: string): CanonicalTemplateId {
  if ((CANONICAL_TEMPLATE_IDS as readonly string[]).includes(templateId)) {
    return templateId as CanonicalTemplateId;
  }
  return LEGACY_TO_CANONICAL_TEMPLATE[templateId] ?? 'classic';
}

export function isKnownTemplateId(templateId: string): boolean {
  return (
    (CANONICAL_TEMPLATE_IDS as readonly string[]).includes(templateId) ||
    templateId in LEGACY_TO_CANONICAL_TEMPLATE
  );
}

export function getDefaultPresentationConfig(templateId: string): CvTemplatePresentationConfig {
  const canonical = resolveCanonicalTemplateId(templateId);
  const preset = LEGACY_TEMPLATE_PRESETS[templateId] ?? LEGACY_TEMPLATE_PRESETS[canonical] ?? {};
  return createDefaultPresentationConfig(preset);
}

export function mergePresentationConfig(
  base: CvTemplatePresentationConfig,
  patch: Partial<CvTemplatePresentationConfig> | null | undefined,
): CvTemplatePresentationConfig {
  if (!patch) return base;
  return createDefaultPresentationConfig({
    ...base,
    ...patch,
    sectionOrder: patch.sectionOrder ?? base.sectionOrder,
    hiddenSections: patch.hiddenSections ?? base.hiddenSections,
    sectionLabels: { ...base.sectionLabels, ...patch.sectionLabels },
    basicsFields: { ...base.basicsFields, ...patch.basicsFields },
    workFields: { ...base.workFields, ...patch.workFields },
    volunteerFields: { ...base.volunteerFields, ...patch.volunteerFields },
    educationFields: { ...base.educationFields, ...patch.educationFields },
    projectFields: { ...base.projectFields, ...patch.projectFields },
    skillsFields: { ...base.skillsFields, ...patch.skillsFields },
    awardsFields: { ...base.awardsFields, ...patch.awardsFields },
    publicationsFields: { ...base.publicationsFields, ...patch.publicationsFields },
    certificatesFields: { ...base.certificatesFields, ...patch.certificatesFields },
    interestsFields: { ...base.interestsFields, ...patch.interestsFields },
  });
}

export function visibleSectionOrder(config: CvTemplatePresentationConfig): SectionKey[] {
  const hidden = new Set(config.hiddenSections);
  const ordered = config.sectionOrder.filter((key) => !hidden.has(key));
  const seen = new Set(ordered);
  for (const key of ALL_SECTION_KEYS) {
    if (!hidden.has(key) && !seen.has(key)) {
      ordered.push(key);
    }
  }
  return ordered;
}
