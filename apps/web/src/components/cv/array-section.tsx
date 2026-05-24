import { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ArraySectionProps<T> {
  title: string;
  items: T[];
  onChange: (items: T[]) => void;
  createItem: () => T;
  renderItem: (item: T, index: number, update: (next: T) => void, remove: () => void) => ReactNode;
}

export function ArraySection<T>({
  title,
  items,
  onChange,
  createItem,
  renderItem,
}: ArraySectionProps<T>) {
  const addItem = () => onChange([...items, createItem()]);
  const updateItem = (index: number, next: T) => {
    const copy = [...items];
    copy[index] = next;
    onChange(copy);
  };
  const removeItem = (index: number) =>
    onChange(items.filter((_, itemIndex) => itemIndex !== index));

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">{title}</h3>
      {items.length === 0 ? (
        <p className="text-muted-foreground text-sm">No entries yet.</p>
      ) : (
        items.map((item, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-base">
                {title} #{index + 1}
              </CardTitle>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() => removeItem(index)}
              >
                Remove
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {renderItem(
                item,
                index,
                (next) => updateItem(index, next),
                () => removeItem(index),
              )}
            </CardContent>
          </Card>
        ))
      )}
      <Button type="button" onClick={addItem}>
        Add entry
      </Button>
    </div>
  );
}
