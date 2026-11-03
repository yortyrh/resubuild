# Templates, preview and export (`EXP`)

### REQ-EXP-001 Templates

CVs render with a choice of visual templates (`classic`, `modern`, `tabular`, `left`). The template is chosen in this order: explicit request, the template saved on the CV, then `classic`. Presentation settings (REQ-CV-013) apply to every template.

### REQ-EXP-002 Classic MIT academic format

The `classic` template follows MIT-style résumé conventions: single-column serif layout, centered header, bold all-caps section titles with a rule underneath.

- Sections appear in this order: Summary, Experience, Volunteer, Education, Skills, Projects, Awards, Certificates, Publications, Languages, Interests, References. Education never comes before Experience.
- Work entries show the employer in bold with the dates right-aligned, then the position in italics, then the bullets. Education entries show the institution, then the degree. Each skill is one line: "**Name:** keywords".

### REQ-EXP-003 Header contact and profile icons

Template headers show location, phone, email, and website with small decorative icons. Social profiles show brand icons for known networks (LinkedIn, GitHub, X, Facebook, Instagram, Reddit, Discord, Dribbble, Behance) and a generic icon for the rest. Website links are visibly styled as links and stay legible in print.

### REQ-EXP-004 Markdown in output

Fields authored in Markdown are rendered as sanitized HTML in all outputs. The allowed elements are paragraphs, emphasis, lists, links, code, and headings.

### REQ-EXP-005 Print preview

A signed-in user can open a print-faithful preview of a CV. It shows the exact export HTML, isolated from the app styles, with minimal app chrome. From there the user can print, download a PDF or JSON file, and adjust template and presentation settings.

### REQ-EXP-006 HTML and PDF export

The HTML export returns a complete printable document. The PDF is generated from **that same HTML**, never from a second template, on Letter-size pages with backgrounds. Image URLs in the HTML are made absolute, so a headless renderer can load them.

### REQ-EXP-007 JSON export

The JSON export returns a schema-valid JSON Resume file (named after the CV) built from all the CV's data.

- It adds `meta` (last modified, version) and `$schema`.
- It removes internal ids and empty sections.
- It keeps stored image references unchanged.

### REQ-EXP-008 Cover letter export

The cover letter of an application can be exported as HTML and PDF through the same rendering pipeline as CVs.
