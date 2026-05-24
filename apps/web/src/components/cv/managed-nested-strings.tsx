'use client';

import { useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import type { CvItemMutationResponse } from '@/lib/cv-item-api';
import {
  DeleteItemDialog,
  ResumeItemForm,
  ResumeItemRow,
  SectionCreateForm,
} from '@/components/cv/cv-item-ui';
import { useCvItemMutation } from '@/components/cv/use-cv-item-mutation';
import { TextField } from '@/components/cv/form-fields';

interface NestedStringApi {
  create: (
    cvId: string,
    parentIndex: number,
    value: string,
    version?: string,
  ) => Promise<CvItemMutationResponse>;
  update: (
    cvId: string,
    parentIndex: number,
    childIndex: number,
    value: string,
    version?: string,
  ) => Promise<CvItemMutationResponse>;
  delete: (
    cvId: string,
    parentIndex: number,
    childIndex: number,
    version?: string,
  ) => Promise<CvItemMutationResponse>;
}

interface ManagedNestedStringsProps {
  cvId: string;
  version: string | undefined;
  onVersionChange: (version: string) => void;
  parentIndex: number;
  values: string[];
  onValuesChange: (values: string[]) => void;
  label: string;
  addLabel: string;
  api: NestedStringApi;
  markdown?: boolean;
}

export function ManagedNestedStrings({
  cvId,
  version,
  onVersionChange,
  parentIndex,
  values,
  onValuesChange,
  label,
  addLabel,
  api,
  markdown = false,
}: ManagedNestedStringsProps) {
  const { saving, error, setError, run } = useCvItemMutation({ version, onVersionChange });
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [draft, setDraft] = useState('');
  const [creating, setCreating] = useState(false);
  const [createDraft, setCreateDraft] = useState('');
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null);

  const cancelEdit = () => {
    setEditingIndex(null);
    setDraft('');
    setError(null);
  };

  const saveEdit = async () => {
    if (editingIndex === null) {
      return;
    }
    await run(
      (v) => api.update(cvId, parentIndex, editingIndex, draft, v),
      () => {
        const next = [...values];
        next[editingIndex] = draft;
        onValuesChange(next);
        cancelEdit();
      },
      `${label} updated`,
    );
  };

  const cancelCreate = () => {
    setCreating(false);
    setCreateDraft('');
    setError(null);
  };

  const saveCreate = async () => {
    if (!createDraft.trim()) {
      return;
    }
    await run(
      (v) => api.create(cvId, parentIndex, createDraft.trim(), v),
      (result) => {
        onValuesChange([...values, result.value ?? createDraft.trim()]);
        cancelCreate();
      },
      `${label} added`,
    );
  };

  const confirmDelete = async () => {
    if (deleteIndex === null) {
      return;
    }
    const index = deleteIndex;
    await run(
      (v) => api.delete(cvId, parentIndex, index, v),
      () => {
        onValuesChange(values.filter((_, i) => i !== index));
        setDeleteIndex(null);
        if (editingIndex === index) {
          cancelEdit();
        }
      },
      `${label} deleted`,
    );
  };

  const listBody: ReactNode =
    values.length > 0 ? (
      <ul className="list-disc space-y-1 pl-5 text-sm">
        {values.map((value, index) => (
          <li key={`${value}-${index}`}>{value}</li>
        ))}
      </ul>
    ) : null;

  return (
    <div className="mt-4 space-y-2">
      <h5 className="text-sm font-medium">{label}</h5>
      {!values.length && !creating && editingIndex === null ? listBody : null}
      {values.map((value, index) =>
        editingIndex === index ? (
          <ResumeItemForm
            key={index}
            saving={saving}
            error={error}
            onSave={saveEdit}
            onCancel={cancelEdit}
          >
            <TextField
              label={label}
              value={draft}
              onChange={setDraft}
              markdown={markdown ? 'inline' : undefined}
            />
          </ResumeItemForm>
        ) : (
          <ResumeItemRow
            key={index}
            title={<span className="font-normal">{value}</span>}
            onEdit={() => {
              setCreating(false);
              setEditingIndex(index);
              setDraft(value);
              setError(null);
            }}
            onDelete={() => setDeleteIndex(index)}
          />
        ),
      )}

      {creating ? (
        <SectionCreateForm
          label={addLabel}
          open
          onOpen={() => setCreating(true)}
          saving={saving}
          error={error}
          onSave={saveCreate}
          onCancel={cancelCreate}
        >
          <TextField
            label={label}
            value={createDraft}
            onChange={setCreateDraft}
            markdown={markdown ? 'inline' : undefined}
          />
        </SectionCreateForm>
      ) : (
        <Button
          type="button"
          className="mt-4"
          onClick={() => {
            setEditingIndex(null);
            setCreating(true);
            setCreateDraft('');
            setError(null);
          }}
        >
          {addLabel}
        </Button>
      )}

      <DeleteItemDialog
        open={deleteIndex !== null}
        title={`Delete ${label.toLowerCase()}?`}
        description="This will be removed immediately."
        confirming={saving}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteIndex(null)}
      />
    </div>
  );
}
