import type {
  Resume,
  ResumeAward,
  ResumeBasics,
  ResumeCertificate,
  ResumeEducation,
  ResumeInterest,
  ResumeLanguage,
  ResumeLocation,
  ResumeProfile,
  ResumeProject,
  ResumePublication,
  ResumeReference,
  ResumeSkill,
  ResumeVolunteer,
  ResumeWork,
} from '@resumind/types';
import type { HeaderStyle, HeadingStyle, SectionKey } from '../../types';
import { escapeHtml, formatDateRange, formatIsoDate, hasItems, normalizeUrl } from '../html';
import { renderMarkdownField } from '../markdown';

export interface SectionRenderContext {
  headingStyle: HeadingStyle;
  sectionLabels?: Partial<Record<SectionKey, string>>;
  headerStyle?: HeaderStyle;
  sidebarNote?: string;
  leadershipVolunteer?: boolean;
}

const DEFAULT_LABELS: Record<SectionKey, string> = {
  summary: 'Summary',
  work: 'Experience',
  volunteer: 'Volunteer',
  education: 'Education',
  skills: 'Skills',
  projects: 'Projects',
  awards: 'Awards',
  certificates: 'Certificates',
  publications: 'Publications',
  languages: 'Languages',
  interests: 'Interests',
  references: 'References',
  additionalInfo: 'Additional Information',
};

function sectionLabel(key: SectionKey, ctx: SectionRenderContext): string {
  if (key === 'volunteer' && ctx.leadershipVolunteer) {
    return ctx.sectionLabels?.volunteer ?? 'Leadership Experiences';
  }
  if (key === 'work' && ctx.leadershipVolunteer) {
    return ctx.sectionLabels?.work ?? 'Work Experience';
  }
  return ctx.sectionLabels?.[key] ?? DEFAULT_LABELS[key];
}

function sectionHeading(id: string, label: string, style: HeadingStyle): string {
  const displayLabel = style === 'uppercase' ? label.toUpperCase() : label;
  const headingClass =
    style === 'uppercase'
      ? 'text-xs font-bold uppercase tracking-widest text-neutral-950 border-b border-neutral-400 pb-0.5 mb-2'
      : 'text-sm font-semibold text-neutral-950 border-b border-neutral-300 pb-0.5 mb-2';
  return `<h2 id="${id}" class="${headingClass}">${escapeHtml(displayLabel)}</h2>`;
}

function dateLine(dateRange: string): string {
  if (!dateRange) return '';
  return `<p class="text-sm text-neutral-800 whitespace-nowrap shrink-0">${dateRange}</p>`;
}

function employerDateRow(employerHtml: string, dateRange: string): string {
  return `<div class="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-0.5">
    <p class="font-bold text-neutral-950">${employerHtml}</p>
    ${dateLine(dateRange)}
  </div>`;
}

function markdownBulletList(items: string[] | undefined): string {
  if (!hasItems(items)) return '';
  const listItems = items;
  const lis = listItems.map((item) => `<li>${renderMarkdownField(item)}</li>`).join('');
  return `<ul class="mt-1 list-disc pl-5 space-y-0.5 text-neutral-900">${lis}</ul>`;
}

function linkedText(label: string | undefined, url: string | undefined): string {
  if (!label) return '';
  const href = normalizeUrl(url);
  if (!href) return escapeHtml(label);
  return `<a class="no-underline text-inherit hover:text-neutral-600 print:text-inherit" href="${escapeHtml(href)}" rel="noopener noreferrer">${escapeHtml(label)}</a>`;
}

