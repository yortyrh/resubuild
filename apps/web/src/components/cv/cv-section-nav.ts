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

export const CV_SECTIONS: { slug: CvSectionSlug; label: string }[] = [
  { slug: 'basics', label: 'Basics' },
  { slug: 'profiles', label: 'Social profiles' },
  { slug: 'work', label: 'Work' },
  { slug: 'volunteer', label: 'Volunteer' },
  { slug: 'education', label: 'Education' },
  { slug: 'skills', label: 'Skills' },
  { slug: 'projects', label: 'Projects' },
  { slug: 'awards', label: 'Awards' },
  { slug: 'certificates', label: 'Certificates' },
  { slug: 'publications', label: 'Publications' },
  { slug: 'languages', label: 'Languages' },
  { slug: 'interests', label: 'Interests' },
  { slug: 'references', label: 'References' },
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
