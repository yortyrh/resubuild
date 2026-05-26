/**
 * MIT CAPD-inspired JSON Resume → HTML renderer.
 * Style conventions: modern-jsonresume/examples/DESIGN.md
 */

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function normalizeUrl(url) {
  if (!url) return null;
  const trimmed = String(url).trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

function formatIsoDate(value) {
  if (!value) return '';
  const match = String(value).match(/^(\d{4})(?:-(\d{2}))?(?:-(\d{2}))?/);
  if (!match) return escapeHtml(value);
  const [, year, month] = match;
  if (!month) return year;
  const date = new Date(Number(year), Number(month) - 1, 1);
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

function formatDateRange(startDate, endDate) {
  const start = formatIsoDate(startDate);
  const end = endDate ? formatIsoDate(endDate) : 'Present';
  if (!start && !endDate) return '';
  if (!start) return end;
  return `${start} – ${end}`;
}

function formatLocation(location) {
  if (!location || typeof location !== 'object') return '';
  const parts = [location.city, location.region, location.countryCode].filter(Boolean);
  return parts.join(', ');
}

function hasItems(array) {
  return Array.isArray(array) && array.length > 0;
}

function sectionHeading(id, label) {
  return `<h2 id="${id}" class="text-xs font-bold uppercase tracking-widest text-neutral-600 border-b border-neutral-300 pb-0.5">${escapeHtml(label)}</h2>`;
}

function bulletList(items) {
  if (!hasItems(items)) return '';
  const lis = items.map((item) => `<li>${escapeHtml(item)}</li>`).join('');
  return `<ul class="mt-1 list-disc pl-5 space-y-0.5 text-neutral-900">${lis}</ul>`;
}

function entryHeader(title, dateRange) {
  return `<div class="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-0.5">
    <h3 class="font-semibold text-neutral-950">${title}</h3>
    ${dateRange ? `<p class="text-sm text-neutral-600 whitespace-nowrap">${dateRange}</p>` : ''}
  </div>`;
}

function linkedLine(label, url) {
  const href = normalizeUrl(url);
  if (!href) return escapeHtml(label);
  return `<a class="no-underline text-inherit hover:text-neutral-600 print:text-inherit" href="${escapeHtml(href)}" rel="noopener noreferrer">${escapeHtml(label)}</a>`;
}

function renderBasics(basics) {
  if (!basics) return '';

  const location = formatLocation(basics.location);
  const contactParts = [];

  if (basics.email) {
    contactParts.push(
      `<a class="inline-flex items-center gap-1 no-underline text-inherit hover:text-neutral-600 print:text-inherit" href="mailto:${escapeHtml(basics.email)}">${escapeHtml(basics.email)}</a>`,
    );
  }
  if (basics.phone) {
    contactParts.push(
      `<span class="inline-flex items-center gap-1">${escapeHtml(basics.phone)}</span>`,
    );
  }
  if (location) {
    contactParts.push(
      `<span class="inline-flex items-center gap-1">${escapeHtml(location)}</span>`,
    );
  }
  if (basics.url) {
    const href = normalizeUrl(basics.url);
    contactParts.push(
      `<a class="inline-flex items-center gap-1 no-underline text-inherit hover:text-neutral-600 print:text-inherit" href="${escapeHtml(href)}" rel="noopener noreferrer">${escapeHtml(basics.url.replace(/^https?:\/\//, ''))}</a>`,
    );
  }

  const profileLinks = hasItems(basics.profiles)
    ? basics.profiles
        .filter((profile) => profile?.network && profile?.url)
        .map(
          (profile) =>
            `<a class="inline-flex items-center gap-1 no-underline text-inherit hover:text-neutral-600 print:text-inherit" href="${escapeHtml(normalizeUrl(profile.url))}" rel="noopener noreferrer">${escapeHtml(profile.network)}</a>`,
        )
        .join('')
    : '';

  return `<header class="text-center border-b border-neutral-300 pb-3">
    <h1 class="text-2xl font-bold tracking-tight text-neutral-950">${escapeHtml(basics.name ?? 'Resume')}</h1>
    ${basics.label ? `<p class="text-sm text-neutral-700 mt-0.5">${escapeHtml(basics.label)}</p>` : ''}
    ${contactParts.length ? `<div class="mt-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-sm text-neutral-800">${contactParts.join('')}</div>` : ''}
    ${profileLinks ? `<div class="mt-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-sm text-neutral-800">${profileLinks}</div>` : ''}
  </header>`;
}

function renderSummary(basics) {
  if (!basics?.summary) return '';
  return `<section class="mt-4" aria-labelledby="summary-heading">
    <h2 id="summary-heading" class="sr-only">Summary</h2>
    <p class="text-neutral-800 text-justify">${escapeHtml(basics.summary)}</p>
  </section>`;
}

function renderWork(work) {
  if (!hasItems(work)) return '';
  const entries = work
    .map((item) => {
      const dateRange = escapeHtml(formatDateRange(item.startDate, item.endDate));
      const orgLine = [linkedLine(item.name, item.url), item.location].filter(Boolean).join(' · ');
      return `<div>
        ${entryHeader(escapeHtml(item.position ?? item.name ?? ''), dateRange)}
        ${orgLine ? `<p class="text-sm font-medium text-neutral-800">${orgLine}</p>` : ''}
        ${item.summary ? `<p class="italic text-neutral-800 mt-1">${escapeHtml(item.summary)}</p>` : ''}
        ${bulletList(item.highlights)}
      </div>`;
    })
    .join('');

  return `<section class="mt-5" aria-labelledby="experience-heading">
    ${sectionHeading('experience-heading', 'Experience')}
    <div class="mt-3 space-y-4">${entries}</div>
  </section>`;
}

function renderVolunteer(volunteer) {
  if (!hasItems(volunteer)) return '';
  const entries = volunteer
    .map((item) => {
      const dateRange = escapeHtml(formatDateRange(item.startDate, item.endDate));
      const orgLine = linkedLine(item.organization, item.url);
      return `<div>
        ${entryHeader(escapeHtml(item.position ?? item.organization ?? ''), dateRange)}
        ${orgLine ? `<p class="text-sm font-medium text-neutral-800">${orgLine}</p>` : ''}
        ${item.summary ? `<p class="italic text-neutral-800 mt-1">${escapeHtml(item.summary)}</p>` : ''}
        ${bulletList(item.highlights)}
      </div>`;
    })
    .join('');

  return `<section class="mt-5" aria-labelledby="volunteer-heading">
    ${sectionHeading('volunteer-heading', 'Volunteer')}
    <div class="mt-3 space-y-4">${entries}</div>
  </section>`;
}

function renderEducation(education) {
  if (!hasItems(education)) return '';
  const entries = education
    .map((item) => {
      const dateRange = escapeHtml(formatDateRange(item.startDate, item.endDate));
      const studyLine = [item.studyType, item.area].filter(Boolean).join(', ');
      const extra = [studyLine, item.score].filter(Boolean).join(' · ');
      return `<div>
        ${entryHeader(linkedLine(item.institution, item.url), dateRange)}
        ${extra ? `<p class="text-sm text-neutral-800">${escapeHtml(extra)}</p>` : ''}
        ${bulletList(item.courses)}
      </div>`;
    })
    .join('');

  return `<section class="mt-5" aria-labelledby="education-heading">
    ${sectionHeading('education-heading', 'Education')}
    <div class="mt-3 space-y-3">${entries}</div>
  </section>`;
}

function renderProjects(projects) {
  if (!hasItems(projects)) return '';
  const entries = projects
    .map((item) => {
      const dateRange = escapeHtml(formatDateRange(item.startDate, item.endDate));
      const meta = [item.entity, item.type, hasItems(item.roles) ? item.roles.join(', ') : '']
        .filter(Boolean)
        .join(' · ');
      const keywords = hasItems(item.keywords) ? item.keywords.join(', ') : '';
      return `<div>
        ${entryHeader(linkedLine(item.name, item.url), dateRange)}
        ${meta ? `<p class="text-sm font-medium text-neutral-800">${escapeHtml(meta)}</p>` : ''}
        ${item.description ? `<p class="italic text-neutral-800 mt-1">${escapeHtml(item.description)}</p>` : ''}
        ${keywords ? `<p class="text-sm text-neutral-800 mt-1">${escapeHtml(keywords)}</p>` : ''}
        ${bulletList(item.highlights)}
      </div>`;
    })
    .join('');

  return `<section class="mt-5" aria-labelledby="projects-heading">
    ${sectionHeading('projects-heading', 'Projects')}
    <div class="mt-3 space-y-4">${entries}</div>
  </section>`;
}

function renderSkills(skills) {
  if (!hasItems(skills)) return '';
  const rows = skills
    .map((item) => {
      const keywords = hasItems(item.keywords) ? item.keywords.join(', ') : '';
      const value = [item.level, keywords].filter(Boolean).join(' — ');
      return `<div>
        <dt class="font-semibold text-neutral-950">${escapeHtml(item.name)}</dt>
        ${value ? `<dd class="text-neutral-800">${escapeHtml(value)}</dd>` : ''}
      </div>`;
    })
    .join('');

  return `<section class="mt-5" aria-labelledby="skills-heading">
    ${sectionHeading('skills-heading', 'Skills')}
    <dl class="mt-3 space-y-2">${rows}</dl>
  </section>`;
}

function renderAwards(awards) {
  if (!hasItems(awards)) return '';
  const entries = awards
    .map((item) => {
      const date = escapeHtml(formatIsoDate(item.date));
      return `<div>
        ${entryHeader(escapeHtml(item.title ?? ''), date)}
        ${item.awarder ? `<p class="text-sm font-medium text-neutral-800">${escapeHtml(item.awarder)}</p>` : ''}
        ${item.summary ? `<p class="text-neutral-800 mt-1">${escapeHtml(item.summary)}</p>` : ''}
      </div>`;
    })
    .join('');

  return `<section class="mt-5" aria-labelledby="awards-heading">
    ${sectionHeading('awards-heading', 'Awards')}
    <div class="mt-3 space-y-3">${entries}</div>
  </section>`;
}

function renderCertificates(certificates) {
  if (!hasItems(certificates)) return '';
  const entries = certificates
    .map((item) => {
      const date = escapeHtml(formatIsoDate(item.date));
      return `<div>
        ${entryHeader(linkedLine(item.name, item.url), date)}
        ${item.issuer ? `<p class="text-sm font-medium text-neutral-800">${escapeHtml(item.issuer)}</p>` : ''}
      </div>`;
    })
    .join('');

  return `<section class="mt-5" aria-labelledby="certificates-heading">
    ${sectionHeading('certificates-heading', 'Certificates')}
    <div class="mt-3 space-y-3">${entries}</div>
  </section>`;
}

function renderPublications(publications) {
  if (!hasItems(publications)) return '';
  const entries = publications
    .map((item) => {
      const date = escapeHtml(formatIsoDate(item.releaseDate));
      return `<div>
        ${entryHeader(linkedLine(item.name, item.url), date)}
        ${item.publisher ? `<p class="text-sm font-medium text-neutral-800">${escapeHtml(item.publisher)}</p>` : ''}
        ${item.summary ? `<p class="text-neutral-800 mt-1">${escapeHtml(item.summary)}</p>` : ''}
      </div>`;
    })
    .join('');

  return `<section class="mt-5" aria-labelledby="publications-heading">
    ${sectionHeading('publications-heading', 'Publications')}
    <div class="mt-3 space-y-3">${entries}</div>
  </section>`;
}

function renderLanguages(languages) {
  if (!hasItems(languages)) return '';
  const items = languages
    .map(
      (item) =>
        `<li><span class="font-semibold text-neutral-950">${escapeHtml(item.language)}</span>${item.fluency ? ` — ${escapeHtml(item.fluency)}` : ''}</li>`,
    )
    .join('');

  return `<section class="mt-5" aria-labelledby="languages-heading">
    ${sectionHeading('languages-heading', 'Languages')}
    <ul class="mt-3 list-none space-y-0.5 pl-0 text-neutral-800">${items}</ul>
  </section>`;
}

function renderInterests(interests) {
  if (!hasItems(interests)) return '';
  const rows = interests
    .map((item) => {
      const keywords = hasItems(item.keywords) ? item.keywords.join(', ') : '';
      return `<div>
        <dt class="font-semibold text-neutral-950">${escapeHtml(item.name)}</dt>
        ${keywords ? `<dd class="text-neutral-800">${escapeHtml(keywords)}</dd>` : ''}
      </div>`;
    })
    .join('');

  return `<section class="mt-5" aria-labelledby="interests-heading">
    ${sectionHeading('interests-heading', 'Interests')}
    <dl class="mt-3 space-y-2">${rows}</dl>
  </section>`;
}

function renderReferences(references) {
  if (!hasItems(references)) return '';
  const entries = references
    .map(
      (item) => `<div>
        <h3 class="font-semibold text-neutral-950">${escapeHtml(item.name)}</h3>
        ${item.reference ? `<p class="text-neutral-800 mt-1">${escapeHtml(item.reference)}</p>` : ''}
      </div>`,
    )
    .join('');

  return `<section class="mt-5" aria-labelledby="references-heading">
    ${sectionHeading('references-heading', 'References')}
    <div class="mt-3 space-y-3">${entries}</div>
  </section>`;
}

export function renderMitTemplateHtml(resume) {
  const title = resume?.basics?.name ? `${resume.basics.name} — Resume` : 'Resume';

  const body = [
    renderBasics(resume.basics),
    renderSummary(resume.basics),
    renderWork(resume.work),
    renderVolunteer(resume.volunteer),
    renderEducation(resume.education),
    renderProjects(resume.projects),
    renderSkills(resume.skills),
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
      }
      .sr-only {
        position: absolute;
        width: 1px;
        height: 1px;
        padding: 0;
        margin: -1px;
        overflow: hidden;
        clip: rect(0, 0, 0, 0);
        white-space: nowrap;
        border: 0;
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
