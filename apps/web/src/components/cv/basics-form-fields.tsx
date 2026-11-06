'use client';

import type { Resume } from '@resubuild/types';
import { CountryCodeField } from '@/components/cv/country-code-field';
import { FieldRow, FormGroup, TextField } from '@/components/cv/form-fields';

export type BasicsFormValue = NonNullable<Resume['basics']>;

interface BasicsFormFieldsProps {
  value: BasicsFormValue;
  onChange: (next: BasicsFormValue) => void;
}

export function BasicsFormFields({ value, onChange }: BasicsFormFieldsProps) {
  const updateDraft = (partial: Partial<BasicsFormValue>) => {
    onChange({ ...value, ...partial });
  };

  const updateLocation = (partial: Partial<NonNullable<BasicsFormValue['location']>>) => {
    updateDraft({
      location: { ...(value.location ?? {}), ...partial },
    });
  };

  return (
    <>
      <FormGroup title="Identity">
        <FieldRow>
          <TextField
            label="Name"
            description="Your full name as it should appear on the CV."
            autoComplete="name"
            value={value.name}
            onChange={(name) => updateDraft({ name })}
          />
          <TextField
            label="Headline"
            description="Your professional title, e.g. Senior Software Engineer."
            value={value.label}
            onChange={(label) => updateDraft({ label })}
          />
        </FieldRow>
      </FormGroup>

      <FormGroup title="Contact">
        <FieldRow>
          <TextField
            label="Email"
            type="email"
            autoComplete="email"
            value={value.email}
            onChange={(email) => updateDraft({ email })}
          />
          <TextField
            label="Phone"
            type="tel"
            autoComplete="tel"
            value={value.phone}
            onChange={(phone) => updateDraft({ phone })}
          />
        </FieldRow>
        <TextField
          label="Website"
          type="url"
          placeholder="https://"
          value={value.url}
          onChange={(url) => updateDraft({ url })}
        />
      </FormGroup>

      <FormGroup title="Location">
        <FieldRow>
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
        </FieldRow>
      </FormGroup>

      <FormGroup title="Summary">
        <TextField
          label="Summary"
          description="Three or four sentences that open the CV."
          markdown
          value={value.summary}
          onChange={(summary) => updateDraft({ summary })}
        />
      </FormGroup>
    </>
  );
}
