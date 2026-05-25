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

Baseline visual order AFTER summary and canonical URL/email/telephone grouping SHALL traverse structured location (+ optional prose) before exposing profile imagery controls tying to `resume.basics.image`. File upload (via Nest media API) with **crop confirmation** and URL paste fallback SHALL both be available in edit mode; view mode SHALL expose upload, edit-crop (owned media only), and delete on the profile photo thumbnail per Basics profile photo requirements.

#### Scenario: Locating avatar UI

- **WHEN** a user scrolls to end of Basics edit form
- **THEN** image upload / URL UX SHALL occupy the concluding block without appearing before geography fields unless responsive collapse requires minor reflow parity

#### Scenario: Crop on upload in edit mode

- **WHEN** a user uploads a file from the Basics edit form photo control
- **THEN** a crop dialog SHALL appear before `basics.image` is updated

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

For Work, Volunteer, Education, Skills, Projects, Awards, Certificates, Publications, Languages, Interests, and References, the editor SHALL render saved entries using resume-preview row components (bold primary text left, dates and locations right, bullet lists for highlights and courses) instead of always-visible card forms. **Basics** view mode SHALL use the same row component but structured location and optional street address MUST render in the contact line under the name—not in the right-aligned meta column—and a profile photo thumbnail MUST appear left of the name/contact block when `basics.image` is set per the Basics profile photo requirements.

#### Scenario: Work section preview layout

- **WHEN** a user views the Work tab with saved entries
- **THEN** each job SHALL show position and company emphasis, date range and location on the right, and highlight bullets beneath the title block

#### Scenario: Skills section preview layout

- **WHEN** a user views the Skills tab
- **THEN** each skill SHALL show name and level in a compact resume line with keywords rendered as inline comma-separated or tag-like text consistent with the sample CV

#### Scenario: References section preview layout

- **WHEN** a user views the References tab with saved entries
- **THEN** each reference SHALL show the contact name emphasized with the reference text displayed beneath in resume-appropriate prose layout

#### Scenario: Basics location not in meta column

- **WHEN** a user views the Basics tab in view mode with location data saved
- **THEN** location SHALL appear in the contact line under the name
- **AND** SHALL NOT appear in the right-aligned meta slot used by other sections for geography

#### Scenario: Basics profile photo beside name

- **WHEN** a user views the Basics tab in view mode with `basics.image` set
- **THEN** a profile thumbnail SHALL appear to the left of the name and contact line
- **AND** the photo URL SHALL NOT render as plain text in the row body

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

### Requirement: CV document title SHALL use view/edit inline pattern in the edit shell

The CV edit shell (`CvEditor`) SHALL present the persisted document title (`cv.title`) in **view mode** by default: prominent read-only text with an **Edit** control. **Edit mode** SHALL expose a single-line text input and **Save** / **Cancel** actions. The editor MUST NOT show a persistent labeled title field and standalone **Save title** button in the default (view) layout.

#### Scenario: Default view shows title and Edit

- **WHEN** a user opens the CV edit page with a saved title
- **THEN** the document title SHALL render as read-only text above the section tabs
- **AND** an **Edit** button SHALL be visible without an always-on title input
- **AND** a standalone **Save title** button SHALL NOT be visible

#### Scenario: Edit mode exposes input and actions

- **WHEN** a user activates **Edit** on the document title
- **THEN** a text input SHALL appear prefilled with the current title
- **AND** **Save** and **Cancel** buttons SHALL be available
- **AND** the read-only title display SHALL be hidden until save or cancel completes

#### Scenario: Save persists title via API

- **WHEN** a user changes the title in edit mode and activates **Save**
- **THEN** the client SHALL call the existing CV update endpoint with the new `title`
- **AND** on success the view mode SHALL show the updated title
- **AND** a success toast SHALL be shown consistent with current title-save feedback

#### Scenario: Cancel discards unsaved edits

- **WHEN** a user activates **Edit**, modifies the draft title, then activates **Cancel**
- **THEN** the displayed title SHALL revert to the last successfully saved value
- **AND** no title update API call SHALL be made

