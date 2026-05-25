## Context

`ManagedBasicsSection` renders Basics in view mode via `ResumeItemRow`. Today:

- **Title block (left)**: name and label.
- **Meta block (right)**: formatted structured location (`city, region, postalCode, countryCode`) and optional `location.address`.
- **Body**: bullet-separated contact line (`email • phone • url`), then summary and photo URL.

Authors expect location and address to read as contact information grouped under the name, consistent with email, phone, and website—not isolated in the right column. The Edit control currently renders below the summary at bottom-left, which feels disconnected from the Basics header once the right column is freed.

## Goals / Non-Goals

**Goals:**

- Show structured location and optional street address in the contact line under the name in Basics view mode.
- Use the same bullet-separated inline format as email, phone, and website.
- Place the Basics Edit button top-right, aligned with the name/label header row.
- Remove location/address from the Basics `meta` slot; repurpose the header right area for Edit.

**Non-Goals:**

- Changing edit-form field order, labels, or validation.
- Changing JSON Resume data shape or API payloads.
- Altering preview layout for Work, Education, or other sections (dates/locations remain right-aligned there).

## Decisions

### 1. Single contact line with bullet separators

**Decision:** Extend the existing contact string pattern: join `[email, phone, url, formattedLocation, streetAddress]` with `•` after filtering empty values.

**Rationale:** Matches current email/phone/url presentation and the user request to sit "like" those fields on one line.

**Alternatives considered:**

- _Second line for location only_ — rejected; user asked for integration with the contact line.
- _Keep structured location in meta, move only street address_ — rejected; splits related geography data and leaves the awkward right column for partial info.

### 2. Reuse `formatBasicsLocation` helper

**Decision:** Keep `formatBasicsLocation(basics)` for the structured locality segment; append `basics.location?.address` as a separate segment when present (street line after city/region/postal/country in the join order).

**Rationale:** No change to formatting logic; minimal diff, predictable output (`Stoney Creek, Ontario, L8J 0L8, CA • 123 Main St` when both exist).

### 3. Header-aligned Edit for Basics only

**Decision:** Extend `ResumeItemRow` with an optional prop (e.g. `actionsPlacement="header"`) that renders the Edit button in the top header row (right side) instead of the bottom action bar. `ManagedBasicsSection` view mode passes this prop; all other sections keep default bottom placement.

**Rationale:** Reuses the existing row component and button styling; localizes the layout exception to Basics without forking a one-off preview component.

**Alternatives considered:**

- _Custom Basics preview without `ResumeItemRow`_ — rejected; duplicates structure and action wiring.
- _Move Edit top-right for all sections_ — rejected; out of scope; Work/Education rows may need bottom actions when Delete is present.

### 4. Omit location `meta` on Basics view rows

**Decision:** Stop passing location/address as `meta` to `ResumeItemRow` in Basics view mode; the header right slot hosts Edit instead.

**Rationale:** Keeps a balanced header row (name left, action right) without empty meta content.

## Risks / Trade-offs

- **[Long contact lines on narrow viewports]** → Acceptable; same wrapping behavior as today's contact line (`text-sm` paragraph). No new truncation logic in scope.
- **[Ambiguity when only location exists]** → Contact line still renders with location segments only; no regression vs. today where meta showed location without email.
- **[Header crowding on small screens]** → Edit uses existing `size="sm"` button; header flex row already wraps with `gap-4`; acceptable for Basics single-row header.

## Migration Plan

Frontend-only deploy. No data migration. Rollback = revert `managed-basics-section.tsx` and any `ResumeItemRow` prop changes.

## Open Questions

None — layout scope is fully defined by the proposal.
