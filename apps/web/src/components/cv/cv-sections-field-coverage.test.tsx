// @vitest-environment jsdom
import type { Resume } from '@resumind/types';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

function stubApi() {
  return { create: vi.fn(), update: vi.fn(), delete: vi.fn() };
}

vi.mock('@/lib/cv-item-api', () => ({
  createCvProfile: vi.fn(),
  updateCvProfile: vi.fn(),
  deleteCvProfile: vi.fn(),
  cvWorkApi: stubApi(),
  cvWorkHighlightApi: stubApi(),
  cvVolunteerApi: stubApi(),
  cvVolunteerHighlightApi: stubApi(),
  cvEducationApi: stubApi(),
  cvEducationCourseApi: stubApi(),
  cvSkillApi: stubApi(),
  cvProjectApi: stubApi(),
  cvProjectHighlightApi: stubApi(),
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

async function switchTab(tabName: string) {
  const user = userEvent.setup();
  const trigger = screen.getByRole('tab', { name: tabName });
  await user.click(trigger);
}

describe('CvSections field coverage', () => {
  afterEach(() => {
    cleanup();
  });

  describe('Work view', () => {
    it('shows all fields when populated', async () => {
      const resume = fullyPopulatedResume();
      render(<CvSections {...defaultProps} resume={resume} />);
      await switchTab('Work');

      expect(screen.getByText(/Staff Engineer, Acme Corp/)).toBeInTheDocument();
      expect(screen.getByText('Remote')).toBeInTheDocument();
      expect(screen.getByText('https://acme.example.com')).toBeInTheDocument();
      expect(screen.getByText(/2020-01/)).toBeInTheDocument();
      expect(screen.getByText('Led platform team.')).toBeInTheDocument();
      expect(screen.getByText('Full-stack platform engineering.')).toBeInTheDocument();
      expect(screen.getAllByText('Scaled to 10M users').length).toBeGreaterThanOrEqual(1);
    });

    it('omits empty optional fields', async () => {
      const resume = fullyPopulatedResume();
      resume.work = [{ position: 'Dev', name: 'Co' }];
      render(<CvSections {...defaultProps} resume={resume} />);
      await switchTab('Work');

      expect(screen.getByText(/Dev, Co/)).toBeInTheDocument();
      expect(screen.queryByText('https://')).not.toBeInTheDocument();
    });
  });

  describe('Volunteer view', () => {
    it('shows url when populated', async () => {
      const resume = fullyPopulatedResume();
      render(<CvSections {...defaultProps} resume={resume} />);
      await switchTab('Volunteer');

      expect(screen.getByText(/Mentor, Code for Good/)).toBeInTheDocument();
      expect(screen.getByText('https://codeforgood.org')).toBeInTheDocument();
      expect(screen.getByText('Mentored junior devs.')).toBeInTheDocument();
    });
  });

  describe('Education view', () => {
    it('shows url and score when populated', async () => {
      const resume = fullyPopulatedResume();
      render(<CvSections {...defaultProps} resume={resume} />);
      await switchTab('Education');

      expect(screen.getByText('MIT')).toBeInTheDocument();
      expect(screen.getByText(/Bachelor — Computer Science/)).toBeInTheDocument();
      expect(screen.getByText('Score: 3.9')).toBeInTheDocument();
      expect(screen.getByText('https://mit.edu')).toBeInTheDocument();
    });
  });

  describe('Projects view', () => {
    it('shows url, entity, and type when populated', async () => {
      const resume = fullyPopulatedResume();
      render(<CvSections {...defaultProps} resume={resume} />);
      await switchTab('Projects');

      expect(screen.getByText('Resume Builder')).toBeInTheDocument();
      expect(screen.getByText('Entity: Open Source')).toBeInTheDocument();
      expect(screen.getByText('Type: Application')).toBeInTheDocument();
      expect(screen.getByText('https://resume.example.com')).toBeInTheDocument();
      expect(screen.getByText('Open source resume tool.')).toBeInTheDocument();
    });
  });

  describe('Awards view', () => {
    it('shows awarder when populated', async () => {
      const resume = fullyPopulatedResume();
      render(<CvSections {...defaultProps} resume={resume} />);
      await switchTab('Awards');

      expect(screen.getByText('Best Paper')).toBeInTheDocument();
      expect(screen.getByText('2023-06')).toBeInTheDocument();
      expect(screen.getByText('IEEE')).toBeInTheDocument();
      expect(screen.getByText('Award for best conference paper.')).toBeInTheDocument();
    });
  });

  describe('Certificates view', () => {
    it('shows url when populated', async () => {
      const resume = fullyPopulatedResume();
      render(<CvSections {...defaultProps} resume={resume} />);
      await switchTab('Certificates');

      expect(screen.getByText('AWS Certified')).toBeInTheDocument();
      expect(screen.getByText('Amazon')).toBeInTheDocument();
      expect(screen.getByText('https://aws.amazon.com/cert/123')).toBeInTheDocument();
    });
  });

  describe('Publications view', () => {
    it('shows url and summary when populated', async () => {
      const resume = fullyPopulatedResume();
      render(<CvSections {...defaultProps} resume={resume} />);
      await switchTab('Publications');

      expect(screen.getByText('Scaling Microservices')).toBeInTheDocument();
      expect(screen.getByText("O'Reilly")).toBeInTheDocument();
      expect(screen.getByText('https://oreilly.com/scaling')).toBeInTheDocument();
      expect(screen.getByText('A guide to scaling microservices.')).toBeInTheDocument();
    });
  });
});
