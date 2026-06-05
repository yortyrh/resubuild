# CV JSON import (delta)

## Purpose

This delta modifies the `cv-json-import` capability to make
`prepareImportedResume` robust to two common agentic-import mistakes that
the previous implementation silently dropped: the XML-style `{"item": [...]}`
envelope and the non-array `basics.profiles` value.

## MODIFIED Requirements

### Requirement: The system SHALL normalize external JSON Resume documents before create

A shared function in `@resumind/types` (e.g. `prepareImportedResume`) SHALL
accept parsed JSON and return a plain object suitable for `POST /cv` `data`.
It MUST reject non-object roots. It SHALL remove top-level `$schema` and
`meta` from the import (Resumind meta is applied server-side on create). It
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

#### Scenario: Nested array properties wrapped as `{ item: [...] }` are unwrapped

- **WHEN** `prepareImportedResume` receives a `work[]` entry whose `highlights` is `{ item: ["A", "B"] }`
- **THEN** the result SHALL have that entry's `highlights` equal to `["A", "B"]`
- **AND** the same rule SHALL apply to `skills[].keywords`, `basics.profiles`, and any other nested array property

#### Scenario: `basics.profiles` is normalized to an array of plain objects

- **WHEN** `prepareImportedResume` receives `{ basics: { name: "Alex", profiles: { network: "LinkedIn", username: "alex" } } }`
- **THEN** the result SHALL have `basics.profiles` equal to `[{ network: "LinkedIn", username: "alex" }]`
- **AND** a well-formed array of profile objects SHALL be preserved (non-object entries filtered out)
- **AND** a string URL, `null`, `undefined`, or missing `profiles` SHALL default to `[]`

#### Scenario: Minimal object always has `basics.profiles: []`

- **WHEN** `prepareImportedResume` receives `{ basics: { name: "Alex" } }`
- **THEN** the result SHALL have `basics.profiles` equal to `[]`

#### Scenario: An object that happens to have an `item` key is not unwrapped

- **WHEN** `prepareImportedResume` receives `{ basics: { name: "Yorty" }, work: [{ name: "Acme", position: "Engineer", item: "not-an-array" }] }`
- **THEN** the result SHALL preserve the `item` field as-is (the unwrap heuristic only fires for objects with exactly one key named `item`)

#### Scenario: Volunteer role in work moves to volunteer on import

- **WHEN** `prepareImportedResume` receives a document whose `work[]` includes an entry with `summary` containing "Volunteer/part-time role" and a paid employment entry without volunteer indicators
- **THEN** the volunteer entry SHALL appear in `volunteer[]` with `organization` set from the work `name`
- **AND** the paid entry SHALL remain in `work[]`
- **AND** the volunteer entry SHALL NOT include work-only fields `name`, `location`, or `description`

#### Scenario: Employer name containing Volunteer does not trigger move

- **WHEN** `prepareImportedResume` receives a `work[]` entry whose `name` is "Volunteer State Community College" and role text does not contain volunteer/unpaid indicators
- **THEN** the entry SHALL remain in `work[]`
- **AND** `volunteer[]` SHALL not gain a duplicate from that entry

#### Scenario: Full sample file normalizes successfully

- **WHEN** `prepareImportedResume` receives a parsed object equivalent to `.samples/resumes/jsonresume/Jane Doe - Senior Software Engineer.json`
- **THEN** the result SHALL include all resume sections with array fields
- **AND** the result SHALL NOT include `$schema` or `meta`

#### Scenario: Non-object input rejected

- **WHEN** `prepareImportedResume` receives an array or string
- **THEN** it SHALL throw an error indicating the resume must be a JSON object
