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

Block editor content area (`[data-slate-editor='true']`) SHALL use `1rem` padding; inline variant SHALL use `0.5rem` padding, overriding Wysimark defaults via application CSS. Inline variant SHALL reserve sufficient top and trailing padding so overlaid remove icons do not obscure editable text.

#### Scenario: Inline highlight field density

- **WHEN** a user edits an inline rich-text field inside a work entry card
- **THEN** the editable region SHALL render with reduced vertical padding suitable for inline form density
- **AND** text SHALL remain readable when a remove icon is present at the top-right

#### Scenario: Block editor padding unchanged

- **WHEN** a user edits a block rich-text field
- **THEN** content padding SHALL remain `1rem` as today

### Requirement: Markdown string list rows SHALL expose overlaid remove control

When `StringListField` renders with `markdown={true}`, each row SHALL wrap the inline markdown editor in a positioned container and SHALL provide a remove control as an icon button fixed to the top-right of that container. The control MUST include an accessible name (e.g. `aria-label="Remove"`). Plain-text string list rows SHALL continue to use the existing adjacent remove button layout.

#### Scenario: Removing a markdown highlight row

- **WHEN** a user activates the remove icon on an inline markdown highlight row
- **THEN** that row SHALL be removed from the parent list value
- **AND** the remove control SHALL NOT occupy a separate column beside the editor

#### Scenario: Plain-text list unchanged

- **WHEN** a user edits a plain-text `StringListField` (e.g. Education courses)
- **THEN** remove SHALL remain the adjacent outline button pattern

### Requirement: Inline Wysimark editors SHALL allow compact multiline editing

The inline markdown editor variant SHALL permit multiple lines of content with vertical growth within configured min/max heights. Application CSS MUST NOT force single-line paragraph layout (e.g. zeroed block margins on all Slate elements) for the inline variant. Inline editors SHALL remain visually denser than block editors via smaller base font size and compact toolbar icon sizing.

#### Scenario: Author enters multiple highlight lines

- **WHEN** a user inserts a line break in an inline markdown highlight field
- **THEN** the editor SHALL display more than one line without clipping content to a single-line height

#### Scenario: Inline vs block visual scale

- **WHEN** a user compares an inline highlight editor with a block description editor on the same form
- **THEN** the inline editor SHALL use smaller typography and padding than the block editor

### Requirement: Sparse categorical fields MUST receive contextual hints

The editor SHALL augment field bindings with succinct helper/description lines on **view and form** states where applicable. Hints remain required for Work (Summary, Description, Highlights), Education (Area, Study type, Courses), Skills (Name, Level), Projects (Entity, Type, Highlights), Awards, Certificates, Publications, Interests (Name), and References (Name, Reference text). TagsInput fields for keywords and roles SHOULD include brief guidance that values are comma-separated tags saved with the parent entry. Highlights `StringListField` on Work, Volunteer, and Projects SHALL include helper copy in form mode clarifying bullet achievements for that entry.

#### Scenario: Work summary clarity

- **WHEN** a user focuses Work summary in edit form
- **THEN** surfaced hint SHALL communicate it is a 2–3 sentence professional elevator pitch for that role

#### Scenario: Skills level clarity

- **WHEN** a user focuses Skill level in edit form
- **THEN** surfaced hint SHOULD communicate meaningful scale cues without implying enum lock-in contradictory to schema

#### Scenario: Work highlights hint in inline list

- **WHEN** a user focuses Highlights in a work entry edit form
- **THEN** helper copy SHALL clarify these are achievement bullets saved with the work entry on Save

### Requirement: CV section tabs SHALL use resume-preview rows for listed entity types

For Work, Volunteer, Education, Skills, Projects, Awards, Certificates, Publications, Languages, Interests, and References, the editor SHALL render saved entries using resume-preview row components (bold primary text left, optional subtitle beneath title, dates and locations right, bullet lists for highlights and courses) instead of always-visible card forms. **Basics** view mode SHALL use the same row component but structured location and optional street address MUST render in the contact line under the name—not in the right-aligned meta column—and a profile photo thumbnail MUST appear left of the name/contact block when `basics.image` is set per the Basics profile photo requirements.

Entity `url` values on Work, Volunteer, Education, Projects, Certificates, and Publications entries SHALL attach to the primary entity label in the title (company, organization, institution, project name, certificate name, publication name) as clickable external links when present; raw URL strings MUST NOT appear in the meta column or as standalone body links for those sections.

