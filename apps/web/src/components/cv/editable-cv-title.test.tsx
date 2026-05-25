// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const mockUpdateCv = vi.fn();
vi.mock('@/lib/api', () => ({
  updateCv: (...args: unknown[]) => mockUpdateCv(...args),
}));

import { toast } from 'sonner';
import { EditableCvTitle } from './editable-cv-title';

describe('EditableCvTitle', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  describe('view mode', () => {
    it('shows the title and Edit button by default', () => {
      render(<EditableCvTitle cvId="cv-1" initialTitle="My Resume" />);
      expect(screen.getByText('My Resume')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument();
      expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    });

    it('shows "Untitled CV" placeholder when title is empty', () => {
      render(<EditableCvTitle cvId="cv-1" initialTitle="" />);
      expect(screen.getByText('Untitled CV')).toBeInTheDocument();
    });

    it('shows "Untitled CV" placeholder when title is whitespace-only', () => {
      render(<EditableCvTitle cvId="cv-1" initialTitle="   " />);
      expect(screen.getByText('Untitled CV')).toBeInTheDocument();
    });
  });

  describe('edit mode', () => {
    it('enters edit mode on Edit click', async () => {
      const user = userEvent.setup();
      render(<EditableCvTitle cvId="cv-1" initialTitle="My Resume" />);

      await user.click(screen.getByRole('button', { name: 'Edit' }));

      expect(screen.getByRole('textbox', { name: 'CV title' })).toHaveValue('My Resume');
      expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    });

    it('reverts draft and exits edit mode on Cancel', async () => {
      const user = userEvent.setup();
      render(<EditableCvTitle cvId="cv-1" initialTitle="My Resume" />);

      await user.click(screen.getByRole('button', { name: 'Edit' }));
      const input = screen.getByRole('textbox', { name: 'CV title' });
      await user.clear(input);
      await user.type(input, 'Changed');
      await user.click(screen.getByRole('button', { name: 'Cancel' }));

      expect(screen.getByText('My Resume')).toBeInTheDocument();
      expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
      expect(mockUpdateCv).not.toHaveBeenCalled();
    });

    it('reverts on Escape key', async () => {
      const user = userEvent.setup();
      render(<EditableCvTitle cvId="cv-1" initialTitle="My Resume" />);

      await user.click(screen.getByRole('button', { name: 'Edit' }));
      const input = screen.getByRole('textbox', { name: 'CV title' });
      await user.clear(input);
      await user.type(input, 'Changed');
      fireEvent.keyDown(input, { key: 'Escape' });

      expect(screen.getByText('My Resume')).toBeInTheDocument();
      expect(mockUpdateCv).not.toHaveBeenCalled();
    });
  });

  describe('save', () => {
    beforeEach(() => {
      mockUpdateCv.mockResolvedValue({});
    });

    it('calls updateCv and shows success toast on Save', async () => {
      const user = userEvent.setup();
      render(<EditableCvTitle cvId="cv-1" initialTitle="My Resume" />);

      await user.click(screen.getByRole('button', { name: 'Edit' }));
      const input = screen.getByRole('textbox', { name: 'CV title' });
      await user.clear(input);
      await user.type(input, 'New Title');
      await user.click(screen.getByRole('button', { name: 'Save' }));

      await waitFor(() => {
        expect(mockUpdateCv).toHaveBeenCalledWith('cv-1', { title: 'New Title' });
      });
      expect(toast.success).toHaveBeenCalledWith('Title updated');
      expect(screen.getByText('New Title')).toBeInTheDocument();
      expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    });

    it('saves on Enter key', async () => {
      const user = userEvent.setup();
      render(<EditableCvTitle cvId="cv-1" initialTitle="My Resume" />);

      await user.click(screen.getByRole('button', { name: 'Edit' }));
      const input = screen.getByRole('textbox', { name: 'CV title' });
      await user.clear(input);
      await user.type(input, 'Enter Title');
      fireEvent.keyDown(input, { key: 'Enter' });

      await waitFor(() => {
        expect(mockUpdateCv).toHaveBeenCalledWith('cv-1', { title: 'Enter Title' });
      });
    });

    it('shows error toast on save failure', async () => {
      mockUpdateCv.mockRejectedValueOnce(new Error('Network error'));
      const user = userEvent.setup();
      render(<EditableCvTitle cvId="cv-1" initialTitle="My Resume" />);

      await user.click(screen.getByRole('button', { name: 'Edit' }));
      await user.click(screen.getByRole('button', { name: 'Save' }));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Network error');
      });
      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });
  });
});
