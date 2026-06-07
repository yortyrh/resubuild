## MODIFIED Requirements

### Requirement: The system SHALL normalize external JSON Resume documents before create

A shared function in `@resubuild/types` (e.g. `prepareImportedResume`) SHALL
accept parsed JSON and return a plain object suitable for `POST /cv` `data`.
It MUST reject non-object roots. It SHALL remove top-level `$schema` and
`meta` from the import (Resubuild meta is applied server-side on create). It
SHALL ensure all standard JSON Resume array sections exist, defaulting
missing or non-array values to empty arrays for: `work`, `volunteer`,
`education`, `awards`, `certificates`, `publications`, `skills`,
`languages`, `interests`, `references`, and `projects`. It SHALL preserve
`basics` and section item content without renaming JSON Resume fields
except when reclassifying volunteer work entries per the volunteer
reclassification requirement below.

Before the array-section defaulting runs, the normalizer SHALL recursively
unwrap any object of the shape `{"item": ...}` (a single key whose name is
`item` and whose value is anything else) at every level of the document —
top-level sections, nested entry properties (`highlights`, `keywords`,
`profiles`, ...), and any other nested object or array. The unwrap pass
SHALL be conservative: it SHALL only unwrap when the object has exactly
one key and that key is `item`; an object with additional keys is treated
as a legitimate resume field that happens to be called `item` and SHALL
NOT be unwrapped. After the unwrap pass, a single plain object in a slot
that expects an array (e.g. `education: { institution: "U" }`) SHALL be
coerced to a one-element array.

The normalizer SHALL also coerce `basics.profiles` to an array of plain
objects. A well-formed array is passed through with non-object entries
filtered out; a single plain object is wrapped in a one-element array; a
string, number, `null`, `undefined`, or missing value defaults to `[]`.
The minimal-basics document (`{ basics: { name: "Alex" } }`) SHALL have
`basics.profiles` equal to `[]` after normalization.

After array sections are normalized, `prepareImportedResume` SHALL run
volunteer reclassification: any `work[]` entry that describes an unpaid or
volunteer role SHALL be removed from `work[]` and appended to `volunteer[]`
with fields mapped to the JSON Resume volunteer shape (`name` or misplaced
`organization` → `organization`; `position`, `url`, `startDate`,
`endDate`, and `highlights` copied; `summary` and `description` merged
into volunteer `summary`; work-only `location` and `description` omitted
from the volunteer row). Reclassification SHALL use role text in
`position`, `summary`, `description`, and `highlights` (not employer
`name`) to detect volunteer/unpaid/community-service/pro-bono indicators.
Entries that only mention "Volunteer" in the employer name SHALL remain
in `work[]`.

#### Scenario: Top-level array sections wrapped as `{ item: [...] }` are unwrapped

- **WHEN** `prepareImportedResume` receives `{ basics: { name: "Yorty" }, work: { item: [{ name: "Acme", position: "Engineer" }] }, education: { item: { institution: "U" } }, skills: { item: [{ name: "JS" }] } }`
- **THEN** the result SHALL have `work` equal to `[{ name: "Acme", position: "Engineer" }]`
- **AND** the result SHALL have `education` equal to `[{ institution: "U" }]`
- **AND** the result SHALL have `skills` equal to `[{ name: "JS" }]`

#### Scenario: Basics profiles defaults to empty array

- **WHEN** `prepareImportedResume` receives `{ basics: { name: "Alex" } }`
- **THEN** the result SHALL have `basics.profiles` equal to `[]`
