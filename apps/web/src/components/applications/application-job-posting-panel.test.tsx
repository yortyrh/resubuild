// @vitest-environment jsdom

import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import type { JobApplicationSummary } from '@/lib/api';
import { ApplicationJobPostingPanel } from './application-job-posting-panel';

const baseApplication: JobApplicationSummary = {
  id: 'app-1',
  status: 'ready',
  jobTitle: 'Senior Engineer',
  jobCompany: 'Acme',
  jobSourceType: 'url',
  jobSourceUrl: 'https://jobs.example.com/123',
  jobSourceFileName: null,
  jobRawText: 'We are hiring a senior engineer.',
  jobSummary: {
    requirements: ['5+ years of TypeScript', 'Team leadership'],
    keywords: ['NestJS', 'PostgreSQL', 'AWS'],
    language: 'es',
  },
  sourceCvTitle: 'Jane Doe — Engineer',
  sourceCvFromSnapshot: false,
  selectionRationale: 'Strongest backend match',
  userMessage: 'Emphasize leadership',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-02T00:00:00.000Z',
};

function renderPanel(overrides: Partial<JobApplicationSummary> = {}) {
  return render(<ApplicationJobPostingPanel application={{ ...baseApplication, ...overrides }} />);
}

afterEach(() => {
  cleanup();
});

/** Nearest ancestor of the heading that also contains the list rendered under it. */
function closestAncestorWithList(heading: HTMLElement): HTMLElement {
  let node: HTMLElement | null = heading.parentElement;
  while (node && !node.querySelector('ul, ol')) {
    node = node.parentElement;
  }
  if (!node) throw new Error('No list found under the heading');
  return node;
}