export function renderBasicsHeader(
  basics: ResumeBasics | undefined,
  headerStyle: HeaderStyle = 'centered',
): string {
  if (!basics) return '';

  const location = formatLocation(basics.location);
  const contactParts: string[] = [];

  if (location) contactParts.push(`<span>${escapeHtml(location)}</span>`);
  if (basics.phone) contactParts.push(`<span>${escapeHtml(basics.phone)}</span>`);
  if (basics.email) {
    contactParts.push(
      `<a class="no-underline text-inherit" href="mailto:${escapeHtml(basics.email)}">${escapeHtml(basics.email)}</a>`,
    );
  }
  if (basics.url) {
    const href = normalizeUrl(basics.url);
    contactParts.push(
      `<a class="no-underline text-inherit" href="${escapeHtml(href ?? basics.url)}" rel="noopener noreferrer">${escapeHtml(basics.url.replace(/^https?:\/\//, ''))}</a>`,
    );
  }

  const contactLine = contactParts.length
    ? `<p class="mt-2 text-sm text-neutral-800">${contactParts.join(' · ')}</p>`
    : '';

  const profileLinks = hasItems(basics.profiles)
    ? basics.profiles
        .filter((profile: ResumeProfile) => profile?.network && profile?.url)
        .map(
          (profile: ResumeProfile) =>
            `<a class="no-underline text-inherit" href="${escapeHtml(normalizeUrl(profile.url) ?? '')}" rel="noopener noreferrer">${escapeHtml(profile.network ?? '')}</a>`,
        )
        .join(' · ')
    : '';

  const profileLine = profileLinks
    ? `<p class="mt-1 text-sm text-neutral-800">${profileLinks}</p>`
    : '';

  const separator = headerStyle === 'icons' ? ' <span aria-hidden="true">☞</span> ' : ' · ';
  const nameClass =
    headerStyle === 'design'
      ? 'text-3xl font-light tracking-wide text-neutral-900'
      : 'text-2xl font-bold tracking-tight text-neutral-950';

  if (headerStyle === 'tabular') {
    return `<header class="border-b border-neutral-400 pb-3">
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div>
          <h1 class="${nameClass}">${escapeHtml(basics.name ?? 'Resume')}</h1>
          ${basics.label ? `<p class="text-sm text-neutral-800 mt-0.5">${escapeHtml(basics.label)}</p>` : ''}
        </div>
        <div class="text-sm text-neutral-800 sm:text-right">
          ${contactParts.join('<br />')}
          ${profileLine ? profileLine.replace('<p class="mt-1 text-sm text-neutral-800">', '<p class="mt-1">').replace('</p>', '</p>') : ''}
        </div>
      </div>
    </header>`;
  }

  if (headerStyle === 'left') {
    return `<header class="border-b border-neutral-400 pb-3 text-left">
      <h1 class="${nameClass}">${escapeHtml(basics.name ?? 'Resume')}</h1>
      ${basics.label ? `<p class="text-sm text-neutral-800 mt-0.5">${escapeHtml(basics.label)}</p>` : ''}
      ${contactLine.replace(' · ', separator)}
      ${profileLine}
    </header>`;
  }

  return `<header class="text-center border-b border-neutral-400 pb-3">
    <h1 class="${nameClass}">${escapeHtml(basics.name ?? 'Resume')}</h1>
    ${basics.label ? `<p class="text-sm text-neutral-800 mt-0.5">${escapeHtml(basics.label)}</p>` : ''}
    ${contactLine.replace(' · ', separator)}
    ${profileLine}
  </header>`;
}

export function renderSummarySection(
  basics: ResumeBasics | undefined,
  ctx: SectionRenderContext,
): string {
  if (!basics?.summary?.trim()) return '';
  const label = sectionLabel('summary', ctx);
  return `<section class="mt-4" aria-labelledby="summary-heading">
    ${sectionHeading('summary-heading', label, ctx.headingStyle)}
    <div class="text-neutral-900 text-justify">${renderMarkdownField(basics.summary)}</div>
  </section>`;
}

export function renderWorkSection(
  work: ResumeWork[] | undefined,
  ctx: SectionRenderContext,
): string {
  if (!hasItems(work)) return '';
  const items = work;
  const label = sectionLabel('work', ctx);
  const entries = items
    .map((item) => {
      const dateRange = escapeHtml(formatDateRange(item.startDate, item.endDate));
      const employerParts = [linkedText(item.name, item.url)];
      if (item.location) employerParts.push(escapeHtml(item.location));
      const employerHtml = employerParts.filter(Boolean).join(', ');
      return `<div>
        ${employerDateRow(employerHtml, dateRange)}
        ${item.position ? `<p class="italic text-neutral-900 mt-0.5">${escapeHtml(item.position)}</p>` : ''}
        ${item.summary ? `<div class="text-neutral-900 mt-1">${renderMarkdownField(item.summary)}</div>` : ''}
        ${markdownBulletList(item.highlights)}
      </div>`;
    })
    .join('');

  return `<section class="mt-5" aria-labelledby="experience-heading">
    ${sectionHeading('experience-heading', label, ctx.headingStyle)}
    <div class="mt-2 space-y-4">${entries}</div>
  </section>`;
}

