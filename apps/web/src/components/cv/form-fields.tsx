import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { MarkdownEditor } from '@/components/cv/markdown-editor';

interface TextFieldProps {
  label: string;
  value?: string;
  onChange: (value: string) => void;
  type?: 'text' | 'email' | 'url';
  multiline?: boolean;
  markdown?: 'inline' | 'block';
  placeholder?: string;
}

export function TextField({
  label,
  value = '',
  onChange,
  type = 'text',
  multiline = false,
  markdown,
  placeholder,
}: TextFieldProps) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {markdown ? (
        <MarkdownEditor
          value={value}
          onChange={onChange}
          variant={markdown}
          placeholder={placeholder}
        />
      ) : multiline ? (
        <Textarea
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <Input
          type={type}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </div>
  );
}

interface StringListFieldProps {
  label: string;
  values?: string[];
  onChange: (values: string[]) => void;
  markdown?: boolean;
}

export function StringListField({
  label,
  values = [],
  onChange,
  markdown = false,
}: StringListFieldProps) {
  const updateItem = (index: number, value: string) => {
    const next = [...values];
    next[index] = value;
    onChange(next);
  };

  const addItem = () => onChange([...values, '']);
  const removeItem = (index: number) =>
    onChange(values.filter((_, itemIndex) => itemIndex !== index));

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="space-y-3">
        {values.map((value, index) => (
          <div key={index} className="flex gap-2 items-start">
            <div className="min-w-0 flex-1">
              {markdown ? (
                <MarkdownEditor
                  value={value}
                  onChange={(next) => updateItem(index, next)}
                  variant="inline"
                />
              ) : (
                <Input
                  value={value}
                  onChange={(e) => updateItem(index, e.target.value)}
                />
              )}
            </div>
            <Button
              type="button"
              variant="outline"
              className="shrink-0"
              onClick={() => removeItem(index)}
            >
              Remove
            </Button>
          </div>
        ))}
        <Button type="button" variant="secondary" onClick={addItem}>
          Add {label}
        </Button>
      </div>
    </div>
  );
}
