// @vitest-environment jsdom
import type { Resume } from '@resumind/types';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { CvSectionSlug } from './cv-section-nav';

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('next/navigation', () => ({
  usePathname: () => '/dashboard/cv/cv-1/work',
}));

function stubApi() {
  return { create: vi.fn(), update: vi.fn(), delete: vi.fn() };
}

vi.mock('@/lib/cv-item-api', () => ({
  createCvProfile: vi.fn(),
  updateCvProfile: vi.fn(),
  deleteCvProfile: vi.fn(),
  cvWorkApi: stubApi(),
  cvVolunteerApi: stubApi(),
  cvEducationApi: stubApi(),
  cvSkillApi: stubApi(),
  cvProjectApi: stubApi(),
  cvAwardApi: stubApi(),
  cvCertificateApi: stubApi(),
  cvPublicationApi: stubApi(),
  cvLanguageApi: stubApi(),
  cvInterestApi: stubApi(),
  cvReferenceApi: stubApi(),
  patchCvBasics: vi.fn(),
}));

vi.mock('@/lib/api', () => ({
  uploadResumeMedia: vi.fn(),
}));

import { CvSections } from './cv-sections';
import { roleTagPillClassName, tagPillClassName } from './tags-input';

function fullyPopulatedResume(): Resume {
  return {
    basics: {
      name: 'Jane Doe',
      label: 'Engineer',
      email: 'jane@example.com',
      phone: '+1-555-0100',
      url: 'https://jane.dev',
      summary: 'A versatile engineer.',
      image: 'https://photo.example.com/jane.jpg',
      location: {
        address: '123 Main St',
        city: 'Springfield',
        region: 'IL',
        postalCode: '62704',
        countryCode: 'US',
      },
      profiles: [{ network: 'GitHub', username: 'janedoe', url: 'https://github.com/janedoe' }],
    },
    work: [
      {
        name: 'Acme Corp',
        position: 'Staff Engineer',
        location: 'Remote',
        url: 'https://acme.example.com',
        startDate: '2020-01',
        endDate: '2024-06',
        summary: 'Led platform team.',
        description: 'Full-stack platform engineering.',
        highlights: ['Scaled to 10M users'],
      },
    ],
    volunteer: [
      {
        organization: 'Code for Good',
        position: 'Mentor',
        url: 'https://codeforgood.org',
        startDate: '2019-03',
        endDate: '2021-12',
        summary: 'Mentored junior devs.',
        highlights: ['Trained 50+ mentees'],
      },
    ],
    education: [
      {
        institution: 'MIT',
        url: 'https://mit.edu',
        area: 'Computer Science',
        studyType: 'Bachelor',
        startDate: '2012-09',
        endDate: '2016-06',
        score: '3.9',
        courses: ['CS101'],
      },
    ],
    skills: [{ name: 'TypeScript', level: 'Expert', keywords: ['TS', 'JS'] }],
    projects: [
      {
        name: 'Resume Builder',
        description: 'Open source resume tool.',
        url: 'https://resume.example.com',
        entity: 'Open Source',
        type: 'Application',
        startDate: '2023-01',
        endDate: '2024-01',
        roles: ['Lead'],
        keywords: ['React'],
        highlights: ['1K stars'],
      },
    ],
    awards: [
      {
        title: 'Best Paper',
        date: '2023-06',
        awarder: 'IEEE',
        summary: 'Award for best conference paper.',
      },
    ],
    certificates: [
      {
        name: 'AWS Certified',
        date: '2022-03',
        issuer: 'Amazon',
        url: 'https://aws.amazon.com/cert/123',
      },
    ],
    publications: [
      {
        name: 'Scaling Microservices',
        publisher: "O'Reilly",
        releaseDate: '2023-01',
        url: 'https://oreilly.com/scaling',
        summary: 'A guide to scaling microservices.',
      },
    ],
    languages: [{ language: 'English', fluency: 'Native' }],
    interests: [{ name: 'Hiking', keywords: ['outdoors', 'nature'] }],
    references: [{ name: 'John Smith', reference: 'Jane is excellent.' }],
  };
}

const defaultProps = {
  cvId: 'cv-1',
  version: 'v1',
  onVersionChange: vi.fn(),
  onResumeChange: vi.fn(),
};