export function renderVolunteerSection(
  volunteer: ResumeVolunteer[] | undefined,
  ctx: SectionRenderContext,
): string {
  if (!hasItems(volunteer)) return '';
  const items = volunteer;
  const label = sectionLabel('volunteer', ctx);
  const entries = items
    .map((item) => {
      const dateRange = escapeHtml(formatDateRange(item.startDate, item.endDate));
      const employerHtml = linkedText(item.organization, item.url);
      return `<div>
        ${employerDateRow(employerHtml, dateRange)}
        ${item.position ? `<p class="italic text-neutral-900 mt-0.5">${escapeHtml(item.position)}</p>` : ''}
        ${item.summary ? `<div class="text-neutral-900 mt-1">${renderMarkdownField(item.summary)}</div>` : ''}
        ${markdownBulletList(item.highlights)}
      </div>`;
    })
    .join('');

  const headingId = ctx.leadershipVolunteer ? 'leadership-heading' : 'volunteer-heading';
  return `<section class="mt-5" aria-labelledby="${headingId}">
    ${sectionHeading(headingId, label, ctx.headingStyle)}
    <div class="mt-2 space-y-4">${entries}</div>
  </section>`;
}

export function renderEducationSection(
  education: ResumeEducation[] | undefined,
  ctx: SectionRenderContext,
  options?: { emphasizeInternational?: boolean },
): string {
  if (!hasItems(education)) return '';
  const items = education;
  const label = sectionLabel('education', ctx);
  const entries = items
    .map((item) => {
      const dateRange = escapeHtml(formatDateRange(item.startDate, item.endDate));
      const institutionHtml = linkedText(item.institution, item.url);
      const degreeLine = [item.studyType, item.area].filter(Boolean).join(', ');
      const degreeExtra = [degreeLine, item.score].filter(Boolean).join(' · ');
      const intlNote =
        options?.emphasizeInternational && item.area
          ? `<p class="text-sm italic text-neutral-700">${escapeHtml(item.area)}</p>`
          : '';
      return `<div>
        ${employerDateRow(institutionHtml, dateRange)}
        ${degreeExtra ? `<p class="font-bold text-neutral-950 mt-0.5">${escapeHtml(degreeExtra)}</p>` : ''}
        ${intlNote}
        ${markdownBulletList(item.courses)}
      </div>`;
    })
    .join('');

  return `<section class="mt-5" aria-labelledby="education-heading">
    ${sectionHeading('education-heading', label, ctx.headingStyle)}
    <div class="mt-2 space-y-3">${entries}</div>
  </section>`;
}

export function renderSkillsSection(
  skills: ResumeSkill[] | undefined,
  ctx: SectionRenderContext,
): string {
  if (!hasItems(skills)) return '';
  const items = skills;
  const label = sectionLabel('skills', ctx);
  const rows = items
    .map((item) => {
      const keywords = hasItems(item.keywords) ? item.keywords.join(', ') : '';
      const value = [keywords, item.level].filter(Boolean).join(' — ');
      if (!item.name) return '';
      return `<p class="text-neutral-900"><strong>${escapeHtml(item.name)}:</strong> ${escapeHtml(value)}</p>`;
    })
    .filter(Boolean)
    .join('');

  return `<section class="mt-5" aria-labelledby="skills-heading">
    ${sectionHeading('skills-heading', label, ctx.headingStyle)}
    <div class="mt-2 space-y-1">${rows}</div>
  </section>`;
}

export function renderProjectsSection(
  projects: ResumeProject[] | undefined,
  ctx: SectionRenderContext,
): string {
  if (!hasItems(projects)) return '';
  const items = projects;
  const label = sectionLabel('projects', ctx);
  const entries = items
    .map((item) => {
      const dateRange = escapeHtml(formatDateRange(item.startDate, item.endDate));
      const titleHtml = linkedText(item.name, item.url);
      const meta = [item.entity, item.type, hasItems(item.roles) ? item.roles.join(', ') : '']
        .filter(Boolean)
        .join(' · ');
      const keywords = hasItems(item.keywords) ? item.keywords.join(', ') : '';
      return `<div>
        ${employerDateRow(titleHtml, dateRange)}
        ${meta ? `<p class="text-sm font-medium text-neutral-800">${escapeHtml(meta)}</p>` : ''}
        ${item.description ? `<div class="italic text-neutral-900 mt-1">${renderMarkdownField(item.description)}</div>` : ''}
        ${keywords ? `<p class="text-sm text-neutral-800 mt-1">${escapeHtml(keywords)}</p>` : ''}
        ${markdownBulletList(item.highlights)}
      </div>`;
    })
    .join('');

  return `<section class="mt-5" aria-labelledby="projects-heading">
    ${sectionHeading('projects-heading', label, ctx.headingStyle)}
    <div class="mt-2 space-y-4">${entries}</div>
  </section>`;
}

