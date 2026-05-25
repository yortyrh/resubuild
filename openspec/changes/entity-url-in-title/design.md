## Context

`ResumeItemRow` (`cv-item-ui.tsx`) renders a bold **title** (left), optional **meta** (right, dates/locations), and optional **body** (children). Section `renderView` functions in `cv-sections.tsx` currently place raw URL strings in meta and duplicate them as `ExternalLink` rows in the body. The prior `clickable-links-new-tab` change made URLs clickable but did not integrate them into entity titles or consolidate secondary labels.

Authors expect resume-preview semantics: the entity name is the link target; secondary context (study type, awarder, fluency) sits under the title; dates stay right-aligned.

## Goals / Non-Goals

**Goals:**

- Add optional `subtitle` to `ResumeItemRow` for muted secondary text under the title.
- Attach `url` to the primary entity label via `ExternalLink` (label = entity name, not raw URL).
- Remove duplicate URL display from meta columns and body paragraphs for affected sections.
- Relocate section-specific secondary fields per the proposal (education study type/area, awards awarder, languages fluency, projects entity/type).

**Non-Goals:**

- Changing edit forms, API payloads, or JSON Resume schema.
- Altering Social profiles tab (URL remains body link under network/username title).
- Changing Skills, Interests, References, or Basics layout.
- Showing raw URL strings anywhere when a linked entity label is available.

## Decisions

### 1. Extend `ResumeItemRow` with `subtitle` prop

Add optional `subtitle?: ReactNode` rendered below title in `text-muted-foreground text-sm font-normal`. Keeps title/meta/body contract intact; avoids embedding subtitle markup inside every section's title node.

**Alternative considered:** Pass compound title nodes (title + subtitle in one prop). Rejected—harder to style consistently and breaks semantic separation.

### 2. Small helper for linked entity labels

Add `linkedEntityLabel(label: string, url?: string | null): ReactNode` (colocated in `cv-sections.tsx` or `external-link.tsx`) that returns plain text when no safe URL, otherwise `<ExternalLink href={url}>{label}</ExternalLink>` with title link styling (`hover:underline underline-offset-2`, inherit font-semibold from parent).

**Alternative considered:** Inline `ExternalLink` at each call site. Rejected—eight sections share the same pattern.

### 3. Section-specific title composition

| Section      | Title                          | Subtitle               | Meta (unchanged fields) |
| ------------ | ------------------------------ | ---------------------- | ----------------------- |
| Work         | `{position}, {linked company}` | —                      | dates, location         |
| Volunteer    | `{position}, {linked org}`     | —                      | dates                   |
| Education    | `{linked institution}`         | `{studyType} — {area}` | dates, score            |
| Projects     | `{linked name}`                | —                      | dates only              |
| Awards       | `{title}`                      | `{awarder}`            | date                    |
| Certificates | `{linked name}`                | —                      | date                    |
| Publications | `{linked name}`                | —                      | releaseDate             |
| Languages    | `{language}`                   | `{fluency}`            | —                       |

Work/Volunteer join position and entity with `", "` only when both present.

Education subtitle: `[studyType, area].filter(Boolean).join(' — ')`; omit subtitle when empty.

Projects body order: description → entity line → type line → roles → keywords → highlights. Entity/type as `text-sm font-normal` paragraphs without `Entity:`/`Type:` prefixes if subtitle-style is preferred—or keep labels for clarity. **Decision:** keep `Entity:` and `Type:` labels in body for scanability (user referenced "Entity: Personal" and "Type: Open Source" moving, not relabeling).

### 4. Update field-coverage tests, not remove URL assertions

Tests asserting URL presence SHALL check for an anchor with normalized `href`, not raw URL text in meta/body. Entity name text must still appear.

## Risks / Trade-offs

- **[Risk] Linked title styling may clash with bold row title** → Use `ExternalLink` with className that inherits weight/color; avoid `break-all` on short entity names.
- **[Risk] Partial titles (company only, no position)** → Existing fallback strings preserved; link applies only to available label segment.
- **[Risk] Spec delta conflicts with archived URL-in-body requirement** → MODIFIED requirement clarifies URLs attach to entity titles for Work/Volunteer/Education/Projects/Certificates/Publications; Social profiles unchanged.

## Migration Plan

Frontend-only deploy. No data migration. Rollback = revert component changes.

## Open Questions

None—all section rules specified in user request.
