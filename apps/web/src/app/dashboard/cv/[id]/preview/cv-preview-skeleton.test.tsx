// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import {
  CvPreviewBreadcrumbSkeleton,
  CvPreviewDocumentSkeleton,
  CvPreviewLoadingRow,
} from './cv-preview-skeleton';

describe('CvPreviewSkeleton', () => {
  afterEach(() => {
    cleanup();
  });

  it('exposes an accessible loading label on the breadcrumb skeleton', () => {
    render(<CvPreviewBreadcrumbSkeleton />);
    expect(screen.getByLabelText('Loading breadcrumb')).toBeInTheDocument();
  });

  it('exposes an accessible loading label on the document skeleton', () => {
    render(<CvPreviewDocumentSkeleton />);
    expect(screen.getByLabelText('Loading resume preview')).toBeInTheDocument();
  });

  it('shows layout panel skeleton on desktop breakpoints', () => {
    render(<CvPreviewLoadingRow />);
    expect(screen.getByLabelText('Loading layout panel')).toBeInTheDocument();
    expect(screen.getByLabelText('Loading layout panel').parentElement?.parentElement).toHaveClass(
      'hidden',
      'lg:block',
    );
  });
});
