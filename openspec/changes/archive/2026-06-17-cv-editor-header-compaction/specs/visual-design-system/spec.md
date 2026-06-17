## ADDED Requirements

### Requirement: The web app SHALL expose a scrollbar-hidden utility for narrow scrollable surfaces

The web app's `globals.css` SHALL define a `.scrollbar-hidden` utility class that hides the scrollbar visually while keeping the element scrollable across modern browsers. The utility MUST suppress `::-webkit-scrollbar` (WebKit/Blink), set `scrollbar-width: none` (Firefox), and set `-ms-overflow-style: none` (legacy Edge/IE). The class is intended for narrow scrollable surfaces (e.g. mobile drawers) where the scrollbar chrome would crowd a small column; keyboard scroll, trackpad scroll, and drag-to-scroll MUST continue to function.

#### Scenario: Scrollbar hidden in drawer

- **WHEN** `.scrollbar-hidden` is applied to a scrollable container
- **THEN** the scrollbar SHALL NOT be visually rendered in WebKit, Blink, Gecko, or legacy Edge browsers
- **AND** the container SHALL remain scrollable via keyboard, trackpad, and drag

#### Scenario: CV section nav drawer uses the utility

- **WHEN** a user opens the mobile section navigation drawer on a viewport below `md`
- **THEN** the drawer's inner scrollable region SHALL carry the `scrollbar-hidden` class
- **AND** the visible width consumed by scrollbar chrome SHALL be zero
