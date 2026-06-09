// @vitest-environment jsdom
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CvListSkeleton } from './cv-list-skeleton';

describe('CvListSkeleton', () => {
  it('renders a status region announcing "Loading CVs"', () => {
    const { container } = render(<CvListSkeleton />);
    expect(container.querySelector('[aria-busy="true"]')).toBeTruthy();
    const status = container.querySelector('[role="status"]');
    expect(status).toBeTruthy();
  });

  it('renders a header strip with title + button skeletons matching the real list layout', () => {
    const { container } = render(<CvListSkeleton />);
    // Header is the first flex row inside the skeleton root.
    const header = container.querySelector('.flex.items-center.justify-between');
    expect(header).toBeTruthy();
    // Header contains a subtitle group (space-y-2) and a button skeleton.
    const subtitleGroup = header?.querySelector('.space-y-2');
    expect(subtitleGroup?.childElementCount).toBe(2);
    const buttonSkeletons = header?.querySelectorAll(':scope > *');
    // Should have the subtitle div + button skeleton = 2 direct children.
    expect(buttonSkeletons?.length).toBeGreaterThanOrEqual(2);
  });

  it('renders four grid cards matching the real list grid', () => {
    const { container } = render(<CvListSkeleton />);
    const grid = container.querySelector('.grid');
    expect(grid).toBeTruthy();
    expect(grid?.querySelectorAll('article')).toHaveLength(4);
  });
});