export function renderAwardsSection(
  awards: ResumeAward[] | undefined,
  ctx: SectionRenderContext,
): string {
  if (!hasItems(awards)) return '';
  const items = awards;
  const label = sectionLabel('awards', ctx);
  const entries = items
    .map((item) => {
      const date = escapeHtml(formatIsoDate(item.date));
      return `<div>
        ${employerDateRow(escapeHtml(item.title ?? ''), date)}
        ${item.awarder ? `<p class="text-sm font-medium text-neutral-800">${escapeHtml(item.awarder)}</p>` : ''}
        ${item.summary ? `<div class="text-neutral-900 mt-1">${renderMarkdownField(item.summary)}</div>` : ''}
      </div>`;
    })
    .join('');

  return `<section class="mt-5" aria-labelledby="awards-heading">
    ${sectionHeading('awards-heading', label, ctx.headingStyle)}
    <div class="mt-2 space-y-3">${entries}</div>
  </section>`;
}

export function renderCertificatesSection(
  certificates: ResumeCertificate[] | undefined,
  ctx: SectionRenderContext,
): string {
  if (!hasItems(certificates)) return '';
  const items = certificates;
  const label = sectionLabel('certificates', ctx);
  const entries = items
    .map((item) => {
      const date = escapeHtml(formatIsoDate(item.date));
      return `<div>
        ${employerDateRow(linkedText(item.name, item.url), date)}
        ${item.issuer ? `<p class="text-sm font-medium text-neutral-800">${escapeHtml(item.issuer)}</p>` : ''}
      </div>`;
    })
    .join('');

  return `<section class="mt-5" aria-labelledby="certificates-heading">
    ${sectionHeading('certificates-heading', label, ctx.headingStyle)}
    <div class="mt-2 space-y-3">${entries}</div>
  </section>`;
}

export function renderPublicationsSection(
  publications: ResumePublication[] | undefined,
  ctx: SectionRenderContext,
): string {
  if (!hasItems(publications)) return '';
  const items = publications;
  const label = sectionLabel('publications', ctx);
  const entries = items
    .map((item) => {
      const date = escapeHtml(formatIsoDate(item.releaseDate));
      return `<div>
        ${employerDateRow(linkedText(item.name, item.url), date)}
        ${item.publisher ? `<p class="text-sm font-medium text-neutral-800">${escapeHtml(item.publisher)}</p>` : ''}
        ${item.summary ? `<div class="text-neutral-900 mt-1">${renderMarkdownField(item.summary)}</div>` : ''}
      </div>`;
    })
    .join('');

  return `<section class="mt-5" aria-labelledby="publications-heading">
    ${sectionHeading('publications-heading', label, ctx.headingStyle)}
    <div class="mt-2 space-y-3">${entries}</div>
  </section>`;
}

export function renderLanguagesSection(
  languages: ResumeLanguage[] | undefined,
  ctx: SectionRenderContext,
): string {
  if (!hasItems(languages)) return '';
  const items = languages;
  const label = sectionLabel('languages', ctx);
  const listItems = items
    .map(
      (item) =>
        `<li><span class="font-semibold text-neutral-950">${escapeHtml(item.language)}</span>${item.fluency ? ` — ${escapeHtml(item.fluency)}` : ''}</li>`,
    )
    .join('');

  return `<section class="mt-5" aria-labelledby="languages-heading">
    ${sectionHeading('languages-heading', label, ctx.headingStyle)}
    <ul class="mt-2 list-none space-y-0.5 pl-0 text-neutral-900">${listItems}</ul>
  </section>`;
}

export function renderInterestsSection(
  interests: ResumeInterest[] | undefined,
  ctx: SectionRenderContext,
): string {
  if (!hasItems(interests)) return '';
  const items = interests;
  const label = sectionLabel('interests', ctx);
  const rows = items
    .map((item) => {
      const keywords = hasItems(item.keywords) ? item.keywords.join(', ') : '';
      return `<p class="text-neutral-900"><strong>${escapeHtml(item.name)}:</strong> ${escapeHtml(keywords)}</p>`;
    })
    .join('');

  return `<section class="mt-5" aria-labelledby="interests-heading">
    ${sectionHeading('interests-heading', label, ctx.headingStyle)}
    <div class="mt-2 space-y-1">${rows}</div>
  </section>`;
}

