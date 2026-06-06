## MODIFIED Requirements

### Requirement: Date-primary section lists SHALL re-sort when dates change

For Work, Volunteer, Education, Projects, Awards, Certificates, and Publications, the client SHALL keep entries ordered according to `@resubuild/types` sort helpers. The list order SHALL update when:

1. A user changes a sort-affecting date field in create or edit form state (optimistic re-sort of the section array).
2. A create, update, or delete mutation succeeds (merge or refetch, then apply sort helpers so local state matches server order).

Reorder drag handles SHALL NOT appear on these sections.

#### Scenario: Editing end date reorders list before save

- **WHEN** a user edits a work entry's `endDate` such that it would rank below another entry
- **THEN** the section list SHALL reorder immediately to reflect the new sort order while the form remains open

#### Scenario: Date-primary sections excluded from drag reorder

- **WHEN** a user views the Work section
- **THEN** drag reorder controls SHALL NOT be shown for work entries
