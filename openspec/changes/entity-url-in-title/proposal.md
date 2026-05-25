## Why

Resume-preview rows currently duplicate URL values as raw text in the right meta column and again as standalone external links in the row body. This clutters the layout and buries meaningful entity names (company, institution, project) behind redundant URLs. Authors expect the primary label to be clickable when a URL exists, with secondary context (study type, awarder, fluency) shown as subtitles—not scattered across meta and body slots.

## What Changes

- Extend `ResumeItemRow` with an optional **subtitle** slot beneath the primary title for secondary labels (study type/area, awarder, fluency).
- **Work**: Remove URL from meta and body; link the **company name** in the title when `url` is set (position remains plain text).
- **Volunteer**: Same pattern—link **organization** in the title; remove URL from meta and body.
- **Education**: Link **institution** in the title when `url` is set; move `studyType — area` to subtitle; keep score and dates in meta; remove URL from meta.
- **Projects**: Link **project name** in the title when `url` is set; move Entity and Type from meta to body (before Roles); remove URL from meta and body.
- **Awards**: Move **awarder** from meta to subtitle under the title; keep date in meta.
- **Certificates**: Link **certificate name** in the title when `url` is set; remove raw URL from body.
- **Publications**: Link **publication name** in the title when `url` is set; remove standalone URL link from body.
- **Languages**: Move **fluency** from meta to subtitle under the language name.
- Reuse existing `ExternalLink` for title links (new tab, normalized href); show entity label text, not the raw URL string.

## Capabilities

### New Capabilities

<!-- None -->

### Modified Capabilities

- `cv-editor-ui`: Resume-preview rows SHALL attach URLs to primary entity titles (not meta/body duplicates) and SHALL use a subtitle slot for secondary labels per section-specific rules above.

## Impact

- **Frontend**: `apps/web/src/components/cv/cv-item-ui.tsx` (`ResumeItemRow` subtitle prop); `apps/web/src/components/cv/cv-sections.tsx` (`renderView` for Work, Volunteer, Education, Projects, Awards, Certificates, Publications, Languages).
- **Tests**: Colocated Vitest updates for affected section view layouts.
- **No API, schema, or dependency changes**.
