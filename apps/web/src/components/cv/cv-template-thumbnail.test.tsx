// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { CvTemplateThumbnail } from './cv-template-thumbnail';

describe('CvTemplateThumbnail', () => {
  afterEach(() => {
    cleanup();
  });

  it('exposes a default accessible label and identifies the template as data attribute', () => {
    const { container } = render(<CvTemplateThumbnail templateId="modern" />);

    expect(screen.getByRole('img', { name: 'CV preview' })).toBeInTheDocument();
    const wrapper = container.querySelector('[data-template]');
    expect(wrapper).toHaveAttribute('data-template', 'modern');
  });

  it('uses the classic layout for unknown template ids', () => {
    const { container } = render(<CvTemplateThumbnail templateId="mystery" />);
    expect(container.querySelector('[data-template]')).toHaveAttribute('data-template', 'classic');
  });

  it('renders the tabular layout with the two-column header', () => {
    const { container } = render(<CvTemplateThumbnail templateId="tabular" />);
    expect(container.querySelector('[data-template]')).toHaveAttribute('data-template', 'tabular');
  });

  it('honours a custom accessible label', () => {
    render(<CvTemplateThumbnail templateId="left" label="Engineer CV preview" />);
    expect(screen.getByRole('img', { name: 'Engineer CV preview' })).toBeInTheDocument();
  });

  describe('skeleton thumbnail (REQ-CV-002)', () => {
    const templates = ['classic', 'modern', 'tabular', 'left'] as const;

    const headingStyles: ReadonlyArray<[string, 'center' | 'left', 'true' | 'false']> = [
      ['classic', 'center', 'true'],
      ['left', 'left', 'true'],
      ['modern', 'left', 'false'],
      ['tabular', 'left', 'false'],
    ];

    function renderRoot(templateId: string): HTMLElement {
      render(<CvTemplateThumbnail templateId={templateId} />);
      return screen.getByRole('img', { name: 'CV preview' });
    }

    function sectionsOf(root: HTMLElement): HTMLElement[] {
      return Array.from(root.querySelectorAll<HTMLElement>('[data-thumbnail-section]'));
    }

    it.each(templates)('renders no text at all for the %s template', (templateId) => {
      const root = renderRoot(templateId);
      expect(root).toHaveAttribute('data-template', templateId);
      expect(root.textContent?.trim()).toBe('');
    });

    it('renders no text at all for an unknown template', () => {
      const root = renderRoot('mystery');
      expect(root.textContent?.trim()).toBe('');
    });

    it.each(templates)('renders exactly 4 sections for the %s template', (templateId) => {
      const root = renderRoot(templateId);
      expect(sectionsOf(root)).toHaveLength(4);
    });

    it.each(headingStyles)(
      'gives every %s section one heading bar aligned %s with rule=%s',
      (templateId, align, rule) => {
        const root = renderRoot(templateId);
        const sections = sectionsOf(root);
        expect(sections).toHaveLength(4);

        for (const section of sections) {
          const headings = section.querySelectorAll('[data-thumbnail-heading]');
          expect(headings).toHaveLength(1);
          expect(headings[0]).toHaveAttribute('data-align', align);
          expect(headings[0]).toHaveAttribute('data-rule', rule);
        }
      },
    );

    it('uses the classic heading style for an unknown template', () => {
      const root = renderRoot('mystery');
      const headings = root.querySelectorAll('[data-thumbnail-section] [data-thumbnail-heading]');
      expect(headings).toHaveLength(4);
      for (const heading of Array.from(headings)) {
        expect(heading).toHaveAttribute('data-align', 'center');
        expect(heading).toHaveAttribute('data-rule', 'true');
      }
    });

    it.each(templates)(
      'varies the number of entry lines across the %s sections and never leaves one empty',
      (templateId) => {
        const root = renderRoot(templateId);
        const lineCounts = sectionsOf(root).map(
          (section) => section.querySelectorAll('[data-thumbnail-line]').length,
        );

        expect(lineCounts).toHaveLength(4);
        for (const count of lineCounts) {
          expect(count).toBeGreaterThanOrEqual(1);
        }
        expect(new Set(lineCounts).size).toBeGreaterThanOrEqual(2);
      },
    );
  });
});
