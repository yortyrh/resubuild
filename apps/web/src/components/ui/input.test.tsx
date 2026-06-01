// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Input } from './input';

describe('Input', () => {
  afterEach(() => {
    cleanup();
  });

  it('coerces null value to empty string for controlled inputs', () => {
    render(<Input value={null} onChange={vi.fn()} aria-label="Test" />);
    expect(screen.getByRole('textbox', { name: 'Test' })).toHaveValue('');
  });

  it('passes string values through unchanged', () => {
    render(<Input value="hello" onChange={vi.fn()} aria-label="Test" />);
    expect(screen.getByRole('textbox', { name: 'Test' })).toHaveValue('hello');
  });

  it('supports defaultValue when value is not provided', () => {
    render(<Input defaultValue="seed" aria-label="Test" />);
    expect(screen.getByRole('textbox', { name: 'Test' })).toHaveValue('seed');
  });
});
