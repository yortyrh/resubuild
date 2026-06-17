# improve-layout-panel Design

## Decisions

### Border-radius override via ID selector

Added a targeted CSS rule in `globals.css` using the element's ID (`#cv-layout-panel-drawer-content`) rather than modifying the global `surface-soft` utility class, which is used elsewhere in the application. This approach:

- Preserves `surface-soft` semantics for other components (cards, panels, application workspace)
- Avoids affecting unintended elements
- Has higher specificity than the class-based `.surface-soft`

### Inline layout panel breakpoint detection

Replaced the `useIsMobile` hook (which tracked the `md` / 768px breakpoint) with a custom `useInlineLayoutPanelDisplayable()` hook that tracks the `lg` breakpoint (1024px). This matches the Tailwind `lg:block` breakpoint used to show/hide the inline panel:

```typescript
const LG_BREAKPOINT_QUERY = '(min-width: 1024px)';
```

The inline panel is hidden below `lg`, so the toggle must drive the mobile drawer on viewports from 768px to 1023px as well as below 768px.

### TemplateConfigPanel responsive className

Changed the className from fixed desktop values to responsive values:

- Before: `w-48 shrink-0 space-y-3 p-3 text-sm`
- After: `w-full shrink-0 space-y-3 px-2 py-1 text-sm`

The "Layout" heading was removed — redundant with the SheetTitle "Layout" in the drawer header.

Added explicit padding (`px-2 pt-2 pb-2`) to each section group (`div.space-y-2`) to ensure consistent internal spacing when the outer padding changed.

## Prior Art

- Existing `surface-soft` utility in `apps/web/src/app/globals.css` line 117
- CvPreviewClient already used `Sheet` for mobile drawer pattern
