# improve-layout-panel Tasks

## Implementation

- [x] Add border-radius: 4px override for #cv-layout-panel-drawer-content in globals.css
- [x] Update TemplateConfigPanel className from desktop to responsive layout
- [x] Remove redundant "Layout" heading from TemplateConfigPanel
- [x] Add explicit padding to section groups in TemplateConfigPanel
- [x] Replace useIsMobile with useInlineLayoutPanelDisplayable in CvPreviewClient
- [x] Fix aria-controls and aria-expanded to use inlinePanelDisplayable condition
- [x] Add className="w-48 p-3" to inline TemplateConfigPanel instance

## E2E Test Impact

None — UI-only change that fixes a silent bug in tablet viewport behavior. The existing cv-editor-ui e2e tests cover the layout panel toggle. The fix ensures the toggle now works correctly on tablet viewports where it previously silently did nothing.