#### Scenario: Work section preview layout

- **WHEN** a user views the Work tab with saved entries
- **THEN** each job SHALL show position and company emphasis with the company linked when `url` is set, date range and location on the right, and highlight bullets beneath the title block
- **AND** the raw URL string SHALL NOT appear in meta or body

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

#### Scenario: Project entity and type in body before roles

- **WHEN** a user views a saved project with `entity`, `type`, and `roles` populated
- **THEN** entity and type SHALL render in the row body before the roles line
- **AND** entity and type SHALL NOT appear in the right-aligned meta column

### Requirement: Section interactions SHALL follow view, inline edit, bottom create, and confirmed delete patterns

The editor SHALL provide Edit actions on view rows that swap to inline forms until Save or Cancel; Add actions that reveal create forms fixed at the section bottom; and Delete actions gated by a confirmation dialog. Save and Delete SHALL trigger immediate API calls per `cv-item-crud`. Item create and edit forms SHALL use native form submit so pressing Enter in a single-line text field activates Save (subject to in-flight guards).

#### Scenario: Cancel edit restores view

- **WHEN** a user clicks Cancel while editing an education entry
- **THEN** the form SHALL close without calling the update API and the prior view row SHALL reappear unchanged

#### Scenario: Enter submits item save form

- **WHEN** a user edits a work entry form and presses Enter in a single-line text field
- **THEN** the form SHALL submit the Save action (subject to validation and in-flight guard)

### Requirement: TagsInput SHALL be the sole editor for keyword and role string lists

Skills keywords, Interests keywords, Projects keywords, and Projects roles SHALL use the shared TagsInput component. The editor MUST NOT provide separate array repeaters or distinct components for keywords versus roles.

#### Scenario: Project roles and keywords

- **WHEN** a user edits a project in form mode
- **THEN** roles and keywords fields SHALL both use TagsInput with appropriate labels

### Requirement: View mode SHALL render markdown-authored fields as formatted Markdown

Every CV editor field that uses the shared Wysimark markdown editor in form mode (`markdown="block"` or inline markdown on highlights) SHALL render its saved value through a shared read-only Markdown renderer in view mode (resume-preview rows and nested highlight rows). Raw Markdown source syntax MUST NOT be shown to the user when formatted output is available. The `highlightBody` helper used for Work, Volunteer, and Projects highlight lists MUST render each bullet with the shared `MarkdownView` component using the inline variant—not as a plain text string inside `<li>`.

#### Scenario: Basics summary preview

- **WHEN** a user saves Basics summary containing bold text and a bullet list, then returns to view mode on the Basics tab
- **THEN** the summary SHALL display with bold emphasis and list formatting applied, not as literal `**` or `-` characters

#### Scenario: Work highlight bullet preview

- **WHEN** a work highlight contains inline emphasis or a link authored via the inline markdown editor
- **THEN** the highlight bullet in the Work tab view row SHALL render the emphasis and clickable link

#### Scenario: Work highlight bold text regression

- **WHEN** a saved work highlight contains `**Reduced API latency by 40%**` authored via the inline markdown editor
- **THEN** the Work tab view row SHALL display bold emphasis for that phrase
- **AND** SHALL NOT display literal `**` characters in the bullet text

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

#### Scenario: Volunteer and project highlight preview

- **WHEN** a volunteer or project highlight contains inline emphasis authored via the inline markdown editor
- **THEN** the corresponding tab view row SHALL render formatted Markdown in the highlight bullet, not raw source syntax

### Requirement: Markdown view output SHALL be sanitized and safe

The read-only Markdown renderer MUST sanitize HTML emitted from user-authored Markdown and MUST NOT execute scripts or render unsafe tags. External links rendered from Markdown SHOULD open in a new browsing context with appropriate `rel` attributes.

#### Scenario: Untrusted link in summary

- **WHEN** saved Markdown includes a link with a `javascript:` URL or embedded script attempt
- **THEN** the view renderer SHALL omit or neutralize unsafe content while still displaying safe text where possible

### Requirement: View mode SHALL render persisted URL fields as clickable external links

