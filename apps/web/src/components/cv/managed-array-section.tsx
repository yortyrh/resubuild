'use client';

import { sanitizeResumeItemPayload } from '@resumind/types';
import { type ReactNode, useState } from 'react';
import {
  DeleteItemDialog,
  ResumeItemForm,
  ResumeItemRow,
  SectionCreateForm,
} from '@/components/cv/cv-item-ui';
import { useCvItemMutation } from '@/components/cv/use-cv-item-mutation';
import { Button } from '@/components/ui/button';
import type { CvItemMutationResponse } from '@/lib/cv-item-api';

interface ArraySectionApi {
  create: (
    cvId: string,
    item: Record<string, unknown>,
    version?: string,
  ) => Promise<CvItemMutationResponse>;
  update: (
    cvId: string,
    index: number,
    item: Record<string, unknown>,
    version?: string,
  ) => Promise<CvItemMutationResponse>;
  delete: (cvId: string, index: number, version?: string) => Promise<CvItemMutationResponse>;
}

interface ManagedArraySectionProps<T> {
  cvId: string;
  version: string | undefined;
  onVersionChange: (version: string) => void;
  items: T[];
  onItemsChange: (items: T[]) => void;
  entityLabel: string;
  addLabel: string;
  createEmpty: () => T;
  toPayload: (item: T) => Record<string, unknown>;
  renderView: (item: T) => {
    title: ReactNode;
    subtitle?: ReactNode;
    meta?: ReactNode;
    body?: ReactNode;
  };
  renderForm: (item: T, onChange: (next: T) => void) => ReactNode;
  renderAfterView?: (item: T, index: number, onItemChange: (next: T) => void) => ReactNode;
  api: ArraySectionApi;
  successMessages?: { create?: string; update?: string; delete?: string };
}

export function ManagedArraySection<T>({
  cvId,
  version,
  onVersionChange,
  items,
  onItemsChange,
  entityLabel,
  addLabel,
  createEmpty,
  toPayload,
  renderView,
  renderForm,
  renderAfterView,
  api,
  successMessages,
}: ManagedArraySectionProps<T>) {
  const { saving, error, setError, run } = useCvItemMutation({ version, onVersionChange });
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [draft, setDraft] = useState<T | null>(null);
  const [creating, setCreating] = useState(false);
  const [createDraft, setCreateDraft] = useState<T | null>(null);
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null);

  const startEdit = (index: number) => {
    setCreating(false);
    setCreateDraft(null);
    setEditingIndex(index);
    setDraft({ ...items[index] });
    setError(null);
  };

  const cancelEdit = () => {
    setEditingIndex(null);
    setDraft(null);
    setError(null);
  };

  const saveEdit = async () => {
    if (editingIndex === null || !draft) {
      return;
    }
    await run(
      (v) => api.update(cvId, editingIndex, sanitizeResumeItemPayload(toPayload(draft)), v),
      () => {
        const next = [...items];
        next[editingIndex] = draft;
        onItemsChange(next);
        cancelEdit();
      },
      successMessages?.update ?? `${entityLabel} updated`,
    );
  };

  const startCreate = () => {
    setEditingIndex(null);
    setDraft(null);
    setCreating(true);
    setCreateDraft(createEmpty());
    setError(null);
  };

  const cancelCreate = () => {
    setCreating(false);
    setCreateDraft(null);
    setError(null);
  };

  const saveCreate = async () => {
    if (!createDraft) {
      return;
    }
    await run(
      (v) => api.create(cvId, sanitizeResumeItemPayload(toPayload(createDraft)), v),
      (result) => {
        const created = (result.item ?? createDraft) as T;
        onItemsChange([...items, created]);
        cancelCreate();
      },
      successMessages?.create ?? `${entityLabel} added`,
    );
  };

  const confirmDelete = async () => {
    if (deleteIndex === null) {
      return;
    }
    const index = deleteIndex;
    await run(
      (v) => api.delete(cvId, index, v),
      () => {
        onItemsChange(items.filter((_, i) => i !== index));
        setDeleteIndex(null);
        if (editingIndex === index) {
          cancelEdit();
        }
      },
      successMessages?.delete ?? `${entityLabel} deleted`,
    );
  };

  return (
    <div className="space-y-4">
      {items.length === 0 && editingIndex === null && !creating ? (
        <p className="text-muted-foreground text-sm">No entries yet.</p>
      ) : null}

      {items.map((item, index) =>
        editingIndex === index && draft ? (
          <ResumeItemForm
            key={index}
            saving={saving}
            error={error}
            onSave={saveEdit}
            onCancel={cancelEdit}
          >
            {renderForm(draft, setDraft)}
          </ResumeItemForm>
        ) : (
          <div key={index}>
            {(() => {
              const view = renderView(item);
              return (
                <ResumeItemRow
                  title={view.title}
                  subtitle={view.subtitle}
                  meta={view.meta}
                  onEdit={() => startEdit(index)}
                  onDelete={() => setDeleteIndex(index)}
                >
                  {view.body}
                </ResumeItemRow>
              );
            })()}
            {renderAfterView?.(item, index, (next) => {
              const updated = [...items];
              updated[index] = next;
              onItemsChange(updated);
            })}
          </div>
        ),
      )}

      {creating && createDraft ? (
        <SectionCreateForm
          label={addLabel}
          open
          onOpen={startCreate}
          saving={saving}
          error={error}
          onSave={saveCreate}
          onCancel={cancelCreate}
        >
          {renderForm(createDraft, setCreateDraft)}
        </SectionCreateForm>
      ) : (
        <Button type="button" className="mt-4" onClick={startCreate}>
          {addLabel}
        </Button>
      )}

      <DeleteItemDialog
        open={deleteIndex !== null}
        title={`Delete ${entityLabel.toLowerCase()}?`}
        description="This cannot be undone. The entry will be removed from your CV immediately."
        confirming={saving}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteIndex(null)}
      />
    </div>
  );
}
