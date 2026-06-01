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
import { toast } from 'sonner';
import { CvGenericSectionSkeleton } from '@/components/cv/cv-editor-skeleton';
import {
  DeleteItemDialog,
  MoveItemDialog,
  ResumeItemForm,
  ResumeItemRow,
  SectionCreateForm,
} from '@/components/cv/cv-item-ui';
import {
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
import { useSectionItemMutations } from '@/lib/queries/cv-mutations';
import type { CvArraySectionKey } from '@/lib/queries/cv-queries';
import { useCvSection } from '@/lib/queries/cv-queries';

interface SectionReorderConfig {
  section: ReorderableCvSection;
  sectionLabel: string;
}

export interface CrossSectionMoveConfig<T extends WithItemId> {
  buttonLabel: string;
  dialogTitle: string;
  dialogDescription: string;
  confirmLabel: string;
  successMessage: string;
  onMove: (item: T) => Promise<void>;
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
  sectionKey: CvArraySectionKey;
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
  renderForm: (
    item: T,
    onChange: (next: T) => void,
    context?: { fieldErrors: Record<string, string>; mode: 'create' | 'edit' },
  ) => ReactNode;
  api: ArraySectionApi;
  successMessages?: { create?: string; update?: string; delete?: string };
  reorder?: SectionReorderConfig;
  validateBeforeSave?: (item: T, mode: 'create' | 'edit') => Record<string, string> | null;
  sortItems?: (items: T[]) => T[];
  crossSectionMove?: CrossSectionMoveConfig<T>;
}

export function ManagedArraySection<T extends WithItemId>({
  cvId,
  sectionKey,
  items,
  onItemsChange,
  entityLabel,
  addLabel,
  createEmpty,
  toPayload,
  renderView,
  renderForm,
  api,
  successMessages,
  reorder,
  validateBeforeSave,
  sortItems,
  crossSectionMove,
}: ManagedArraySectionProps<T>) {
  const needsHydration = sectionItemsNeedHydration(items);
  const {
    data: sectionData,
    isLoading: sectionLoading,
    error: sectionQueryError,
  } = useCvSection<T>(cvId, sectionKey, { enabled: needsHydration });
  const { saving, error, setError, run, refetchSectionItems } = useSectionItemMutations(
    cvId,
    sectionKey,
  );
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<T | null>(null);
  const [creating, setCreating] = useState(false);
  const [createDraft, setCreateDraft] = useState<T | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [moveItem, setMoveItem] = useState<T | null>(null);
  const [moving, setMoving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const reorderSeqRef = useRef(0);
  const onItemsChangeRef = useRef(onItemsChange);
  const setErrorRef = useRef(setError);
  const hydratedForCvIdRef = useRef<string | null>(null);

  onItemsChangeRef.current = onItemsChange;
  setErrorRef.current = setError;

  useEffect(() => {
    if (hydratedForCvIdRef.current !== null && hydratedForCvIdRef.current !== cvId) {
      hydratedForCvIdRef.current = null;
    }
  }, [cvId]);

  useEffect(() => {
    if (!needsHydration || !sectionData) {
      return;
    }
    if (hydratedForCvIdRef.current === cvId) {
      return;
    }

    hydratedForCvIdRef.current = cvId;
    onItemsChangeRef.current(sectionData);
  }, [cvId, needsHydration, sectionData]);

  useEffect(() => {
    if (sectionQueryError) {
      setErrorRef.current(
        sectionQueryError instanceof Error
          ? sectionQueryError.message
          : 'Failed to refresh section entries',
      );
    }
  }, [sectionQueryError]);

  const applySortedItems = useCallback(
    (nextItems: T[]) => (sortItems ? sortItems(nextItems) : nextItems),
    [sortItems],
  );

  const handleEditDraftChange = useCallback(
    (next: T) => {
      setDraft(next);
      setFieldErrors({});
      if (sortItems && editingId) {
        onItemsChange(applySortedItems(mergeItemById(items, next)));
      }
    },
    [applySortedItems, editingId, items, onItemsChange, sortItems],
  );

  const handleCreateDraftChange = useCallback((next: T) => {
    setCreateDraft(next);
    setFieldErrors({});
  }, []);

  const runValidation = (item: T, mode: 'create' | 'edit'): boolean => {
    if (!validateBeforeSave) {
      return true;
    }
    const errors = validateBeforeSave(item, mode);
    if (errors && Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return false;
    }
    setFieldErrors({});
    return true;
  };

  const startEdit = (item: T) => {
    setCreating(false);
    setCreateDraft(null);
    try {
      setEditingId(getItemId(item, entityLabel));
      setDraft({ ...item });
      setFieldErrors({});
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
    setFieldErrors({});
    setError(null);
  };

  const saveEdit = async () => {
    if (!editingId || !draft) {
      return;
    }
    if (!runValidation(draft, 'edit')) {
      return;
    }
    await run(
      () => api.update(cvId, editingId, sanitizeResumeItemPayload(toPayload(draft))),
      (result) => {
        const updated = (result.item ?? draft) as T;
        onItemsChange(applySortedItems(mergeItemById(items, updated)));
        cancelEdit();
      },
      successMessages?.update ?? `${entityLabel} updated`,
      { mergeItem: true },
    );
  };

  const startCreate = () => {
    setEditingId(null);
    setDraft(null);
    setCreating(true);
    setCreateDraft(createEmpty());
    setFieldErrors({});
    setError(null);
  };

  const cancelCreate = () => {
    setCreating(false);
    setCreateDraft(null);
    setFieldErrors({});
    setError(null);
  };

  const saveCreate = async () => {
    if (!createDraft) {
      return;
    }
    if (!runValidation(createDraft, 'create')) {
      return;
    }
    await run(
      () => api.create(cvId, sanitizeResumeItemPayload(toPayload(createDraft))),
      async () => {
        onItemsChange(await refetchSectionItems<T>());
        cancelCreate();
      },
      successMessages?.create ?? `${entityLabel} added`,
      { invalidateSection: true },
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
      { invalidateSection: true },
    );
  };

  const confirmMove = async () => {
    if (!moveItem || !crossSectionMove) {
      return;
    }

    const item = moveItem;
    setMoving(true);
    setError(null);

    try {
      await crossSectionMove.onMove(item);
      toast.success(crossSectionMove.successMessage);
      setMoveItem(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Move failed';
      setError(message);
      toast.error(message);
    } finally {
      setMoving(false);
    }
  };

  const actionsDisabled = saving || moving;

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
        const result = await reorderCvSection(cvId, reorder.section, order);

        if (seq !== reorderSeqRef.current) {
          return;
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

        onItemsChange(snapshotItems);
        const message = err instanceof Error ? err.message : 'Reorder failed';
        setError(message);
      }
    },
    [cvId, entityLabel, onItemsChange, reorder, setError],
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
        secondaryAction={
          crossSectionMove && item.id
            ? {
                label: crossSectionMove.buttonLabel,
                onClick: () => setMoveItem(item),
                disabled: actionsDisabled,
              }
            : undefined
        }
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
        <SortableItemShell id={item.id} disabled={actionsDisabled}>
          {({ isDragging, dragHandleProps }) => rowElement(dragHandleProps, isDragging)}
        </SortableItemShell>
      );
    }

    return rowElement();
  };

  if (needsHydration && sectionLoading) {
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
        saving={actionsDisabled}
        error={error}
        onSave={saveEdit}
        onCancel={cancelEdit}
      >
        {renderForm(draft, handleEditDraftChange, { fieldErrors, mode: 'edit' })}
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

      <SectionCreateForm
        label={addLabel}
        open={creating && createDraft !== null}
        onOpen={startCreate}
        saving={actionsDisabled}
        error={error}
        onSave={saveCreate}
        onCancel={cancelCreate}
      >
        {createDraft
          ? renderForm(createDraft, handleCreateDraftChange, { fieldErrors, mode: 'create' })
          : null}
      </SectionCreateForm>

      <DeleteItemDialog
        open={deleteId !== null}
        title={`Delete ${entityLabel.toLowerCase()}?`}
        description="This cannot be undone. The entry will be removed from your CV immediately."
        confirming={saving}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteId(null)}
      />

      {crossSectionMove ? (
        <MoveItemDialog
          open={moveItem !== null}
          title={crossSectionMove.dialogTitle}
          description={crossSectionMove.dialogDescription}
          confirmLabel={crossSectionMove.confirmLabel}
          confirming={moving}
          onConfirm={confirmMove}
          onCancel={() => setMoveItem(null)}
        />
      ) : null}
    </div>
  );
}