#### Scenario: Empty title displays placeholder in view mode

- **WHEN** a user views the edit shell and the saved title is empty or whitespace-only
- **THEN** view mode SHALL show an **Untitled CV** (or equivalent) placeholder treatment
- **AND** the **Edit** affordance SHALL remain available

#### Scenario: Save disabled while request in flight

- **WHEN** a title save request is in progress
- **THEN** **Save** and **Cancel** (and **Edit** if still visible) SHALL be disabled or otherwise prevent duplicate submission until the request completes

### Requirement: View mode SHALL render markdown-authored fields as formatted Markdown

Every CV editor field that uses the shared Wysimark markdown editor in form mode (`markdown="block"` or inline markdown on highlights) SHALL render its saved value through a shared read-only Markdown renderer in view mode (resume-preview rows and nested highlight rows). Raw Markdown source syntax MUST NOT be shown to the user when formatted output is available.

#### Scenario: Basics summary preview

- **WHEN** a user saves Basics summary containing bold text and a bullet list, then returns to view mode on the Basics tab
- **THEN** the summary SHALL display with bold emphasis and list formatting applied, not as literal `**` or `-` characters

#### Scenario: Work highlight bullet preview

- **WHEN** a work highlight contains inline emphasis or a link authored via the inline markdown editor
- **THEN** the highlight bullet in the Work tab view row SHALL render the emphasis and clickable link

#### Scenario: Reference text preview

- **WHEN** a reference entry includes multi-paragraph Markdown with block quotes or lists
- **THEN** the References tab view row SHALL render block-level Markdown structure beneath the contact name

### Requirement: Markdown view rendering SHALL be consistent across all CV section tabs

The shared Markdown renderer SHALL be used for markdown-authored view output in Basics, Work, Volunteer, Projects, Awards, Publications, References, and nested highlight list rows (Work, Volunteer, Projects) without tab-specific one-off plain-text fallbacks.

#### Scenario: Awards summary preview

- **WHEN** a user views a saved award whose summary was authored with the block markdown editor
- **THEN** the Awards tab preview SHALL show formatted Markdown for the summary field

#### Scenario: Project description preview

- **WHEN** a saved project includes a non-empty description authored with the block markdown editor
- **THEN** the Projects tab preview SHALL show the description as rendered Markdown in the entry body

### Requirement: Markdown view output SHALL be sanitized and safe

The read-only Markdown renderer MUST sanitize HTML emitted from user-authored Markdown and MUST NOT execute scripts or render unsafe tags. External links rendered from Markdown SHOULD open in a new browsing context with appropriate `rel` attributes.

#### Scenario: Untrusted link in summary

- **WHEN** saved Markdown includes a link with a `javascript:` URL or embedded script attempt
- **THEN** the view renderer SHALL omit or neutralize unsafe content while still displaying safe text where possible

### Requirement: View mode SHALL render persisted URL fields as clickable external links

Every JSON Resume `url` field shown in CV editor view mode (resume-preview rows) SHALL be rendered as a clickable hyperlink using the stored value as the destination. The link MUST open in a new browsing context (`target="_blank"`) with `rel="noopener noreferrer"`. Bare hostnames without a scheme (e.g. `linkedin.com/in/user`) SHALL be normalized to HTTPS for navigation.

#### Scenario: Social profile URL in preview

- **WHEN** a user views a saved social profile entry with a non-empty URL on the Social profiles tab
- **THEN** the URL SHALL appear as a clickable link that opens the profile destination in a new tab

#### Scenario: Basics website in contact line

- **WHEN** a user views Basics with a non-empty `basics.url` alongside email or phone
- **THEN** the website segment in the contact line under the name SHALL be a clickable link opening in a new tab while other contact segments remain plain text

#### Scenario: Work entry URL in preview

- **WHEN** a user views a saved work entry with a non-empty `url` field
- **THEN** the Work tab preview SHALL display the URL as a clickable external link in the entry body

#### Scenario: Project URL in preview

