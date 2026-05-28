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
import { renderMarkdownField } from './render-markdown-field';

export const PDF_EXPORT_OPTIONS = {
  format: 'Letter' as const,
  printBackground: true,
  margin: { top: '0.5in', right: '0.5in', bottom: '0.5in', left: '0.5in' },
};

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function normalizeUrl(url: string | undefined): string | null {
  if (!url) return null;
  const trimmed = String(url).trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

function formatIsoDate(value: string | undefined): string {
  if (!value) return '';
  const match = String(value).match(/^(\d{4})(?:-(\d{2}))?(?:-(\d{2}))?/);
  if (!match) return escapeHtml(value);
  const [, year, month] = match;
  if (!month) return year ?? '';
  const date = new Date(Number(year), Number(month) - 1, 1);
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

function formatDateRange(startDate: string | undefined, endDate: string | undefined): string {
  const start = formatIsoDate(startDate);
  const end = endDate ? formatIsoDate(endDate) : 'Present';
  if (!start && !endDate) return '';
  if (!start) return end;
  return `${start} – ${end}`;
}

function formatLocation(location: ResumeLocation | undefined): string {
  if (!location || typeof location !== 'object') return '';
  const parts = [location.city, location.region, location.countryCode].filter(Boolean);
  return parts.join(', ');
}

function hasItems<T>(array: T[] | undefined): array is T[] {
  return Array.isArray(array) && array.length > 0;
}

function sectionHeading(id: string, label: string): string {
  return `<h2 id="${id}" class="text-xs font-bold uppercase tracking-widest text-neutral-950 border-b border-neutral-400 pb-0.5 mb-2">${escapeHtml(label)}</h2>`;
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
  const lis = items.map((item) => `<li>${renderMarkdownField(item)}</li>`).join('');
  return `<ul class="mt-1 list-disc pl-5 space-y-0.5 text-neutral-900">${lis}</ul>`;
}

function linkedText(label: string | undefined, url: string | undefined): string {
  if (!label) return '';
  const href = normalizeUrl(url);
  if (!href) return escapeHtml(label);
  return `<a class="no-underline text-inherit hover:text-neutral-600 print:text-inherit" href="${escapeHtml(href)}" rel="noopener noreferrer">${escapeHtml(label)}</a>`;
}

function renderBasics(basics: ResumeBasics | undefined): string {
  if (!basics) return '';

  const location = formatLocation(basics.location);
  const contactParts: string[] = [];

  if (location) {
    contactParts.push(`<span>${escapeHtml(location)}</span>`);
  }
  if (basics.phone) {
    contactParts.push(`<span>${escapeHtml(basics.phone)}</span>`);
  }
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

  return `<header class="text-center border-b border-neutral-400 pb-3">
    <h1 class="text-2xl font-bold tracking-tight text-neutral-950">${escapeHtml(basics.name ?? 'Resume')}</h1>
    ${basics.label ? `<p class="text-sm text-neutral-800 mt-0.5">${escapeHtml(basics.label)}</p>` : ''}
    ${contactLine}
    ${profileLine}
  </header>`;
}

function renderSummary(basics: ResumeBasics | undefined): string {
  if (!basics?.summary?.trim()) return '';
  return `<section class="mt-4" aria-labelledby="summary-heading">
    ${sectionHeading('summary-heading', 'Summary')}
    <div class="text-neutral-900 text-justify">${renderMarkdownField(basics.summary)}</div>
  </section>`;
}

function renderWork(work: ResumeWork[] | undefined): string {
  if (!hasItems(work)) return '';
  const entries = work
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
    ${sectionHeading('experience-heading', 'Experience')}
    <div class="mt-2 space-y-4">${entries}</div>
  </section>`;
}

function renderVolunteer(volunteer: ResumeVolunteer[] | undefined): string {
  if (!hasItems(volunteer)) return '';
  const entries = volunteer
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

  return `<section class="mt-5" aria-labelledby="volunteer-heading">
    ${sectionHeading('volunteer-heading', 'Volunteer')}
    <div class="mt-2 space-y-4">${entries}</div>
  </section>`;
}

function renderEducation(education: ResumeEducation[] | undefined): string {
  if (!hasItems(education)) return '';
  const entries = education
    .map((item) => {
      const dateRange = escapeHtml(formatDateRange(item.startDate, item.endDate));
      const institutionHtml = linkedText(item.institution, item.url);
      const degreeLine = [item.studyType, item.area].filter(Boolean).join(', ');
      const degreeExtra = [degreeLine, item.score].filter(Boolean).join(' · ');
      return `<div>
        ${employerDateRow(institutionHtml, dateRange)}
        ${degreeExtra ? `<p class="font-bold text-neutral-950 mt-0.5">${escapeHtml(degreeExtra)}</p>` : ''}
        ${markdownBulletList(item.courses)}
      </div>`;
    })
    .join('');

  return `<section class="mt-5" aria-labelledby="education-heading">
    ${sectionHeading('education-heading', 'Education')}
    <div class="mt-2 space-y-3">${entries}</div>
  </section>`;
}

function renderSkills(skills: ResumeSkill[] | undefined): string {
  if (!hasItems(skills)) return '';
  const rows = skills
    .map((item) => {
      const keywords = hasItems(item.keywords) ? item.keywords.join(', ') : '';
      const value = [keywords, item.level].filter(Boolean).join(' — ');
      if (!item.name) return '';
      return `<p class="text-neutral-900"><strong>${escapeHtml(item.name)}:</strong> ${escapeHtml(value)}</p>`;
    })
    .filter(Boolean)
    .join('');

  return `<section class="mt-5" aria-labelledby="skills-heading">
    ${sectionHeading('skills-heading', 'Skills')}
    <div class="mt-2 space-y-1">${rows}</div>
  </section>`;
}

function renderProjects(projects: ResumeProject[] | undefined): string {
  if (!hasItems(projects)) return '';
  const entries = projects
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
    ${sectionHeading('projects-heading', 'Projects')}
    <div class="mt-2 space-y-4">${entries}</div>
  </section>`;
}

function renderAwards(awards: ResumeAward[] | undefined): string {
  if (!hasItems(awards)) return '';
  const entries = awards
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
    ${sectionHeading('awards-heading', 'Awards')}
    <div class="mt-2 space-y-3">${entries}</div>
  </section>`;
}

function renderCertificates(certificates: ResumeCertificate[] | undefined): string {
  if (!hasItems(certificates)) return '';
  const entries = certificates
    .map((item) => {
      const date = escapeHtml(formatIsoDate(item.date));
      return `<div>
        ${employerDateRow(linkedText(item.name, item.url), date)}
        ${item.issuer ? `<p class="text-sm font-medium text-neutral-800">${escapeHtml(item.issuer)}</p>` : ''}
      </div>`;
    })
    .join('');

  return `<section class="mt-5" aria-labelledby="certificates-heading">
    ${sectionHeading('certificates-heading', 'Certificates')}
    <div class="mt-2 space-y-3">${entries}</div>
  </section>`;
}

function renderPublications(publications: ResumePublication[] | undefined): string {
  if (!hasItems(publications)) return '';
  const entries = publications
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
    ${sectionHeading('publications-heading', 'Publications')}
    <div class="mt-2 space-y-3">${entries}</div>
  </section>`;
}

function renderLanguages(languages: ResumeLanguage[] | undefined): string {
  if (!hasItems(languages)) return '';
  const items = languages
    .map(
      (item) =>
        `<li><span class="font-semibold text-neutral-950">${escapeHtml(item.language)}</span>${item.fluency ? ` — ${escapeHtml(item.fluency)}` : ''}</li>`,
    )
    .join('');

  return `<section class="mt-5" aria-labelledby="languages-heading">
    ${sectionHeading('languages-heading', 'Languages')}
    <ul class="mt-2 list-none space-y-0.5 pl-0 text-neutral-900">${items}</ul>
  </section>`;
}

function renderInterests(interests: ResumeInterest[] | undefined): string {
  if (!hasItems(interests)) return '';
  const rows = interests
    .map((item) => {
      const keywords = hasItems(item.keywords) ? item.keywords.join(', ') : '';
      return `<p class="text-neutral-900"><strong>${escapeHtml(item.name)}:</strong> ${escapeHtml(keywords)}</p>`;
    })
    .join('');

  return `<section class="mt-5" aria-labelledby="interests-heading">
    ${sectionHeading('interests-heading', 'Interests')}
    <div class="mt-2 space-y-1">${rows}</div>
  </section>`;
}

function renderReferences(references: ResumeReference[] | undefined): string {
  if (!hasItems(references)) return '';
  const entries = references
    .map(
      (item) => `<div>
        <h3 class="font-semibold text-neutral-950">${escapeHtml(item.name)}</h3>
        ${item.reference ? `<div class="text-neutral-900 mt-1">${renderMarkdownField(item.reference)}</div>` : ''}
      </div>`,
    )
    .join('');

  return `<section class="mt-5" aria-labelledby="references-heading">
    ${sectionHeading('references-heading', 'References')}
    <div class="mt-2 space-y-3">${entries}</div>
  </section>`;
}

/** Render a full MIT-format HTML document from JSON Resume data. */
export function renderResumeHtml(resume: Resume): string {
  const title = resume?.basics?.name ? `${resume.basics.name} — Resume` : 'Resume';

  const body = [
    renderBasics(resume.basics),
    renderSummary(resume.basics),
    renderWork(resume.work),
    renderVolunteer(resume.volunteer),
    renderEducation(resume.education),
    renderSkills(resume.skills),
    renderProjects(resume.projects),
    renderAwards(resume.awards),
    renderCertificates(resume.certificates),
    renderPublications(resume.publications),
    renderLanguages(resume.languages),
    renderInterests(resume.interests),
    renderReferences(resume.references),
  ].join('\n');

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)}</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script>
      tailwind.config = {
        theme: {
          extend: {
            fontFamily: {
              resume: ['Georgia', 'Cambria', 'Times New Roman', 'Times', 'serif'],
            },
          },
        },
      };
    </script>
    <style>
      @media print {
        @page {
          margin: 0.5in;
        }
        .no-print {
          display: none !important;
        }
      }
    </style>
  </head>
  <body class="min-h-screen bg-neutral-100 print:bg-white">
    <article class="max-w-[8.5in] mx-auto my-6 print:my-0 bg-white text-neutral-900 font-resume text-[11pt] leading-snug shadow-sm print:shadow-none p-[0.5in] print:p-0 text-pretty">
      ${body}
    </article>
  </body>
</html>`;
}
