'use client';

import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { sanitizeResumeItemPayload } from '@resumind/types';
import {
  type ButtonHTMLAttributes,
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { CvGenericSectionSkeleton } from '@/components/cv/cv-editor-skeleton';
import {
  DeleteItemDialog,
  ResumeItemForm,
  ResumeItemRow,
  SectionCreateForm,
} from '@/components/cv/cv-item-ui';
import { useCvItemMutation } from '@/components/cv/use-cv-item-mutation';
import { Button } from '@/components/ui/button';
import {
  CvItemApiError,
  type CvItemMutationResponse,
  type ReorderableCvSection,
  reorderCvSection,
} from '@/lib/cv-item-api';
import {
  getItemId,
  getOrderedItemIds,
  idsOrderEqual,
  mergeItemById,
  moveIdDown,
  moveIdUp,
  orderItemsByIds,
  removeItemById,
  type WithItemId,
} from '@/lib/cv-section-order';
import { sectionItemsNeedHydration } from '@/lib/cv-section-refetch';

interface SectionReorderConfig {
  section: ReorderableCvSection;
  sectionLabel: string;
  version?: string | null;
  onVersionChange?: (version: string | undefined) => void;
}

function SortableItemShell({
  id,
  disabled,
  children,
}: {
  id: string;
  disabled: boolean;
  children: (state: { isDragging: boolean; dragHandleProps: Record<string, unknown> }) => ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
    disabled,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style}>
      {children({
        isDragging,
        dragHandleProps: { ...attributes, ...listeners },
      })}
    </div>
  );
}

interface ArraySectionApi {
  create: (cvId: string, item: Record<string, unknown>) => Promise<CvItemMutationResponse>;
  update: (
    cvId: string,
    itemId: string,
    item: Record<string, unknown>,
  ) => Promise<CvItemMutationResponse>;
  delete: (cvId: string, itemId: string) => Promise<CvItemMutationResponse>;
}

export interface ManagedArraySectionProps<T extends WithItemId> {
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
  reorder?: SectionReorderConfig;
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
  reorder,
}: ManagedArraySectionProps<T>) {
  const { saving, error, setError, run } = useCvItemMutation();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<T | null>(null);
  const [creating, setCreating] = useState(false);
  const [createDraft, setCreateDraft] = useState<T | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [itemsLoading, setItemsLoading] = useState(() => sectionItemsNeedHydration(items));
  const reorderSeqRef = useRef(0);
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

  const reorderEnabled =
    reorder !== undefined &&
    items.length >= 2 &&
    editingId === null &&
    !creating &&
    !sectionItemsNeedHydration(items);

  const persistReorder = useCallback(
    async (order: string[], snapshotItems: T[]) => {
      if (!reorder) {
        return;
      }

      const currentIds = getOrderedItemIds(snapshotItems, entityLabel);
      if (idsOrderEqual(currentIds, order)) {
        return;
      }

      const optimisticItems = orderItemsByIds(snapshotItems, order);
      onItemsChange(optimisticItems);
      setError(null);

      const seq = ++reorderSeqRef.current;

      try {
        const result = await reorderCvSection(
          cvId,
          reorder.section,
          order,
          reorder.version ?? undefined,
        );

        if (seq !== reorderSeqRef.current) {
          return;
        }

        const nextVersion = result.meta?.version;
        if (nextVersion && reorder.onVersionChange) {
          reorder.onVersionChange(nextVersion);
        }

        if (!result.items) {
          return;
        }

        const serverItems = result.items as T[];
        const serverIds = getOrderedItemIds(serverItems, entityLabel);
        if (!idsOrderEqual(order, serverIds)) {
          onItemsChange(serverItems);
        }
      } catch (err) {
        if (seq !== reorderSeqRef.current) {
          return;
        }

        if (err instanceof CvItemApiError && err.status === 409) {
          try {
            const refetched = await refetchItems();
            onItemsChange(refetched);
            setError(
              'This CV was updated elsewhere. The list was refreshed — try reordering again.',
            );
          } catch (refetchErr) {
            onItemsChange(snapshotItems);
            setError(
              refetchErr instanceof Error
                ? refetchErr.message
                : 'Conflict while reordering. Reload the page and try again.',
            );
          }
          return;
        }

        onItemsChange(snapshotItems);
        const message = err instanceof Error ? err.message : 'Reorder failed';
        setError(message);
      }
    },
    [cvId, entityLabel, onItemsChange, refetchItems, reorder, setError],
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    if (!reorderEnabled || !reorder) {
      return;
    }
    const { active, over } = event;
    if (!over || active.id === over.id) {
      return;
    }
    const ids = getOrderedItemIds(items, entityLabel);
    const oldIndex = ids.indexOf(String(active.id));
    const newIndex = ids.indexOf(String(over.id));
    if (oldIndex < 0 || newIndex < 0) {
      return;
    }
    await persistReorder(arrayMove(ids, oldIndex, newIndex), items);
  };

  const handleMove = async (index: number, direction: 'up' | 'down') => {
    if (!reorder) {
      return;
    }
    const ids = getOrderedItemIds(items, entityLabel);
    const next = direction === 'up' ? moveIdUp(ids, index) : moveIdDown(ids, index);
    if (!next) {
      return;
    }
    await persistReorder(next, items);
  };

  const renderViewRow = (item: T, index: number) => {
    const view = renderView(item);
    const reorderProps =
      reorderEnabled && item.id
        ? {
            sectionLabel: reorder!.sectionLabel,
            canMoveUp: index > 0,
            canMoveDown: index < items.length - 1,
            onMoveUp: () => void handleMove(index, 'up'),
            onMoveDown: () => void handleMove(index, 'down'),
          }
        : undefined;

    const rowElement = (dragHandleProps?: Record<string, unknown>, isDragging = false) => (
      <ResumeItemRow
        title={view.title}
        subtitle={view.subtitle}
        meta={view.meta}
        isDragging={isDragging}
        onEdit={() => startEdit(item)}
        onDelete={() => {
          try {
            setDeleteId(getItemId(item, entityLabel));
          } catch (err) {
            setError(err instanceof Error ? err.message : 'Cannot delete this entry');
          }
        }}
        reorder={
          reorderProps
            ? {
                ...reorderProps,
                dragHandleProps: dragHandleProps as ButtonHTMLAttributes<HTMLButtonElement>,
              }
            : undefined
        }
      >
        {view.body}
      </ResumeItemRow>
    );

    if (reorderEnabled && item.id) {
      return (
        <SortableItemShell id={item.id} disabled={saving}>
          {({ isDragging, dragHandleProps }) => rowElement(dragHandleProps, isDragging)}
        </SortableItemShell>
      );
    }

    return rowElement();
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

  const sortableIds = reorderEnabled
    ? (items.map((item) => item.id).filter(Boolean) as string[])
    : [];

  const itemList = items.map((item, index) => {
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
      <div key={itemKey}>{renderViewRow(item, index)}</div>
    );
  });

  return (
    <div className="space-y-4">
      {error ? <p className="text-destructive text-sm">{error}</p> : null}

      {items.length === 0 && editingId === null && !creating ? (
        <p className="text-muted-foreground text-sm">No entries yet.</p>
      ) : null}

      {reorderEnabled ? (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={sortableIds} strategy={verticalListSortingStrategy}>
            {itemList}
          </SortableContext>
        </DndContext>
      ) : (
        itemList
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
