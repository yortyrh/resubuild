// @vitest-environment jsdom
import type { CvTemplatePresentationConfig } from '@resubuild/resume-template';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TemplateConfigPanel } from './template-config-panel';

vi.mock('@dnd-kit/core', async () => {
  const actual = await vi.importActual<typeof import('@dnd-kit/core')>('@dnd-kit/core');
  return {
    ...actual,
    DndContext: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  };
});

vi.mock('@dnd-kit/sortable', async () => {
  const actual = await vi.importActual<typeof import('@dnd-kit/sortable')>('@dnd-kit/sortable');
  return {
    ...actual,
    SortableContext: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    useSortable: () => ({
      attributes: {},
      listeners: {},
      setNodeRef: () => undefined,
      transform: null,
      transition: undefined,
      isDragging: false,
    }),
  };
});

const baseConfig: CvTemplatePresentationConfig = {
  sectionOrder: ['summary', 'work', 'education', 'skills'],
  hiddenSections: [],
  sectionLabels: {},
  basicsFields: {
    label: true,
    location: true,
    phone: true,
    email: true,
    url: true,
    profiles: true,
    image: false,
  },
  workFields: { location: true, summary: true, highlights: true, url: true },
  volunteerFields: { location: true, summary: true, highlights: true, url: true },
  educationFields: { score: true, courses: true, url: true },
  projectFields: {
    entity: true,
    type: true,
    roles: true,
    description: true,
    highlights: true,
    keywords: true,
    url: true,
  },
  skillsFields: { level: true },
  awardsFields: { awarder: true, summary: true },
  publicationsFields: { publisher: true, summary: true },
  certificatesFields: { issuer: true },
  interestsFields: { keywords: true },
  leadershipVolunteer: false,
};

function educationIndex(list: HTMLElement): number {
  return within(list)
    .getAllByRole('listitem')
    .findIndex((item) => item.textContent?.includes('Education'));
}

describe('TemplateConfigPanel', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it(
    'keeps hidden sections in place instead of moving them to the bottom',
    { timeout: 10_000 },
    () => {
      const onChange = vi.fn();
      render(<TemplateConfigPanel initialConfig={baseConfig} onChange={onChange} />);

      const list = screen.getByRole('list');
      expect(educationIndex(list)).toBe(2);

      fireEvent.click(screen.getByRole('checkbox', { name: 'Show Education section' }));

      expect(onChange).toHaveBeenCalledWith({
        ...baseConfig,
        hiddenSections: ['education'],
      });

      const listAfter = screen.getByRole('list');
      expect(educationIndex(listAfter)).toBe(2);
      expect(screen.getByRole('checkbox', { name: 'Show Education section' })).not.toBeChecked();

      const educationRow = within(listAfter)
        .getAllByRole('listitem')
        .find((item) => item.textContent?.includes('Education'));
      expect(educationRow).not.toHaveClass('opacity-60');
    },
  );

  it('exposes drag handles to reorder sections', () => {
    render(<TemplateConfigPanel initialConfig={baseConfig} onChange={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Reorder Education' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Move Education up' })).not.toBeInTheDocument();
  });
});
