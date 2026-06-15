// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { LanguageField } from './language-field';

describe('LanguageField', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders empty trigger when value is null', () => {
    render(<LanguageField value={null} onChange={vi.fn()} />);
    expect(screen.getByRole('combobox', { name: /Language, choose language/i })).toHaveTextContent(
      'Select language…',
    );
  });

  it('displays legacy custom value when not in canonical list', () => {
    render(<LanguageField value="Klingon" onChange={vi.fn()} />);
    expect(screen.getByRole('combobox', { name: /Language, choose language/i })).toHaveTextContent(
      'Klingon',
    );
  });

  it('displays canonical value with ISO code in trigger', () => {
    render(<LanguageField value="English" onChange={vi.fn()} />);
    expect(screen.getByRole('combobox', { name: /Language, choose language/i })).toHaveTextContent(
      'English (en)',
    );
  });

  it('filters options by search query', async () => {
    const user = userEvent.setup();
    render(<LanguageField value="" onChange={vi.fn()} />);

    await user.click(screen.getByRole('combobox'));
    const search = screen.getByPlaceholderText('Search by name or code…');
    await user.type(search, 'spa');

    expect(screen.getByRole('option', { name: /Spanish/i })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /English/i })).not.toBeInTheDocument();
  });

  it('calls onChange with language name on option click', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<LanguageField value="" onChange={onChange} />);

    await user.click(screen.getByRole('combobox'));
    const search = screen.getByPlaceholderText('Search by name or code…');
    await user.type(search, 'spanish');
    await user.click(screen.getByRole('option', { name: /Spanish/i }));

    expect(onChange).toHaveBeenCalledWith('Spanish');
  });

  it('selects highlighted option on Enter and closes dropdown', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<LanguageField value="" onChange={onChange} />);

    await user.click(screen.getByRole('combobox'));
    const search = screen.getByPlaceholderText('Search by name or code…');
    await user.type(search, 'spanish');

    const combobox = screen.getByRole('combobox');
    fireEvent.keyDown(combobox, { key: 'Enter' });

    expect(onChange).toHaveBeenCalledWith('Spanish');
    expect(screen.queryByPlaceholderText('Search by name or code…')).not.toBeInTheDocument();
  });

  it('closes dropdown on Escape without changing value', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<LanguageField value="English" onChange={onChange} />);

    await user.click(screen.getByRole('combobox'));
    expect(screen.getByPlaceholderText('Search by name or code…')).toBeInTheDocument();

    const combobox = screen.getByRole('combobox');
    fireEvent.keyDown(combobox, { key: 'Escape' });

    expect(onChange).not.toHaveBeenCalled();
    expect(screen.queryByPlaceholderText('Search by name or code…')).not.toBeInTheDocument();
  });
});
