# cv-editor-ui Specification

## Purpose

TBD - created by archiving change cv-editor-ui-simplification. Update Purpose after archive.
## Requirements
### Requirement: Basics SHALL present Label before Summary with guiding microcopy for job titles

The Basics tab SHALL render `basics.label` immediately before `basics.summary` and SHALL expose an inline description under the Label control containing at least examples equivalent to `"Senior Software Engineer"` and `"Marketing Specialist"`.

#### Scenario: Author reviews Basics order

- **WHEN** a user opens Basics on the CV editor
- **THEN** the Summary editor appears directly after Label and SHALL NOT appear above Label

### Requirement: Social profiles MUST be authored in their own dashboard tab

The CV editor tabs SHALL include a **`Social profiles`** tab whose content binds exclusively to JSON Resume `basics.profiles` array editing (Network, Username, URL). The Basics tab MUST NOT duplicate the Profiles array repeater once migration ships.

#### Scenario: Navigating Profiles

- **WHEN** a user selects Social profiles tab
- **THEN** all profile entries for `resume.basics.profiles` MUST be reachable there regardless of Basics presence

### Requirement: Basics location country MUST be selectable with ISO-aligned codes

The editor SHALL replace the free-text Basics country entry with an accessible combobox (typeahead/popover selection) emitting **ISO 3166-1 alpha-2 codes** persisted as `resume.basics.location.countryCode`; display labels MAY include localized country names but stored code MUST normalize to uppercase ASCII.

#### Scenario: Choosing Canada

- **WHEN** a user selects Canada in the picker
- **THEN** persisted data SHALL include `countryCode` equal to `CA` and SHALL persist through save roundtrip

### Requirement: Structured address fields SHALL remain authoritative with clarified optional prose

The Basics location grid SHALL preserve distinct inputs aligned to JSON Resume structured fields (`city`, `region`, `postalCode`, `countryCode`). Any supplemental multiline textarea bound to JSON Resume `location.address` SHALL include helper copy clarifying optional combined-line postal details and MUST NOT imply users should ignore structured locality fields.

#### Scenario: Guidance on duplicate intent

- **WHEN** a user focuses optional address prose
- **THEN** explanatory hint text SHALL articulate that granular fields remain primary structured data sources

### Requirement: Basics photo control MUST appear last after geography details

Baseline visual order AFTER summary and canonical URL/email/telephone grouping SHALL traverse structured location (+ optional prose) before exposing profile imagery controls tying to `resume.basics.image`. File upload (via Nest media API) and URL paste fallback SHALL both be available.

#### Scenario: Locating avatar UI

- **WHEN** a user scrolls to end of Basics
- **THEN** image upload / URL UX SHALL occupy the concluding block without appearing before geography fields unless responsive collapse requires minor reflow parity

### Requirement: Markdown-first MDEditor usages SHALL migrate to `@wysimark/react`

The CV editor MUST remove `@uiw/react-md-editor` components for Basics summaries and repeatable rich-text stacks. Replacement SHALL instantiate `@wysimark/react` via a shared wrapper, SHALL present WYSIWYG chrome by default, and SHALL load the editor client-only (`next/dynamic` with `ssr: false`) to avoid Emotion SSR pseudo-class warnings.

#### Scenario: Non-technical author edits Summary

- **WHEN** a user without Markdown knowledge modifies Summary prose
- **THEN** usable formatting controls SHALL operate without exposing raw Markdown as the mandatory surface

### Requirement: Wysimark toolbars SHALL be constrained and SHALL NOT offer in-editor image upload

The shared rich-text wrapper SHALL configure Wysimark with patched toolbar presets:

- **Inline variant** (`minimalToolbar`): Bold, Italic, Strikethrough, Emoji.
- **Block variant** (`compactBlockToolbar`): Bold, Italic, Strikethrough, Insert Link, Lists, Block Quote, Insert Table, Emoji.

The editor MUST NOT expose paragraph-style dropdowns, code-block tools, or image-upload controls. Profile images are uploaded only via the Basics photo control.

#### Scenario: Block editor toolbar scope

- **WHEN** a user opens a block rich-text field (e.g. Work description)
- **THEN** toolbar items SHALL be limited to the block preset above and SHALL NOT include image upload or code block actions

### Requirement: Wysimark editor content padding SHALL be compact

Block editor content area (`[data-slate-editor='true']`) SHALL use `1rem` padding; inline variant SHALL use `0.5rem` padding, overriding Wysimark defaults via application CSS.

#### Scenario: Inline highlight field density

- **WHEN** a user edits an inline rich-text field inside a work entry card
- **THEN** the editable region SHALL render with reduced vertical padding suitable for inline form density

### Requirement: Sparse categorical fields MUST receive contextual hints

The editor SHALL augment field bindings with succinct helper/description lines on **view and form** states where applicable. Hints remain required for Work (Summary, Description, Highlights), Education (Area, Study type), Skills (Name, Level), Projects (Entity, Type, Highlights), Awards, Certificates, Publications, Interests (Name), and References (Name, Reference text). TagsInput fields for keywords and roles SHOULD include brief guidance that values are comma-separated tags saved with the parent entry.

#### Scenario: Work summary clarity

- **WHEN** a user focuses Work summary in edit form
- **THEN** surfaced hint SHALL communicate it is a 2–3 sentence professional elevator pitch for that role

#### Scenario: Skills level clarity

- **WHEN** a user focuses Skill level in edit form
- **THEN** surfaced hint SHOULD communicate meaningful scale cues without implying enum lock-in contradictory to schema

### Requirement: CV section tabs SHALL use resume-preview rows for listed entity types

For Basics (excluding Social profiles tab), Work, Volunteer, Education, Skills, Projects, Awards, Certificates, Publications, Languages, Interests, and References, the editor SHALL render saved entries using resume-preview row components (bold primary text left, dates and locations right, bullet lists for highlights and courses) instead of always-visible card forms.

#### Scenario: Work section preview layout

- **WHEN** a user views the Work tab with saved entries
- **THEN** each job SHALL show position and company emphasis, date range and location on the right, and highlight bullets beneath the title block

#### Scenario: Skills section preview layout

- **WHEN** a user views the Skills tab
- **THEN** each skill SHALL show name and level in a compact resume line with keywords rendered as inline comma-separated or tag-like text consistent with the sample CV

#### Scenario: References section preview layout

- **WHEN** a user views the References tab with saved entries
- **THEN** each reference SHALL show the contact name emphasized with the reference text displayed beneath in resume-appropriate prose layout

### Requirement: Section interactions SHALL follow view, inline edit, bottom create, and confirmed delete patterns

The editor SHALL provide Edit actions on view rows that swap to inline forms until Save or Cancel; Add actions that reveal create forms fixed at the section bottom; and Delete actions gated by a confirmation dialog. Save and Delete SHALL trigger immediate API calls per `cv-item-crud`.

#### Scenario: Cancel edit restores view

- **WHEN** a user clicks Cancel while editing an education entry
- **THEN** the form SHALL close without calling the update API and the prior view row SHALL reappear unchanged

### Requirement: TagsInput SHALL be the sole editor for keyword and role string lists

Skills keywords, Interests keywords, Projects keywords, and Projects roles SHALL use the shared TagsInput component. The editor MUST NOT provide separate array repeaters or distinct components for keywords versus roles.

#### Scenario: Project roles and keywords

- **WHEN** a user edits a project in form mode
- **THEN** roles and keywords fields SHALL both use TagsInput with appropriate labels

