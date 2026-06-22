## ADDED Requirements

### Requirement: Page SHALL reserve a stable scrollbar gutter so Radix scroll-lock does not shift the editor layout

The dashboard global stylesheet (`apps/web/src/app/globals.css`) SHALL apply `scrollbar-gutter: stable` to the `html` element so the right-side scrollbar gutter is permanently reserved regardless of whether the scrollbar is currently visible. The stylesheet SHALL also override the runtime `body[data-scroll-locked]` margin and padding that Radix Select / Dialog (via `react-remove-scroll-bar`) inject to `0 !important` so the body does not resize while a popover is open.

Together, these two rules MUST guarantee that opening any Radix-driven popover (Block-type select dropdown on the markdown editor toolbar, Link dialog, table grid picker, future Radix Select / Dialog surfaces) does not shift the layout of the editor or the form below it.

The override selector MUST have higher specificity than the runtime-injected `body[data-scroll-locked]` rule from `react-remove-scroll-bar` (which uses `!important` at the `body[...]` level) so the override wins at runtime; the existing `html body[data-scroll-locked]` selector satisfies this.

#### Scenario: Block-type select dropdown opens without shifting the editor layout

- **WHEN** the user is editing the Basics Summary field and clicks the Block-type select trigger in the markdown editor toolbar
- **THEN** the dropdown SHALL open and list the available block types (Paragraph and Quote in the constrained block variant; Paragraph, Quote, and Heading 1–6 in `freeForm` mode)
- **AND** the page width and the position of the form controls below the editor SHALL NOT change between the closed and open states of the dropdown
- **AND** the scrollbar SHALL NOT visibly disappear between the closed and open states (the gutter is reserved regardless)

#### Scenario: Link dialog opens without shifting the editor layout

- **WHEN** the user is editing any markdown field and clicks the Link toolbar button
- **THEN** the Link dialog SHALL open above the editor
- **AND** the page width and the position of the form controls below the editor SHALL NOT change between the closed and open states

#### Scenario: Scroll-lock override zeroes react-remove-scroll-bar padding and margin

- **WHEN** `react-remove-scroll-bar` mounts and the runtime stylesheet injects `body[data-scroll-locked] { padding-right: 15px; margin-right: 15px; ... }`
- **THEN** the global stylesheet override `html body[data-scroll-locked] { margin: 0 !important; padding: 0 !important }` SHALL win so the body element's computed `padding-right` and `margin-right` remain `0` while the popover is open
- **AND** the body's effective horizontal space SHALL be identical to the closed state (reserved gutter preserved, no double-compensation)
