// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

const mockCreateCv = vi.fn();
const mockReplace = vi.fn();
const mockPush = vi.fn();

vi.mock('@/lib/api', () => ({
  createCv: (...args: unknown[]) => mockCreateCv(...args),
}));

vi.mock('@resumind/types', () => ({
  createEmptyResume: () => ({
    basics: {},
    work: [],
    volunteer: [],
    education: [],
    awards: [],
    certificates: [],
    publications: [],
    skills: [],
    languages: [],
    interests: [],
    references: [],
    projects: [],
  }),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    replace: mockReplace,
    push: mockPush,
  }),
}));

import { NewCvPageClient } from './new-cv-page-client';

describe('NewCvPageClient', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('does not auto-create a CV on load', () => {
    render(<NewCvPageClient />);
    expect(mockCreateCv).not.toHaveBeenCalled();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('creates a CV and navigates to the editor when Save succeeds', async () => {
    mockCreateCv.mockResolvedValue({ id: 'cv-new-1' });
    const user = userEvent.setup({ delay: null });
    render(<NewCvPageClient />);

    const textboxes = screen.getAllByRole('textbox');
    await user.type(textboxes[0], 'Alex Smith');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(mockCreateCv).toHaveBeenCalledTimes(1);
    });
    expect(mockCreateCv).toHaveBeenCalledWith({
      data: expect.objectContaining({
        basics: expect.objectContaining({ name: 'Alex Smith' }),
        work: [],
        education: [],
      }),
    });
    expect(mockCreateCv).toHaveBeenCalledWith(
      expect.not.objectContaining({ title: expect.anything() }),
    );
    expect(mockReplace).toHaveBeenCalledWith('/dashboard/cv/cv-new-1');
  }, 15_000);
});