export function renderReferencesSection(
  references: ResumeReference[] | undefined,
  ctx: SectionRenderContext,
): string {
  if (!hasItems(references)) return '';
  const items = references;
  const label = sectionLabel('references', ctx);
  const entries = items
    .map(
      (item) => `<div>
        <h3 class="font-semibold text-neutral-950">${escapeHtml(item.name)}</h3>
        ${item.reference ? `<div class="text-neutral-900 mt-1">${renderMarkdownField(item.reference)}</div>` : ''}
      </div>`,
    )
    .join('');

  return `<section class="mt-5" aria-labelledby="references-heading">
    ${sectionHeading('references-heading', label, ctx.headingStyle)}
    <div class="mt-2 space-y-3">${entries}</div>
  </section>`;
}

export function renderAdditionalInfoSection(resume: Resume, ctx: SectionRenderContext): string {
  const parts: string[] = [];
  if (hasItems(resume.languages)) {
    parts.push(
      resume.languages
        .map(
          (item: ResumeLanguage) =>
            `<p><strong>${escapeHtml(item.language)}</strong>${item.fluency ? `: ${escapeHtml(item.fluency)}` : ''}</p>`,
        )
        .join(''),
    );
  }
  if (hasItems(resume.interests)) {
    parts.push(
      resume.interests
        .map((item: ResumeInterest) => {
          const keywords = hasItems(item.keywords) ? item.keywords.join(', ') : '';
          return `<p><strong>${escapeHtml(item.name)}:</strong> ${escapeHtml(keywords)}</p>`;
        })
        .join(''),
    );
  }
  if (parts.length === 0) return '';

  const label = sectionLabel('additionalInfo', ctx);
  return `<section class="mt-5" aria-labelledby="additional-info-heading">
    ${sectionHeading('additional-info-heading', label, ctx.headingStyle)}
    <div class="mt-2 space-y-1">${parts.join('')}</div>
  </section>`;
}

export function renderSection(
  key: SectionKey,
  resume: Resume,
  ctx: SectionRenderContext,
  options?: { emphasizeInternational?: boolean },
): string {
  switch (key) {
    case 'summary':
      return renderSummarySection(resume.basics, ctx);
    case 'work':
      return renderWorkSection(resume.work, ctx);
    case 'volunteer':
      return renderVolunteerSection(resume.volunteer, ctx);
    case 'education':
      return renderEducationSection(resume.education, ctx, options);
    case 'skills':
      return renderSkillsSection(resume.skills, ctx);
    case 'projects':
      return renderProjectsSection(resume.projects, ctx);
    case 'awards':
      return renderAwardsSection(resume.awards, ctx);
    case 'certificates':
      return renderCertificatesSection(resume.certificates, ctx);
    case 'publications':
      return renderPublicationsSection(resume.publications, ctx);
    case 'languages':
      return renderLanguagesSection(resume.languages, ctx);
    case 'interests':
      return renderInterestsSection(resume.interests, ctx);
    case 'references':
      return renderReferencesSection(resume.references, ctx);
    case 'additionalInfo':
      return renderAdditionalInfoSection(resume, ctx);
    default:
      return '';
  }
}

export function renderSections(
  resume: Resume,
  sectionOrder: SectionKey[],
  ctx: SectionRenderContext,
  options?: { emphasizeInternational?: boolean },
): string {
  const sidebar = ctx.sidebarNote
    ? `<aside class="text-xs text-neutral-600 border-l-2 border-neutral-300 pl-3 mb-4">${escapeHtml(ctx.sidebarNote)}</aside>`
    : '';

  return [
    renderBasicsHeader(resume.basics, ctx.headerStyle ?? 'centered'),
    sidebar,
    ...sectionOrder.map((key) => renderSection(key, resume, ctx, options)),
  ]
    .filter(Boolean)
    .join('\n');
}

function formatLocation(location: ResumeLocation | undefined): string {
  if (!location || typeof location !== 'object') return '';
  const parts = [location.city, location.region, location.countryCode].filter(Boolean);
  return parts.join(', ');
}

export const MIT_CLASSIC_SECTION_ORDER: SectionKey[] = [
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
