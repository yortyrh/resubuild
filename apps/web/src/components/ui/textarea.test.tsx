// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Textarea } from './textarea';

describe('Textarea', () => {
  afterEach(() => {
    cleanup();
  });

  it('coerces null value to empty string for controlled textareas', () => {
    render(<Textarea value={null} onChange={vi.fn()} aria-label="Test" />);
    expect(screen.getByRole('textbox', { name: 'Test' })).toHaveValue('');
  });

  it('passes string values through unchanged', () => {
    render(<Textarea value="notes" onChange={vi.fn()} aria-label="Test" />);
    expect(screen.getByRole('textbox', { name: 'Test' })).toHaveValue('notes');
  });

  it('supports defaultValue when value is not provided', () => {
    render(<Textarea defaultValue="seed" aria-label="Test" />);
    expect(screen.getByRole('textbox', { name: 'Test' })).toHaveValue('seed');
  });
});
