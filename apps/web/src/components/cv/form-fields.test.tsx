import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/components/cv/markdown-editor', () => ({
  MarkdownEditor: ({ value, onChange }: { value?: string; onChange: (next: string) => void }) => (
    <div
      contentEditable
      suppressContentEditableWarning
      onInput={(event) => onChange(event.currentTarget.textContent ?? '')}
    >
      {value}
    </div>
  ),
}));

import { StringListField } from './form-fields';

function ControlledStringListField({
  initialValues = [] as string[],
  markdown = false,
  label = 'Courses',
}: {
  initialValues?: string[];
  markdown?: boolean;
  label?: string;
}) {
  const [values, setValues] = useState(initialValues);
  return <StringListField label={label} values={values} onChange={setValues} markdown={markdown} />;
}

describe('StringListField', () => {
  afterEach(() => {
    cleanup();
  });

  it('adds a new course when Enter is pressed on the last input', () => {
    const onChange = vi.fn();
    render(
      <form onSubmit={(event) => event.preventDefault()}>
        <StringListField label="Courses" values={['First']} onChange={onChange} />
      </form>,
    );

    fireEvent.keyDown(screen.getByDisplayValue('First'), { key: 'Enter' });

    expect(onChange).toHaveBeenCalledWith(['First', '']);
  });

  it('does nothing when Enter is pressed on a non-last course input', () => {
    const onChange = vi.fn();
    render(
      <form onSubmit={(event) => event.preventDefault()}>
        <StringListField label="Courses" values={['First', 'Second']} onChange={onChange} />
      </form>,
    );

    fireEvent.keyDown(screen.getByDisplayValue('First'), { key: 'Enter' });

    expect(onChange).not.toHaveBeenCalled();
  });

  it('does not submit the parent form when Enter is pressed on the last course input', () => {
    const onSubmit = vi.fn((event) => event.preventDefault());
    render(
      <form onSubmit={onSubmit}>
        <StringListField label="Courses" values={['First', 'Second']} onChange={vi.fn()} />
      </form>,
    );

    fireEvent.keyDown(screen.getByDisplayValue('Second'), { key: 'Enter' });

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('focuses the new course input when Add is clicked', () => {
    render(<ControlledStringListField initialValues={['First']} label="Courses" />);

    fireEvent.click(screen.getByRole('button', { name: 'Add Courses' }));

    const inputs = screen.getAllByRole('textbox');
    expect(inputs).toHaveLength(2);
    expect(document.activeElement).toBe(inputs[1]);
  });

  it('focuses the new course input when Enter is pressed on the last item', () => {
    render(<ControlledStringListField initialValues={['First']} label="Courses" />);

    fireEvent.keyDown(screen.getByDisplayValue('First'), { key: 'Enter' });

    const inputs = screen.getAllByRole('textbox');
    expect(inputs).toHaveLength(2);
    expect(document.activeElement).toBe(inputs[1]);
  });

  it('does not auto-focus when adding a highlight', () => {
    render(
      <ControlledStringListField initialValues={['First highlight']} label="Highlights" markdown />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Add Highlights' }));

    const editables = document.querySelectorAll('[contenteditable="true"]');
    expect(editables).toHaveLength(2);
    expect(document.activeElement).not.toBe(editables[1]);
  });

  it('uses an icon remove control for markdown rows', () => {
    render(
      <StringListField
        label="Highlights"
        markdown
        values={['First highlight']}
        onChange={vi.fn()}
      />,
    );

    const remove = screen.getByRole('button', { name: 'Remove' });
    expect(remove).not.toHaveTextContent('Remove');
  });

  it('keeps labeled Remove button for plain-text rows', () => {
    render(<StringListField label="Courses" values={['First']} onChange={vi.fn()} />);

    expect(screen.getByRole('button', { name: 'Remove' })).toHaveTextContent('Remove');
  });

  it('does not add a highlight when Enter is pressed in the editor', () => {
    const onChange = vi.fn();
    render(
      <StringListField
        label="Highlights"
        markdown
        values={['First highlight']}
        onChange={onChange}
      />,
    );

    const editable = document.querySelector('[contenteditable="true"]');
    fireEvent.keyDown(editable!, { key: 'Enter' });

    expect(onChange).not.toHaveBeenCalled();
  });
});
