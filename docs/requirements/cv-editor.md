# CV editor (`EDIT`)

### REQ-EDIT-001 Section navigation

The editor has one view per section (Basics, Social profiles, Work, Volunteer, Education, Skills, Projects, Awards, Certificates, Publications, Languages, Interests, References).

- The active section is part of the URL, so reloading or sharing the link restores it; the navigation highlights the active section.
- On small screens the navigation collapses into a drawer.

### REQ-EDIT-002 View, edit, create, delete

Each section shows its entries in a resume-like read view.

- Edit replaces the entry in place with a form until Save or Cancel; Create opens a form at the end of the section; Delete asks for confirmation.
- The view shows every field the form can edit.

### REQ-EDIT-003 Required dates

Saving a Work, Volunteer, Education, or Project entry requires a start date. Awards and certificates require a date; publications require a release date. These rules apply to interactive saves only, not to imports. An entry without an end date shows "Current".

### REQ-EDIT-004 Markdown fields

Summaries, descriptions, highlights, and reference text are authored as Markdown.

- In the read view they are rendered as formatted, sanitized HTML, the same way in every section.
- Links (Markdown links and URL fields) open in a new tab.
- CV fields allow only a limited grammar: no headings, code blocks, or images. Cover letters allow the full grammar.

### REQ-EDIT-005 String lists

Keywords (skills, interests) and roles (projects) are edited as tags and shown as read-only tags in the read view. Highlights and courses are edited as ordered rows inside the parent form, which can be extended from the keyboard and removed individually.

### REQ-EDIT-006 Basics

- Label is shown before Summary, with guidance that it is a job title.
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
