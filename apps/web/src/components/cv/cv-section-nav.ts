export const CV_SECTION_SLUGS = [
  'basics',
  'profiles',
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
] as const;

export type CvSectionSlug = (typeof CV_SECTION_SLUGS)[number];

export const CV_SECTIONS: { slug: CvSectionSlug; label: string; description: string }[] = [
  {
    slug: 'basics',
    label: 'Summary',
    description: 'Name, headline, contact details and the summary that opens your CV.',
  },
  {
    slug: 'profiles',
    label: 'Social profiles',
    description: 'Public profiles shown next to your contact details.',
  },
  { slug: 'work', label: 'Work', description: 'Jobs you held, sorted newest first.' },
  {
    slug: 'volunteer',
    label: 'Volunteer',
    description: 'Unpaid and community roles, sorted newest first.',
  },
  {
    slug: 'education',
    label: 'Education',
    description: 'Degrees, diplomas and programs, sorted newest first.',
  },
  { slug: 'skills', label: 'Skills', description: 'Skill groups with the keywords under each.' },
  { slug: 'projects', label: 'Projects', description: 'Notable work outside a single job.' },
  { slug: 'awards', label: 'Awards', description: 'Prizes, scholarships and recognitions.' },
  {
    slug: 'certificates',
    label: 'Certificates',
    description: 'Professional certifications and licenses.',
  },
  {
    slug: 'publications',
    label: 'Publications',
    description: 'Articles, papers, books and talks.',
  },
  { slug: 'languages', label: 'Languages', description: 'Languages you speak and how well.' },
  { slug: 'interests', label: 'Interests', description: 'Interests outside work.' },
  { slug: 'references', label: 'References', description: 'People who can vouch for your work.' },
];

const slugSet = new Set<string>(CV_SECTION_SLUGS);

export function isValidSectionSlug(slug: string): slug is CvSectionSlug {
  return slugSet.has(slug);
}

export function resolveSectionFromSlug(slug: string | undefined): CvSectionSlug {
  if (!slug || !isValidSectionSlug(slug)) {
    return 'basics';
  }
  return slug;
}

export function getSectionHref(cvId: string, slug: CvSectionSlug): string {
  if (slug === 'basics') {
    return `/dashboard/cv/${cvId}`;
  }
  return `/dashboard/cv/${cvId}/${slug}`;
}

export function getSectionLabel(slug: CvSectionSlug): string {
  return CV_SECTIONS.find((section) => section.slug === slug)?.label ?? 'Summary';
}

export function getSectionDescription(slug: CvSectionSlug): string {
  return CV_SECTIONS.find((section) => section.slug === slug)?.description ?? '';
}

export function resolveActiveSectionFromPathname(pathname: string): CvSectionSlug {
  const match = pathname.match(/\/dashboard\/cv\/[^/]+\/([^/]+)/);
  if (match && isValidSectionSlug(match[1])) {
    return match[1];
  }
  return 'basics';
}
