'use client';

import type { Resume } from '@resubuild/types';
import { ComposerBlock } from '@/components/cv/composer/entry-composer';
import { InlineField } from '@/components/cv/composer/inline-field';
import { CountryCodeField } from '@/components/cv/country-code-field';
import { MarkdownEditor } from '@/components/cv/markdown-editor';

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
    <div className="space-y-4">
      <header className="border-page-rule space-y-1 border-b pb-4 text-center">
        <InlineField
          label="Name"
          tone="name"
          align="center"
          placeholder="Your full name"
          value={value.name}
          onChange={(name) => updateDraft({ name })}
        />
        <InlineField
          label="Headline"
          align="center"
          placeholder="Headline, e.g. Senior Software Engineer"
          value={value.label}
          onChange={(label) => updateDraft({ label })}
          className="text-[1.0625rem]"
        />
        <div className="mx-auto grid max-w-2xl gap-x-4 gap-y-1 pt-2 sm:grid-cols-3">
          <InlineField
            label="Email"
            type="email"
            tone="meta"
            align="center"
            value={value.email}
            onChange={(email) => updateDraft({ email })}
          />
          <InlineField
            label="Phone"
            type="tel"
            tone="meta"
            align="center"
            value={value.phone}
            onChange={(phone) => updateDraft({ phone })}
          />
          <InlineField
            label="Website"
            type="url"
            tone="meta"
            align="center"
            value={value.url}
            onChange={(url) => updateDraft({ url })}
          />
        </div>
      </header>

      <ComposerBlock label="Location" hint="City and country are usually enough.">
        <div className="grid gap-x-4 gap-y-3 sm:grid-cols-2">
          <InlineField
            label="City"
            value={value.location?.city}
            onChange={(city) => updateLocation({ city })}
          />
          <InlineField
            label="Region"
            value={value.location?.region}
            onChange={(region) => updateLocation({ region })}
          />
          <InlineField
            label="Postal code"
            value={value.location?.postalCode}
            onChange={(postalCode) => updateLocation({ postalCode })}
          />
          <div className="font-sans">
            <CountryCodeField
              value={value.location?.countryCode}
              onChange={(countryCode) => updateLocation({ countryCode })}
            />
          </div>
        </div>
      </ComposerBlock>

      <ComposerBlock label="Summary" hint="Three or four sentences that open the CV.">
        <MarkdownEditor
          deferUntilFocus
          ariaLabel="Summary"
          placeholder="Who you are, what you are best at, and what you want next."
          value={value.summary ?? ''}
          onChange={(summary) => updateDraft({ summary })}
        />
      </ComposerBlock>
    </div>
  );
}