Every JSON Resume `url` field shown in CV editor view mode (resume-preview rows) SHALL be rendered as a clickable hyperlink using the stored value as the destination. The link MUST open in a new browsing context (`target="_blank"`) with `rel="noopener noreferrer"`. Bare hostnames without a scheme (e.g. `linkedin.com/in/user`) SHALL be normalized to HTTPS for navigation.

For Work, Volunteer, Education, Projects, Certificates, and Publications, the hyperlink SHALL wrap the primary entity label in the row title and SHALL display the entity name (not the raw URL string) as link text. The URL MUST NOT additionally appear as plain text in the meta column or as a duplicate standalone link in the row body.

#### Scenario: Social profile URL in preview

- **WHEN** a user views a saved social profile entry with a non-empty URL on the Social profiles tab
- **THEN** the URL SHALL appear as a clickable link that opens the profile destination in a new tab

#### Scenario: Basics website in contact line

- **WHEN** a user views Basics with a non-empty `basics.url` alongside email or phone
- **THEN** the website segment in the contact line under the name SHALL be a clickable link opening in a new tab while other contact segments remain plain text

#### Scenario: Work entry URL in preview

- **WHEN** a user views a saved work entry with a non-empty `url` field and company name populated
- **THEN** the Work tab preview SHALL render the company name in the title as a clickable external link
- **AND** the raw URL string SHALL NOT appear in the meta column or entry body

#### Scenario: Volunteer entry URL in preview

- **WHEN** a user views a saved volunteer entry with a non-empty `url` field and organization populated
- **THEN** the Volunteer tab preview SHALL render the organization name in the title as a clickable external link
- **AND** the raw URL string SHALL NOT appear in the meta column or entry body

#### Scenario: Education institution URL in preview

- **WHEN** a user views a saved education entry with a non-empty `url` field and institution populated
- **THEN** the Education tab preview SHALL render the institution name in the title as a clickable external link
- **AND** the raw URL string SHALL NOT appear in the meta column

#### Scenario: Project URL in preview

- **WHEN** a user views a saved project with a non-empty `url` field and name populated
- **THEN** the Projects tab preview SHALL render the project name in the title as a clickable external link
- **AND** the raw URL string SHALL NOT appear in the meta column or entry body

#### Scenario: Publication and certificate URLs in preview

- **WHEN** a user views a saved publication or certificate with a non-empty `url` field and name populated
- **THEN** the corresponding tab preview SHALL render the entry name in the title as a clickable external link
- **AND** the raw URL string SHALL NOT appear in the entry body

#### Scenario: Unsafe URL scheme

- **WHEN** a stored URL uses a disallowed scheme such as `javascript:`
- **THEN** the editor view SHALL NOT navigate via script execution and SHALL omit or neutralize the unsafe hyperlink while preserving safe display where possible

### Requirement: Markdown-rendered links SHALL open in a new tab

When view mode renders links produced from Markdown-authored fields (summaries, descriptions, highlights), those anchors SHALL use the same new-tab and `rel` policy as dedicated `url` fields.

#### Scenario: Link inside work summary Markdown

- **WHEN** a work summary saved with Markdown contains an `[label](https://example.com)` link and the user views the Work entry
- **THEN** the rendered link SHALL open `https://example.com` in a new tab with `rel="noopener noreferrer"`

### Requirement: CV section navigation SHALL use a left sidebar on desktop and tablet

On viewports at or above the application `md` breakpoint, the CV editor SHALL render section navigation as a vertical list in a fixed left panel with text labels and section icons. The active section's content SHALL occupy the remaining horizontal space to the right. The horizontal wrapping tab strip MUST NOT be the primary navigation pattern on md+ viewports. Authors SHALL be able to collapse the sidebar to icon-only mode and expand it again via an explicit toggle control. The collapse/expand toggle SHALL render in the breadcrumb chrome row (adjacent to the breadcrumb trail), NOT inside the sidebar sticky header.

#### Scenario: Desktop layout shows sidebar and content

- **WHEN** a user opens the CV editor on a viewport at or above the `md` breakpoint
- **THEN** section links SHALL appear in a left sidebar with icons and labels and the selected section's editor content SHALL render in the adjacent main pane

#### Scenario: All sections reachable from sidebar

- **WHEN** a user scans the left sidebar on desktop
- **THEN** links for Basics, Social profiles, Work, Volunteer, Education, Skills, Projects, Awards, Certificates, Publications, Languages, Interests, and References SHALL be visible without using horizontal tab scrolling

