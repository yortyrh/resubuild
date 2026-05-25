## ADDED Requirements

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

## MODIFIED Requirements

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

### Requirement: Basics photo control MUST appear last after geography details

Baseline visual order AFTER summary and canonical URL/email/telephone grouping SHALL traverse structured location (+ optional prose) before exposing profile imagery controls tying to `resume.basics.image`. File upload (via Nest media API) with **crop confirmation** and URL paste fallback SHALL both be available in edit mode; view mode SHALL expose upload, edit-crop (owned media only), and delete on the profile photo thumbnail per Basics profile photo requirements.

#### Scenario: Locating avatar UI

- **WHEN** a user scrolls to end of Basics edit form
- **THEN** image upload / URL UX SHALL occupy the concluding block without appearing before geography fields unless responsive collapse requires minor reflow parity

#### Scenario: Crop on upload in edit mode

- **WHEN** a user uploads a file from the Basics edit form photo control
- **THEN** a crop dialog SHALL appear before `basics.image` is updated
