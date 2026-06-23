// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { CvSectionContent } from './cv-section-content';

describe('CvSectionContent', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders children', () => {
    render(<CvSectionContent>Section body</CvSectionContent>);

    expect(screen.getByText('Section body')).toBeInTheDocument();
  });

  it('merges additional class names', () => {
    const { container } = render(
      <CvSectionContent className="space-y-4">Section body</CvSectionContent>,
    );

    expect(container.firstElementChild).toHaveClass('space-y-4');
  });
});