#### Scenario: Sidebar collapses to icons

- **WHEN** a user activates the collapse control in the breadcrumb row on desktop
- **THEN** the sidebar SHALL shrink to icon-only links with accessible labels
- **AND** selecting a section SHALL still update the URL and main content pane

#### Scenario: Toggle lives beside breadcrumb

- **WHEN** a user views any CV editor section
- **THEN** the section-nav toggle button SHALL appear in the same horizontal row as the breadcrumb trail
- **AND** SHALL NOT appear as the first item inside the sidebar sticky column

### Requirement: CV section navigation SHALL use a left drawer on mobile

Below the `md` breakpoint, the CV editor SHALL render the same left sidebar navigation rail in icon-only form (not a separate overlay drawer). Section links SHALL remain visible without opening a Sheet or menu overlay. The collapse/expand toggle SHALL remain available in the breadcrumb row and SHALL switch between icon-only and labeled sidebar modes appropriate to viewport width.

#### Scenario: Mobile shows icon sidebar without drawer

- **WHEN** a user opens the CV editor on a viewport below `md`
- **THEN** section navigation SHALL appear as a persistent icon-only left rail
- **AND** a separate Sections drawer overlay MUST NOT be required to reach any section

#### Scenario: Mobile section selection updates content

- **WHEN** a user selects a section from the mobile icon rail
- **THEN** the main pane SHALL show the chosen section's content
- **AND** the URL SHALL reflect the selected section slug

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

The navigation list (sidebar at all breakpoints) SHALL visually distinguish the active section with icons and labels (or icon-only with accessible name) and SHALL expose `aria-current="page"` (or equivalent) on the active link for assistive technologies.

#### Scenario: Active item styling in sidebar

- **WHEN** a user views `/dashboard/cv/[id]/education`
- **THEN** the Education navigation link SHALL be styled as active and other section links SHALL appear inactive

### Requirement: View mode SHALL expose every form-backed JSON Resume field per section

For each CV editor tab that uses resume-preview rows, the read-only view for a saved entry SHALL render every field that the corresponding edit form can persist, whenever that field holds a non-empty value. Fields MUST NOT be hidden in view mode solely because they were absent from sample resume data used during initial UI design.

URL fields remain visible in view mode via linked entity titles (or contact-line links for Basics) rather than raw URL text.

#### Scenario: Work entry shows URL and description

- **WHEN** a user saves a work entry with `url` and `description` populated
- **THEN** the Work tab view row SHALL display the company as a linked title segment and the description in the body without requiring Edit mode

#### Scenario: Volunteer entry shows organization URL

- **WHEN** a user saves a volunteer entry with `url` populated
- **THEN** the Volunteer tab view row SHALL expose the URL as a link on the organization name in the title

#### Scenario: Education entry shows institution URL and score

- **WHEN** a user saves an education entry with `url` and `score` populated
- **THEN** the Education tab view row SHALL display the institution as a linked title and the score in the meta column

#### Scenario: Project entry shows URL, entity, and type

- **WHEN** a user saves a project with `url`, `entity`, and `type` populated
- **THEN** the Projects tab view row SHALL display the project name as a linked title, entity and type in the body, and dates in meta

#### Scenario: Award entry shows awarder

- **WHEN** a user saves an award with `awarder` populated
- **THEN** the Awards tab view row SHALL display the awarder as subtitle beneath the title

#### Scenario: Certificate entry shows URL

- **WHEN** a user saves a certificate with `url` populated
- **THEN** the Certificates tab view row SHALL display the certificate name as a linked title

#### Scenario: Publication entry shows URL and summary

- **WHEN** a user saves a publication with `url` and `summary` populated
- **THEN** the Publications tab view row SHALL display the publication name as a linked title and the summary in the body

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

### Requirement: Basics view mode SHALL display profile photo beside identity block

When `basics.image` is set, Basics view mode SHALL render a profile photo thumbnail to the **left** of the name/label and contact line within the row title area. The raw photo URL MUST NOT appear as body text below the summary. For owned API media URLs, the thumbnail `<img>` src SHALL be the public thumbnail URL (`/media/{id}/thumbnail`), not the full display URL. The crop dialog and persisted `basics.image` SHALL continue to use the full `/media/{id}` URL.

#### Scenario: Photo shown with name and contact