function renderSection(activeSection: CvSectionSlug, resume: Resume) {
  render(<CvSections {...defaultProps} activeSection={activeSection} resume={resume} />);
}

function expectLinkedTitle(label: string, href: string) {
  const link = screen.getByRole('link', { name: label });
  expect(link).toHaveAttribute('href', href);
  expect(link).toHaveAttribute('target', '_blank');
  expect(link).toHaveAttribute('rel', 'noopener noreferrer');
}

describe('CvSections field coverage', () => {
  afterEach(() => {
    cleanup();
  });

  describe('Work view', () => {
    it('shows all fields when populated', () => {
      const resume = fullyPopulatedResume();
      renderSection('work', resume);

      expect(screen.getByText('Staff Engineer')).toBeInTheDocument();
      expectLinkedTitle('Acme Corp', 'https://acme.example.com');
      expect(screen.getByText('Remote')).toBeInTheDocument();
      expect(screen.queryByText('https://acme.example.com')).not.toBeInTheDocument();
      expect(screen.getByText(/2020-01/)).toBeInTheDocument();
      expect(screen.getByText('Led platform team.')).toBeInTheDocument();
      expect(screen.getByText('Full-stack platform engineering.')).toBeInTheDocument();
      expect(screen.getAllByText('Scaled to 10M users').length).toBeGreaterThanOrEqual(1);
    });

    it('renders markdown highlights as formatted output', () => {
      const resume = fullyPopulatedResume();
      resume.work = [
        {
          position: 'Staff Engineer',
          name: 'Acme Corp',
          highlights: ['**Reduced API latency by 40%**'],
        },
      ];
      const { container } = render(
        <CvSections {...defaultProps} activeSection="work" resume={resume} />,
      );

      const strong = container.querySelector('strong');
      expect(strong).not.toBeNull();
      expect(strong?.textContent).toBe('Reduced API latency by 40%');
      expect(container.textContent).not.toContain('**');
    });

    it('omits empty optional fields', () => {
      const resume = fullyPopulatedResume();
      resume.work = [{ position: 'Dev', name: 'Co' }];
      renderSection('work', resume);

      expect(screen.getByText('Dev')).toBeInTheDocument();
      expect(screen.getByText('Co')).toBeInTheDocument();
      expect(screen.queryByText(/Dev, Co/)).not.toBeInTheDocument();
      expect(screen.queryByText('https://')).not.toBeInTheDocument();
    });
  });

  describe('Volunteer view', () => {
    it('links organization in subtitle when url is populated', () => {
      const resume = fullyPopulatedResume();
      renderSection('volunteer', resume);

      expect(screen.getByText('Mentor')).toBeInTheDocument();
      expectLinkedTitle('Code for Good', 'https://codeforgood.org');
      expect(screen.queryByText('https://codeforgood.org')).not.toBeInTheDocument();
      expect(screen.getByText('Mentored junior devs.')).toBeInTheDocument();
    });
  });

  describe('Education view', () => {
    it('links institution and shows study type as subtitle', () => {
      const resume = fullyPopulatedResume();
      renderSection('education', resume);

      expectLinkedTitle('MIT', 'https://mit.edu');
      expect(screen.getByText(/Bachelor — Computer Science/)).toBeInTheDocument();
      expect(screen.getByText('Score: 3.9')).toBeInTheDocument();
      expect(screen.queryByText('https://mit.edu')).not.toBeInTheDocument();
    });
  });

  describe('Projects view', () => {
    it('links name and shows entity and type in body', () => {
      const resume = fullyPopulatedResume();
      renderSection('projects', resume);

      expectLinkedTitle('Resume Builder', 'https://resume.example.com');
      expect(screen.getByText('Entity')).toBeInTheDocument();
      expect(screen.getByText('Open Source')).toBeInTheDocument();
      expect(screen.getByText('Type')).toBeInTheDocument();
      expect(screen.getByText('Application')).toBeInTheDocument();
      expect(screen.queryByText('Entity: Open Source')).not.toBeInTheDocument();
      expect(screen.queryByText('Type: Application')).not.toBeInTheDocument();
      expect(screen.queryByText('https://resume.example.com')).not.toBeInTheDocument();
      expect(screen.getByText('Open source resume tool.')).toBeInTheDocument();
    });

    it('renders roles as labeled pills with distinct styling', () => {
      const resume = fullyPopulatedResume();
      renderSection('projects', resume);

      expect(screen.getByText('Roles')).toBeInTheDocument();
      expect(screen.getByText('Lead')).toBeInTheDocument();
      expect(screen.queryByText('Roles: Lead')).not.toBeInTheDocument();

      const rolePill = screen.getByText('Lead').closest('span');
      expect(rolePill).toHaveClass(...roleTagPillClassName.split(' '));
    });

    it('renders keywords as labeled tag pills without comma-separated prefix', () => {
      const resume = fullyPopulatedResume();
      const { container } = render(
        <CvSections {...defaultProps} activeSection="projects" resume={resume} />,
      );

      expect(screen.getByText('Keywords')).toBeInTheDocument();
      expect(screen.getByText('React')).toBeInTheDocument();
      expect(screen.queryByText('Keywords: React')).not.toBeInTheDocument();
      expect(screen.queryByText('React,')).not.toBeInTheDocument();

      const reactPill = screen.getByText('React').closest('span');
      expect(reactPill).toHaveClass(...tagPillClassName.split(' '));
      expect(container.querySelector('button[aria-label^="Remove"]')).toBeNull();
    });
  });

  describe('Skills view', () => {
    it('renders keywords as tag pills without a label', () => {
      const resume = fullyPopulatedResume();
      renderSection('skills', resume);

      expect(screen.queryByText('Keywords')).not.toBeInTheDocument();
      expect(screen.getByText('TS')).toBeInTheDocument();
      expect(screen.getByText('JS')).toBeInTheDocument();
      expect(screen.queryByText('TS, JS')).not.toBeInTheDocument();

      const tsPill = screen.getByText('TS').closest('span');
      expect(tsPill).toHaveClass(...tagPillClassName.split(' '));
    });
  });

  describe('Interests view', () => {
    it('renders keywords as labeled tag pills', () => {
      const resume = fullyPopulatedResume();
      renderSection('interests', resume);

      expect(screen.getByText('Keywords')).toBeInTheDocument();
      expect(screen.getByText('outdoors')).toBeInTheDocument();
      expect(screen.getByText('nature')).toBeInTheDocument();
      expect(screen.queryByText('outdoors, nature')).not.toBeInTheDocument();

      const outdoorsPill = screen.getByText('outdoors').closest('span');
      expect(outdoorsPill).toHaveClass(...tagPillClassName.split(' '));
    });
  });

  describe('Awards view', () => {
    it('shows awarder as subtitle when populated', () => {
      const resume = fullyPopulatedResume();
      renderSection('awards', resume);

      expect(screen.getByText('Best Paper')).toBeInTheDocument();
      expect(screen.getByText('2023-06')).toBeInTheDocument();
      expect(screen.getByText('IEEE')).toBeInTheDocument();
      expect(screen.getByText('Award for best conference paper.')).toBeInTheDocument();
    });
  });

  describe('Certificates view', () => {
    it('links certificate name without raw url in body', () => {
      const resume = fullyPopulatedResume();
      renderSection('certificates', resume);

      expectLinkedTitle('AWS Certified', 'https://aws.amazon.com/cert/123');
      expect(screen.getByText('Amazon')).toBeInTheDocument();
      expect(screen.queryByText('https://aws.amazon.com/cert/123')).not.toBeInTheDocument();
    });
  });

  describe('Publications view', () => {
    it('links publication name without raw url in body', () => {
      const resume = fullyPopulatedResume();
      renderSection('publications', resume);

      expectLinkedTitle('Scaling Microservices', 'https://oreilly.com/scaling');
      expect(screen.getByText("O'Reilly")).toBeInTheDocument();
      expect(screen.queryByText('https://oreilly.com/scaling')).not.toBeInTheDocument();
      expect(screen.getByText('A guide to scaling microservices.')).toBeInTheDocument();
    });
  });

  describe('Languages view', () => {
    it('shows fluency as subtitle', () => {
      const resume = fullyPopulatedResume();
      renderSection('languages', resume);

      expect(screen.getByText('English')).toBeInTheDocument();
      expect(screen.getByText('Native')).toBeInTheDocument();
    });
  });
});