- **WHEN** a user views a saved project with a non-empty `url` field
- **THEN** the Projects tab preview SHALL display the URL as a clickable external link

#### Scenario: Publication and certificate URLs in preview

- **WHEN** a user views a saved publication or certificate with a non-empty `url` field
- **THEN** the corresponding tab preview SHALL display the URL as a clickable external link

#### Scenario: Unsafe URL scheme

- **WHEN** a stored URL uses a disallowed scheme such as `javascript:`
- **THEN** the editor view SHALL NOT navigate via script execution and SHALL omit or neutralize the unsafe hyperlink while preserving safe display where possible

### Requirement: Markdown-rendered links SHALL open in a new tab

When view mode renders links produced from Markdown-authored fields (summaries, descriptions, highlights), those anchors SHALL use the same new-tab and `rel` policy as dedicated `url` fields.

#### Scenario: Link inside work summary Markdown

- **WHEN** a work summary saved with Markdown contains an `[label](https://example.com)` link and the user views the Work entry
- **THEN** the rendered link SHALL open `https://example.com` in a new tab with `rel="noopener noreferrer"`

### Requirement: CV section navigation SHALL use a left sidebar on desktop and tablet

On viewports at or above the application `md` breakpoint, the CV editor SHALL render section navigation as a vertical list in a fixed left panel. The active section's content SHALL occupy the remaining horizontal space to the right. The horizontal wrapping tab strip MUST NOT be the primary navigation pattern on md+ viewports.

#### Scenario: Desktop layout shows sidebar and content

- **WHEN** a user opens the CV editor on a viewport at or above the `md` breakpoint
- **THEN** section links SHALL appear in a left sidebar and the selected section's editor content SHALL render in the adjacent main pane

#### Scenario: All sections reachable from sidebar

- **WHEN** a user scans the left sidebar on desktop
- **THEN** links for Basics, Social profiles, Work, Volunteer, Education, Skills, Projects, Awards, Certificates, Publications, Languages, Interests, and References SHALL be visible without using horizontal tab scrolling

### Requirement: CV section navigation SHALL use a left drawer on mobile

Below the `md` breakpoint, the CV editor SHALL hide the fixed left sidebar and SHALL expose an affordance (e.g. menu or **Sections** control) that opens a left-side drawer containing the same section list. Selecting a section SHALL close the drawer and display that section's content in the main pane.

#### Scenario: Mobile drawer opens section list

- **WHEN** a user on a viewport below `md` activates the sections menu control
- **THEN** a left-side drawer SHALL open listing all CV sections

#### Scenario: Mobile section selection closes drawer

- **WHEN** a user selects a section from the mobile drawer
- **THEN** the drawer SHALL close and the main pane SHALL show the chosen section's content

### Requirement: Active CV section SHALL be reflected in the URL path

Section selection SHALL update the browser URL using path segments under `/dashboard/cv/[id]`. The Basics section SHALL be the active section when the URL contains no section segment after the CV id (e.g. `/dashboard/cv/abc`). Each other section SHALL map to a single lowercase slug segment (e.g. `/dashboard/cv/abc/work`, `/dashboard/cv/abc/profiles` for Social profiles).

#### Scenario: Default URL opens Basics

- **WHEN** a user navigates to `/dashboard/cv/[id]` with no trailing section segment
- **THEN** the Basics section SHALL be active and its content SHALL be shown

#### Scenario: Section slug in URL opens matching section

- **WHEN** a user navigates to `/dashboard/cv/[id]/work`
- **THEN** the Work section SHALL be active and its editor content SHALL be shown

#### Scenario: Invalid section slug falls back safely

- **WHEN** a user navigates to `/dashboard/cv/[id]/not-a-real-section`
- **THEN** the application SHALL NOT render a broken editor state and SHALL redirect or otherwise resolve to a safe default (Basics index or not-found) consistent with App Router conventions

### Requirement: Browser reload SHALL restore the selected section from the URL

The CV editor SHALL derive the active section from the current URL on initial load and after a full page reload. Client-only tab state MUST NOT be required to preserve section selection across reloads.