- **WHEN** a user views Basics with `basics.image` pointing at owned media and the thumbnail loads successfully
- **THEN** a preview at most 150×150 CSS pixels (aspect ratio preserved) SHALL appear left of the name (`text-xl`) and contact paragraph
- **AND** the image request SHALL target the thumbnail endpoint, not the full media stream

#### Scenario: No photo configured

- **WHEN** a user views Basics with no `basics.image`
- **THEN** no thumbnail SHALL render
- **AND** an upload affordance SHALL remain available in view mode

#### Scenario: External image URL

- **WHEN** `basics.image` is an external URL (not owned API media)
- **THEN** the thumbnail MAY use that URL directly with the same max 150×150 display constraint
- **AND** no thumbnail endpoint is required

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

### Requirement: Highlights and courses SHALL be edited inline in parent create/edit forms

For Work, Volunteer, and Projects, `highlights` SHALL be edited with the shared `StringListField` inside the parent entry create/edit form, using inline markdown rich text per row. For Education, `courses` SHALL be edited with `StringListField` inside the parent create/edit form using plain text inputs per row. The editor MUST NOT render separate nested item rows (`ManagedNestedStrings` or equivalent) beneath view-mode parent entries for these fields.

#### Scenario: Editing work highlights in parent form

- **WHEN** a user clicks Edit on a work entry or starts creating a new work entry
- **THEN** the form SHALL include a Highlights `StringListField` with inline markdown editors for each highlight
- **AND** the view row beneath the title block SHALL NOT show separate Edit/Delete controls per highlight

#### Scenario: Editing education courses in parent form

- **WHEN** a user clicks Edit on an education entry or starts creating a new education entry
- **THEN** the form SHALL include a Courses `StringListField` with plain text inputs for each course
- **AND** the view row SHALL NOT show separate Edit/Delete controls per course

#### Scenario: Volunteer and project highlights match work pattern

- **WHEN** a user edits a volunteer or project entry in form mode
- **THEN** highlights SHALL use the same inline `StringListField` markdown pattern as Work
- **AND** SHALL NOT use nested per-highlight CRUD UI below the view row

#### Scenario: View mode still shows bullet lists

- **WHEN** a user views a saved work, volunteer, project, or education entry without editing
- **THEN** highlights or courses SHALL render as bulleted lists in the resume-preview row body unchanged

### Requirement: Languages tab language field MUST use a searchable combobox

The Languages section edit form SHALL replace the free-text Language input with an accessible filterable combobox (button trigger, searchable dropdown, keyboard navigation, click-outside dismiss) consistent with the Basics country picker interaction model. Options SHALL be drawn from a canonical ISO 639-1 aligned list (English display names). The control SHALL persist the selected **language name** string to `resume.languages[].language` per JSON Resume schema.

#### Scenario: Selecting English from picker

- **WHEN** a user edits a language entry and selects "English" from the combobox
- **THEN** `language` SHALL equal `"English"` after save roundtrip
- **AND** the Languages view row SHALL display "English" as the title

#### Scenario: Filtering by typed query

- **WHEN** a user opens the language combobox and types `spa` in the search field
- **THEN** the option list SHALL narrow to matching languages (e.g. Spanish)
- **AND** the user SHALL be able to select a match via click or Enter

#### Scenario: Keyboard navigation

- **WHEN** the language combobox dropdown is open
- **THEN** ArrowDown and ArrowUp SHALL move highlight among filtered options
- **AND** Enter SHALL select the highlighted option and close the dropdown
- **AND** Escape SHALL close the dropdown without changing the value

#### Scenario: Legacy custom language value preserved

- **WHEN** a language entry has `language` set to a string not present in the canonical list (e.g. imported CV data)
- **THEN** the combobox trigger SHALL display that stored string as the current selection
- **AND** the user SHALL still be able to search and pick a canonical name to replace it

#### Scenario: Fluency field unchanged

- **WHEN** a user edits a language entry
- **THEN** Fluency SHALL remain a free-text field separate from the language combobox

### Requirement: CV editor SHALL expose breadcrumb context above section content

The CV editor SHALL render a breadcrumb trail above the active section content showing, at minimum: a link to the dashboard CV list (`My CVs`), the derived CV title (linking to the Basics route when viewing another section), and the active section name when not on Basics. The section-nav collapse toggle SHALL appear at the start of this chrome row. Section body content below the breadcrumb row SHALL be wrapped in a consistent content container with left padding aligned to the breadcrumb text. Duplicate standalone page headings (`Edit CV`, large derived title above sections) MUST NOT appear alongside the breadcrumb.

