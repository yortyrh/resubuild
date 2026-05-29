## Why

Resume preview templates and the CV editor Basics/Social profiles views render contact details (location, phone, email, website) and social links as plain text separated by bullets. The JSON Resume registry reference layouts (e.g. [thomasdavis](https://registry.jsonresume.org/thomasdavis)) prefix each item with recognizable icons, making headers faster to scan and visually aligned with common resume conventions. Authors also lack guidance when entering social network names—the free-text Network field should suggest standard platforms while still allowing custom values.

## What Changes

- Add inline SVG (or equivalent) icons before location, phone, email, and website in **all server-rendered resume template headers** (`packages/resume-template`).
- Style website links in templates with a distinct link treatment (underline, inherit-safe hover) consistent with editor `ExternalLink` affordance where print-safe.
- Prefix social profile links in template headers with network-specific brand icons when the network name is recognized (LinkedIn, Facebook, Instagram, GitHub, Reddit, Discord, X/Twitter, Dribbble, Behance, plus reasonable fallbacks).
- Mirror the same contact and social icon treatment in **Basics view mode** and **Social profiles view rows** in the web editor.
- Replace the Social profiles **Network** plain text input with a combobox that offers prioritized network suggestions, supports typeahead filtering, and **allows free-text** values not in the list (same interaction model as country/language pickers).
- Add colocated unit tests for icon mapping helpers and template header HTML output.

## Capabilities

### New Capabilities

- `resume-template-header-icons`: Server-rendered resume template headers SHALL prefix contact fields and recognized social profiles with accessible inline icons and appropriate link styling.

### Modified Capabilities

- `cv-editor-ui`: Basics view contact line SHALL show icons for location, phone, email, and website (with existing `ExternalLink` styling for URL); Social profiles view rows SHALL show network icons; Social profiles Network field SHALL use combobox with suggestions and free-text.

## Impact

- **packages/resume-template**: `renderBasicsHeader` in `primitives/sections/index.ts`; shared icon/network normalization helpers; template unit tests.
- **apps/web**: `managed-basics-section.tsx`, `profiles-section.tsx`, new shared contact/social icon components or helpers, new `SocialNetworkField` combobox component.
- **Dependencies**: Lucide React (web, already used); inline SVG strings for server HTML (no runtime Lucide in template package).
- **No API, database, or schema changes**; UI-only and HTML rendering enhancement.
