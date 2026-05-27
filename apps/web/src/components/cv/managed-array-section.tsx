'use client';

import { sanitizeResumeItemPayload } from '@resumind/types';
import { type ReactNode, useEffect, useRef, useState } from 'react';
import { CvGenericSectionSkeleton } from '@/components/cv/cv-editor-skeleton';
import {
  DeleteItemDialog,
  ResumeItemForm,
  ResumeItemRow,
  SectionCreateForm,
} from '@/components/cv/cv-item-ui';
import { useCvItemMutation } from '@/components/cv/use-cv-item-mutation';
import { Button } from '@/components/ui/button';
import type { CvItemMutationResponse } from '@/lib/cv-item-api';
import { getItemId, mergeItemById, removeItemById, type WithItemId } from '@/lib/cv-section-order';
import { sectionItemsNeedHydration } from '@/lib/cv-section-refetch';

interface ArraySectionApi {
  create: (cvId: string, item: Record<string, unknown>) => Promise<CvItemMutationResponse>;
  update: (
    cvId: string,
    itemId: string,
    item: Record<string, unknown>,
  ) => Promise<CvItemMutationResponse>;
  delete: (cvId: string, itemId: string) => Promise<CvItemMutationResponse>;
}

interface ManagedArraySectionProps<T extends WithItemId> {
  cvId: string;
  items: T[];
  onItemsChange: (items: T[]) => void;
  refetchItems: () => Promise<T[]>;
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
  api: ArraySectionApi;
  successMessages?: { create?: string; update?: string; delete?: string };
}

export function ManagedArraySection<T extends WithItemId>({
  cvId,
  items,
  onItemsChange,
  refetchItems,
  entityLabel,
  addLabel,
  createEmpty,
  toPayload,
  renderView,
  renderForm,
  api,
  successMessages,
}: ManagedArraySectionProps<T>) {
  const { saving, error, setError, run } = useCvItemMutation();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<T | null>(null);
  const [creating, setCreating] = useState(false);
  const [createDraft, setCreateDraft] = useState<T | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [itemsLoading, setItemsLoading] = useState(() => sectionItemsNeedHydration(items));
  const refetchItemsRef = useRef(refetchItems);
  const onItemsChangeRef = useRef(onItemsChange);
  const setErrorRef = useRef(setError);
  const hydratedForCvIdRef = useRef<string | null>(null);
  const needsHydration = sectionItemsNeedHydration(items);

  refetchItemsRef.current = refetchItems;
  onItemsChangeRef.current = onItemsChange;
  setErrorRef.current = setError;

  useEffect(() => {
    if (hydratedForCvIdRef.current !== null && hydratedForCvIdRef.current !== cvId) {
      hydratedForCvIdRef.current = null;
    }
  }, [cvId]);

  useEffect(() => {
    if (!needsHydration) {
      setItemsLoading(false);
      return;
    }
    if (hydratedForCvIdRef.current === cvId) {
      setItemsLoading(false);
      return;
    }

    setItemsLoading(true);
    let cancelled = false;

    void refetchItemsRef
      .current()
      .then((refetched) => {
        if (cancelled) {
          return;
        }
        hydratedForCvIdRef.current = cvId;
        onItemsChangeRef.current(refetched);
      })
      .catch((err) => {
        if (cancelled) {
          return;
        }
        hydratedForCvIdRef.current = null;
        setErrorRef.current(
          err instanceof Error ? err.message : 'Failed to refresh section entries',
        );
      })
      .finally(() => {
        if (!cancelled) {
          setItemsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [cvId, needsHydration]);

  const startEdit = (item: T) => {
    setCreating(false);
    setCreateDraft(null);
    try {
      setEditingId(getItemId(item, entityLabel));
      setDraft({ ...item });
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : `Cannot edit this ${entityLabel.toLowerCase()}`,
      );
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setDraft(null);
    setError(null);
  };

  const saveEdit = async () => {
    if (!editingId || !draft) {
      return;
    }
    await run(
      () => api.update(cvId, editingId, sanitizeResumeItemPayload(toPayload(draft))),
      (result) => {
        const updated = (result.item ?? draft) as T;
        onItemsChange(mergeItemById(items, updated));
        cancelEdit();
      },
      successMessages?.update ?? `${entityLabel} updated`,
    );
  };

  const startCreate = () => {
    setEditingId(null);
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
      () => api.create(cvId, sanitizeResumeItemPayload(toPayload(createDraft))),
      async () => {
        onItemsChange(await refetchItems());
        cancelCreate();
      },
      successMessages?.create ?? `${entityLabel} added`,
    );
  };

  const confirmDelete = async () => {
    if (!deleteId) {
      return;
    }
    const itemId = deleteId;
    await run(
      () => api.delete(cvId, itemId),
      () => {
        onItemsChange(removeItemById(items, itemId));
        setDeleteId(null);
        if (editingId === itemId) {
          cancelEdit();
        }
      },
      successMessages?.delete ?? `${entityLabel} deleted`,
    );
  };

  if (itemsLoading) {
    return (
      <div
        className="space-y-4"
        role="status"
        aria-busy="true"
        aria-label={`Loading ${entityLabel.toLowerCase()} entries`}
      >
        <CvGenericSectionSkeleton />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {items.length === 0 && editingId === null && !creating ? (
        <p className="text-muted-foreground text-sm">No entries yet.</p>
      ) : null}

      {items.map((item, index) => {
        const itemKey = item.id ?? `row-${index}`;
        return editingId === item.id && draft ? (
          <ResumeItemForm
            key={itemKey}
            saving={saving}
            error={error}
            onSave={saveEdit}
            onCancel={cancelEdit}
          >
            {renderForm(draft, setDraft)}
          </ResumeItemForm>
        ) : (
          <div key={itemKey}>
            {(() => {
              const view = renderView(item);
              return (
                <ResumeItemRow
                  title={view.title}
                  subtitle={view.subtitle}
                  meta={view.meta}
                  onEdit={() => startEdit(item)}
                  onDelete={() => {
                    try {
                      setDeleteId(getItemId(item, entityLabel));
                    } catch (err) {
                      setError(err instanceof Error ? err.message : 'Cannot delete this entry');
                    }
                  }}
                >
                  {view.body}
                </ResumeItemRow>
              );
            })()}
          </div>
        );
      })}

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
        open={deleteId !== null}
        title={`Delete ${entityLabel.toLowerCase()}?`}
        description="This cannot be undone. The entry will be removed from your CV immediately."
        confirming={saving}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