#### Scenario: Basics breadcrumb shows title only

- **WHEN** a user views `/dashboard/cv/[id]` on Basics
- **THEN** the breadcrumb SHALL show `My CVs` and the derived CV title as the current page
- **AND** SHALL NOT show a trailing section segment

#### Scenario: Work section breadcrumb shows section

- **WHEN** a user views `/dashboard/cv/[id]/work`
- **THEN** the breadcrumb SHALL show `My CVs`, a link with the CV title pointing to `/dashboard/cv/[id]`, and `Work` as the current page

#### Scenario: Short title on narrow viewports

- **WHEN** the CV has both name and label populated and the viewport is below the `sm` breakpoint
- **THEN** the breadcrumb CV title segment MAY show the name only while wider viewports show the full derived title

#### Scenario: Section content padding

- **WHEN** a user views any section's edit or preview content below the breadcrumb row
- **THEN** the content SHALL be inset with consistent left padding relative to the breadcrumb text baseline

### Requirement: CV editor and dashboard SHALL show skeleton placeholders while loading

While authentication, CV list, CV editor data, or client-only markdown editors are loading, the UI SHALL render skeleton placeholders that approximate final layout (sidebar icons, breadcrumb bars, list cards, form fields, markdown chrome) instead of plain `"Loading…"` text alone.

#### Scenario: Session gate loading

- **WHEN** the dashboard shell is waiting for session validation
- **THEN** a dashboard-shaped skeleton (header + content placeholders) SHALL be shown

#### Scenario: CV list loading

- **WHEN** the dashboard CV list fetch is in progress
- **THEN** skeleton cards matching the CV list grid SHALL be shown

#### Scenario: CV editor loading

- **WHEN** a user navigates to a CV editor route before resume JSON is available
- **THEN** a skeleton matching breadcrumb, sidebar, and section content SHALL be shown

#### Scenario: Markdown editor hydration

- **WHEN** a Wysimark markdown editor chunk is loading on the client
- **THEN** an inline or block skeleton matching the editor variant SHALL occupy the editor region until the editor mounts

### Requirement: Wysimark editor shell SHALL use square corners and stable toolbar height

Global styles for `.rich-text-editor` SHALL target the Wysimark shell via direct-child selectors (`> .border`) rather than descendant `.rounded-md.border` chains. The inner editor shell SHALL use square corners (`border-radius: 0`). Block-variant toolbars SHALL use a fixed height of 30px; inline-variant toolbars SHALL use em-based height. Toolbar containers SHALL NOT add extra bottom margin that separates toolbar from content.

#### Scenario: Block editor toolbar height

- **WHEN** a user focuses a block Wysimark field (e.g. Work description)
- **THEN** the toolbar row SHALL render at 30px height without rounded inner corners

#### Scenario: Inline editor compact toolbar

- **WHEN** a user focuses an inline Wysimark field
- **THEN** the toolbar SHALL use em-scaled compact height consistent with inline variant styling

### Requirement: String list fields SHALL support keyboard row extension

Non-markdown `StringListField` instances SHALL move focus to a newly added row when the user presses Enter on the last row's input. Enter on non-terminal rows MUST NOT submit the parent form unless the row is the last item and the implementation explicitly adds a new row first.

#### Scenario: Enter adds highlight row

- **WHEN** a user presses Enter in the last plain-text row of a string list inside an item form
- **THEN** a new empty row SHALL be appended
- **AND** focus SHALL move to the new row's input

### Requirement: Project roles SHALL use distinct tag styling in view mode

When Projects view mode renders `roles`, each role tag SHALL use styling visually distinct from keyword tags (e.g. primary-tinted pills) and SHALL appear under a **Roles** metadata label.

#### Scenario: Roles vs keywords styling

- **WHEN** a saved project has both roles and keywords
- **THEN** the view row SHALL show labeled **Roles** and **Keywords** groups
- **AND** role pills SHALL NOT share identical styling with keyword pills

### Requirement: CV editor shell SHALL remain horizontally stable when section content height varies

