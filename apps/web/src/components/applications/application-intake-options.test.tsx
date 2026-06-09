// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApplicationIntakeOptions } from './application-intake-options';

vi.mock('@/components/cv/markdown-editor', () => ({
  MarkdownEditor: ({
    value,
    onChange,
    placeholder,
  }: {
    value?: string;
    onChange: (value: string) => void;
    placeholder?: string;
  }) => (
    <textarea
      data-testid="md-editor"
      data-placeholder={placeholder ?? ''}
      value={value ?? ''}
      onChange={(event) => onChange(event.target.value)}
    />
  ),
}));

describe('ApplicationIntakeOptions', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders the Optional instruction as a Markdown editor and propagates onChange', () => {
    const onMessageChange = vi.fn();
    render(
      <ApplicationIntakeOptions
        cvs={[]}
        pickMode="auto"
        onPickModeChange={vi.fn()}
        sourceCvId=""
        onSourceCvIdChange={vi.fn()}
        message=""
        onMessageChange={onMessageChange}
      />,
    );

    const editor = screen.getByTestId('md-editor');
    expect(editor).toBeInTheDocument();
    expect(editor).toHaveAttribute('data-placeholder', 'Emphasize React experience…');

    fireEvent.change(editor, { target: { value: 'Highlight Node.js' } });
    expect(onMessageChange).toHaveBeenCalledWith('Highlight Node.js');
  });
});
