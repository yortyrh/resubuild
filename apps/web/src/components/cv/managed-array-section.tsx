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
import { sanitizeResumeItemPayload } from '@resubuild/types';
import { useQueryClient } from '@tanstack/react-query';
import {
  type ButtonHTMLAttributes,
  type ReactNode,
  useCallback,
  useMemo,
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
import { Button } from '@/components/ui/button';
import {
  type CvItemMutationResponse,
  type ReorderableCvSection,
  reorderCvSection,
} from '@/lib/cv-item-api';
import {
  getItemId,
  getOrderedItemIds,
  idsOrderEqual,
  moveIdDown,
  moveIdUp,
  orderItemsByIds,
  type WithItemId,
} from '@/lib/cv-section-order';
import {
  removeSectionItem,
  useSectionItemMutations,
  writeSectionItem,
  writeSectionList,
} from '@/lib/queries/cv-mutations';
import type { CvArraySectionKey } from '@/lib/queries/cv-queries';
import { useCvSectionItem, useCvSectionList } from '@/lib/queries/cv-queries';

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

/**
 * One card's data: its own entry key, falling back to the list entry (also used
 * for rows without an id, which have no entry key).
 */
function SectionEntry<T extends WithItemId>({
  cvId,
  sectionKey,
  entry,
  children,
}: {
  cvId: string;
  sectionKey: CvArraySectionKey;
  entry: T;
  children: (item: T) => ReactNode;
}) {
  const { data } = useCvSectionItem<T>(cvId, sectionKey, entry.id ?? '');
  return <>{children(data ?? entry)}</>;
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
  entityLabel: string;
  addLabel: string;
  /** One line shown when the section has no entries, saying what belongs here. */
  emptyText?: string;
  createEmpty: () => T;
  toPayload: (item: T) => Record<string, unknown>;
  renderView: (item: T) => {
    title: ReactNode;
    subtitle?: ReactNode;
    /** Date range for the left rail; pass a string (possibly empty) in dated sections. */
    dates?: ReactNode;
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
  entityLabel,
  addLabel,
  emptyText,
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
  const queryClient = useQueryClient();
  // The server list is the only source of entries: `undefined` until it has
  // loaded, so an empty section is never assumed.
  const listQuery = useCvSectionList<T>(cvId, sectionKey);
  const listItems = listQuery.data;
  const { saving, error, setError, run } = useSectionItemMutations(cvId, sectionKey);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const [editingId, setEditingId] = useState<string | null>(null);
  // Entry last edited; stays marked after Cancel/Save until another form opens.
  const [lastEditedId, setLastEditedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<T | null>(null);
  const [creating, setCreating] = useState(false);
  const [createDraft, setCreateDraft] = useState<T | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [moveItem, setMoveItem] = useState<T | null>(null);
  const [moving, setMoving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const reorderSeqRef = useRef(0);

  // While an entry is edited the list does not change (the draft is local), so
  // it only re-sorts once the save writes the cache.
  const items = useMemo(
    () => (listItems ? (sortItems ? sortItems(listItems) : listItems) : []),
    [listItems, sortItems],
  );

  // The draft stays local while typing: pushing it into the whole CV on each
  // keystroke re-rendered every entry and re-sorted the list under the cursor.
  // The list is merged and re-sorted once, on save.
  const handleEditDraftChange = useCallback((next: T) => {
    setDraft(next);
    setFieldErrors((current) => (Object.keys(current).length > 0 ? {} : current));
  }, []);

  const handleCreateDraftChange = useCallback((next: T) => {
    setCreateDraft(next);
    setFieldErrors((current) => (Object.keys(current).length > 0 ? {} : current));
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
    setLastEditedId(null);
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
    setLastEditedId(editingId);
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
        if (!result.item) {
          writeSectionItem(queryClient, cvId, sectionKey, {
            ...(draft as Record<string, unknown>),
            id: editingId,
          });
        }
        cancelEdit();
      },
      successMessages?.update ?? `${entityLabel} updated`,
      { mergeItem: true },
    );
  };

  const startCreate = () => {
    setLastEditedId(null);
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
      () => {
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
        removeSectionItem(queryClient, cvId, sectionKey, itemId);
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
    reorder !== undefined && items.length >= 2 && editingId === null && !creating;

  const persistReorder = useCallback(
    async (order: string[], snapshotItems: T[]) => {
      if (!reorder) {
        return;
      }

      const currentIds = getOrderedItemIds(snapshotItems, entityLabel);
      if (idsOrderEqual(currentIds, order)) {
        return;
      }

      const writeList = (next: T[]) =>
        writeSectionList(queryClient, cvId, sectionKey, next as Record<string, unknown>[]);
      writeList(orderItemsByIds(snapshotItems, order));
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
          writeList(serverItems);
        }
      } catch (err) {
        if (seq !== reorderSeqRef.current) {
          return;
        }

        writeList(snapshotItems);
        const message = err instanceof Error ? err.message : 'Reorder failed';
        setError(message);
      }
    },
    [cvId, entityLabel, queryClient, reorder, sectionKey, setError],
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
        highlighted={item.id !== undefined && item.id === lastEditedId}
        onHighlightDismiss={() => setLastEditedId(null)}
        title={view.title}
        subtitle={view.subtitle}
        dates={view.dates}
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

  // View rows only depend on the saved items, so typing in a draft re-renders
  // the composer alone.
  // biome-ignore lint/correctness/useExhaustiveDependencies: handlers only close over the listed state and stable setters
  const viewRows = useMemo(
    () =>
      new Map(
        items.map((entry, index) => {
          const rowKey = entry.id ?? `row-${index}`;
          return [
            rowKey,
            <SectionEntry<T> key={rowKey} cvId={cvId} sectionKey={sectionKey} entry={entry}>
              {(item) => renderViewRow(item, index)}
            </SectionEntry>,
          ] as const;
        }),
      ),
    [
      cvId,
      sectionKey,
      items,
      renderView,
      reorderEnabled,
      actionsDisabled,
      crossSectionMove,
      reorder,
      entityLabel,
      lastEditedId,
    ],
  );

  if (listQuery.isPending) {
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

  if (!listItems) {
    const message =
      listQuery.error instanceof Error
        ? listQuery.error.message
        : `Could not load ${entityLabel.toLowerCase()} entries`;
    return (
      <div className="max-w-[52rem]">
        <div
          role="alert"
          className="border-destructive/40 flex flex-wrap items-center gap-3 rounded-lg border border-dashed px-5 py-6"
        >
          <p className="text-destructive flex-1 text-sm">{message}</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={listQuery.isFetching}
            onClick={() => void listQuery.refetch()}
          >
            Retry
          </Button>
        </div>
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
        title={`Edit ${entityLabel.toLowerCase()}`}
        saving={actionsDisabled}
        error={error}
        onSave={saveEdit}
        onCancel={cancelEdit}
      >
        {renderForm(draft, handleEditDraftChange, { fieldErrors, mode: 'edit' })}
      </ResumeItemForm>
    ) : (
      <div key={itemKey}>{viewRows.get(itemKey)}</div>
    );
  });

  const formOpen = editingId !== null || creating;

  return (
    <div className="max-w-[52rem] space-y-3">
      {error && !formOpen ? (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      ) : null}

      {items.length === 0 && !creating ? (
        <div className="border-border rounded-lg border border-dashed px-5 py-8">
          <p className="text-foreground text-sm font-medium">No entries yet</p>
          {emptyText ? <p className="text-muted-foreground mt-1 text-sm">{emptyText}</p> : null}
        </div>
      ) : null}

      {reorderEnabled ? (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={sortableIds} strategy={verticalListSortingStrategy}>
            <div className="space-y-3">{itemList}</div>
          </SortableContext>
        </DndContext>
      ) : (
        <div className="space-y-3">{itemList}</div>
      )}

      <div className="pt-1">
        <SectionCreateForm
          label={addLabel}
          title={`New ${entityLabel.toLowerCase()}`}
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
      </div>

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