The CV editor layout (section sidebar, breadcrumb row, and main content pane) SHALL NOT shift horizontally when navigating between sections whose content does or does not require vertical page scrolling. Horizontal position of `#cv-section-nav` and adjacent content SHALL remain consistent across all CV section routes at a given viewport width.

#### Scenario: Navigating from short section to tall section

- **WHEN** a user on desktop (md+ viewport) navigates from Basics to Work (or any section with content taller than the viewport)
- **THEN** the left edge of the section sidebar and nav links SHALL NOT change horizontal position relative to the viewport

#### Scenario: Navigating from tall section to short section

- **WHEN** a user navigates from Work to Awards (or any section that fits within the viewport without scrolling)
- **THEN** the left edge of the section sidebar and nav links SHALL NOT change horizontal position relative to the viewport

#### Scenario: All sections maintain stable nav position

- **WHEN** a user sequentially visits Basics, Social profiles, Work, Volunteer, Education, Skills, Projects, Awards, Certificates, Publications, Languages, Interests, and References
- **THEN** `#cv-section-nav` bounding box `left` coordinate SHALL remain within 1px across all sections at the same viewport size

### Requirement: Keyword string arrays SHALL render as read-only tag pills in view mode

Skills, Interests, and Projects keyword arrays in resume-preview view rows SHALL render through a shared read-only tag list component that reuses the same pill styling as `TagsInput` (`bg-muted`, rounded corners, compact padding) without remove buttons or text inputs. Keywords MUST NOT be displayed as comma-separated plain text in view mode.

#### Scenario: Skills keywords as tag pills

- **WHEN** a user views the Skills tab with a saved skill whose `keywords` array contains `["React", "TypeScript"]`
- **THEN** each keyword SHALL appear as an individual muted pill beneath the skill name/level line
- **AND** SHALL NOT appear as the literal string `React, TypeScript`

#### Scenario: Interests keywords as tag pills

- **WHEN** a user views the Interests tab with saved keywords on an interest entry
- **THEN** keywords SHALL render as the same read-only tag pills used on Skills

#### Scenario: Projects keywords as tag pills

- **WHEN** a user views the Projects tab with saved keywords on a project entry
- **THEN** keywords SHALL render as read-only tag pills in the entry body
- **AND** SHALL NOT use a comma-separated `Keywords:` prose line

### Requirement: ResumeItemRow SHALL support an optional subtitle beneath the title

The shared resume-preview row component SHALL accept an optional `subtitle` prop rendered directly below the primary title in muted, normal-weight small text. Sections that carry secondary entity context (education study type/area, awarder, language fluency) SHALL use this slot instead of the right-aligned meta column or redundant body lines.

#### Scenario: Education row shows study type and area as subtitle

- **WHEN** a user views a saved education entry with `studyType` "Bachelor" and `area` "Computer Science"
- **THEN** the institution name SHALL appear as the bold title (linked when `url` is set)
- **AND** "Bachelor — Computer Science" SHALL appear as subtitle beneath the title
- **AND** study type and area SHALL NOT appear in the right-aligned meta column

#### Scenario: Language row shows fluency as subtitle

- **WHEN** a user views a saved language entry with `language` "English" and `fluency` "Native"
- **THEN** "English" SHALL appear as the title
- **AND** "Native" SHALL appear as subtitle beneath the title
- **AND** fluency SHALL NOT appear in the meta column

#### Scenario: Award row shows awarder as subtitle

- **WHEN** a user views a saved award with `title` "Employee of the Year" and `awarder` "Acme Corp"
- **THEN** the award title SHALL remain the bold primary title
- **AND** "Acme Corp" SHALL appear as subtitle beneath the title
- **AND** awarder SHALL NOT appear in the meta column

### Requirement: CV document title SHALL derive from Basics name and label

The persisted document title (`cv.title`) SHALL be computed from `data.basics.name` and `data.basics.label` using the shared derivation rules: trim both fields; when both are non-empty use `` `{name} — {label}` ``; when only name is non-empty use name; when only label is non-empty use label; when both are empty use **Untitled CV**. The edit shell SHALL display this derived title as read-only prominent text above section tabs. Authors SHALL NOT edit document title independently of Basics.

#### Scenario: Both name and label set

- **WHEN** basics contain name `Jane Doe` and label `Software Engineer`
- **THEN** the edit shell header SHALL display `Jane Doe — Software Engineer`
- **AND** the dashboard CV list SHALL show the same derived title from `cv.title`