describe('ApplicationJobPostingPanel source', () => {
  it.each([
    ['url', 'Link'],
    ['text', 'Pasted text'],
    ['pdf', 'PDF'],
    ['image', 'Screenshot'],
  ] as const)('labels the %s source type as "%s"', (jobSourceType, label) => {
    renderPanel({ jobSourceType, jobSourceUrl: null });

    expect(screen.getByText(label)).toBeInTheDocument();
  });

  it('links to the saved job URL in a new tab', () => {
    renderPanel();

    const link = screen.getByRole('link', { name: 'https://jobs.example.com/123' });
    expect(link).toHaveAttribute('href', 'https://jobs.example.com/123');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    expect(screen.queryByText('Link not saved for this application')).not.toBeInTheDocument();
  });

  it.each([null, undefined, ''])(
    'explains that the link was not saved for a URL source without a URL (%s)',
    (jobSourceUrl) => {
      renderPanel({ jobSourceType: 'url', jobSourceUrl });

      expect(screen.getByText('Link not saved for this application')).toBeInTheDocument();
      expect(screen.queryByRole('link')).not.toBeInTheDocument();
    },
  );

  it('does not show the missing-link note for non-URL sources', () => {
    renderPanel({ jobSourceType: 'text', jobSourceUrl: null });

    expect(screen.queryByText('Link not saved for this application')).not.toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('shows the uploaded file name', () => {
    renderPanel({ jobSourceType: 'pdf', jobSourceUrl: null, jobSourceFileName: 'job-offer.pdf' });

    expect(screen.getByText('job-offer.pdf')).toBeInTheDocument();
  });
});

describe('ApplicationJobPostingPanel details', () => {
  it('shows position, company and language', () => {
    renderPanel();

    expect(screen.getByText('Position')).toBeInTheDocument();
    expect(screen.getByText('Senior Engineer')).toBeInTheDocument();
    expect(screen.getByText('Company')).toBeInTheDocument();
    expect(screen.getByText('Acme')).toBeInTheDocument();
    expect(screen.getByText('Language')).toBeInTheDocument();
    expect(screen.getByText('es')).toBeInTheDocument();
  });

  it.each([null, undefined])('omits the language when it is %s', (language) => {
    renderPanel({ jobSummary: { requirements: ['SQL'], keywords: ['Go'], language } });

    expect(screen.queryByText('Language')).not.toBeInTheDocument();
  });

  it('lists each requirement and keyword', () => {
    renderPanel();

    const requirementsHeading = screen.getByRole('heading', { name: 'Requirements' });
    const requirementsSection = closestAncestorWithList(requirementsHeading);
    const items = within(requirementsSection).getAllByRole('listitem');
    expect(items.map((item) => item.textContent)).toEqual([
      '5+ years of TypeScript',
      'Team leadership',
    ]);

    expect(screen.getByRole('heading', { name: 'Keywords' })).toBeInTheDocument();
    for (const keyword of ['NestJS', 'PostgreSQL', 'AWS']) {
      expect(screen.getAllByText(keyword)).toHaveLength(1);
    }
  });

  it('omits the requirements heading when there are no requirements', () => {
    renderPanel({ jobSummary: { requirements: [], keywords: ['NestJS'] } });

    expect(screen.queryByRole('heading', { name: 'Requirements' })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Keywords' })).toBeInTheDocument();
  });

  it('omits the keywords heading when there are no keywords', () => {
    renderPanel({ jobSummary: { requirements: ['SQL'], keywords: [] } });

    expect(screen.queryByRole('heading', { name: 'Keywords' })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Requirements' })).toBeInTheDocument();
  });

  it.each([null, undefined])('omits both lists when the job summary is %s', (jobSummary) => {
    renderPanel({ jobSummary });

    expect(screen.queryByRole('heading', { name: 'Requirements' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Keywords' })).not.toBeInTheDocument();
    expect(screen.queryByText('Language')).not.toBeInTheDocument();
  });
});

describe('ApplicationJobPostingPanel generation', () => {
  it('shows the base CV, the rationale and the user instructions', () => {
    renderPanel();

    expect(screen.getByText('Base CV')).toBeInTheDocument();
    expect(screen.getByText(/Jane Doe — Engineer/)).toBeInTheDocument();
    expect(screen.queryByText(/saved copy/)).not.toBeInTheDocument();
    expect(screen.getByText('Why this CV')).toBeInTheDocument();
    expect(screen.getByText('Strongest backend match')).toBeInTheDocument();
    expect(screen.getByText('Your instructions')).toBeInTheDocument();
    expect(screen.getByText('Emphasize leadership')).toBeInTheDocument();
  });

  it('marks the base CV as a saved copy when it comes from the snapshot', () => {
    renderPanel({ sourceCvFromSnapshot: true });

    expect(screen.getByText(/saved copy/)).toBeInTheDocument();
  });

  it.each([null, undefined, ''])('omits the user instructions when they are %s', (userMessage) => {
    renderPanel({ userMessage });

    expect(screen.queryByText('Your instructions')).not.toBeInTheDocument();
  });
});

describe('ApplicationJobPostingPanel posting content', () => {
  it('renders the raw posting text verbatim, preserving line breaks', () => {
    const raw = '**About us**\n\n- Remote\n- # Not a heading';
    renderPanel({ jobRawText: raw });

    expect(screen.getByRole('heading', { name: 'Job posting content' })).toBeInTheDocument();
    const block = screen.getByText(
      (_, element) => element?.textContent === raw && element.children.length === 0,
    );
    expect(block).toHaveClass('whitespace-pre-wrap');
    expect(block.querySelector('strong')).toBeNull();
    expect(screen.queryByText('No job posting text was saved.')).not.toBeInTheDocument();
  });

  it.each([null, undefined, ''])('says no text was saved when the raw text is %s', (jobRawText) => {
    renderPanel({ jobRawText });

    expect(screen.getByRole('heading', { name: 'Job posting content' })).toBeInTheDocument();
    expect(screen.getByText('No job posting text was saved.')).toBeInTheDocument();
  });
});

describe('ApplicationJobPostingPanel dates', () => {
  /** Text of the field that the given label names (label plus value). */
  function fieldText(label: string): string {
    return screen.getByText(label).parentElement?.textContent ?? '';
  }

  it('shows the created and the updated date', () => {
    renderPanel({
      createdAt: '2024-05-10T12:00:00.000Z',
      updatedAt: '2026-03-15T12:00:00.000Z',
    });

    expect(fieldText('Created')).toMatch(/2024/);
    expect(fieldText('Created')).not.toMatch(/2026/);
    expect(fieldText('Updated')).toMatch(/2026/);
    expect(fieldText('Updated')).not.toMatch(/2024/);
  });

  it('does not crash or show "Invalid Date" when both dates are invalid', () => {
    expect(() =>
      renderPanel({ createdAt: 'not-a-date', updatedAt: 'also-not-a-date' }),
    ).not.toThrow();

    expect(screen.queryByText(/Invalid Date/)).not.toBeInTheDocument();
    expect(screen.queryByText('Created')).not.toBeInTheDocument();
    expect(screen.queryByText('Updated')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Job posting content' })).toBeInTheDocument();
  });

  it('still shows the valid date when the other one is invalid', () => {
    renderPanel({ createdAt: 'not-a-date', updatedAt: '2026-03-15T12:00:00.000Z' });

    expect(screen.queryByText(/Invalid Date/)).not.toBeInTheDocument();
    expect(screen.queryByText('Created')).not.toBeInTheDocument();
    expect(fieldText('Updated')).toMatch(/2026/);
  });
});

describe('ApplicationJobPostingPanel empty fields', () => {
  const emptyValues = [null, undefined, '', '   '];

  it.each(emptyValues)('omits the position when it is %j', (jobTitle) => {
    renderPanel({ jobTitle });

    expect(screen.queryByText('Position')).not.toBeInTheDocument();
    expect(screen.getByText('Company')).toBeInTheDocument();
  });

  it.each(emptyValues)('omits the company when it is %j', (jobCompany) => {
    renderPanel({ jobCompany });

    expect(screen.queryByText('Company')).not.toBeInTheDocument();
    expect(screen.getByText('Position')).toBeInTheDocument();
  });

  it.each(emptyValues)('omits the base CV when its title is %j', (sourceCvTitle) => {
    renderPanel({ sourceCvTitle, sourceCvFromSnapshot: true });

    expect(screen.queryByText('Base CV')).not.toBeInTheDocument();
    expect(screen.queryByText(/saved copy/)).not.toBeInTheDocument();
    expect(screen.getByText('Why this CV')).toBeInTheDocument();
  });

  it.each(emptyValues)(
    'omits why this CV was chosen when the rationale is %j',
    (selectionRationale) => {
      renderPanel({ selectionRationale });

      expect(screen.queryByText('Why this CV')).not.toBeInTheDocument();
      expect(screen.getByText('Base CV')).toBeInTheDocument();
    },
  );

  it('omits a whitespace-only language', () => {
    renderPanel({ jobSummary: { requirements: ['SQL'], keywords: ['Go'], language: '   ' } });

    expect(screen.queryByText('Language')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Requirements' })).toBeInTheDocument();
  });
});
