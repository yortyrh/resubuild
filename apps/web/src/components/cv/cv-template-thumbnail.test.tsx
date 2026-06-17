// @vitest-environment jsdom

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CvTemplateThumbnail } from './cv-template-thumbnail';

describe('CvTemplateThumbnail', () => {
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
});
