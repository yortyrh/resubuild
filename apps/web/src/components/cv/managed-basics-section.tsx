'use client';

import { useRef, useState, type ChangeEvent } from 'react';
import { toast } from 'sonner';
import type { Resume } from '@resumind/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CountryCodeField } from '@/components/cv/country-code-field';
import { TextField } from '@/components/cv/form-fields';
import { ResumeItemForm, ResumeItemRow } from '@/components/cv/cv-item-ui';
import { useCvItemMutation } from '@/components/cv/use-cv-item-mutation';
import { uploadResumeMedia } from '@/lib/api';
import { patchCvBasics } from '@/lib/cv-item-api';

interface ManagedBasicsSectionProps {
  cvId: string;
  version: string | undefined;
  onVersionChange: (version: string) => void;
  basics: NonNullable<Resume['basics']>;
  onBasicsChange: (basics: NonNullable<Resume['basics']>) => void;
}

function formatBasicsLocation(basics: NonNullable<Resume['basics']>): string {
  const parts = [
    basics.location?.city,
    basics.location?.region,
    basics.location?.postalCode,
    basics.location?.countryCode,
  ].filter(Boolean);
  return parts.join(', ');
}

export function ManagedBasicsSection({
  cvId,
  version,
  onVersionChange,
  basics,
  onBasicsChange,
}: ManagedBasicsSectionProps) {
  const { saving, error, setError, run } = useCvItemMutation({ version, onVersionChange });
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(basics);
  const profilePhotoInputRef = useRef<HTMLInputElement>(null);

  const startEdit = () => {
    setDraft({ ...basics, location: { ...basics.location } });
    setEditing(true);
    setError(null);
  };

  const cancelEdit = () => {
    setEditing(false);
    setDraft(basics);
    setError(null);
  };

  const saveBasics = async (nextBasics: NonNullable<Resume['basics']>) => {
    await run(
      (v) => patchCvBasics(cvId, nextBasics as Record<string, unknown>, v),
      () => {
        onBasicsChange(nextBasics);
        setEditing(false);
      },
      'Basics updated',
    );
  };

  const handleProfilePhoto = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) {
      return;
    }
    try {
      const { url } = await uploadResumeMedia(file);
      const next = { ...basics, image: url };
      await saveBasics(next);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Photo upload failed');
    }
  };

  const updateDraft = (patch: Partial<NonNullable<Resume['basics']>>) => {
    setDraft((current) => ({ ...current, ...patch }));
  };

  const updateLocation = (patch: Partial<NonNullable<Resume['basics']>['location']>) => {
    setDraft((current) => ({
      ...current,
      location: { ...current.location, ...patch },
    }));
  };

  if (editing) {
    return (
      <ResumeItemForm
        saving={saving}
        error={error}
        onSave={() => saveBasics(draft)}
        onCancel={cancelEdit}
      >
        <TextField label="Name" value={draft.name} onChange={(name) => updateDraft({ name })} />
        <TextField
          label="Label"
          description='Your professional headline — e.g. "Senior Software Engineer" or "Marketing Specialist".'
          value={draft.label}
          onChange={(label) => updateDraft({ label })}
        />
        <TextField
          label="Summary"
          markdown="block"
          multiline
          value={draft.summary}
          onChange={(summary) => updateDraft({ summary })}
        />
        <TextField
          label="Email"
          type="email"
          value={draft.email}
          onChange={(email) => updateDraft({ email })}
        />
        <TextField label="Phone" value={draft.phone} onChange={(phone) => updateDraft({ phone })} />
        <TextField
          label="Website"
          type="url"
          value={draft.url}
          onChange={(url) => updateDraft({ url })}
        />
        <div className="grid gap-4 md:grid-cols-2">
          <TextField
            label="City"
            value={draft.location?.city}
            onChange={(city) => updateLocation({ city })}
          />
          <TextField
            label="Region"
            value={draft.location?.region}
            onChange={(region) => updateLocation({ region })}
          />
          <TextField
            label="Postal code"
            value={draft.location?.postalCode}
            onChange={(postalCode) => updateLocation({ postalCode })}
          />
          <CountryCodeField
            value={draft.location?.countryCode}
            onChange={(countryCode) => updateLocation({ countryCode })}
          />
        </div>
        <TextField
          label="Address"
          description="Optional. Street number and street name (suite or unit if needed)."
          value={draft.location?.address}
          onChange={(address) => updateLocation({ address })}
        />
        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Label htmlFor="basics-image-url">Profile photo</Label>
            <div className="flex gap-2">
              <input
                ref={profilePhotoInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                className="hidden"
                onChange={handleProfilePhoto}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => profilePhotoInputRef.current?.click()}
              >
                Upload
              </Button>
            </div>
          </div>
          <Input
            id="basics-image-url"
            type="url"
            value={draft.image ?? ''}
            placeholder="https://..."
            onChange={(e) => updateDraft({ image: e.target.value })}
          />
        </div>
      </ResumeItemForm>
    );
  }

  const contact = [basics.email, basics.phone, basics.url].filter(Boolean).join(' • ');
  const location = formatBasicsLocation(basics);

  return (
    <ResumeItemRow
      title={
        <div className="space-y-1">
          <div className="text-xl">{basics.name || 'Untitled'}</div>
          {basics.label ? (
            <div className="text-muted-foreground font-normal">{basics.label}</div>
          ) : null}
        </div>
      }
      meta={
        <div className="space-y-1">
          {location ? <div>{location}</div> : null}
          {basics.location?.address ? <div>{basics.location.address}</div> : null}
        </div>
      }
      onEdit={startEdit}
    >
      <div className="space-y-2 text-sm">
        {contact ? <p>{contact}</p> : null}
        {basics.summary ? <p className="whitespace-pre-wrap">{basics.summary}</p> : null}
        {basics.image ? (
          <p className="text-muted-foreground truncate">Photo: {basics.image}</p>
        ) : null}
      </div>
    </ResumeItemRow>
  );
}
