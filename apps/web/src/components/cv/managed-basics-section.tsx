'use client';

import type { Resume } from '@resumind/types';
import { type ChangeEvent, useRef, useState } from 'react';
import { toast } from 'sonner';
import { CountryCodeField } from '@/components/cv/country-code-field';
import { ResumeItemForm, ResumeItemRow } from '@/components/cv/cv-item-ui';
import { ExternalLink } from '@/components/cv/external-link';
import { TextField } from '@/components/cv/form-fields';
import { MarkdownView } from '@/components/cv/markdown-view';
import { ProfilePhotoCropDialog } from '@/components/cv/profile-photo-crop-dialog';
import { ProfilePhotoThumbnail } from '@/components/cv/profile-photo-thumbnail';
import { useCvItemMutation } from '@/components/cv/use-cv-item-mutation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  type CropRect,
  deleteMedia,
  getMediaMeta,
  parseMediaIdFromImageUrl,
  patchMediaCrop,
  uploadResumeMedia,
} from '@/lib/api';
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
  const editProfilePhotoInputRef = useRef<HTMLInputElement>(null);

  const [cropDialogOpen, setCropDialogOpen] = useState(false);
  const [cropImageUrl, setCropImageUrl] = useState('');
  const [cropMediaId, setCropMediaId] = useState<string | null>(null);
  const [cropInitial, setCropInitial] = useState<CropRect | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [cropApplying, setCropApplying] = useState(false);

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

  const isOwnedMedia = !!parseMediaIdFromImageUrl(basics.image);

  const openCropForFile = (file: File) => {
    setPendingFile(file);
    setCropMediaId(null);
    setCropInitial(null);
    setCropImageUrl(URL.createObjectURL(file));
    setCropDialogOpen(true);
  };

  const handleProfilePhotoSelect = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    openCropForFile(file);
  };

  const handleCropConfirm = async (crop: CropRect) => {
    setCropApplying(true);
    try {
      if (pendingFile) {
        const { id, url } = await uploadResumeMedia(pendingFile);
        await patchMediaCrop(id, crop);
        const next = { ...basics, image: url };
        await saveBasics(next);
      } else if (cropMediaId) {
        await patchMediaCrop(cropMediaId, crop);
        toast.success('Crop updated');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Crop failed');
    } finally {
      setCropApplying(false);
      setCropDialogOpen(false);
      setPendingFile(null);
      if (cropImageUrl.startsWith('blob:')) URL.revokeObjectURL(cropImageUrl);
      setCropImageUrl('');
    }
  };

  const handleCropCancel = () => {
    setCropDialogOpen(false);
    setPendingFile(null);
    if (cropImageUrl.startsWith('blob:')) URL.revokeObjectURL(cropImageUrl);
    setCropImageUrl('');
  };

  const handleEditCrop = async () => {
    const mediaId = parseMediaIdFromImageUrl(basics.image);
    if (!mediaId) return;
    try {
      const meta = await getMediaMeta(mediaId);
      setCropMediaId(mediaId);
      setCropInitial(meta.crop);
      setCropImageUrl(basics.image!);
      setCropDialogOpen(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load crop data');
    }
  };

  const handleDeletePhoto = async () => {
    const mediaId = parseMediaIdFromImageUrl(basics.image);
    try {
      if (mediaId) {
        await deleteMedia(mediaId);
      }
      const next = { ...basics, image: '' };
      await saveBasics(next);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  const handleUploadClick = () => {
    profilePhotoInputRef.current?.click();
  };

  type Basics = NonNullable<Resume['basics']>;

  const updateDraft = (patch: Partial<Basics>) => {
    setDraft((current: Basics) => ({ ...current, ...patch }));
  };

  const updateLocation = (patch: Partial<NonNullable<Basics['location']>>) => {
    setDraft((current: Basics) => ({
      ...current,
      location: { ...current.location, ...patch },
    }));
  };

  const handleEditProfilePhoto = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    openCropForFile(file);
  };

  if (editing) {
    return (
      <>
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
          <TextField
            label="Phone"
            value={draft.phone}
            onChange={(phone) => updateDraft({ phone })}
          />
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
                  ref={editProfilePhotoInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  className="hidden"
                  onChange={handleEditProfilePhoto}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => editProfilePhotoInputRef.current?.click()}
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
        <ProfilePhotoCropDialog
          open={cropDialogOpen}
          imageUrl={cropImageUrl}
          initialCrop={cropInitial}
          onConfirm={handleCropConfirm}
          onCancel={handleCropCancel}
          confirming={cropApplying}
        />
      </>
    );
  }

  const contactSegments: React.ReactNode[] = [];
  if (basics.email) contactSegments.push(basics.email);
  if (basics.phone) contactSegments.push(basics.phone);
  if (basics.url) contactSegments.push(<ExternalLink key="url" href={basics.url} />);
  const location = formatBasicsLocation(basics);
  if (location) contactSegments.push(location);
  if (basics.location?.address) contactSegments.push(basics.location.address);

  return (
    <>
      <input
        ref={profilePhotoInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="hidden"
        onChange={handleProfilePhotoSelect}
      />
      <ResumeItemRow
        title={
          <div className="flex gap-4">
            <ProfilePhotoThumbnail
              src={basics.image || undefined}
              isOwnedMedia={isOwnedMedia}
              onUpload={handleUploadClick}
              onEditCrop={isOwnedMedia ? handleEditCrop : undefined}
              onDelete={handleDeletePhoto}
            />
            <div className="min-w-0 flex-1 space-y-1">
              <div className="text-xl">{basics.name || 'Untitled'}</div>
              {basics.label ? (
                <div className="text-muted-foreground font-normal">{basics.label}</div>
              ) : null}
              {contactSegments.length > 0 ? (
                <p className="text-muted-foreground flex flex-wrap items-center gap-x-1 text-sm font-normal">
                  {contactSegments.map((segment, i) => (
                    <span key={typeof segment === 'string' ? segment : `seg-${i}`}>
                      {i > 0 ? ' • ' : ''}
                      {segment}
                    </span>
                  ))}
                </p>
              ) : null}
            </div>
          </div>
        }
        actionsPlacement="header"
        onEdit={startEdit}
      >
        <MarkdownView value={basics.summary} variant="block" />
      </ResumeItemRow>
      <ProfilePhotoCropDialog
        open={cropDialogOpen}
        imageUrl={cropImageUrl}
        initialCrop={cropInitial}
        onConfirm={handleCropConfirm}
        onCancel={handleCropCancel}
        confirming={cropApplying}
      />
    </>
  );
}
