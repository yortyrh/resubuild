'use client';

import type { Resume } from '@resumind/types';
import { CountryCodeField } from '@/components/cv/country-code-field';
import { TextField } from '@/components/cv/form-fields';

export type BasicsFormValue = NonNullable<Resume['basics']>;

interface BasicsFormFieldsProps {
  value: BasicsFormValue;
  onChange: (basics: BasicsFormValue) => void;
}

export function BasicsFormFields({ value, onChange }: BasicsFormFieldsProps) {
  const updateDraft = (patch: Partial<BasicsFormValue>) => {
    onChange({ ...value, ...patch });
  };

  const updateLocation = (patch: Partial<NonNullable<BasicsFormValue['location']>>) => {
    onChange({
      ...value,
      location: { ...value.location, ...patch },
    });
  };

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 md:items-start">
        <TextField
          label="Name"
          description="Your full name as it should appear on the CV."
          value={value.name}
          onChange={(name) => updateDraft({ name })}
        />
        <TextField
          label="Label"
          description='Your professional headline — e.g. "Senior Software Engineer" or "Marketing Specialist".'
          value={value.label}
          onChange={(label) => updateDraft({ label })}
        />
      </div>
      <TextField
        label="Summary"
        markdown="block"
        multiline
        value={value.summary}
        onChange={(summary) => updateDraft({ summary })}
      />
      <div className="grid gap-4 md:grid-cols-2">
        <TextField
          label="Email"
          type="email"
          value={value.email}
          onChange={(email) => updateDraft({ email })}
        />
        <TextField label="Phone" value={value.phone} onChange={(phone) => updateDraft({ phone })} />
      </div>
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
    </>
  );
}
