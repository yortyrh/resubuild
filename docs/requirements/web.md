# Public site and app shell (`WEB`)

### REQ-WEB-001 Landing page

Anonymous visitors at `/` see a marketing page instead of being redirected to login.

- Sections:
  - hero with the PDF→structured-CV transformation and calls to action (try it, see how it works)
  - features (with a link to `/features`)
  - how it works (Import → Edit → Export)
  - JSON Resume open-standard callout
  - FAQ
  - footer
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

- On small screens the navigation becomes a slim top bar with a menu.
- While the session loads, the shell shows a skeleton with the same layout.
- App chrome never appears in print output.

### REQ-WEB-006 Responsive layout

Login, register, CV list, applications, every editor section and the preview work at 375px width. They must have no horizontal scrolling and no clipped controls.

- Header actions collapse to icon-only buttons on small screens. These buttons keep accessible labels.
- Tables become stacked cards on small screens.
- Auth pages center their card in the viewport.

### REQ-WEB-007 Settings

The settings area groups the following:

- Security (REQ-AUTH-004)
- AI provider and scraping settings (REQ-IMP-008, REQ-IMP-009)
- the MCP key (REQ-MCP-002)
