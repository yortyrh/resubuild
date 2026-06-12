// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  usePathname: () => '/dashboard/cv/cv-1/projects',
}));

import { CvSectionLayout, CvSectionNavToggle } from './cv-section-layout';
import { CV_SECTIONS } from './cv-section-nav';

function mockMatchMedia(value: (query: string) => boolean) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: value(query),
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

function mockDesktop() {
  mockMatchMedia((query) => query === '(min-width: 768px)');
}

function mockMobile() {
  mockMatchMedia((query) => query === '(max-width: 767px)');
}

describe('CvSectionLayout — desktop sidebar', () => {
  beforeEach(() => {
    mockDesktop();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders section labels when expanded on desktop', () => {
    render(
      <CvSectionLayout cvId="cv-1">
        <CvSectionNavToggle />
        <div>Editor content</div>
      </CvSectionLayout>,
    );

    expect(screen.getByRole('link', { name: 'Projects' })).toBeInTheDocument();
    expect(screen.getByText('Editor content')).toBeInTheDocument();
  });

  it('collapses to icons only and restores labels on expand', () => {
    render(
      <CvSectionLayout cvId="cv-1">
        <CvSectionNavToggle />
        <div>Editor content</div>
      </CvSectionLayout>,
    );

    const nav = screen.getByRole('navigation', { name: 'CV sections' });

    fireEvent.click(screen.getByRole('button', { name: 'Toggle section navigation' }));

    expect(within(nav).getByText('Projects')).toHaveClass('hidden');
    expect(within(nav).getByRole('link', { name: 'Projects' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Expand section navigation' }));

    expect(within(nav).getByText('Projects')).toHaveClass('inline');
  });
});

describe('CvSectionLayout — mobile drawer', () => {
  beforeEach(() => {
    mockMobile();
  });

  afterEach(() => {
    cleanup();
  });

  it('does not render the persistent sidebar below md', () => {
    const { container } = render(
      <CvSectionLayout cvId="cv-1">
        <CvSectionNavToggle />
        <div>Editor content</div>
      </CvSectionLayout>,
    );

    // The sidebar aside is the one with the `cv-section-nav` id. It must
    // not be visible below `md`. The Sheet content is portalled and renders
    // even when closed, so we look at the aside directly.
    const sidebar = container.querySelector('aside');
    expect(sidebar).not.toBeNull();
    expect(sidebar).toHaveClass('hidden');
    expect(sidebar).toHaveClass('md:block');
    expect(screen.getByText('Editor content')).toBeInTheDocument();
  });

  it('opens the drawer when the toggle is clicked and lists every section', async () => {
    render(
      <CvSectionLayout cvId="cv-1">
        <CvSectionNavToggle />
        <div>Editor content</div>
      </CvSectionLayout>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Open section navigation' }));

    const dialog = await screen.findByRole('dialog');
    const drawerNav = within(dialog).getByRole('navigation', { name: 'CV sections' });

    for (const section of CV_SECTIONS) {
      expect(within(drawerNav).getByRole('link', { name: section.label })).toBeInTheDocument();
    }
    expect(CV_SECTIONS).toHaveLength(13);
  });

  it('marks the active section with aria-current="page" inside the drawer', async () => {
    render(
      <CvSectionLayout cvId="cv-1">
        <CvSectionNavToggle />
        <div>Editor content</div>
      </CvSectionLayout>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Open section navigation' }));

    const dialog = await screen.findByRole('dialog');
    const projectsLink = within(dialog).getByRole('link', { name: 'Projects' });
    expect(projectsLink).toHaveAttribute('aria-current', 'page');
  });

  it('closes the drawer after a section is selected', async () => {
    render(
      <CvSectionLayout cvId="cv-1">
        <CvSectionNavToggle />
        <div>Editor content</div>
      </CvSectionLayout>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Open section navigation' }));
    const dialog = await screen.findByRole('dialog');

    fireEvent.click(within(dialog).getByRole('link', { name: 'Work' }));

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });
});
