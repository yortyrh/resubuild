# CV editor (`EDIT`)

### REQ-EDIT-001 Section navigation

The editor has one view per section (Basics, Social profiles, Work, Volunteer, Education, Skills, Projects, Awards, Certificates, Publications, Languages, Interests, References).

- The active section is part of the URL, so reloading or sharing the link restores it; the navigation highlights the active section.
- On small screens the navigation collapses into a drawer.

### REQ-EDIT-002 View, edit, create, delete

Each section shows its entries on a white page set in the export template's typeface and layout, so the section reads like the printed CV.

- Edit replaces the entry in place with a page composer until Save or Cancel: the fields sit where they print (organization and dates on the first line, role in italics below, bullets as a list) and are set in the same type. Create opens the composer at the end of the page; Escape cancels; Delete asks for confirmation.
- The view shows every field the form can edit. Fields the template does not print (the work description) are marked as not printed.
- While an entry is being edited the list does not re-sort; it re-sorts after Save.

### REQ-EDIT-003 Required dates

Saving a Work, Volunteer, Education, or Project entry requires a start date. Awards and certificates require a date; publications require a release date. These rules apply to interactive saves only, not to imports. An entry without an end date shows "Current".

### REQ-EDIT-004 Markdown fields

Summaries, descriptions, highlights, and reference text are stored as Markdown.

- Summaries, descriptions, and reference text are edited with the rich Markdown editor. It loads only when the field is focused; until then the field shows its rendered text.
- Highlights and courses are edited as plain text, one field per bullet. Markdown typed by hand or written by AI (for example `**40%**` or a link) is kept as text, shown rendered while the bullet is not focused, and rendered in the read view and the export.
- In the read view they are rendered as formatted, sanitized HTML, the same way in every section.
- Links (Markdown links and URL fields) open in a new tab.
- CV fields allow only a limited grammar: no headings, code blocks, or images. Cover letters allow the full grammar.

### REQ-EDIT-005 String lists

Keywords (skills, interests) and roles (projects) are edited as tags and shown as read-only tags in the read view. Enter or a comma adds a tag, Backspace in the empty field removes the last one, and pasting a comma-separated list adds each item.

Highlights and courses are edited as ordered bullets inside the parent entry:

- Enter splits the bullet at the cursor and starts the next one; it never submits the form.
- Backspace at the start of a bullet joins it to the previous one; Delete at the end joins the next one.
- Alt+Up and Alt+Down move a bullet; Up and Down at the edges move between bullets.
- Pasting several lines creates one bullet per line, without leading list markers (`-`, `*`, `•`, `1.`).
- Each bullet can be removed individually.

### REQ-EDIT-006 Basics

- The header is edited as it prints: name, headline (the JSON Resume `label`, a job title), and the contact line, followed by location and Summary.
- Location uses structured fields; the country is chosen from an ISO-code list.
- Social profiles are edited in their own section. The network field suggests known networks but accepts free text; known networks show their brand icon.
- The languages field is a searchable list.

### REQ-EDIT-007 Profile photo

The Basics section lets the user upload, crop, re-crop, and delete the photo. It is shown next to the identity block, and a failed load shows a visible error state (see REQ-CV-012).

### REQ-EDIT-008 Reorder

Profiles, skills, languages, interests, and references can be reordered by drag-and-drop and by accessible move-up/move-down controls.

- Reordering is disabled while an entry is being edited or created.
- A failed reorder restores the previous order and shows an error.

### REQ-EDIT-009 Loading and stability

The editor and dashboard show placeholder skeletons while loading. The layout does not shift horizontally when content height changes or a dialog opens.

### REQ-EDIT-010 Breadcrumbs

The editor and the new-CV pages (create from scratch, import from file, import from URL) show a breadcrumb back to the CV list.

### REQ-EDIT-011 Preview entry point

Editing sections is the default CV experience. The editor links to the print preview (REQ-EXP-005).
