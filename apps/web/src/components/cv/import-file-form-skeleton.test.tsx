// @vitest-environment jsdom
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ImportFileFormSkeleton } from './import-file-form-skeleton';

describe('ImportFileFormSkeleton', () => {
  it('renders a skeleton matching the import form layout', () => {
    const { container } = render(<ImportFileFormSkeleton />);
    expect(container.querySelector('[aria-busy="true"]')).toBeTruthy();
    expect(container.querySelector('.border-dashed')).toBeTruthy();
  });
});