#### Scenario: Reload preserves Work section

- **WHEN** a user is viewing `/dashboard/cv/[id]/work` and reloads the browser
- **THEN** the Work section SHALL remain active without resetting to Basics

#### Scenario: Shared link opens correct section

- **WHEN** a user opens a bookmarked or shared URL `/dashboard/cv/[id]/languages` in a new session
- **THEN** the Languages section SHALL be active after authentication and CV data load complete

### Requirement: Section navigation links SHALL indicate the active section

The navigation list (sidebar and drawer) SHALL visually distinguish the active section and SHALL expose `aria-current="page"` (or equivalent) on the active link for assistive technologies.

#### Scenario: Active item styling in sidebar

- **WHEN** a user views `/dashboard/cv/[id]/education`
- **THEN** the Education navigation link SHALL be styled as active and other section links SHALL appear inactive

### Requirement: View mode SHALL expose every form-backed JSON Resume field per section

For each CV editor tab that uses resume-preview rows, the read-only view for a saved entry SHALL render every field that the corresponding edit form can persist, whenever that field holds a non-empty value. Fields MUST NOT be hidden in view mode solely because they were absent from sample resume data used during initial UI design.

#### Scenario: Work entry shows URL and description

- **WHEN** a user saves a work entry with `url` and `description` populated
- **THEN** the Work tab view row SHALL display both values without requiring Edit mode

#### Scenario: Volunteer entry shows organization URL

- **WHEN** a user saves a volunteer entry with `url` populated
- **THEN** the Volunteer tab view row SHALL display the URL

#### Scenario: Education entry shows institution URL and score

- **WHEN** a user saves an education entry with `url` and `score` populated
- **THEN** the Education tab view row SHALL display both values

#### Scenario: Project entry shows URL, entity, and type

- **WHEN** a user saves a project with `url`, `entity`, and `type` populated
- **THEN** the Projects tab view row SHALL display all three values

#### Scenario: Award entry shows awarder

- **WHEN** a user saves an award with `awarder` populated
- **THEN** the Awards tab view row SHALL display the awarder

#### Scenario: Certificate entry shows URL

- **WHEN** a user saves a certificate with `url` populated
- **THEN** the Certificates tab view row SHALL display the URL

#### Scenario: Publication entry shows URL and summary

- **WHEN** a user saves a publication with `url` and `summary` populated
- **THEN** the Publications tab view row SHALL display both values

### Requirement: Field coverage audit SHALL be documented and verified

Before marking the change complete, the implementation SHALL include a documented mapping of each section's form fields to view-mode placement, and automated tests SHALL assert that representative fully populated entries render all expected field values in view mode.

#### Scenario: Regression test for Work completeness

- **WHEN** a unit test renders a Work section view row with every Work field set
- **THEN** the rendered output SHALL include text (or link) for `name`, `position`, `location`, `url`, `startDate`, `endDate`, `summary`, `description`, and each highlight

#### Scenario: Empty fields remain omitted

- **WHEN** a saved entry has a form-backed field that is empty or undefined
- **THEN** the view row SHALL NOT render a placeholder for that field

### Requirement: Basics view mode SHALL group location with contact details under the name

In Basics **view** mode (non-editing), the editor SHALL render email, phone, website URL, formatted structured location (`city`, `region`, `postalCode`, `countryCode`), and optional `location.address` in a single bullet-separated contact line directly beneath the name/label block. Structured location and street address MUST NOT appear in the right-aligned `meta` column for Basics rows.

#### Scenario: Location appears with email and phone

- **WHEN** a user views Basics with name, email, phone, and structured location populated
- **THEN** email, phone, and formatted location SHALL appear on one contact line under the name separated by bullet characters
- **AND** the right-aligned meta column SHALL NOT display location for Basics

#### Scenario: Street address included in contact line

- **WHEN** a user views Basics with optional `location.address` populated
- **THEN** the street address SHALL appear in the same bullet-separated contact line as other contact fields
- **AND** SHALL NOT render in the Basics meta column

#### Scenario: Contact line with location only

