## MODIFIED Requirements

### Requirement: Item mutation helpers SHALL keep date-primary sections sorted

The dashboard CV editor and related helpers SHALL apply `@resumind/types` date sort helpers to Work, Volunteer, Education, Projects, Awards, Certificates, and Publications arrays whenever:

- A sort-affecting date field changes during create or edit form interaction, or
- A create, update, or delete mutation succeeds for those sections.

After update or delete, local section state SHALL be merged by matching item `id`, then sorted. After create, the client SHALL incorporate the returned item (with `id`) and sort the section (via section GET refetch or equivalent sort pass). Sort-backed sections (profiles, skills, languages, interests, references) SHALL continue to use reorder API and manual ordering only.

#### Scenario: Work section sorted after patch

- **WHEN** the client receives a successful work item update response
- **THEN** it SHALL merge the item by `id` and re-sort the work array with `sortWorkRows` (or `sortSectionRows('work', …)`)

#### Scenario: Date edit in form triggers immediate re-sort

- **WHEN** a user changes `endDate` on an in-progress work edit form
- **THEN** the visible work list SHALL re-sort before the user clicks Save

#### Scenario: Skills reorder unchanged

- **WHEN** a user reorders skills via drag-and-drop
- **THEN** the client SHALL continue to call the reorder API and SHALL NOT apply date sort helpers to skills
