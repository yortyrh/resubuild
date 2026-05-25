'use client';

import type { Resume } from '@resumind/types';
import { type ChangeEvent, useRef } from 'react';
import { CountryCodeField } from '@/components/cv/country-code-field';
import { TextField } from '@/components/cv/form-fields';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export type BasicsFormValue = NonNullable<Resume['basics']>;

interface BasicsFormFieldsProps {
  value: BasicsFormValue;
  onChange: (basics: BasicsFormValue) => void;
  onProfilePhotoFileSelect?: (file: File) => void;
  imageFieldId?: string;
}

export function BasicsFormFields({
  value,
  onChange,
  onProfilePhotoFileSelect,
  imageFieldId = 'basics-image-url',
}: BasicsFormFieldsProps) {
  const profilePhotoInputRef = useRef<HTMLInputElement>(null);

  const updateDraft = (patch: Partial<BasicsFormValue>) => {
    onChange({ ...value, ...patch });
  };

  const updateLocation = (patch: Partial<NonNullable<BasicsFormValue['location']>>) => {
    onChange({
      ...value,
      location: { ...value.location, ...patch },
    });
  };

  const handleProfilePhotoSelect = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !onProfilePhotoFileSelect) return;
    onProfilePhotoFileSelect(file);
  };

  return (
    <>
      <TextField label="Name" value={value.name} onChange={(name) => updateDraft({ name })} />
      <TextField
        label="Label"
        description='Your professional headline — e.g. "Senior Software Engineer" or "Marketing Specialist".'
        value={value.label}
        onChange={(label) => updateDraft({ label })}
      />
      <TextField
        label="Summary"
        markdown="block"
        multiline
        value={value.summary}
        onChange={(summary) => updateDraft({ summary })}
      />
      <TextField
        label="Email"
        type="email"
        value={value.email}
        onChange={(email) => updateDraft({ email })}
      />
      <TextField label="Phone" value={value.phone} onChange={(phone) => updateDraft({ phone })} />
      <TextField
        label="Website"
        type="url"
        value={value.url}
        onChange={(url) => updateDraft({ url })}
      />
      <div className="grid gap-4 md:grid-cols-2">
        <TextField
          label="City"
          value={value.location?.city}
          onChange={(city) => updateLocation({ city })}
        />
        <TextField
          label="Region"
          value={value.location?.region}
          onChange={(region) => updateLocation({ region })}
        />
        <TextField
          label="Postal code"
          value={value.location?.postalCode}
          onChange={(postalCode) => updateLocation({ postalCode })}
        />
        <CountryCodeField
          value={value.location?.countryCode}
          onChange={(countryCode) => updateLocation({ countryCode })}
        />
      </div>
      <TextField
        label="Address"
        description="Optional. Street number and street name (suite or unit if needed)."
        value={value.location?.address}
        onChange={(address) => updateLocation({ address })}
      />
      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Label htmlFor={imageFieldId}>Profile photo</Label>
          {onProfilePhotoFileSelect ? (
            <div className="flex gap-2">
              <input
                ref={profilePhotoInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                className="hidden"
                onChange={handleProfilePhotoSelect}
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
          ) : null}
        </div>
        <Input
          id={imageFieldId}
          type="url"
          value={value.image ?? ''}
          placeholder="https://..."
          onChange={(e) => updateDraft({ image: e.target.value })}
        />
      </div>
    </>
  );
}
