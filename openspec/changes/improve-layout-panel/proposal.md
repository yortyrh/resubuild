# improve-layout-panel

## Summary

This change retroactively documents work already implemented in the working tree.

## What Changes

- **CSS**: Reduced border-radius on `#cv-layout-panel-drawer-content` from `12px` (`0.75rem`) to `4px` for a squarer, more compact appearance in the mobile drawer.
- **TemplateConfigPanel component**: Refactored className for better mobile drawer fit — changed from desktop-focused `w-48 p-3` to responsive `w-full px-2 py-1`, removed redundant "Layout" header, added explicit padding to section groups.
- **CvPreviewClient**: Replaced `useIsMobile` hook with custom `useInlineLayoutPanelDisplayable()` hook that tracks the `lg` breakpoint (1024px) to determine when the inline panel can be displayed versus when the mobile drawer must be used. Fixed aria-controls and aria-expanded attributes to correctly target the drawer on non-lg viewports (tablet range 768–1023px was broken — button silently did nothing).

## Why

1. The drawer content had overly rounded corners (12px) that looked inconsistent with the dense drawer layout.
2. The previous `useIsMobile` breakpoint was too narrow — at tablet viewports (768–1023px), the inline panel was hidden by Tailwind's `lg:block`, but the toggle still drove the inline panel state instead of the drawer, making the layout button a silent no-op.
3. The TemplateConfigPanel used a fixed desktop width that overflowed the mobile drawer.

## Capabilities

No new capabilities. Modifies existing behavior under `cv-editor-ui`:

- **Section: CV preview layout panel toggle** — Fixed to correctly drive the mobile drawer on all viewports below `lg` (1024px), not just the `md` mobile breakpoint.