- **WHEN** a user views Basics with structured location but no email, phone, or website
- **THEN** the contact line SHALL still render showing formatted location (and address if present) under the name

### Requirement: Basics view mode SHALL place Edit in the header top-right

In Basics **view** mode, the Edit action MUST render in the top-right of the Basics preview row, vertically aligned with the name/label header block. The Edit button MUST NOT render in the bottom action bar for Basics view rows.

#### Scenario: Edit visible beside name

- **WHEN** a user views the Basics tab in view mode
- **THEN** the Edit button SHALL appear top-right on the same header row as the name
- **AND** SHALL NOT appear below the summary or photo line

#### Scenario: Other sections unchanged

- **WHEN** a user views Work or another repeatable section in view mode
- **THEN** Edit actions SHALL remain in the bottom action bar per existing section row behavior

### Requirement: Basics view mode SHALL display profile photo beside identity block

When `basics.image` is set, Basics view mode SHALL render a profile photo thumbnail to the **left** of the name/label and contact line within the row title area. The raw photo URL MUST NOT appear as body text below the summary.

#### Scenario: Photo shown with name and contact

- **WHEN** a user views Basics with `basics.image` populated and the image loads successfully
- **THEN** a cropped-to-fit square thumbnail SHALL appear left of the name (`text-xl`) and contact paragraph
- **AND** the body SHALL NOT include a `Photo: {url}` text line

#### Scenario: No photo configured

- **WHEN** a user views Basics with no `basics.image`
- **THEN** no thumbnail SHALL render
- **AND** an upload affordance SHALL remain available in view mode

### Requirement: Basics profile photo SHALL indicate load failures

When the profile photo URL fails to load, the UI SHALL replace the broken image with a visible error state (placeholder plus short message) and SHALL still offer upload, delete, and edit actions appropriate to the URL type.

#### Scenario: Broken media URL

- **WHEN** `basics.image` points at a URL that returns an error or fails to decode
- **THEN** the editor SHALL show an error indicator instead of a broken-image icon alone
- **AND** the user SHALL be able to delete the reference or upload a replacement

### Requirement: Basics view mode SHALL support profile photo delete

The Basics view row SHALL expose a delete-photo action that clears `basics.image` on the CV via the existing basics patch API. When the image URL matches an owned API media URL (`/media/{uuid}`), the client SHALL also call authenticated media delete so registry and storage objects are removed.

#### Scenario: Delete owned media photo

- **WHEN** a user confirms delete on a profile photo whose URL is `{PUBLIC_API_URL}/media/{id}` owned by the user
- **THEN** the client SHALL call media delete for that id
- **AND** SHALL patch basics to remove `image`
- **AND** the thumbnail SHALL disappear from view mode

#### Scenario: Delete external URL photo

- **WHEN** a user confirms delete on a profile photo whose URL is not an owned API media URL
- **THEN** the client SHALL patch basics to remove `image` only
- **AND** SHALL NOT call media delete

### Requirement: Basics SHALL support upload and edit-crop for profile photos

Uploading a profile photo SHALL open a crop dialog before the photo is assigned to `basics.image`. For photos already stored as owned media, the user SHALL be able to edit crop parameters, re-applying crop server-side while retaining the original upload.

#### Scenario: Upload with crop

- **WHEN** a user selects a new image file for profile photo
- **THEN** a crop dialog SHALL appear before save
- **AND** on confirm the client SHALL upload the original, apply crop via the media crop API, and set `basics.image` to the returned display URL

#### Scenario: Edit crop on existing owned media

- **WHEN** a user chooses edit crop on a profile photo backed by owned media with saved crop params
- **THEN** the crop dialog SHALL initialize with the saved rectangle
- **AND** on confirm the cropped derivative SHALL be regenerated and the display URL unchanged in shape (`/media/{id}`)

#### Scenario: Edit crop unavailable for external URL

- **WHEN** `basics.image` is an external URL not matching owned media
- **THEN** edit-crop SHALL NOT be offered
- **AND** upload and delete-from-CV actions MAY still be offered