#### Scenario: Name only

- **WHEN** basics contain name `Jane Doe` and an empty or whitespace-only label
- **THEN** the derived title SHALL be `Jane Doe`

#### Scenario: Neither name nor label

- **WHEN** basics name and label are both empty or whitespace-only
- **THEN** the derived title SHALL be `Untitled CV`

#### Scenario: No title edit affordance

- **WHEN** a user views the CV edit shell
- **THEN** the document title SHALL NOT expose Edit, Save, or Cancel controls for title
- **AND** SHALL NOT show a standalone title text input in the default layout

#### Scenario: Title updates after basics save

- **WHEN** a user saves Basics with an updated name or label
- **THEN** the edit shell header SHALL reflect the newly derived title after the basics save succeeds (via updated `cv.title` in the response or equivalent refetch)

### Requirement: Profile photo crop dialog SHALL NOT render an image with empty src

The profile photo crop dialog component SHALL NOT mount an `<img>` element with an empty or missing `src` attribute when no preview URL is available or when the dialog is idle. This prevents spurious network requests and React/Next.js console warnings.

#### Scenario: Dialog closed with empty preview URL

- **WHEN** the crop dialog is not open and `imageUrl` is an empty string
- **THEN** the component SHALL NOT render an `<img>` element with `src=""`

#### Scenario: Dialog open with valid preview URL

- **WHEN** the crop dialog is open and `imageUrl` is a non-empty blob or media URL
- **THEN** the crop preview `<img>` SHALL render with that URL as `src`
- **AND** the user SHALL be able to adjust and confirm the crop as today

### Requirement: Reorderable sections SHALL expose drag-and-drop reorder in view mode

The editor SHALL allow users to reorder entries via drag-and-drop in view mode for Social profiles, Skills, Languages, Interests, and References when at least two entries exist. Drag handles SHALL be visible and SHALL NOT appear while a row is in edit or create mode. Reorder SHALL apply optimistic list updates immediately, then call the section reorder API.

#### Scenario: Drag skill row

- **WHEN** a user drags a skill entry to a new position in view mode
- **THEN** the list SHALL update immediately to the new order
- **AND** the client SHALL call the skills reorder API with the new id order in the background

#### Scenario: Reorder disabled during edit

- **WHEN** a user is editing a language entry inline
- **THEN** drag reorder controls SHALL be disabled for that section until save or cancel

### Requirement: Reorder SHALL provide keyboard-accessible move controls

Each reorderable row SHALL expose move-up and move-down actions that reorder by one position and invoke the same reorder API as drag-and-drop. Controls SHALL be disabled at list boundaries and SHALL include accessible names (e.g. "Move skill up").

#### Scenario: Move reference up via keyboard

- **WHEN** a user activates move-up on the second reference entry
- **THEN** that entry SHALL move to first position in the UI immediately
- **AND** SHALL persist after the API succeeds

### Requirement: The CV preview page SHALL provide a template layout configuration panel

On `/dashboard/cv/[id]/preview`, the editor UI SHALL expose a **Layout** panel (`TemplateConfigPanel`) allowing authors to reorder visible sections (drag-and-drop), toggle section visibility, toggle per-section optional fields, and customize section labels where supported. Changes SHALL debounce and persist via `PATCH /cv/:id/template-presentation` for the currently selected template. The panel SHALL use design tokens consistent with `apps/web/DESIGN.md` (`surface-soft`).

#### Scenario: Section reorder updates preview

- **WHEN** the user drags Education above Experience in the layout panel
- **THEN** the app SHALL PATCH presentation config
- **AND** refetch export HTML so the preview reflects the new order

#### Scenario: Hide section updates preview

- **WHEN** the user hides the Projects section in the layout panel
- **THEN** the preview iframe SHALL no longer show a Projects section after refetch

### Requirement: Preview SHALL display export HTML in an isolated iframe

The preview client SHALL load HTML from `GET /cv/:id/export/html` and display it using `iframe[srcDoc]`, not `dangerouslySetInnerHTML` on a page-level div. A loading skeleton SHALL show until HTML is available.

#### Scenario: Preview uses iframe

- **WHEN** export HTML is loaded on the preview page
- **THEN** the resume content SHALL render inside an iframe element
- **AND** app chrome (toolbar, layout panel) SHALL remain outside the iframe
