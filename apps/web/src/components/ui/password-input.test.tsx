// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PasswordInput } from './password-input';

describe('PasswordInput', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders as type="password" by default with a "Show password" toggle', () => {
    render(<PasswordInput aria-label="Password" value="" onChange={vi.fn()} />);

    const input = screen.getByLabelText('Password');
    expect(input).toHaveAttribute('type', 'password');

    const toggle = screen.getByRole('button', { name: /show password/i });
    expect(toggle).toBeInTheDocument();
    expect(toggle).toHaveAttribute('aria-pressed', 'false');
    expect(toggle).toHaveAttribute('type', 'button');
  });

  it('reveals the password when the toggle is clicked', async () => {
    const user = userEvent.setup();
    render(<PasswordInput aria-label="Password" value="" onChange={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: /show password/i }));

    const input = screen.getByLabelText('Password');
    expect(input).toHaveAttribute('type', 'text');

    const toggle = screen.getByRole('button', { name: /hide password/i });
    expect(toggle).toHaveAttribute('aria-pressed', 'true');
  });

  it('re-masks the password when the toggle is clicked a second time', async () => {
    const user = userEvent.setup();
    render(<PasswordInput aria-label="Password" value="" onChange={vi.fn()} />);

    const toggle = screen.getByRole('button', { name: /show password/i });
    await user.click(toggle);
    await user.click(toggle);

    expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'password');
    expect(toggle).toHaveAttribute('aria-pressed', 'false');
  });

  it('preserves the typed value across toggle interactions', async () => {
    const user = userEvent.setup();
    render(<PasswordInput aria-label="Password" defaultValue="hunter2" />);

    const input = screen.getByLabelText('Password');
    expect(input).toHaveValue('hunter2');

    await user.click(screen.getByRole('button', { name: /show password/i }));
    expect(input).toHaveValue('hunter2');
    expect(input).toHaveAttribute('type', 'text');

    await user.click(screen.getByRole('button', { name: /hide password/i }));
    expect(input).toHaveValue('hunter2');
    expect(input).toHaveAttribute('type', 'password');
  });

  it('does not submit the surrounding form when the toggle is clicked', async () => {
    const user = userEvent.setup();
    const handleSubmit = vi.fn((event: React.FormEvent<HTMLFormElement>) => event.preventDefault());

    render(
      <form onSubmit={handleSubmit}>
        <PasswordInput aria-label="Password" defaultValue="hunter2" />
      </form>,
    );

    await user.click(screen.getByRole('button', { name: /show password/i }));

    expect(handleSubmit).not.toHaveBeenCalled();
  });
});
