# Public site and app shell (`WEB`)

### REQ-WEB-001 Landing page

Anonymous visitors at `/` see a marketing page instead of being redirected to login.

- Sections:
  - a sticky pill navigation (section links that mark the section in view, Features, Log in, Get started free); on small screens the links move into a menu
  - hero with the PDF→editable-CV promise, calls to action (try the live demo, and "Import your CV free" while the free import wizard is open, REQ-IMP-011), an animated walkthrough beside the text on wide screens (below it on small ones: import a PDF, edit on the page, tailor a copy for a job, export the PDF; a recreation of the app, not a recording; reduced motion shows a still frame), and below both a proof strip of three panes: the CV you have, the entry in the page editor, and the printed page. One highlight is typed in the editor and appears on the page; with reduced motion both show the finished text
  - how it works, numbered (Import → Edit on the page → Export PDF)
  - the page editor (plain-text bullets, paste splitting, Markdown, fields where they print)
  - ownership: private data, the open JSON Resume format, bring your own AI key, MCP access
  - tailoring a copy for each job (only claims REQ-APP-003, REQ-APP-005 and REQ-APP-006 behavior)
  - FAQ
  - closing call to action and footer
- Signed-in visitors go to the dashboard.
- Exactly one `h1`, one `main` landmark, and a correct heading outline.

### REQ-WEB-002 Features page

A public `/features` page describes the product capabilities.

### REQ-WEB-003 SEO

Public pages emit the following, all derived from a single site configuration:

- title and description
- canonical URLs
- Open Graph and Twitter metadata
- structured data (Organization, WebSite, SoftwareApplication; FAQPage on `/`)

The site also provides a sitemap (public pages only) and a `robots` file that disallows the dashboard and API. It also provides a web app manifest.

### REQ-WEB-004 Icons

The site provides a favicon (16/32/48), PWA icons (including maskable and Apple touch icons) and a social preview image. All of them are generated from a single source icon.

### REQ-WEB-005 Dashboard shell

Signed-in pages share one shell: navigation (CVs, Applications, Settings) and the user menu.

- The top bar always shows the active AI and links to the AI provider settings (REQ-IMP-008): for the user's own key, the provider logo and account name; for included AI, its name and the tokens left this month, never the model behind it (REQ-IMP-010). Without a usable account it shows a "Set up AI" link instead. On small screens only the logo shows; the name stays available to screen readers.
- On small screens the navigation becomes a slim top bar with a menu.
- While the session loads, the shell shows a skeleton with the same layout.
- App chrome never appears in print output.

### REQ-WEB-006 Responsive layout

Login, register, CV list, applications, every editor section and the preview work at 375px width. They must have no horizontal scrolling and no clipped controls.

- Header actions collapse to icon-only buttons on small screens. These buttons keep accessible labels.
- Tables become stacked cards on small screens.
- Auth pages center their card in the viewport; on large screens the landing hero's animated walkthrough (same recreation, same reduced-motion still frame) sits beside the form. The panel is hidden on small screens, and its image loads lazily so those screens do not download it.

### REQ-WEB-007 Settings

The settings area groups the following, with a shared sub-navigation (`/dashboard/settings` opens the first item):

- Security (REQ-AUTH-004)
- AI provider settings (REQ-IMP-008)
- the MCP key (REQ-MCP-002)
