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
import type { CvTemplatePresentationConfig } from '@resubuild/resume-template';
import { ALL_SECTION_KEYS, type SectionKey } from '@resubuild/resume-template';
import { GripVertical } from 'lucide-react';
import { type ButtonHTMLAttributes, memo, useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

const SECTION_LABELS: Record<SectionKey, string> = {
  summary: 'Summary',
  work: 'Experience',
  volunteer: 'Volunteer',
  education: 'Education',
  skills: 'Skills',
  projects: 'Projects',
  awards: 'Awards',
  certificates: 'Certificates',
  publications: 'Publications',
  languages: 'Languages',
  interests: 'Interests',
  references: 'References',
};

const BASICS_FIELD_LABELS: {
  key: keyof CvTemplatePresentationConfig['basicsFields'];
  label: string;
}[] = [
  { key: 'label', label: 'Headline / label' },
  { key: 'location', label: 'Location' },
  { key: 'phone', label: 'Phone' },
  { key: 'email', label: 'Email' },
  { key: 'url', label: 'Website' },
  { key: 'profiles', label: 'Social profiles' },
  { key: 'image', label: 'Profile photo' },
];

const WORK_FIELD_LABELS: {
  key: keyof CvTemplatePresentationConfig['workFields'];
  label: string;
}[] = [
  { key: 'location', label: 'Location' },
  { key: 'url', label: 'Company link' },
  { key: 'summary', label: 'Role summary' },
  { key: 'highlights', label: 'Bullet highlights' },
];

interface TemplateConfigPanelProps {
  initialConfig: CvTemplatePresentationConfig;
  onChange: (next: CvTemplatePresentationConfig) => void;
  disabled?: boolean;
  id?: string;
  className?: string;
}

function orderedSections(sectionOrder: SectionKey[]): SectionKey[] {
  const validKeys = new Set(ALL_SECTION_KEYS);
  const order = sectionOrder.filter((key) => validKeys.has(key));
  const seen = new Set(order);
  for (const key of ALL_SECTION_KEYS) {
    if (!seen.has(key)) {
      order.push(key);
    }
  }
  return order;
}

function SortableSectionRow({
  sectionKey,
  label,
  checked,
  disabled,
  onToggle,
}: {
  sectionKey: SectionKey;
  label: string;
  checked: boolean;
  disabled?: boolean;
  onToggle: (enabled: boolean) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: sectionKey,
    disabled,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const dragHandleProps = {
    ...attributes,
    ...listeners,
  } as ButtonHTMLAttributes<HTMLButtonElement>;

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={cn(
        'border-input/60 bg-background flex items-center gap-1 rounded-md border px-1.5 py-1',
        isDragging && 'z-10 opacity-90 shadow-sm',
      )}
    >
      <input
        type="checkbox"
        className="size-3.5 shrink-0"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onToggle(event.target.checked)}
        aria-label={`Show ${label} section`}
      />
      <span className="min-w-0 flex-1 truncate text-xs font-medium">{label}</span>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="text-muted-foreground h-6 min-w-6 shrink-0 cursor-grab px-0 active:cursor-grabbing"
        disabled={disabled}
        aria-label={`Reorder ${label}`}
        {...dragHandleProps}
      >
        <GripVertical className="size-3.5" aria-hidden="true" />
      </Button>
    </li>
  );
}

export const TemplateConfigPanel = memo(function TemplateConfigPanel({
  initialConfig,
  onChange,
  disabled,
  id,
  className,
}: TemplateConfigPanelProps) {
  const [config, setConfig] = useState(initialConfig);

  useEffect(() => {
    setConfig(initialConfig);
  }, [initialConfig]);

  const applyConfig = useCallback(
    (next: CvTemplatePresentationConfig) => {
      setConfig(next);
      onChange(next);
    },
    [onChange],
  );

  const hidden = new Set(config.hiddenSections);
  const sections = orderedSections(config.sectionOrder);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const toggleSection = (key: SectionKey, enabled: boolean) => {
    const nextHidden = new Set(config.hiddenSections);
    if (enabled) {
      nextHidden.delete(key);
    } else {
      nextHidden.add(key);
    }
    applyConfig({ ...config, hiddenSections: [...nextHidden] });
  };

  const handleSectionDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = sections.indexOf(active.id as SectionKey);
    const newIndex = sections.indexOf(over.id as SectionKey);
    if (oldIndex < 0 || newIndex < 0) {
      return;
    }

    applyConfig({ ...config, sectionOrder: arrayMove(sections, oldIndex, newIndex) });
  };

  const toggleBasicsField = (
    key: keyof CvTemplatePresentationConfig['basicsFields'],
    enabled: boolean,
  ) => {
    applyConfig({
      ...config,
      basicsFields: { ...config.basicsFields, [key]: enabled },
    });
  };

  const toggleWorkField = (
    key: keyof CvTemplatePresentationConfig['workFields'],
    enabled: boolean,
  ) => {
    applyConfig({
      ...config,
      workFields: { ...config.workFields, [key]: enabled },
      volunteerFields: { ...config.volunteerFields, [key]: enabled },
    });
  };

  return (
    <aside
      id={id}
      className={cn('no-print surface-soft w-full shrink-0 space-y-3 px-2 py-1 text-sm', className)}
    >
      <div className="space-y-2 px-2 pb-2 pt-2">
        <Label className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
          Sections
        </Label>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleSectionDragEnd}
        >
          <SortableContext items={sections} strategy={verticalListSortingStrategy}>
            <ul className="space-y-1">
              {sections.map((key) => (
                <SortableSectionRow
                  key={key}
                  sectionKey={key}
                  label={SECTION_LABELS[key]}
                  checked={!hidden.has(key)}
                  disabled={disabled}
                  onToggle={(enabled) => toggleSection(key, enabled)}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      </div>

      <div className="space-y-2 px-2 pb-2 pt-2">
        <Label className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
          Header fields
        </Label>
        <div className="grid gap-1.5">
          {BASICS_FIELD_LABELS.map(({ key, label }) => (
            <label key={key} className="flex items-center gap-2">
              <input
                type="checkbox"
                className="size-3.5"
                checked={config.basicsFields[key]}
                disabled={disabled}
                onChange={(event) => toggleBasicsField(key, event.target.checked)}
              />
              <span>{label}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="space-y-2 px-2 pb-2 pt-2">
        <Label className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
          Experience fields
        </Label>
        <div className="grid gap-1.5">
          {WORK_FIELD_LABELS.map(({ key, label }) => (
            <label key={key} className="flex items-center gap-2">
              <input
                type="checkbox"
                className="size-3.5"
                checked={config.workFields[key]}
                disabled={disabled}
                onChange={(event) => toggleWorkField(key, event.target.checked)}
              />
              <span>{label}</span>
            </label>
          ))}
        </div>
      </div>
    </aside>
  );
});
